from langchain_community.document_loaders import WebBaseLoader # hier wordt BeautifulSoup gebruikt om de tekst van een webpagina te extraheren
from langchain_text_splitters import RecursiveCharacterTextSplitter

def load_article(url: str) -> str:
    loader = WebBaseLoader([url]) # zet om naar standaard formaat dat langchain verwacht
    docs = loader.load()
    return docs[0].page_content

def chunk_article(text: str) -> list[str]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200, 
    )
    chunks = splitter.split_text(text)
    return chunks


# **Waarom chunken?**

# LLMs hebben een **context window limiet**. Een lang artikel past niet altijd 
# in één API call. Door te chunken stuur je beheersbare stukken naar Claude.

# De `chunk_overlap` zorgt dat je **geen context verliest** aan de grenzen van een chunk:
# ```
# Chunk 1: [--------------------200----]
# Chunk 2:             [200--------------------]
#                      ↑ overlap
# ```

# ---

# **In Prism context:**

# Dit is waarschijnlijk de pipeline voor het analyseren van lange artikelen:
# ```
# URL → load_article() → ruwe tekst → chunk_article() → chunks → Claude API