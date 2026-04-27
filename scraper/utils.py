"""Helpers used across the scraper modules.

This module intentionally has no third-party dependencies so it can be
imported safely from anywhere (tests, CLI, web app, etc.).
"""

from __future__ import annotations

import re
import unicodedata
from typing import Iterable

# ---------------------------------------------------------------------------
# Indonesian translation tables (per PRD §4.5).
# ---------------------------------------------------------------------------

MONTH_ID: dict[str, str] = {
    "January": "Januari",
    "February": "Februari",
    "March": "Maret",
    "April": "April",
    "May": "Mei",
    "June": "Juni",
    "July": "Juli",
    "August": "Agustus",
    "September": "September",
    "October": "Oktober",
    "November": "November",
    "December": "Desember",
}

STATUS_ID: dict[str, str] = {
    "Available. Released": "Tersedia",
    "Available": "Tersedia",
    "Discontinued": "Dihentikan",
    "Coming soon": "Segera Hadir",
    "Cancelled": "Dibatalkan",
}


def clean_text(value: str | None) -> str | None:
    """Normalize whitespace, strip ``\\xa0`` and surrounding spaces.

    Returns ``None`` if the value is empty after cleaning so downstream code
    can preserve the schema's "missing means null" rule.
    """

    if value is None:
        return None
    if not isinstance(value, str):
        value = str(value)

    # Replace common HTML / unicode whitespace with regular spaces.
    text = value.replace("\xa0", " ").replace("\u200b", "")
    text = unicodedata.normalize("NFKC", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text or None


def slugify(value: str) -> str:
    """Tiny slugifier used for filenames."""
    text = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-zA-Z0-9]+", "_", text).strip("_").lower()
    return text or "phones"


def translate_yes_no(value: str | None) -> str | None:
    """Translate English Yes/No-ish answers to Indonesian.

    Anything else (e.g. a feature description) is returned as-is so we don't
    lose information.
    """
    text = clean_text(value)
    if text is None:
        return None
    lower = text.lower()
    if lower in {"yes"}:
        return "Ya"
    if lower in {"no", "none"}:
        return "Tidak"
    return text


def translate_card_slot(value: str | None) -> str | None:
    """Translate the GSMArena ``Card slot`` field to Indonesian."""
    text = clean_text(value)
    if text is None:
        return None
    lower = text.lower()
    if lower in {"no", "none"}:
        return "Tidak ada"
    return text


def translate_status(value: str | None) -> str | None:
    """Translate phone availability status to Indonesian."""
    text = clean_text(value)
    if text is None:
        return None
    for english, indonesian in STATUS_ID.items():
        if text.lower().startswith(english.lower()):
            return indonesian
    return text


def translate_month(value: str | None) -> str | None:
    """Replace English month names with Indonesian equivalents."""
    text = clean_text(value)
    if text is None:
        return None
    for english, indonesian in MONTH_ID.items():
        text = re.sub(rf"\b{english}\b", indonesian, text)
    return text


def parse_float(value: str | None) -> float | None:
    """Best-effort float parser used for the GSMArena rating value."""
    text = clean_text(value)
    if text is None:
        return None
    match = re.search(r"-?\d+(?:\.\d+)?", text)
    if not match:
        return None
    try:
        return float(match.group(0))
    except ValueError:
        return None


def split_internal_memory(value: str | None) -> tuple[str | None, str | None]:
    """Split GSMArena's ``Memory > Internal`` value into RAM/storage.

    GSMArena typically renders something like
    ``"256GB 12GB RAM, 512GB 16GB RAM, 1TB 16GB RAM"``.  We return a tuple
    ``(ram_summary, storage_summary)`` keeping the original ordering.
    """
    text = clean_text(value)
    if text is None:
        return None, None

    options = [opt.strip() for opt in text.split(",") if opt.strip()]
    rams: list[str] = []
    storages: list[str] = []
    for opt in options:
        ram_match = re.search(r"(\d+(?:\.\d+)?)\s*(GB|MB)\s*RAM", opt, re.IGNORECASE)
        storage_match = re.search(
            r"(\d+(?:\.\d+)?)\s*(TB|GB|MB)(?!\s*RAM)", opt, re.IGNORECASE
        )
        if ram_match:
            rams.append(ram_match.group(0).replace("  ", " "))
        if storage_match:
            storages.append(
                f"{storage_match.group(1)}{storage_match.group(2).upper()}"
            )

    ram_summary = ", ".join(_dedupe(rams)) or None
    storage_summary = ", ".join(_dedupe(storages)) or None
    if ram_summary is None and storage_summary is None:
        # Fall back to the raw text rather than dropping data entirely.
        return None, text
    return ram_summary, storage_summary


def extract_refresh_rate(display_type: str | None) -> str | None:
    """Pull the refresh rate (e.g. ``120Hz``) out of GSMArena's display
    description if it is present."""
    text = clean_text(display_type)
    if text is None:
        return None
    match = re.search(r"(\d{2,4})\s*Hz", text, re.IGNORECASE)
    if not match:
        return None
    return f"{match.group(1)}Hz"


def extract_battery_capacity(
    capacity: str | None, type_field: str | None
) -> str | None:
    """Try ``Battery > Capacity`` first; otherwise look inside ``Type``."""
    text = clean_text(capacity)
    if text:
        return text
    type_text = clean_text(type_field)
    if type_text is None:
        return None
    match = re.search(r"\d[\d,\.]*\s*mAh", type_text)
    if match:
        return match.group(0)
    return None


def detect_category(name: str | None) -> str:
    """Detect smartphone vs tablet from the product name."""
    text = (name or "").lower()
    if any(token in text for token in (" tab ", " tab", "ipad", "pad ", " pad")):
        return "tablet"
    return "smartphone"


def first_non_empty(values: Iterable[str | None]) -> str | None:
    for value in values:
        cleaned = clean_text(value)
        if cleaned:
            return cleaned
    return None


def _dedupe(items: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for item in items:
        key = item.lower()
        if key in seen:
            continue
        seen.add(key)
        result.append(item)
    return result
