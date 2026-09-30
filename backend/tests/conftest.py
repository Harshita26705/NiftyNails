import os
import tempfile
from pathlib import Path

# Configure before the app (and its settings cache) is imported.
_MEDIA = tempfile.mkdtemp(prefix="nifty-test-media-")
os.environ.update({
    "DATABASE_URL": "sqlite+pysqlite:///:memory:",
    "ENVIRONMENT": "test",
    "SECRET_KEY": "test-secret-key-not-for-production",
    "MEDIA_DIR": _MEDIA,
    "ADMIN_EMAIL": "owner@test.in",
    "ADMIN_PASSWORD": "OwnerPass!123",
})

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, event  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

import app.models  # noqa: E402,F401
from app.core.rate_limit import ALL_LIMITERS  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.main import create_app  # noqa: E402
from app.seed.__main__ import ensure_foundation, load_demo  # noqa: E402


@pytest.fixture()
def engine():
    eng = create_engine("sqlite+pysqlite:///:memory:", connect_args={"check_same_thread": False},
                        poolclass=StaticPool)

    @event.listens_for(eng, "connect")
    def _fk_on(dbapi_conn, _):
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(eng)
    yield eng
    eng.dispose()


@pytest.fixture()
def db(engine):
    Session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    session = Session()
    ensure_foundation(session)
    load_demo(session)
    yield session
    session.close()


@pytest.fixture()
def client(db, engine):
    Session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def _get_db():
        s = Session()
        try:
            yield s
        finally:
            s.close()

    for limiter in ALL_LIMITERS:
        limiter.reset()
    app = create_app()
    app.dependency_overrides[get_db] = _get_db
    with TestClient(app) as c:
        yield c


def _login(client: TestClient, email: str, password: str) -> TestClient:
    r = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return client


@pytest.fixture()
def admin_client(client):
    return _login(client, "owner@test.in", "OwnerPass!123")


@pytest.fixture()
def customer_client(client):
    r = client.post("/api/v1/auth/register",
                    json={"email": "priya@example.com", "password": "Nails4ever!", "full_name": "Priya Sharma"})
    assert r.status_code == 201, r.text
    return client


@pytest.fixture()
def media_dir() -> Path:
    return Path(_MEDIA)


SHIPPING = {
    "full_name": "Priya Sharma", "phone": "9876543210", "line1": "12 Rose Lane", "line2": "",
    "city": "Bengaluru", "state": "Karnataka", "pincode": "560001",
}
