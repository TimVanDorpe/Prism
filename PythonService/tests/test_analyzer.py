from services.analyzer import analyze_bias, AnalysisResult, BiasAnalysis

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


def test_geeft_analysis_result_terug():
    """Resultaat moet een AnalysisResult zijn met analyse + token counts."""
    result = analyze_bias(ARTIKEL_LINKS)
    assert isinstance(result, AnalysisResult)
    assert isinstance(result.analysis, BiasAnalysis)


def test_bias_score_is_getal_tussen_0_en_100():
    result = analyze_bias(ARTIKEL_LINKS)
    assert 0 <= result.analysis.biasScore <= 100


def test_leaning_is_geldig():
    result = analyze_bias(ARTIKEL_LINKS)
    assert result.analysis.biasedLeaning in ("left", "right", "neutral")


def test_summary_is_tekst():
    result = analyze_bias(ARTIKEL_LINKS)
    assert isinstance(result.analysis.summary, str)
    assert len(result.analysis.summary) > 10


def test_links_artikel_heeft_left_leaning():
    result = analyze_bias(ARTIKEL_LINKS)
    assert result.analysis.biasedLeaning == "left"


def test_rechts_artikel_heeft_right_leaning():
    result = analyze_bias(ARTIKEL_RECHTS)
    assert result.analysis.biasedLeaning == "right"


def test_token_counts_zijn_positief():
    """Stap 9: usage_metadata moet echte token counts bevatten."""
    result = analyze_bias(ARTIKEL_LINKS)
    assert result.input_tokens > 0
    assert result.output_tokens > 0
