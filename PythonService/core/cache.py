import time
import hashlib
from typing import Any, Optional
from core.config import settings

# De cache: { url_hash: (timestamp, result) }
_cache: dict[str, tuple[float, Any]] = {}


def _hash(url: str) -> str:
    """Zet een URL om naar een korte hash als sleutel."""
    return hashlib.md5(url.encode()).hexdigest()


def get_cached(url: str) -> Optional[Any]:
    """Geef het gecachte resultaat terug, of None als het verlopen/niet bestaat."""
    key = _hash(url)
    if key not in _cache:
        return None

    timestamp, result = _cache[key]
    ttl_seconds = settings.cache_ttl_minutes * 60

    if time.time() - timestamp > ttl_seconds:
        del _cache[key]  # Verlopen — verwijder het
        return None

    return result


def set_cached(url: str, result: Any) -> None:
    """Sla een resultaat op in de cache met de huidige timestamp."""
    key = _hash(url)
    _cache[key] = (time.time(), result)


def clear_expired() -> None:
    """Verwijder alle verlopen entries uit de cache."""
    ttl_seconds = settings.cache_ttl_minutes * 60
    now = time.time()
    expired = [key for key, (timestamp, _) in _cache.items()
               if now - timestamp > ttl_seconds]
    for key in expired:
        del _cache[key]
