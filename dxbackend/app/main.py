from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.routing import APIRoute
from sqlmodel import Session
from starlette.middleware.cors import CORSMiddleware

from app.api.main import api_router
from app.api.routes import legal
from app.core.config import settings
from app.core.db import engine, init_db

# Used when BACKEND_CORS_ORIGINS is empty on the server (e.g. EC2).
_DEFAULT_CORS_ORIGINS: list[str] = [
    "capacitor://localhost",
    "ionic://localhost",
    "http://localhost",
    "https://localhost",
    "http://localhost:4200",
    "http://127.0.0.1:4200",
]
# ng serve may use any port; match http(s)://localhost:* and 127.0.0.1:*
_LOCALHOST_ORIGIN_REGEX = r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"


def custom_generate_unique_id(route: APIRoute) -> str:
    return f"{route.tags[0]}-{route.name}"


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Create DB tables (split_group, group_member, etc.) and seed first superuser."""
    with Session(engine) as session:
        init_db(session)
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    generate_unique_id_function=custom_generate_unique_id,
    lifespan=lifespan,
)

# CORS: non-local must always register middleware (empty BACKEND_CORS_ORIGINS used to skip CORS entirely).
if settings.ENVIRONMENT == "local":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    origins = (
        [str(o).strip("/") for o in settings.BACKEND_CORS_ORIGINS]
        if settings.BACKEND_CORS_ORIGINS
        else list(_DEFAULT_CORS_ORIGINS)
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_origin_regex=_LOCALHOST_ORIGIN_REGEX,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix=settings.API_V1_STR)
# Public HTML pages for store listings (no SPA): https://your-host/splitkit/privacy-policy
app.include_router(legal.router, prefix="/splitkit", tags=["legal"])
