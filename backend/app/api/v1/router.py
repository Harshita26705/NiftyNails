from fastapi import APIRouter, Depends

from app.api.deps import require_admin
from app.api.v1 import account, ai, auth, catalog, designs, orders
from app.api.v1.admin import configuration, lookups, operations, products

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(catalog.router)
api_router.include_router(ai.router)
api_router.include_router(designs.router)
api_router.include_router(orders.router)
api_router.include_router(account.router)

# Router-level guard: every admin route requires staff/admin even if an endpoint forgets its own check.
admin_router = APIRouter(prefix="/admin", dependencies=[Depends(require_admin)])
admin_router.include_router(operations.router)
admin_router.include_router(products.router)
admin_router.include_router(lookups.router)
admin_router.include_router(configuration.router)
api_router.include_router(admin_router)
