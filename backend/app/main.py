from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, investigations, evidence, rca, capa, dashboard, copilot
from app.database.db import Base, engine

app = FastAPI(
    title="PharmaRoot AI API",
    description="AI-Powered Root Cause Analysis & CAPA Management for Pharmaceutical Manufacturing",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(investigations.router, prefix="/api")
app.include_router(evidence.router, prefix="/api")
app.include_router(rca.router, prefix="/api")
app.include_router(capa.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(copilot.router, prefix="/api")


@app.on_event("startup")
def create_tables():
    Base.metadata.create_all(bind=engine)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "PharmaRoot AI"}
