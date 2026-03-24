from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.routing import APIRoute
from sqlmodel import Session
from starlette.middleware.cors import CORSMiddleware

from app.api.main import api_router
from app.core.config import settings
from app.core.db import engine, init_db


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

# CORS: Capacitor/WebView XHR is cross-origin to EC2; without middleware, clients often see status 0.
# If BACKEND_CORS_ORIGINS is unset on staging/production, we still allow typical native app origins.
if settings.ENVIRONMENT == "local":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    if settings.BACKEND_CORS_ORIGINS:
        cors_origins = [
            str(origin).strip("/") for origin in settings.BACKEND_CORS_ORIGINS
        ]
    else:
        cors_origins = [
            "capacitor://localhost",
            "ionic://localhost",
            "http://localhost",
            "https://localhost",
            "http://localhost:4200",
        ]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix=settings.API_V1_STR)
