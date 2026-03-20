from pinecone import Pinecone
from core.config import settings

pc = Pinecone(api_key=settings.pinecone_api_key)
index = pc.Index(settings.pinecone_index_name)


def upsert(id: str, vector: list[float], metadata: dict) -> None:
    """Sla een vector op in Pinecone met een ID en metadata."""
    index.upsert(vectors=[{"id": id, "values": vector, "metadata": metadata}])


def query(vector: list[float], top_k: int = 5) -> list[dict]:
    """Zoek de meest gelijkaardige vectoren in Pinecone."""
    result = index.query(vector=vector, top_k=top_k, include_metadata=True)
    return result.matches
