"""Central configuration for the GSMArena scraper.

Values are loaded from environment variables (with optional ``.env`` support
via ``python-dotenv``) and exposed as module-level constants so the rest of
the codebase has a single import point.
"""

from __future__ import annotations

import os
from pathlib import Path

try:
    from dotenv import load_dotenv

    load_dotenv()
except Exception:  # pragma: no cover - dotenv is optional at runtime
    pass


def _float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None or raw == "":
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def _int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or raw == "":
        return default
    try:
        return int(raw)
    except ValueError:
        return default


PROJECT_ROOT: Path = Path(__file__).resolve().parent

DELAY_MIN: float = _float("DELAY_MIN", 2.0)
DELAY_MAX: float = _float("DELAY_MAX", 5.0)
MAX_RETRIES: int = _int("MAX_RETRIES", 5)
REQUEST_TIMEOUT: int = _int("REQUEST_TIMEOUT", 30)

LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO").upper()

BASE_URL: str = os.getenv("BASE_URL", "https://www.gsmarena.com").rstrip("/")

OUTPUT_DIR: Path = (PROJECT_ROOT / os.getenv("OUTPUT_DIR", "data/output")).resolve()
CHECKPOINT_DIR: Path = (
    PROJECT_ROOT / os.getenv("CHECKPOINT_DIR", "data/checkpoint")
).resolve()
LOG_FILE: Path = PROJECT_ROOT / os.getenv("LOG_FILE", "scraper.log")

# Default browser-like headers; ``User-Agent`` is overridden per request.
DEFAULT_HEADERS: dict[str, str] = {
    "Accept": (
        "text/html,application/xhtml+xml,application/xml;q=0.9,"
        "image/avif,image/webp,*/*;q=0.8"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Referer": BASE_URL + "/",
}


def ensure_dirs() -> None:
    """Make sure the output / checkpoint directories exist."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    CHECKPOINT_DIR.mkdir(parents=True, exist_ok=True)


def setup_logging(log_file: Path | None = None) -> None:
    """Configure root logger to write to console and ``scraper.log``."""
    import logging

    target = log_file or LOG_FILE
    target.parent.mkdir(parents=True, exist_ok=True)

    root = logging.getLogger()
    if getattr(root, "_gsm_configured", False):
        return

    root.setLevel(LOG_LEVEL)
    fmt = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] %(message)s", "%Y-%m-%d %H:%M:%S"
    )

    console = logging.StreamHandler()
    console.setFormatter(fmt)
    root.addHandler(console)

    file_handler = logging.FileHandler(target, encoding="utf-8")
    file_handler.setFormatter(fmt)
    root.addHandler(file_handler)

    root._gsm_configured = True  # type: ignore[attr-defined]
