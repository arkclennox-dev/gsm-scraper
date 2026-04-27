"""HTML → intermediate dict parsers for GSMArena pages."""

from __future__ import annotations

import logging
import re
from typing import Optional
from urllib.parse import urljoin

from bs4 import BeautifulSoup

import config
from scraper.utils import clean_text

log = logging.getLogger(__name__)


def _soup(html: str) -> BeautifulSoup:
    return BeautifulSoup(html, "lxml")


# ---------------------------------------------------------------------------
# Phone detail page parsing.
# ---------------------------------------------------------------------------


def parse_phone_page(html: str, url: str) -> Optional[dict]:
    """Parse a GSMArena phone detail page.

    Returns the intermediate raw dict described in PRD §4.4, or ``None`` if
    the page does not look like a phone detail page (e.g. hit a 404 / captcha).
    """
    if not html:
        return None
    soup = _soup(html)

    name_el = soup.select_one("h1.specs-phone-name-title") or soup.select_one("h1")
    name = clean_text(name_el.get_text()) if name_el else None
    if not name:
        log.error("Could not find phone name on %s", url)
        return None

    brand = _extract_brand(soup, url)

    image_el = soup.select_one("div.specs-photo-main img") or soup.select_one(
        "div#specs-cp-pic img"
    )
    image_url = None
    if image_el is not None:
        image_url = (
            image_el.get("src")
            or image_el.get("data-src")
            or image_el.get("data-original")
        )
        image_url = clean_text(image_url)

    rating_el = soup.select_one('span[itemprop="ratingValue"]') or soup.select_one(
        "div.help-rating strong"
    )
    rating_raw = clean_text(rating_el.get_text()) if rating_el else ""

    desc_el = soup.select_one("p.tagline") or soup.select_one("p#specs-tagline")
    description_raw = clean_text(desc_el.get_text()) if desc_el else ""

    specs_raw = _parse_spec_table(soup)

    return {
        "name": name,
        "brand": brand,
        "image_url": image_url,
        "rating_raw": rating_raw or "",
        "description_raw": description_raw or "",
        "specs_raw": specs_raw,
        "source_url": url,
    }


def _extract_brand(soup: BeautifulSoup, url: str) -> str:
    """Try to determine the brand from the breadcrumb, falling back to URL."""
    crumb = soup.select_one("div.breadcrumb a") or soup.select_one("nav.breadcrumb a")
    if crumb is not None:
        text = clean_text(crumb.get_text())
        if text:
            return text

    # The product name usually starts with the brand: ``Samsung Galaxy S25 Ultra``
    title = soup.select_one("h1.specs-phone-name-title")
    if title is not None:
        first = clean_text(title.get_text() or "").split() if title else []
        if first:
            return first[0].title()

    # Fall back to URL slug:  https://www.gsmarena.com/samsung_galaxy_s25_ultra-12821.php
    match = re.search(r"/([a-z0-9]+)_", url, re.IGNORECASE)
    if match:
        return match.group(1).title()
    return ""


def _parse_spec_table(soup: BeautifulSoup) -> dict[str, dict[str, str]]:
    specs: dict[str, dict[str, str]] = {}

    tables = soup.select("table") if not soup.select("div#specs-list table") else soup.select(
        "div#specs-list table"
    )
    current_group: Optional[str] = None

    for table in tables:
        # Each table represents a spec category in GSMArena.
        header = table.select_one("th")
        if header is None:
            continue
        group_name = clean_text(header.get_text())
        if not group_name:
            continue
        current_group = group_name
        specs.setdefault(current_group, {})

        for row in table.select("tr"):
            ttl = row.select_one("td.ttl")
            nfo = row.select_one("td.nfo")
            if ttl is None or nfo is None:
                continue
            key = clean_text(ttl.get_text())
            value = clean_text(nfo.get_text(separator=" "))
            if not key:
                continue
            specs[current_group][key] = value or ""

    return specs


# ---------------------------------------------------------------------------
# Brand listing pages (e.g. https://www.gsmarena.com/samsung-phones-9.php)
# ---------------------------------------------------------------------------


def parse_brand_listing(html: str, base_url: str | None = None) -> list[str]:
    """Return absolute URLs of every phone linked from a brand listing page."""
    if not html:
        return []
    soup = _soup(html)
    base = (base_url or config.BASE_URL).rstrip("/") + "/"
    urls: list[str] = []
    seen: set[str] = set()
    for link in soup.select("div.makers a, ul.section-body a"):
        href = link.get("href") or ""
        if not href.endswith(".php"):
            continue
        if "review" in href:
            continue
        absolute = urljoin(base, href)
        if absolute in seen:
            continue
        seen.add(absolute)
        urls.append(absolute)
    return urls


def parse_brand_listing_pagination(html: str, base_url: str | None = None) -> list[str]:
    """Return the URLs for additional pages (page 2, 3, ...) of a brand listing."""
    if not html:
        return []
    soup = _soup(html)
    base = (base_url or config.BASE_URL).rstrip("/") + "/"
    pages: list[str] = []
    seen: set[str] = set()
    for link in soup.select("div.nav-pages a"):
        href = link.get("href") or ""
        if not href:
            continue
        absolute = urljoin(base, href)
        if absolute in seen:
            continue
        seen.add(absolute)
        pages.append(absolute)
    return pages


# ---------------------------------------------------------------------------
# Brands index page (https://www.gsmarena.com/makers.php3)
# ---------------------------------------------------------------------------


def parse_brands_index(html: str, base_url: str | None = None) -> dict[str, str]:
    """Return ``{brand_slug: listing_url}`` for every brand on the makers page."""
    if not html:
        return {}
    soup = _soup(html)
    base = (base_url or config.BASE_URL).rstrip("/") + "/"
    brands: dict[str, str] = {}
    for link in soup.select("table a"):
        href = link.get("href") or ""
        if not href.endswith(".php"):
            continue
        slug = href.split("-", 1)[0].lower()
        if not slug:
            continue
        brands[slug] = urljoin(base, href)
    return brands
