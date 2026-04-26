"""Tests for ``scraper.fetcher``."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import requests

from scraper.fetcher import fetch_page


class _Response:
    def __init__(
        self,
        status_code: int,
        text: str = "<html></html>",
        headers=None,
        url: str = "https://www.gsmarena.com/page",
    ):
        self.status_code = status_code
        self.text = text
        self.headers = headers or {}
        self.url = url

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise requests.HTTPError(f"{self.status_code}")


def test_fetch_page_returns_html_on_200():
    session = MagicMock()
    session.headers = {}
    session.get.return_value = _Response(200, "<html>OK</html>")
    with patch("scraper.fetcher._polite_sleep", lambda: None):
        html = fetch_page("https://example.com", session=session)
    assert html == "<html>OK</html>"
    session.get.assert_called_once()


def test_fetch_page_retries_on_429_then_succeeds():
    session = MagicMock()
    session.headers = {}
    session.get.side_effect = [
        _Response(429, headers={"Retry-After": "0"}),
        _Response(200, "<html>recovered</html>"),
    ]
    with patch("scraper.fetcher._polite_sleep", lambda: None), patch(
        "scraper.fetcher.time.sleep", lambda *_: None
    ):
        html = fetch_page("https://example.com", session=session)
    assert html == "<html>recovered</html>"
    assert session.get.call_count == 2


def test_fetch_page_returns_none_on_persistent_failure():
    session = MagicMock()
    session.headers = {}
    session.get.return_value = _Response(503)
    with patch("scraper.fetcher._polite_sleep", lambda: None), patch(
        "scraper.fetcher.time.sleep", lambda *_: None
    ), patch("config.MAX_RETRIES", 2):
        html = fetch_page("https://example.com", session=session)
    assert html is None


def test_fetch_page_retries_on_mobile_redirect():
    """A 200 response that landed on m.gsmarena.com must trigger a UA-rotation retry."""
    session = MagicMock()
    session.headers = {}
    session.get.side_effect = [
        _Response(
            200, "<html>mobile</html>", url="https://m.gsmarena.com/samsung-phones-9.php"
        ),
        _Response(
            200, "<html>desktop</html>", url="https://www.gsmarena.com/samsung-phones-9.php"
        ),
    ]
    with patch("scraper.fetcher._polite_sleep", lambda: None), patch(
        "scraper.fetcher.time.sleep", lambda *_: None
    ):
        html = fetch_page("https://www.gsmarena.com/samsung-phones-9.php", session=session)
    assert html == "<html>desktop</html>"
    assert session.get.call_count == 2
