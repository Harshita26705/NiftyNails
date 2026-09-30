"""Demo account seeding: deterministic, idempotent, never created in production."""

from sqlalchemy import select

from app.models import User
from app.seed.__main__ import DEMO_ACCOUNTS, load_demo_accounts

API = "/api/v1"


def test_demo_accounts_created_with_correct_roles(db):
    load_demo_accounts(db)
    for email, _password, role_name, _name in DEMO_ACCOUNTS:
        user = db.scalar(select(User).where(User.email == email))
        assert user is not None
        assert user.role_name == role_name


def test_demo_accounts_seeding_is_idempotent(db):
    load_demo_accounts(db)
    load_demo_accounts(db)
    all_matching = db.scalars(select(User).where(User.email.in_([a[0] for a in DEMO_ACCOUNTS]))).all()
    assert len(all_matching) == len(DEMO_ACCOUNTS)


def test_demo_accounts_not_created_in_production(db, monkeypatch):
    import app.seed.__main__ as seed_main

    settings = seed_main.get_settings()
    monkeypatch.setattr(seed_main, "get_settings", lambda: settings.model_copy(update={"environment": "production"}))
    load_demo_accounts(db)
    for email, *_ in DEMO_ACCOUNTS:
        assert db.scalar(select(User).where(User.email == email)) is None


def test_demo_customer_and_admin_can_log_in(db, client):
    load_demo_accounts(db)
    customer, admin = DEMO_ACCOUNTS[0], DEMO_ACCOUNTS[1]
    r = client.post(f"{API}/auth/login", json={"email": customer[0], "password": customer[1]})
    assert r.status_code == 200, r.text
    assert r.json()["user"]["role_name"] == "customer"
    r = client.post(f"{API}/auth/login", json={"email": admin[0], "password": admin[1]})
    assert r.status_code == 200, r.text
    assert r.json()["user"]["role_name"] == "admin"


def test_demo_login_auto_creates_the_account(db, client):
    """The one-click /auth/demo-login button shouldn't require the seed script to have run first."""
    assert db.scalar(select(User).where(User.email == DEMO_ACCOUNTS[1][0])) is None
    r = client.post(f"{API}/auth/demo-login", json={"role": "admin"})
    assert r.status_code == 200, r.text
    assert r.json()["user"]["role_name"] == "admin"
    assert r.json()["user"]["email"] == DEMO_ACCOUNTS[1][0]
    # Idempotent: a second click signs into the same account rather than erroring or duplicating it.
    r2 = client.post(f"{API}/auth/demo-login", json={"role": "admin"})
    assert r2.status_code == 200, r2.text
    assert r2.json()["user"]["id"] == r.json()["user"]["id"]


def test_demo_login_customer_role(client):
    r = client.post(f"{API}/auth/demo-login", json={"role": "customer"})
    assert r.status_code == 200, r.text
    assert r.json()["user"]["role_name"] == "customer"
    assert r.json()["user"]["email"] == DEMO_ACCOUNTS[0][0]


def test_demo_login_blocked_in_production(client, monkeypatch):
    import app.api.v1.auth as auth_module

    settings = auth_module.get_settings()
    monkeypatch.setattr(auth_module, "get_settings", lambda: settings.model_copy(update={"environment": "production"}))
    r = client.post(f"{API}/auth/demo-login", json={"role": "admin"})
    assert r.status_code == 404
