from dataclasses import dataclass
from typing import Literal
from pydantic import BaseModel, Field
from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from core.config import settings


# --- Pydantic model: de vorm van het antwoord dat we van Claude verwachten ---

class BiasAnalysis(BaseModel):
    biasScore: int = Field(
        description="Bias score van 0 (geen bias) tot 100 (extreme bias)"
    )
    biasedLeaning: Literal["left", "right", "neutral"] = Field(
        description="Politieke richting van de bias"
    )
    summary: str = Field(
        description="Korte samenvatting van de bias in het artikel (2-3 zinnen)"
    )


@dataclass
class AnalysisResult:
    """
    Stap 9 — Cost Tracking via Anthropic usage_metadata

    Claude stuurt bij elke response de token counts mee in usage_metadata.
    We lezen die uit en geven ze terug naast de BiasAnalysis zodat rag.py
    de totale kost van een /compare call kan berekenen.

    Tarieven Claude Sonnet (claude-sonnet-4-20250514):
      - Input:  $3  per 1 miljoen tokens
      - Output: $15 per 1 miljoen tokens
    """
    analysis: BiasAnalysis
    input_tokens: int
    output_tokens: int


# --- De drie bouwstenen van de chain ---

# 1. Parser: zet Claude's tekstantwoord om naar een BiasAnalysis object
parser = PydanticOutputParser(pydantic_object=BiasAnalysis)

# 2. Prompt: instructies voor Claude + plek voor het artikel + outputformaat
prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        "Je bent een neutrale media-analist die artikelen beoordeelt op politieke bias.\n"
        "{format_instructions}",
    ),
    (
        "human",
        "Analyseer de bias in dit nieuwsartikel:\n\n{text}",
    ),
])

# 3. Model: Claude Sonnet via LangChain
model = ChatAnthropic(
    model="claude-sonnet-4-20250514",
    api_key=settings.anthropic_api_key,
)

# --- Twee chains ---
# chain_raw stopt vóór de parser zodat we de AIMessage (met usage_metadata) kunnen lezen
chain_raw = prompt | model


def analyze_bias(text: str) -> AnalysisResult:
    """
    Analyseer een artikel op bias.

    Geeft een AnalysisResult terug met:
      - analysis:       getypt BiasAnalysis object
      - input_tokens:   aantal tokens in de prompt
      - output_tokens:  aantal tokens in Claude's antwoord
    """
    message = chain_raw.invoke({
        "text": text,
        "format_instructions": parser.get_format_instructions(),
    })

    analysis = parser.invoke(message)

    usage = message.usage_metadata or {}
    return AnalysisResult(
        analysis=analysis,
        input_tokens=usage.get("input_tokens", 0),
        output_tokens=usage.get("output_tokens", 0),
    )
