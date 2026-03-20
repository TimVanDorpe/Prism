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

# --- De LCEL chain: prompt | model | parser ---
# De | operator koppelt de stappen aan elkaar zoals een pijplijn
chain = prompt | model | parser


def analyze_bias(text: str) -> BiasAnalysis:
    """Analyseer een artikel op bias. Geeft een getypt BiasAnalysis object terug."""
    return chain.invoke({
        "text": text,
        "format_instructions": parser.get_format_instructions(), #json schema dat we aan Claude geven zodat hij weet hoe hij moet antwoorden
    })
