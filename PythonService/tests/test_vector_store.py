from services.vector_store import upsert, query


def test_upsert_and_query():
    """Sla een vector op en zoek hem terug."""
    vector = [0.1] * 1024
    upsert(
        id="test-artikel-1",
        vector=vector,
        metadata={"url": "https://example.com", "title": "Test artikel"},
    )

    results = query(vector=vector, top_k=1)
    assert len(results) >= 1
    assert results[0].id == "test-artikel-1"


def test_query_returns_most_similar():
    """Twee vectoren opslaan — query geeft de meest gelijkaardige terug."""
    vec_a = [1.0] + [0.0] * 1023  # Richting A
    vec_b = [0.0] + [1.0] + [0.0] * 1022  # Richting B

    upsert(id="vec-a", vector=vec_a, metadata={"label": "A"})
    upsert(id="vec-b", vector=vec_b, metadata={"label": "B"})

    results = query(vector=vec_a, top_k=2)
    ids = [r.id for r in results]
    assert ids[0] == "vec-a"  # Meest gelijkaardig aan vec_a
