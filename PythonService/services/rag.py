from urllib.parse import urlparse

from core.cache import get_cached, set_cached
from models.schemas import ArticleComparison, CompareResponse
from services.scraper import load_article, chunk_article
from services.embeddings import embed_text, embed_chunks
from services.vector_store import upsert_article, search_similar
from services.analyzer import analyze_bias


def _domain(url: str) -> str:
    """Haal het leesbare domein op uit een URL, bijv. 'bbc.com'."""
    return urlparse(url).netloc.replace("www.", "")


def run_pipeline(url: str) -> CompareResponse:
    """
    RAG Pipeline — Retrieval-Augmented Generation

    RAG lost het probleem op dat een LLM (zoals Claude) geen toegang heeft
    tot jouw eigen data of recente nieuws. In plaats van alleen Claude te
    vragen "analyseer dit artikel", doen we drie stappen:

      1. RETRIEVE  — Haal gerelateerde artikelen op uit Pinecone
                     (artikelen die eerder zijn opgeslagen en over hetzelfde
                     onderwerp gaan).

      2. AUGMENT   — Voeg die opgehaalde context toe aan de prompt.
                     Claude leest nu échte artikeltekst, geen geheugen.

      3. GENERATE  — Claude genereert een gestructureerde BiasAnalysis
                     op basis van de werkelijke inhoud.

    Zo vergelijken we bias over meerdere nieuwsbronnen — net als Ground News.
    """

    # ── a. Cache-controle ────────────────────────────────────────────────
    # Als we dit artikel al eerder geanalyseerd hebben, sturen we het
    # opgeslagen resultaat direct terug. Geen onnodige API-kosten.
    cached = get_cached(url)
    if cached:
        return cached

    # ── b. Scrapen & splitsen ────────────────────────────────────────────
    # WebBaseLoader haalt de ruwe tekst van de webpagina op.
    # RecursiveCharacterTextSplitter verdeelt die tekst in stukken van
    # 1000 tekens met 200 tekens overlap, zodat geen zin halverwege
    # wordt doorgeknipt.
    raw_text = load_article(url)
    chunks = chunk_article(raw_text)

    # ── c. Embedden van de "vingerafdruk" ────────────────────────────────
    # We embedden alleen de eerste 1000 tekens als zoekopdracht.
    # Dit geeft een compacte vector die het onderwerp van het artikel
    # vertegenwoordigt — de "vingerafdruk" voor de Pinecone-zoekopdracht.
    query_vec = embed_text(raw_text[:1000])

    # ── d. Opslaan in Pinecone (WRITE) ───────────────────────────────────
    # Alle chunks worden als aparte vectoren opgeslagen zodat toekomstige
    # artikelen dit artikel als "gerelateerd" kunnen terugvinden.
    chunk_vecs = embed_chunks(chunks)
    upsert_article(url, chunks, chunk_vecs)

    # ── e. Zoeken naar gerelateerde artikelen (RETRIEVE) ─────────────────
    # Dit is de kern van RAG: we vragen Pinecone om de 10 meest gelijkende
    # vectoren. Elk resultaat is een chunk van een eerder opgeslagen artikel.
    # We dedupliceren op URL en sluiten het huidige artikel zelf uit.
    hits = search_similar(query_vec, top_k=10)
    seen_urls = {url}
    related_urls = []
    for hit in hits:
        hit_url = hit["url"]
        if hit_url not in seen_urls:
            seen_urls.add(hit_url)
            related_urls.append(hit_url)

    # ── f. Bias-analyse van het originele artikel (GENERATE) ─────────────
    # We sturen maximaal 8000 tekens naar Claude. De LCEL-keten in
    # analyzer.py bouwt de prompt, stuurt hem naar ChatAnthropic en
    # parseert het antwoord naar een getypeerd BiasAnalysis-object.
    original_analysis = analyze_bias(raw_text[:8000])
    original = ArticleComparison(
        url=url,
        source=_domain(url),
        biasScore=original_analysis.biasScore,
        biasedLeaning=original_analysis.biasedLeaning,
        summary=original_analysis.summary,
    )

    # ── g. Bias-analyse van gerelateerde artikelen (AUGMENT + GENERATE) ──
    # Voor elk gevonden gerelateerd artikel scrapen en analyseren we opnieuw.
    # Dit is de "augmented" stap: we voeden Claude met meerdere echte bronnen
    # over hetzelfde verhaal, zodat de vergelijking op feiten gebaseerd is.
    # We beperken tot 3 artikelen om kosten te beheersen.
    related = []
    for rel_url in related_urls[:3]:
        try:
            rel_text = load_article(rel_url)
            rel_analysis = analyze_bias(rel_text[:8000])
            related.append(ArticleComparison(
                url=rel_url,
                source=_domain(rel_url),
                biasScore=rel_analysis.biasScore,
                biasedLeaning=rel_analysis.biasedLeaning,
                summary=rel_analysis.summary,
            ))
        except Exception:
            # Sla artikelen over die niet gescraped kunnen worden
            continue

    # ── h. Resultaat opbouwen, cachen en teruggeven ──────────────────────
    result = CompareResponse(original=original, related=related, costUsd=0.0)
    set_cached(url, result)
    return result
