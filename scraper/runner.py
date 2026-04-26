"""High-level orchestration that ties the fetcher / parser / transformer
/ storage modules together.

Both the CLI (``main.py``) and the Flask web app delegate the actual
scraping work to :func:`scrape` here so the logic lives in one place.
"""

from __future__ import annotations

import logging
import re
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Iterable
from urllib.parse import urljoin, urlparse

import requests

import config
from scraper.fetcher import build_session, fetch_page
from scraper.parser import (
    parse_brand_listing,
    parse_brand_listing_pagination,
    parse_brands_index,
    parse_phone_page,
)
from scraper.storage import (
    checkpoint_path,
    load_checkpoint,
    output_filename,
    save_checkpoint,
    save_csv,
    save_json,
)
from scraper.transformer import transform, validate
from scraper.utils import slugify

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Result containers
# ---------------------------------------------------------------------------


@dataclass
class ScrapeResult:
    label: str
    phones: list[dict] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)
    failed: list[str] = field(default_factory=list)
    json_path: Path | None = None
    csv_path: Path | None = None
    checkpoint_path: Path | None = None
    duration_seconds: float = 0.0

    def summary(self) -> dict:
        return {
            "label": self.label,
            "scraped": len(self.phones),
            "skipped": len(self.skipped),
            "failed": len(self.failed),
            "json_path": str(self.json_path) if self.json_path else None,
            "csv_path": str(self.csv_path) if self.csv_path else None,
            "checkpoint_path": (
                str(self.checkpoint_path) if self.checkpoint_path else None
            ),
            "duration_seconds": round(self.duration_seconds, 2),
        }


# ---------------------------------------------------------------------------
# URL resolution helpers
# ---------------------------------------------------------------------------


_BRAND_INDEX_URL = "/makers.php3"


def resolve_brand_listing_url(brand: str, session: requests.Session) -> str | None:
    """Return the GSMArena listing URL for ``brand`` (e.g. ``samsung``)."""
    slug = slugify(brand)
    direct_guess = f"{config.BASE_URL}/{slug}-phones-9.php"
    log.debug("Trying direct brand URL %s", direct_guess)
    html = fetch_page(direct_guess, session=session, delay=False)
    if html and "<title>404" not in html.lower() and "page not found" not in html.lower():
        if parse_brand_listing(html):
            return direct_guess

    log.info("Falling back to brand index lookup for %s", brand)
    index_html = fetch_page(urljoin(config.BASE_URL + "/", _BRAND_INDEX_URL), session=session)
    if not index_html:
        return None
    brands = parse_brands_index(index_html)
    candidate = brands.get(slug)
    if not candidate:
        for key, url in brands.items():
            if slug in key or key in slug:
                candidate = url
                break
    return candidate


def collect_phone_urls(
    listing_url: str, session: requests.Session, *, max_pages: int = 50
) -> list[str]:
    """Walk a brand listing (and its paginated tail) collecting phone URLs."""
    urls: list[str] = []
    seen: set[str] = set()
    queue = [listing_url]
    visited_pages: set[str] = set()

    while queue and len(visited_pages) < max_pages:
        page_url = queue.pop(0)
        if page_url in visited_pages:
            continue
        visited_pages.add(page_url)

        html = fetch_page(page_url, session=session)
        if not html:
            continue
        for url in parse_brand_listing(html):
            if url in seen:
                continue
            seen.add(url)
            urls.append(url)
        for next_page in parse_brand_listing_pagination(html):
            if next_page not in visited_pages and next_page not in queue:
                queue.append(next_page)
    return urls


# ---------------------------------------------------------------------------
# Main scrape entry point
# ---------------------------------------------------------------------------


ProgressCallback = Callable[[dict], None]


