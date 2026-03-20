import pytest
from services.vector_store import upsert_article, search_similar, delete_namespace

# Alle testdata gaat in deze namespace — nooit in de echte data
TEST_NAMESPACE = "test"


@pytest.fixture(autouse=True)
def cleanup():
    """Verwijder alle testdata na elke test automatisch."""
    yield  # Test runt hier
    delete_namespace(TEST_NAMESPACE)


def test_upsert_and_search():
    """Sla chunks van een artikel op en zoek ze terug."""
    chunks = ["Trump tekende een handelsakkoord.", "De beurs steeg met 2%."]
    embeddings = [[0.1] * 1024, [0.2] * 1024]
    url = "https://www.vrt.be/vrtnws/nl/2026/03/20/ingrid-daubechies-krijgt-eredoctoraat-ugent/"

    upsert_article(url=url, chunks=chunks, embeddings=embeddings, namespace=TEST_NAMESPACE)

    results = search_similar(query_embedding=[0.1] * 1024, top_k=2, namespace=TEST_NAMESPACE)
    assert len(results) >= 1
    assert results[0].metadata["url"] == url


def test_metadata_bevat_chunk_info():
    """Elke match moet url, chunk_index en text bevatten."""
    chunks = ["Eerste chunk.", "Tweede chunk."]
    embeddings = [[0.3] * 1024, [0.4] * 1024]
    url = "https://www.vrt.be/vrtnws/nl/2026/03/20/waarom-israel-plots-ook-doelwitten-in-de-kaspische-zee-aanvalt/"

    upsert_article(url=url, chunks=chunks, embeddings=embeddings, namespace=TEST_NAMESPACE)

    results = search_similar(query_embedding=[0.3] * 1024, top_k=1, namespace=TEST_NAMESPACE)
    metadata = results[0].metadata

    assert "url" in metadata
    assert "chunk_index" in metadata
    assert "text" in metadata


#   Test start
#      ↓
#   fixture: yield (niets, gewoon wachten)
#      ↓
#   test runt → data gaat naar namespace "test"
#      ↓
#   fixture: delete_namespace("test") → alles weg