"""Tests for ``scraper.transformer``."""

from __future__ import annotations

from scraper.parser import parse_phone_page
from scraper.transformer import transform, validate

EXPECTED_GROUPS = {
    "Jaringan",
    "Identitas",
    "Layar",
    "Platform",
    "Memori",
    "Kamera Utama",
    "Kamera Depan",
    "Suara",
    "Konektivitas",
    "Sensor",
    "Baterai",
    "Lainnya",
}


def test_transform_complete(sample_phone_html, sample_url):
    raw = parse_phone_page(sample_phone_html, sample_url)
    phone = transform(raw)

    assert phone["name"] == "Samsung Galaxy S25 Ultra"
    assert phone["brand"] == "Samsung"
    assert phone["category"] == "smartphone"
    assert phone["rating"] == 9.2
    assert phone["coverImage"].startswith("https://")
    assert phone["published"] is True
    assert set(phone["specs"].keys()) == EXPECTED_GROUPS
    assert phone["specs"]["Identitas"]["Tahun Rilis"] == "2025, Januari 22"
    assert phone["specs"]["Identitas"]["Status"] == "Tersedia"
    assert phone["specs"]["Memori"]["Slot Kartu"] == "Tidak ada"
    assert phone["specs"]["Konektivitas"]["NFC"] == "Ya"
    assert phone["specs"]["Konektivitas"]["Inframerah"] == "Tidak"
    assert phone["specs"]["Suara"]["Jack 3.5mm"] == "Tidak"
    assert phone["specs"]["Layar"]["Refresh Rate"] == "120Hz"
    assert "12GB RAM" in phone["specs"]["Memori"]["RAM"]
    assert phone["specs"]["Baterai"]["Kapasitas"] == "5000 mAh"

    ok, warnings = validate(phone)
    assert ok is True
    assert warnings == []


def test_transform_missing_fields_returns_nulls():
    raw = {
        "name": "GenericPhone X",
        "brand": "generic",
        "image_url": None,
        "rating_raw": "",
        "description_raw": "",
        "specs_raw": {
            "Network": {"Technology": "GSM"},
            "Launch": {"Announced": "2024, March 1"},
            "Body": {},
            "Display": {},
            "Platform": {},
            "Memory": {},
            "Main Camera": {},
            "Selfie camera": {},
            "Sound": {},
            "Comms": {},
            "Features": {},
            "Battery": {},
            "Misc": {},
        },
    }
    phone = transform(raw)
    assert phone["rating"] is None
    assert phone["coverImage"] is None
    assert phone["specs"]["Layar"]["Tipe"] is None
    assert phone["specs"]["Memori"]["RAM"] is None
    assert phone["specs"]["Identitas"]["Tahun Rilis"] == "2024, Maret 1"
    # Even with sparse specs, the schema should expose every key.
    assert set(phone["specs"].keys()) == EXPECTED_GROUPS
