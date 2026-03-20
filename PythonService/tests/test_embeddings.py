import math
from services.embeddings import embed_text, embed_chunks

def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Berekent hoe gelijkaardig twee vectoren zijn (0 = totaal anders, 1 = identiek)"""
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x ** 2 for x in a))
    norm_b = math.sqrt(sum(x ** 2 for x in b))
    return dot / (norm_a * norm_b)

def test_embed_text_returns_vector():
    vector = embed_text("Trump signs trade deal")
    assert isinstance(vector, list)
    assert len(vector) == 3072  # gemini-embedding-001 geeft altijd 3072 getallen

def test_similar_sentences_have_high_similarity():
    vec1 = embed_text("De premier tekende een handelsakkoord")
    vec2 = embed_text("The prime minister signed a trade deal")
    similarity = cosine_similarity(
        vec1, vec2)
    assert similarity > 0.8, f"Gelijkaardige zinnen moeten score > 0.8 hebben, kreeg {similarity:.2f}"

def test_different_sentences_have_low_similarity():
    vec1 = embed_text("De premier tekende een handelsakkoord")
    vec2 = embed_text("Ik hou van pizza met extra kaas")
    similarity = cosine_similarity(vec1, vec2)
    assert similarity < 0.8, f"Verschillende zinnen moeten score < 0.8 hebben, kreeg {similarity:.2f}"

def test_embed_chunks_returns_multiple_vectors():
    chunks = ["Eerste chunk tekst", "Tweede chunk tekst", "Derde chunk tekst"]
    vectors = embed_chunks(chunks)
    assert len(vectors) == 3
    assert all(len(v) == 3072 for v in vectors)


#   Wat is cosine similarity?

#   Stel je twee pijlen voor vanuit het middelpunt van een cirkel:

#           vec1 (handelsakkoord)
#          ↗
#         /  ← kleine hoek = grote similarity
#        /
#       •──────→ vec2 (trade deal)

#   Cosine similarity meet de hoek tussen twee vectoren:
#   - Hoek = 0° → score = 1.0 (identiek)
#   - Hoek = 90° → score = 0.0 (totaal anders)

#   Het maakt niet uit hoe lang de pijlen zijn, alleen de richting telt.