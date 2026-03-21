from fastapi import APIRouter, Request

from core.limiter import limiter
from models.schemas import CompareRequest, CompareResponse
from services.rag import run_pipeline

router = APIRouter()


@router.post("/compare", response_model=CompareResponse)
@limiter.limit("10/minute")  # 10 verzoeken per minuut per IP-adres
async def compare(request: Request, body: CompareRequest):
    return run_pipeline(str(body.url))
