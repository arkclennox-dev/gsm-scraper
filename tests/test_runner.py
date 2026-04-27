"""Tests for scraper.runner brand resolution."""
from __future__ import annotations

from unittest.mock import patch

from scraper import runner


_INDEX_HTML = """
<html><body><table>
  <tr>
    <td><a href="samsung-phones-9.php">Samsung</a></td>
    <td><a href="xiaomi-phones-80.php">Xiaomi</a></td>
    <td><a href="apple-phones-48.php">Apple</a></td>
  </tr>
</table></body></html>
"""


def test_resolve_brand_listing_url_uses_index_per_brand_id():
    """Each brand must resolve to its own per-brand listing id (not Samsung's).

    Regression: ``xiaomi-phones-9.php`` happily returns Samsung's listing (the
    trailing ``9`` is Samsung's id), so a previous direct-URL shortcut produced
    Samsung phones for any brand. The resolver must always use the makers
    index, which carries the correct ``-{id}.php`` per brand.
    """

    def fake_fetch_page(url, session=None, delay=True):
        if url.endswith("/makers.php3"):
            return _INDEX_HTML
        raise AssertionError(f"unexpected fetch_page call to {url!r}")

    with patch("scraper.runner.fetch_page", side_effect=fake_fetch_page):
        samsung_url = runner.resolve_brand_listing_url("samsung", session=None)
        xiaomi_url = runner.resolve_brand_listing_url("xiaomi", session=None)
        apple_url = runner.resolve_brand_listing_url("apple", session=None)

    assert samsung_url and samsung_url.endswith("samsung-phones-9.php")
    assert xiaomi_url and xiaomi_url.endswith("xiaomi-phones-80.php")
    assert apple_url and apple_url.endswith("apple-phones-48.php")
    # The crucial bit: xiaomi must NOT resolve to samsung's listing.
    assert "samsung" not in xiaomi_url
