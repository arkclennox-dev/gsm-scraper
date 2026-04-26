"""Persistence helpers: JSON / CSV writers and checkpoint manager."""

from __future__ import annotations

import datetime as _dt
import json
import logging
from pathlib import Path
from typing import Iterable

import pandas as pd

import config
from scraper.utils import slugify

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# JSON / CSV
# ---------------------------------------------------------------------------


def save_json(phones: list[dict], filepath: str | Path) -> Path:
    """Persist ``phones`` as a UTF-8 JSON array."""
    path = Path(filepath)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        json.dump(phones, fh, ensure_ascii=False, indent=2)
    log.info("Wrote %d phones to %s", len(phones), path)
    return path


def save_csv(phones: list[dict], filepath: str | Path) -> Path:
    """Persist ``phones`` as a flat CSV with dotted column names."""
    path = Path(filepath)
    path.parent.mkdir(parents=True, exist_ok=True)
    if phones:
        flat = [_flatten(phone) for phone in phones]
        df = pd.DataFrame(flat)
    else:
        df = pd.DataFrame()
    df.to_csv(path, index=False, encoding="utf-8-sig")
    log.info("Wrote %d phones to %s", len(phones), path)
    return path


def _flatten(phone: dict, prefix: str = "") -> dict:
    flat: dict = {}
    for key, value in phone.items():
        col = f"{prefix}{key}" if not prefix else f"{prefix}.{key}"
        if isinstance(value, dict):
            flat.update(_flatten(value, col))
        elif isinstance(value, list):
            flat[col] = json.dumps(value, ensure_ascii=False)
        else:
            flat[col] = value
    return flat


# ---------------------------------------------------------------------------
# Checkpoint
# ---------------------------------------------------------------------------


def save_checkpoint(scraped_urls: Iterable[str], filepath: str | Path) -> Path:
    """Write the set of already-scraped URLs to a checkpoint file."""
    path = Path(filepath)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        for url in sorted(set(scraped_urls)):
            fh.write(url + "\n")
    return path


def load_checkpoint(filepath: str | Path) -> set[str]:
    """Read a checkpoint file; return an empty set if it doesn't exist."""
    path = Path(filepath)
    if not path.exists():
        return set()
    with path.open("r", encoding="utf-8") as fh:
        return {line.strip() for line in fh if line.strip()}


# ---------------------------------------------------------------------------
# Filename helpers
# ---------------------------------------------------------------------------


def output_filename(
    label: str,
    extension: str,
    *,
    output_dir: Path | None = None,
    timestamp: str | None = None,
) -> Path:
    """Build ``data/output/phones_{label}_{timestamp}.{ext}``."""
    ext = extension.lstrip(".")
    out_dir = output_dir or config.OUTPUT_DIR
    out_dir.mkdir(parents=True, exist_ok=True)
    ts = timestamp or _dt.datetime.now().strftime("%Y-%m-%d_%H%M%S")
    return out_dir / f"phones_{slugify(label)}_{ts}.{ext}"


def checkpoint_path(label: str, *, checkpoint_dir: Path | None = None) -> Path:
    cp_dir = checkpoint_dir or config.CHECKPOINT_DIR
    cp_dir.mkdir(parents=True, exist_ok=True)
    return cp_dir / f"checkpoint_{slugify(label)}.txt"
