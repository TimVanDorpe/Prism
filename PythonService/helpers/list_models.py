from google import genai
from core.config import settings

client = genai.Client(api_key=settings.google_api_key)
for model in client.models.list():
    print(model.name, model.supported_actions)



# Dit gebruiken we om te kijken welke modellen er beschikbaar zijn in de Google GenAI API, en welke acties ze ondersteunen (embedden, genereren, etc.). We zien dat "models/gemini-embedding-001" een model is dat tekst kan embedden, en dat "models/gemini-2.0-pro" een model is dat tekst kan genereren. We zullen deze modellen gebruiken in onze service.
