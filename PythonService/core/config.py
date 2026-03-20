from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    anthropic_api_key: str
    google_api_key: str = ""
    pinecone_api_key: str = ""
    pinecone_index_name: str = "prism"
    port: int = 8000
    cache_ttl_minutes: int = 60
    rate_limit: str = "10/minute"

settings = Settings()
