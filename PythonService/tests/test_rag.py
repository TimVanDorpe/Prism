"""
Tests voor de RAG-pipeline (services/rag.py)

We mocken alle externe diensten (scraper, embeddings, Pinecone, Claude)
zodat de tests snel zijn en geen echte API-kosten maken.
Wat we testen: de logica van de pipeline zelf — cache, deduplicatie,
structuur van de response.
"""
from unittest.mock import patch, MagicMock

from services.rag import run_pipeline
from services.analyzer import BiasAnalysis
from models.schemas import CompareResponse, ArticleComparison

URL_ORIGINEEL = "https://bbc.com/news/artikel-1"
URL_GERELATEERD = "https://cnn.com/news/artikel-2"

# ── Herbruikbare mock-waarden ─────────────────────────────────────────────

NEP_TEKST = "Dit is een nepartikel over politiek." * 20
NEP_CHUNKS = ["chunk een", "chunk twee", "chunk drie"]
NEP_VECTOR = [0.1] * 1024

NEP_ANALYSE = BiasAnalysis(biasScore=60, biasedLeaning="left", summary="Licht links getint.")

NEP_HITS_MET_GERELATEERD = [
    {"url": URL_ORIGINEEL, "chunk_index": 0, "text": "chunk", "score": 0.99},   # zelfde URL → overgeslagen
    {"url": URL_GERELATEERD, "chunk_index": 0, "text": "chunk", "score": 0.85},
]

NEP_HITS_LEEG = []


def _patch_alle_services(hits=None):
    """
    Geeft een lijst van patches terug voor alle externe afhankelijkheden.
    Gebruik als contextmanager via `with _patch_alle_services() as mocks`.
    """
    if hits is None:
        hits = NEP_HITS_LEEG
    return [
        patch("services.rag.get_cached", return_value=None),
        patch("services.rag.set_cached"),
        patch("services.rag.load_article", return_value=NEP_TEKST),
        patch("services.rag.chunk_article", return_value=NEP_CHUNKS),
        patch("services.rag.embed_text", return_value=NEP_VECTOR),
        patch("services.rag.embed_chunks", return_value=[NEP_VECTOR] * len(NEP_CHUNKS)),
        patch("services.rag.upsert_article"),
        patch("services.rag.search_similar", return_value=hits),
        patch("services.rag.analyze_bias", return_value=NEP_ANALYSE),
    ]


# ── Tests ─────────────────────────────────────────────────────────────────

def test_geeft_compare_response_terug():
    """run_pipeline moet altijd een CompareResponse teruggeven."""
    from contextlib import ExitStack
    with ExitStack() as stack:
        for p in _patch_alle_services():
            stack.enter_context(p)
        result = run_pipeline(URL_ORIGINEEL)

    assert isinstance(result, CompareResponse)


def test_origineel_artikel_heeft_juiste_url():
    from contextlib import ExitStack
    with ExitStack() as stack:
        for p in _patch_alle_services():
            stack.enter_context(p)
        result = run_pipeline(URL_ORIGINEEL)

    assert result.original.url == URL_ORIGINEEL


def test_origineel_artikel_heeft_juiste_source():
    from contextlib import ExitStack
    with ExitStack() as stack:
        for p in _patch_alle_services():
            stack.enter_context(p)
        result = run_pipeline(URL_ORIGINEEL)

    assert result.original.source == "bbc.com"


def test_bias_score_komt_van_analyzer():
    from contextlib import ExitStack
    with ExitStack() as stack:
        for p in _patch_alle_services():
            stack.enter_context(p)
        result = run_pipeline(URL_ORIGINEEL)

    assert result.original.biasScore == NEP_ANALYSE.biasScore
    assert result.original.biasedLeaning == NEP_ANALYSE.biasedLeaning


def test_geen_gerelateerde_artikelen_als_pinecone_leeg_is():
    """Als Pinecone niets teruggeeft, moet related een lege lijst zijn."""
    from contextlib import ExitStack
    with ExitStack() as stack:
        for p in _patch_alle_services(hits=NEP_HITS_LEEG):
            stack.enter_context(p)
        result = run_pipeline(URL_ORIGINEEL)

    assert result.related == []


def test_zelfde_url_wordt_niet_als_gerelateerd_opgenomen():
    """
    Pinecone geeft het originele artikel zelf terug als eerste hit.
    De pipeline moet dit herkennen en overslaan.
    """
    from contextlib import ExitStack
    hits = [{"url": URL_ORIGINEEL, "chunk_index": 0, "text": "x", "score": 0.99}]
    with ExitStack() as stack:
        for p in _patch_alle_services(hits=hits):
            stack.enter_context(p)
        result = run_pipeline(URL_ORIGINEEL)

    assert result.related == []


def test_gerelateerd_artikel_wordt_opgenomen():
    """Als Pinecone een ander artikel teruggeeft, moet het in related staan."""
    from contextlib import ExitStack
    with ExitStack() as stack:
        for p in _patch_alle_services(hits=NEP_HITS_MET_GERELATEERD):
            stack.enter_context(p)
        result = run_pipeline(URL_ORIGINEEL)

    assert len(result.related) == 1
    assert result.related[0].url == URL_GERELATEERD
    assert result.related[0].source == "cnn.com"


def test_cache_hit_slaat_pipeline_over():
    """
    Als get_cached een resultaat teruggeeft, mag de rest van de pipeline
    (scraper, embeddings, Pinecone, Claude) nooit aangeroepen worden.
    """
    nep_cached = CompareResponse(
        original=ArticleComparison(
            url=URL_ORIGINEEL, source="bbc.com",
            biasScore=42, biasedLeaning="neutral", summary="Gecached."
        ),
        related=[],
        costUsd=0.0,
    )
    with patch("services.rag.get_cached", return_value=nep_cached) as mock_cache, \
         patch("services.rag.load_article") as mock_scraper:

        result = run_pipeline(URL_ORIGINEEL)

        assert result == nep_cached
        mock_scraper.assert_not_called()


def test_resultaat_wordt_gecached_na_pipeline():
    """Na een succesvolle analyse moet set_cached aangeroepen zijn."""
    from contextlib import ExitStack
    with ExitStack() as stack:
        patches = _patch_alle_services()
        mocks = [stack.enter_context(p) for p in patches]
        result = run_pipeline(URL_ORIGINEEL)

    # set_cached is de tweede patch in de lijst
    set_cached_mock = mocks[1]
    set_cached_mock.assert_called_once_with(URL_ORIGINEEL, result)


def test_kapot_gerelateerd_artikel_wordt_overgeslagen():
    """
    Als load_article faalt voor een gerelateerd artikel, mag de pipeline
    niet crashen — dat artikel wordt gewoon overgeslagen.
    """
    from contextlib import ExitStack

    def load_side_effect(url):
        if url == URL_GERELATEERD:
            raise Exception("Scrape mislukt")
        return NEP_TEKST

    with ExitStack() as stack:
        patches = _patch_alle_services(hits=NEP_HITS_MET_GERELATEERD)
        mocks = [stack.enter_context(p) for p in patches]
        # Overschrijf load_article met de fout-variant
        mocks[2].side_effect = load_side_effect

        result = run_pipeline(URL_ORIGINEEL)

    assert result.related == []
