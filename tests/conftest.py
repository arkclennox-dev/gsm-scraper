"""Shared pytest fixtures and path setup."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


@pytest.fixture
def sample_phone_html() -> str:
    return (Path(__file__).parent / "fixtures" / "sample_phone.html").read_text(
        encoding="utf-8"
    )


@pytest.fixture
def sample_url() -> str:
    return "https://www.gsmarena.com/samsung_galaxy_s25_ultra-12821.php"


@pytest.fixture(autouse=True)
def _redirect_paths(tmp_path, monkeypatch):
    """Keep tests from writing into the real ``data/`` dir."""
    import config

    out_dir = tmp_path / "output"
    cp_dir = tmp_path / "checkpoint"
    out_dir.mkdir()
    cp_dir.mkdir()
    monkeypatch.setattr(config, "OUTPUT_DIR", out_dir)
    monkeypatch.setattr(config, "CHECKPOINT_DIR", cp_dir)
    monkeypatch.setattr(config, "LOG_FILE", tmp_path / "scraper.log")
    yield
