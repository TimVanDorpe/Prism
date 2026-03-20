import time
from core.cache import get_cached, set_cached, clear_expired


def test_get_returns_none_als_niet_bestaat():
    assert get_cached("https://example.com/nieuw") is None


def test_set_en_get():
    set_cached("https://example.com/artikel", {"biasScore": 72})
    result = get_cached("https://example.com/artikel")
    assert result == {"biasScore": 72}


def test_verlopen_entry_geeft_none(monkeypatch):
    """Simuleer dat de TTL verstreken is door time.time() te manipuleren."""
    set_cached("https://example.com/oud", {"biasScore": 50})

    # Doe alsof er 2 uur verstreken zijn
    now = time.time()
    monkeypatch.setattr(time, "time", lambda: now + 7201)

    result = get_cached("https://example.com/oud")
    assert result is None


def test_clear_expired_verwijdert_oude_entries(monkeypatch):
    set_cached("https://example.com/verlopen", {"biasScore": 30})

    now = time.time()
    monkeypatch.setattr(time, "time", lambda: now + 7201)

    clear_expired()
    assert get_cached("https://example.com/verlopen") is None
