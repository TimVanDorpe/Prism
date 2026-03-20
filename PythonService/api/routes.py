from fastapi import APIRouter, Request
from slowapi.errors import RateLimitExceeded
from core.limiter import limiter
from models.schemas import CompareRequest, CompareResponse, ArticleComparison

router = APIRouter()

@router.post("/compare", response_model=CompareResponse)
@limiter.limit("10/minute")
async def compare(request: Request, body: CompareRequest):
    dummy_article = ArticleComparison(
        url=str(body.url),
        source="example.com",
        biasScore=42,
        biasedLeaning="neutral",
        summary="This is a stub response — real analysis coming in Step 5.",
    )
    return CompareResponse(
        original=dummy_article,
        related=[],
        costUsd=0.0,
    )
