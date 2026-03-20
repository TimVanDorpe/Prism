from pydantic import BaseModel, HttpUrl
from typing import Literal

class CompareRequest(BaseModel):
    url: HttpUrl

class ArticleComparison(BaseModel):
    url: str
    source: str
    biasScore: int
    biasedLeaning: Literal["left", "right", "neutral"]
    summary: str

class CompareResponse(BaseModel):
    original: ArticleComparison
    related: list[ArticleComparison]
    costUsd: float
