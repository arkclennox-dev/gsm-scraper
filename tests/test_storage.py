"""Tests for ``scraper.storage``."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from scraper.storage import (
    load_checkpoint,
    output_filename,
    save_checkpoint,
    save_csv,
    save_json,
)


SAMPLE_PHONE = {
    "name": "Samsung Galaxy S25 Ultra",
    "brand": "Samsung",
    "category": "smartphone",
    "description": "Premium flagship.",
    "rating": 9.2,
    "coverImage": "https://example.com/s25.jpg",
    "published": True,
    "specs": {
        "Layar": {"Ukuran": "6.9 inches", "Refresh Rate": "120Hz"},
        "Memori": {"RAM": "12GB", "Penyimpanan Internal": "256GB"},
    },
}


def test_save_json_roundtrip(tmp_path):
    target = tmp_path / "phones.json"
    save_json([SAMPLE_PHONE], target)
    assert target.exists()
    data = json.loads(target.read_text(encoding="utf-8"))
    assert data == [SAMPLE_PHONE]


def test_save_csv_has_dotted_columns_and_bom(tmp_path):
    target = tmp_path / "phones.csv"
    save_csv([SAMPLE_PHONE], target)
    assert target.exists()
    raw = target.read_bytes()
    assert raw.startswith(b"\xef\xbb\xbf")  # UTF-8 BOM (utf-8-sig)
    df = pd.read_csv(target, encoding="utf-8-sig")
    assert "specs.Layar.Ukuran" in df.columns
    assert "specs.Memori.RAM" in df.columns
    assert df.iloc[0]["specs.Layar.Refresh Rate"] == "120Hz"


def test_checkpoint_roundtrip(tmp_path):
    cp = tmp_path / "checkpoint_samsung.txt"
    urls = {
        "https://www.gsmarena.com/a-1.php",
        "https://www.gsmarena.com/b-2.php",
    }
    save_checkpoint(urls, cp)
    loaded = load_checkpoint(cp)
    assert loaded == urls
    assert load_checkpoint(tmp_path / "missing.txt") == set()


def test_output_filename_uses_label_and_extension(tmp_path):
    path: Path = output_filename(
        "Samsung Galaxy", "json", output_dir=tmp_path, timestamp="2025-01-27_143022"
    )
    assert path.name == "phones_samsung_galaxy_2025-01-27_143022.json"
    assert path.parent == tmp_path
