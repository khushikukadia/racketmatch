from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routes.feed import router as feed_router
from app.routes.matches import router as matches_router
from app.routes.profiles import router as profiles_router
from app.routes.proposals import router as proposals_router
from app.routes.swipes import router as swipes_router

app = FastAPI(title="SmashOrPass API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profiles_router)
app.include_router(swipes_router)
app.include_router(matches_router)
app.include_router(proposals_router)
app.include_router(feed_router)


@app.get("/health")
def health():
    return {"status": "ok"}
