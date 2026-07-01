from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import memos
from app.database import engine, Base

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AWS Memo API", redirect_slashes=False)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(memos.router, prefix="/api/memos", tags=["memos"])

@app.get("/health")
def health():
    return {"status": "ok"}
