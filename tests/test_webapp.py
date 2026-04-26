"""Smoke tests for the Flask web app."""

from __future__ import annotations

import json
import time

import config
import webapp.app as webapp_app
from webapp.app import create_app


def test_index_renders():
    app = create_app()
    client = app.test_client()
    res = client.get("/")
    assert res.status_code == 200
    assert b"GSMArena Scraper" in res.data
    # The UI must surface the configured default brand limit.
    assert f"defaults to {config.DEFAULT_BRAND_LIMIT}".encode() in res.data
    assert f"default {config.DEFAULT_BRAND_LIMIT}".encode() in res.data


def test_brand_scrape_defaults_limit_to_default_brand_limit(monkeypatch):
    """Submitting a brand scrape without a limit must apply DEFAULT_BRAND_LIMIT."""

    captured: dict[str, object] = {}

    def fake_scrape(*, brand=None, url=None, all_brands=False, output="json",
                    limit=None, resume=False, progress=None):
        captured["brand"] = brand
        captured["limit"] = limit
        from scraper.runner import ScrapeResult

        return ScrapeResult(label=brand or "n/a")

    monkeypatch.setattr(webapp_app, "scrape", fake_scrape)

    app = create_app()
    client = app.test_client()
    res = client.post(
        "/api/scrape",
        data=json.dumps({"brand": "samsung"}),
        content_type="application/json",
    )
    assert res.status_code == 200
    # Wait for the background thread to consume our captured args.
    for _ in range(50):
        if "limit" in captured:
            break
        time.sleep(0.05)
    assert captured.get("brand") == "samsung"
    assert captured.get("limit") == config.DEFAULT_BRAND_LIMIT
    assert config.DEFAULT_BRAND_LIMIT >= 50


def test_healthz():
    app = create_app()
    client = app.test_client()
    res = client.get("/healthz")
    assert res.status_code == 200
    assert res.get_json() == {"ok": True}


def test_scrape_requires_target():
    app = create_app()
    client = app.test_client()
    res = client.post("/api/scrape", data=json.dumps({}), content_type="application/json")
    assert res.status_code == 400
