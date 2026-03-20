from google import genai
from core.config import settings

client = genai.Client(api_key=settings.google_api_key)

def embed_text(text: str) -> list[float]:
    """Embed één stuk tekst → lijst van getallen (vector)"""
    result = client.models.embed_content(
        model="models/gemini-embedding-001",
        contents=text,
    )
    return result.embeddings[0].values

def embed_chunks(chunks: list[str]) -> list[list[float]]:
    """Embed meerdere chunks in één batch API call (efficiënter)"""
    result = client.models.embed_content(
        model="models/gemini-embedding-001",
        contents=chunks,  # Kan een list aan in één call
    )
    return [e.values for e in result.embeddings]



# verschil embedding en vector ?                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     
                                 
# ● Ze zijn hetzelfde, maar vanuit een andere invalshoek:                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
  
#   Vector = het wiskundige object (een lijst van getallen)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              [0.12, -0.84, 0.33, ...]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     
#   Embedding = het proces + het resultaat van tekst omzetten naar een vector                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          
#   "Trump" → AI model → [0.12, -0.84, 0.33, ...]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             ---                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  Analogie: een foto van een persoon is het resultaat, een vector is de lijst pixels. Het woord "embedding" zegt ook hoe die vector gemaakt is (via een AI model dat betekenis vastlegt).
#                                                                 
#  Analogie: een foto van een persoon is het resultaat,
#  een vector is de lijst pixels. Het woord "embedding" zegt ook 
#  hoe die vector gemaakt is (via een AI model dat betekenis vastlegt).
#
#  In de praktijk gebruiken developers de woorden door elkaar — 
#  als iemand zegt "geef me de embedding van die zin", 
#  bedoelt hij gewoon de vector.   
# 
#                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        In de praktijk gebruiken developers de woorden door elkaar — als iemand zegt "geef me de embedding van die zin", bedoelt hij gewoon de vector.
    