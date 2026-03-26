from fastapi import APIRouter, Request

from core.limiter import limiter
from models.schemas import CompareRequest, CompareResponse, RunComparisonRequest
from services.rag import run_pipeline

router = APIRouter()


@router.post("/compare", response_model=CompareResponse)
@limiter.limit("10/minute")  # 10 verzoeken per minuut per IP-adres
async def compare(request: Request, body: CompareRequest):
    return run_pipeline(str(body.url))


@router.post("/run-comparison")
async def run_comparison(body: RunComparisonRequest):
    result = run_pipeline(str(body.url))
    return {
        "originalScore":   result.original.biasScore,
        "originalLeaning": result.original.biasedLeaning,
        "originalSummary": result.original.summary,
        "relatedArticles": [r.model_dump() for r in result.related],
        "costUsd":         result.costUsd,
    }
