from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    anthropic_api_key: str
    openai_api_key: str = ""
    pinecone_api_key: str = ""
    pinecone_index_name: str = "prism-articles"
    port: int = 8000
    cache_ttl_minutes: int = 60
    rate_limit: str = "10/minute"

    class Config:
        env_file = ".env"

settings = Settings()
