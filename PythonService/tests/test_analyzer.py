from services.analyzer import analyze_bias, BiasAnalysis

ARTIKEL_LINKS = """
President Biden signed a landmark climate bill today, delivering on a key
progressive promise. Environmental groups celebrated the decision, calling
it a historic step forward for clean energy and social justice.
"""

ARTIKEL_RECHTS = """
The Biden administration's radical climate agenda will destroy thousands of
jobs in the energy sector. This socialist overreach ignores hardworking
Americans and will send energy prices through the roof.
"""


def test_geeft_bias_analysis_object_terug():
    """Resultaat moet een BiasAnalysis object zijn, geen ruwe tekst."""
    result = analyze_bias(ARTIKEL_LINKS)
    assert isinstance(result, BiasAnalysis)


def test_bias_score_is_getal_tussen_0_en_100():
    result = analyze_bias(ARTIKEL_LINKS)
    assert 0 <= result.biasScore <= 100


def test_leaning_is_geldig():
    result = analyze_bias(ARTIKEL_LINKS)
    assert result.biasedLeaning in ("left", "right", "neutral")


def test_summary_is_tekst():
    result = analyze_bias(ARTIKEL_LINKS)
    assert isinstance(result.summary, str)
    assert len(result.summary) > 10


def test_links_artikel_heeft_left_leaning():
    result = analyze_bias(ARTIKEL_LINKS)
    assert result.biasedLeaning == "left"


def test_rechts_artikel_heeft_right_leaning():
    result = analyze_bias(ARTIKEL_RECHTS)
    assert result.biasedLeaning == "right"
