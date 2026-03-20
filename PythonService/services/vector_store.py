from pinecone import Pinecone
from core.config import settings

pc = Pinecone(api_key=settings.pinecone_api_key)
index = pc.Index(settings.pinecone_index_name)


def upsert_article(
    url: str,
    chunks: list[str],
    embeddings: list[list[float]],
    namespace: str = "",
) -> None:
    """Sla alle chunks van een artikel op in Pinecone.

    Elke chunk krijgt een eigen vector + metadata:
    - id: unieke combinatie van url en chunk index
    - values: de embedding vector
    - metadata: url, chunk_index, text
    - namespace: optionele scheiding (bv. "test" vs productiedata)
    """
    vectors = [
        {
            "id": f"{url}#chunk-{i}",
            "values": embedding,
            "metadata": {
                "url": url,
                "chunk_index": i,
                "text": chunk,
            },
        }
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings))
    ]
    index.upsert(vectors=vectors, namespace=namespace)


def search_similar(
    query_embedding: list[float],
    top_k: int = 10,
    namespace: str = "",
) -> list[dict]:
    """Zoek de meest gelijkaardige chunks in Pinecone."""
    result = index.query(
        vector=query_embedding,
        top_k=top_k,
        include_metadata=True,
        namespace=namespace,
    )
    return result.matches


def delete_namespace(namespace: str) -> None:
    """Verwijder alle vectoren in een namespace (handig na tests)."""
    index.delete(delete_all=True, namespace=namespace)
