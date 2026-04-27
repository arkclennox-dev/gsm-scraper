"""Tests for ``scraper.parser``."""

from __future__ import annotations

from scraper.parser import parse_brand_listing, parse_phone_page


def test_parse_phone_page_extracts_expected_fields(sample_phone_html, sample_url):
    raw = parse_phone_page(sample_phone_html, sample_url)
    assert raw is not None
    assert raw["name"] == "Samsung Galaxy S25 Ultra"
    assert raw["brand"].lower() == "samsung"
    assert raw["image_url"].startswith("https://")
    assert raw["rating_raw"] == "9.2"
    assert raw["description_raw"].startswith("Premium flagship")

    specs = raw["specs_raw"]
    expected_groups = {
        "Network",
        "Launch",
        "Body",
        "Display",
        "Platform",
        "Memory",
        "Main Camera",
        "Selfie camera",
        "Sound",
        "Comms",
        "Battery",
        "Misc",
    }
    assert expected_groups.issubset(set(specs.keys()))
    assert specs["Memory"]["Card slot"] == "No"
    assert "120Hz" in specs["Display"]["Type"]


def test_parse_phone_page_returns_none_on_garbage_html():
    assert parse_phone_page("", "https://example.com") is None
    assert parse_phone_page("<html><body>Nothing here</body></html>", "x") is None


def test_parse_brand_listing_extracts_links():
    html = """
    <html><body>
      <div class="makers">
        <ul>
          <li><a href="samsung_galaxy_s25_ultra-12821.php">S25 Ultra</a></li>
          <li><a href="samsung_galaxy_s25-12820.php">S25</a></li>
          <li><a href="some-review.php">Review</a></li>
        </ul>
      </div>
    </body></html>
    """
    urls = parse_brand_listing(html, base_url="https://www.gsmarena.com")
    assert any("samsung_galaxy_s25_ultra-12821.php" in u for u in urls)
    assert any("samsung_galaxy_s25-12820.php" in u for u in urls)
    assert all("review" not in u for u in urls)
