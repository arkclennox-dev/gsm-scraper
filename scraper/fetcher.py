"""HTTP layer for the GSMArena scraper.

The fetcher is intentionally synchronous (per PRD §7) and rotates
``User-Agent`` per request while reusing a ``requests.Session`` for cookies
and connection pooling.
"""

from __future__ import annotations

import logging
import random
import time
from typing import Optional

import requests
from tenacity import (
    RetryError,
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

import config

log = logging.getLogger(__name__)


def _user_agent() -> str:
    """Return a random User-Agent.

    ``fake-useragent`` reaches out to a remote dataset; if that lookup fails
    we fall back to a small built-in pool so the scraper still runs offline
    (e.g. in CI).
    """
    try:
        from fake_useragent import UserAgent

        return UserAgent().random
    except Exception:  # pragma: no cover - exercised only when dataset fails
        fallback = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 "
            "(KHTML, like Gecko) Version/17.2 Safari/605.1.15",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        ]
        return random.choice(fallback)


def build_session() -> requests.Session:
    """Create a ``requests.Session`` pre-configured with browser-ish headers."""
    session = requests.Session()
    session.headers.update(config.DEFAULT_HEADERS)
    return session


class _RetryableHTTPError(requests.HTTPError):
    """HTTP status code we should retry on (429 / 503 / 403)."""


def _polite_sleep() -> None:
    delay = random.uniform(config.DELAY_MIN, config.DELAY_MAX)
    time.sleep(delay)


def fetch_page(
    url: str,
    session: Optional[requests.Session] = None,
    *,
    delay: bool = True,
) -> Optional[str]:
    """Download ``url`` and return its HTML body, or ``None`` on failure.

    Implements the retry / backoff policy described in PRD §4.3 and §8.
    """
    sess = session or build_session()

    @retry(
        reraise=True,
        retry=retry_if_exception_type(
            (_RetryableHTTPError, requests.ConnectionError, requests.Timeout)
        ),
        stop=stop_after_attempt(config.MAX_RETRIES),
        wait=wait_exponential(multiplier=2, min=2, max=32),
    )
    def _do_request() -> str:
        sess.headers["User-Agent"] = _user_agent()
        log.debug("GET %s", url)
        response = sess.get(url, timeout=config.REQUEST_TIMEOUT, allow_redirects=True)
        status = response.status_code
        if status == 429:
            retry_after = response.headers.get("Retry-After")
            try:
                wait_for = float(retry_after) if retry_after else 30.0
            except ValueError:
                wait_for = 30.0
            log.warning(
                "HTTP 429 from %s – sleeping %.1fs before retry", url, wait_for
            )
            time.sleep(wait_for)
            raise _RetryableHTTPError(f"429 Too Many Requests for {url}")
        if status in (403, 503):
            log.warning("HTTP %s from %s – will retry", status, url)
            raise _RetryableHTTPError(f"{status} for {url}")
        if status >= 400:
            log.error("HTTP %s from %s – not retrying", status, url)
            response.raise_for_status()
        return response.text

    try:
        html = _do_request()
    except (_RetryableHTTPError, requests.RequestException, RetryError) as exc:
        log.error("Giving up on %s after retries: %s", url, exc)
        return None
    finally:
        if delay:
            _polite_sleep()
    return html