def scrape(
    *,
    brand: str | None = None,
    url: str | None = None,
    all_brands: bool = False,
    output: str = "json",
    limit: int | None = None,
    resume: bool = False,
    progress: ProgressCallback | None = None,
) -> ScrapeResult:
    """Execute a scrape run.

    Exactly one of ``brand``, ``url``, ``all_brands`` should be supplied.
    """
    if sum(bool(x) for x in (brand, url, all_brands)) != 1:
        raise ValueError("Provide exactly one of brand=, url=, or all_brands=True")

    config.ensure_dirs()
    started = time.time()

    if url:
        label = _label_from_url(url)
    elif brand:
        label = brand.lower()
    else:
        label = "all"

    result = ScrapeResult(label=label)
    cp_path = checkpoint_path(label)
    result.checkpoint_path = cp_path
    already: set[str] = load_checkpoint(cp_path) if resume else set()

    session = build_session()
    target_urls = _resolve_targets(brand, url, all_brands, session)
    if not target_urls:
        log.error("No phone URLs to scrape for label=%s", label)
        return result

    if limit is not None:
        target_urls = target_urls[: max(0, limit)]

    for idx, phone_url in enumerate(target_urls, start=1):
        if phone_url in already:
            log.info("[%d/%d] Skipping (checkpoint) %s", idx, len(target_urls), phone_url)
            result.skipped.append(phone_url)
            _emit(progress, idx, len(target_urls), phone_url, "skipped")
            continue
        try:
            html = fetch_page(phone_url, session=session)
            if not html:
                log.error("Empty HTML for %s", phone_url)
                result.failed.append(phone_url)
                _emit(progress, idx, len(target_urls), phone_url, "failed")
                continue
            raw = parse_phone_page(html, phone_url)
            if not raw:
                log.error("Could not parse %s", phone_url)
                result.failed.append(phone_url)
                _emit(progress, idx, len(target_urls), phone_url, "failed")
                continue
            phone = transform(raw)
            ok, warnings = validate(phone)
            for w in warnings:
                log.warning("[%s] %s", phone.get("name") or phone_url, w)
            if not ok:
                log.error("Validation failed for %s; skipping", phone_url)
                result.failed.append(phone_url)
                _emit(progress, idx, len(target_urls), phone_url, "failed")
                continue
            result.phones.append(phone)
            already.add(phone_url)
            save_checkpoint(already, cp_path)
            log.info(
                "[%d/%d] Scraped %s (%s)",
                idx,
                len(target_urls),
                phone.get("name"),
                phone_url,
            )
            _emit(progress, idx, len(target_urls), phone_url, "ok", phone)
        except KeyboardInterrupt:
            log.warning("Interrupted by user; saving checkpoint and exiting")
            save_checkpoint(already, cp_path)
            break
        except Exception as exc:  # noqa: BLE001 — top-level safety net
            log.exception("Unhandled error scraping %s: %s", phone_url, exc)
            result.failed.append(phone_url)
            _emit(progress, idx, len(target_urls), phone_url, "failed")

    _persist(result, output)
    result.duration_seconds = time.time() - started
    return result


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _resolve_targets(
    brand: str | None,
    url: str | None,
    all_brands: bool,
    session: requests.Session,
) -> list[str]:
    if url:
        return [url]
    if brand:
        listing = resolve_brand_listing_url(brand, session)
        if not listing:
            log.error("Could not resolve brand listing for %s", brand)
            return []
        return collect_phone_urls(listing, session)
    if all_brands:
        index_html = fetch_page(
            urljoin(config.BASE_URL + "/", _BRAND_INDEX_URL), session=session
        )
        brands = parse_brands_index(index_html or "")
        urls: list[str] = []
        for slug, listing_url in brands.items():
            log.info("Collecting phones for brand %s", slug)
            urls.extend(collect_phone_urls(listing_url, session))
        return urls
    return []


def _persist(result: ScrapeResult, output: str) -> None:
    output = (output or "json").lower()
    if not result.phones:
        return
    if output in {"json", "both"}:
        result.json_path = save_json(
            result.phones, output_filename(result.label, "json")
        )
    if output in {"csv", "both"}:
        result.csv_path = save_csv(
            result.phones, output_filename(result.label, "csv")
        )


def _label_from_url(url: str) -> str:
    parsed = urlparse(url)
    name = parsed.path.rsplit("/", 1)[-1].rsplit(".", 1)[0]
    name = re.sub(r"-\d+$", "", name)
    return slugify(name) or "single"


def _emit(
    progress: ProgressCallback | None,
    index: int,
    total: int,
    url: str,
    status: str,
    phone: dict | None = None,
) -> None:
    if progress is None:
        return
    try:
        progress(
            {
                "index": index,
                "total": total,
                "url": url,
                "status": status,
                "phone": phone,
            }
        )
    except Exception:  # noqa: BLE001
        log.exception("Progress callback raised; ignoring")


def collected_urls_for(brand: str) -> list[str]:
    """Convenience helper exposed for tests / scripts."""
    session = build_session()
    listing = resolve_brand_listing_url(brand, session)
    if not listing:
        return []
    return collect_phone_urls(listing, session)


def iter_chunks(items: Iterable, size: int):  # pragma: no cover - utility
    chunk: list = []
    for item in items:
        chunk.append(item)
        if len(chunk) >= size:
            yield chunk
            chunk = []
    if chunk:
        yield chunk
