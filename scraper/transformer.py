"""Convert the parser's intermediate dict to the PRD §5 target schema."""

from __future__ import annotations

import logging
from typing import Any

from scraper.utils import (
    clean_text,
    detect_category,
    extract_battery_capacity,
    extract_refresh_rate,
    first_non_empty,
    parse_float,
    split_internal_memory,
    translate_card_slot,
    translate_month,
    translate_status,
    translate_yes_no,
)

log = logging.getLogger(__name__)


def _g(specs: dict[str, dict[str, str]], group: str, key: str) -> str | None:
    """Safely look up a value inside the nested ``specs_raw`` dict."""
    section = specs.get(group) or {}
    if not isinstance(section, dict):
        return None
    return clean_text(section.get(key))


def _camera_config(main_camera: dict[str, str] | None) -> str | None:
    if not main_camera:
        return None
    for key in ("Quad", "Triple", "Dual", "Single", "Penta"):
        value = clean_text(main_camera.get(key))
        if value:
            return f"{key}: {value}"
    return None


def transform(raw: dict) -> dict:
    """Map the parser output to the exact JSON schema from PRD §5."""

    if not raw or not isinstance(raw, dict):
        raise ValueError("transform() requires a non-empty raw dict")

    name = clean_text(raw.get("name")) or ""
    brand_raw = clean_text(raw.get("brand")) or ""
    brand = brand_raw.title() if brand_raw else ""
    specs_raw: dict[str, dict[str, str]] = raw.get("specs_raw") or {}

    description = clean_text(raw.get("description_raw"))
    if not description:
        description = (
            f"Smartphone {brand} {name}.".strip().rstrip(".") + "."
            if brand and name
            else (f"Smartphone {name}." if name else None)
        )

    rating = parse_float(raw.get("rating_raw"))
    if rating is not None and not (0.0 <= rating <= 10.0):
        log.warning("Rating %.2f out of range for %s; clamping to null", rating, name)
        rating = None

    cover_image = clean_text(raw.get("image_url"))
    if cover_image and not cover_image.startswith("http"):
        cover_image = None

    ram, storage = split_internal_memory(_g(specs_raw, "Memory", "Internal"))

    main_camera_section = specs_raw.get("Main Camera") or {}
    selfie_section = specs_raw.get("Selfie camera") or specs_raw.get(
        "Selfie Camera"
    ) or {}

    schema: dict[str, Any] = {
        "name": name or None,
        "brand": brand or None,
        "category": detect_category(name),
        "description": description,
        "rating": rating,
        "coverImage": cover_image,
        "published": True,
        "specs": {
            "Jaringan": {
                "Teknologi": _g(specs_raw, "Network", "Technology"),
                "Band 2G": _g(specs_raw, "Network", "2G bands"),
                "Band 4G LTE": _g(specs_raw, "Network", "4G bands"),
                "Band 5G": _g(specs_raw, "Network", "5G bands"),
            },
            "Identitas": {
                "Tahun Rilis": translate_month(
                    _g(specs_raw, "Launch", "Announced")
                ),
                "Status": translate_status(_g(specs_raw, "Launch", "Status")),
                "Dimensi": _g(specs_raw, "Body", "Dimensions"),
                "Berat": _g(specs_raw, "Body", "Weight"),
                "Bahan": _g(specs_raw, "Body", "Build"),
                "SIM": _g(specs_raw, "Body", "SIM"),
            },
            "Layar": {
                "Tipe": _g(specs_raw, "Display", "Type"),
                "Ukuran": _g(specs_raw, "Display", "Size"),
                "Resolusi": _g(specs_raw, "Display", "Resolution"),
                "Refresh Rate": extract_refresh_rate(
                    _g(specs_raw, "Display", "Type")
                ),
                "Pelindung Layar": _g(specs_raw, "Display", "Protection"),
            },
            "Platform": {
                "OS": _g(specs_raw, "Platform", "OS"),
                "Chipset": _g(specs_raw, "Platform", "Chipset"),
                "CPU": _g(specs_raw, "Platform", "CPU"),
                "GPU": _g(specs_raw, "Platform", "GPU"),
            },
            "Memori": {
                "Slot Kartu": translate_card_slot(
                    _g(specs_raw, "Memory", "Card slot")
                ),
                "RAM": ram,
                "Penyimpanan Internal": storage,
            },
            "Kamera Utama": {
                "Konfigurasi": _camera_config(main_camera_section),
                "Fitur": clean_text(main_camera_section.get("Features")),
                "Video": clean_text(main_camera_section.get("Video")),
            },
            "Kamera Depan": {
                "Resolusi": clean_text(selfie_section.get("Single"))
                or _camera_config(selfie_section),
                "Fitur": clean_text(selfie_section.get("Features")),
                "Video": clean_text(selfie_section.get("Video")),
            },
            "Suara": {
                "Speaker": _g(specs_raw, "Sound", "Loudspeaker"),
                "Jack 3.5mm": translate_yes_no(
                    _g(specs_raw, "Sound", "3.5mm jack")
                ),
            },
            "Konektivitas": {
                "WLAN": _g(specs_raw, "Comms", "WLAN"),
                "Bluetooth": _g(specs_raw, "Comms", "Bluetooth"),
                "GPS": _g(specs_raw, "Comms", "Positioning"),
                "NFC": translate_yes_no(_g(specs_raw, "Comms", "NFC")),
                "USB": _g(specs_raw, "Comms", "USB"),
                "Inframerah": translate_yes_no(
                    _g(specs_raw, "Comms", "Infrared port")
                ),
            },
            "Sensor": {"Sensor": _g(specs_raw, "Features", "Sensors")},
            "Baterai": {
                "Tipe": _g(specs_raw, "Battery", "Type"),
                "Kapasitas": extract_battery_capacity(
                    _g(specs_raw, "Battery", "Capacity"),
                    _g(specs_raw, "Battery", "Type"),
                ),
                "Pengisian Kabel": _g(specs_raw, "Battery", "Charging"),
                "Pengisian Nirkabel": _g(
                    specs_raw, "Battery", "Wireless charging"
                ),
            },
            "Lainnya": {
                "Warna": _g(specs_raw, "Misc", "Colors"),
                "Model": _g(specs_raw, "Misc", "Models"),
                "SAR": first_non_empty(
                    [
                        _g(specs_raw, "Misc", "SAR"),
                        _g(specs_raw, "Misc", "SAR EU"),
                        _g(specs_raw, "Misc", "SAR US"),
                        _g(specs_raw, "Tests", "Performance"),
                    ]
                ),
            },
        },
    }

    return schema


