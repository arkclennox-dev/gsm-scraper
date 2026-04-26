"""Smoke tests for the Flask web app."""

from __future__ import annotations

import json

from webapp.app import create_app


def test_index_renders():
    app = create_app()
    client = app.test_client()
    res = client.get("/")
    assert res.status_code == 200
    assert b"GSMArena Scraper" in res.data


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
