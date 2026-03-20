from services.scraper import load_article, chunk_article

TEST_URL = "https://www.vrt.be/vrtnws/nl/2026/02/22/soedan-sluitstuk/"

def test_load_article_returns_text():
    text = load_article(TEST_URL)
    assert isinstance(text, str), "Resultaat moet een string zijn"
    assert len(text) > 100, "Artikel moet meer dan 100 tekens bevatten"

def test_chunk_article_splits_text():
    text = load_article(TEST_URL)
    chunks = chunk_article(text)
    assert isinstance(chunks, list), "Chunks moet een lijst zijn"
    assert len(chunks) > 0, "Er moet minstens 1 chunk zijn"

def test_chunk_size_respected():
    text = load_article(TEST_URL)
    chunks = chunk_article(text)
    for chunk in chunks:
        assert len(chunk) <= 1200, f"Chunk te groot: {len(chunk)} tekens"