# ---------------------------------------------------------------------------
# Validation (PRD §10).
# ---------------------------------------------------------------------------


def validate(phone: dict) -> tuple[bool, list[str]]:
    """Return ``(is_valid, warnings)`` for a transformed phone record.

    ``is_valid=False`` means the record should be **skipped** (missing required
    fields).  Warnings describe non-fatal issues (e.g. invalid rating coerced
    to ``null``).
    """
    warnings: list[str] = []
    name = phone.get("name")
    brand = phone.get("brand")
    if not name:
        return False, ["missing required field: name"]
    if not brand:
        return False, ["missing required field: brand"]

    rating = phone.get("rating")
    if rating is not None and (
        not isinstance(rating, (int, float)) or not (0.0 <= float(rating) <= 10.0)
    ):
        warnings.append("rating outside 0-10 range; setting to null")
        phone["rating"] = None

    cover = phone.get("coverImage")
    if cover is not None and not str(cover).startswith("http"):
        warnings.append("coverImage missing http scheme; setting to null")
        phone["coverImage"] = None

    specs = phone.get("specs") or {}
    populated_groups = sum(
        1
        for group in specs.values()
        if isinstance(group, dict) and any(v not in (None, "") for v in group.values())
    )
    if populated_groups < 5:
        warnings.append(
            f"only {populated_groups} populated spec groups (expected >= 5)"
        )

    return True, warnings
