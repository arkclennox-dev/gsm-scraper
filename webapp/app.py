"""Flask front-end for the GSMArena scraper.

The web app provides three things:

* a small form to trigger a scrape (by brand or by URL),
* a job dashboard that reports progress in real time,
* a results browser to download the JSON / CSV files produced under
  ``data/output``.
"""

from __future__ import annotations

import json
import threading
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from flask import (
    Flask,
    abort,
    jsonify,
    render_template,
    request,
    send_from_directory,
    url_for,
)

import config
from scraper.runner import scrape


# ---------------------------------------------------------------------------
# In-process job tracking (sufficient for the single-instance scope of the
# PRD; not designed for horizontal scaling).
# ---------------------------------------------------------------------------


@dataclass
class JobState:
    id: str
    label: str
    status: str = "pending"
    total: int = 0
    progress: int = 0
    last_url: str | None = None
    last_status: str | None = None
    started_at: float = field(default_factory=time.time)
    finished_at: float | None = None
    error: str | None = None
    summary: dict[str, Any] | None = None
    events: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "label": self.label,
            "status": self.status,
            "total": self.total,
            "progress": self.progress,
            "last_url": self.last_url,
            "last_status": self.last_status,
            "started_at": self.started_at,
            "finished_at": self.finished_at,
            "error": self.error,
            "summary": self.summary,
            "events": self.events[-20:],
        }


_jobs: dict[str, JobState] = {}
_jobs_lock = threading.Lock()


def _record_progress(job: JobState, event: dict[str, Any]) -> None:
    with _jobs_lock:
        job.total = event.get("total", job.total)
        job.progress = event.get("index", job.progress)
        job.last_url = event.get("url")
        job.last_status = event.get("status")
        phone = event.get("phone") or {}
        job.events.append(
            {
                "index": event.get("index"),
                "total": event.get("total"),
                "url": event.get("url"),
                "status": event.get("status"),
                "name": phone.get("name") if isinstance(phone, dict) else None,
            }
        )


def _run_job(
    job: JobState,
    *,
    brand: str | None,
    url: str | None,
    all_brands: bool,
    output: str,
    limit: int | None,
    resume: bool,
) -> None:
    try:
        with _jobs_lock:
            job.status = "running"
        result = scrape(
            brand=brand,
            url=url,
            all_brands=all_brands,
            output=output,
            limit=limit,
            resume=resume,
            progress=lambda e: _record_progress(job, e),
        )
        with _jobs_lock:
            job.status = "complete"
            job.summary = result.summary()
            job.finished_at = time.time()
    except Exception as exc:  # noqa: BLE001
        with _jobs_lock:
            job.status = "error"
            job.error = str(exc)
            job.finished_at = time.time()


# ---------------------------------------------------------------------------
# Flask app factory
# ---------------------------------------------------------------------------


def create_app() -> Flask:
    config.ensure_dirs()
    config.setup_logging()

    app = Flask(__name__, template_folder="templates", static_folder="static")
    app.config["MAX_CONTENT_LENGTH"] = 1 * 1024 * 1024  # 1 MB form payload cap.

    @app.route("/")
    def index() -> str:
        return render_template(
            "index.html",
            files=_list_output_files(),
            jobs=sorted(_jobs.values(), key=lambda j: j.started_at, reverse=True),
            default_brand_limit=config.DEFAULT_BRAND_LIMIT,
        )

    @app.post("/api/scrape")
    def api_scrape():
        payload = request.get_json(silent=True) or request.form.to_dict()
        brand = (payload.get("brand") or "").strip() or None
        url = (payload.get("url") or "").strip() or None
        all_brands = str(payload.get("all", "")).lower() in {"1", "true", "on", "yes"}
        output = (payload.get("output") or "json").lower()
        if output not in {"json", "csv", "both"}:
            return jsonify({"error": "output must be json, csv or both"}), 400
        try:
            limit_raw = payload.get("limit")
            limit = int(limit_raw) if limit_raw not in (None, "", "0") else None
        except (TypeError, ValueError):
            return jsonify({"error": "limit must be an integer"}), 400
        resume = str(payload.get("resume", "")).lower() in {"1", "true", "on", "yes"}

        provided = sum(bool(x) for x in (brand, url, all_brands))
        if provided != 1:
            return (
                jsonify(
                    {"error": "provide exactly one of brand, url, or all"}
                ),
                400,
            )

        if (brand or all_brands) and limit is None:
            # Web UI default: pull a meaningful batch (≥50 phones by default,
            # configurable via DEFAULT_BRAND_LIMIT env var) so a single click
            # produces a useful dataset without typing a number every time.
            limit = config.DEFAULT_BRAND_LIMIT

        job_id = uuid.uuid4().hex[:12]
        label = brand or (url or "all")
        job = JobState(id=job_id, label=label)
        with _jobs_lock:
            _jobs[job_id] = job

        thread = threading.Thread(
            target=_run_job,
            kwargs={
                "job": job,
                "brand": brand,
                "url": url,
                "all_brands": all_brands,
                "output": output,
                "limit": limit,
                "resume": resume,
            },
            daemon=True,
        )
        thread.start()
        return jsonify({"job_id": job_id, "status_url": url_for("api_job", job_id=job_id)})

    @app.get("/api/jobs/<job_id>")
    def api_job(job_id: str):
        job = _jobs.get(job_id)
        if job is None:
            abort(404)
        return jsonify(job.to_dict())

    @app.get("/api/files")
    def api_files():
        return jsonify({"files": _list_output_files()})

    @app.get("/api/files/<path:filename>")
    def api_file_preview(filename: str):
        path = (config.OUTPUT_DIR / filename).resolve()
        if not _is_inside(path, config.OUTPUT_DIR) or not path.exists():
            abort(404)
        if path.suffix.lower() == ".json":
            try:
                with path.open("r", encoding="utf-8") as fh:
                    data = json.load(fh)
            except Exception as exc:  # noqa: BLE001
                return jsonify({"error": str(exc)}), 500
            return jsonify(data[:50] if isinstance(data, list) else data)
        if path.suffix.lower() == ".csv":
            with path.open("r", encoding="utf-8-sig") as fh:
                head = "".join(fh.readline() for _ in range(20))
            return jsonify({"preview": head})
        abort(415)

    @app.get("/download/<path:filename>")
    def download(filename: str):
        path = (config.OUTPUT_DIR / filename).resolve()
        if not _is_inside(path, config.OUTPUT_DIR) or not path.exists():
            abort(404)
        return send_from_directory(
            directory=str(config.OUTPUT_DIR),
            path=filename,
            as_attachment=True,
        )

    @app.get("/healthz")
    def healthz():
        return {"ok": True}

    return app


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _list_output_files() -> list[dict[str, Any]]:
    config.ensure_dirs()
    items: list[dict[str, Any]] = []
    for path in sorted(config.OUTPUT_DIR.glob("*"), key=lambda p: p.stat().st_mtime, reverse=True):
        if not path.is_file():
            continue
        if path.name.startswith("."):
            continue
        stat = path.stat()
        items.append(
            {
                "name": path.name,
                "size": stat.st_size,
                "modified": stat.st_mtime,
                "ext": path.suffix.lstrip("."),
            }
        )
    return items


def _is_inside(child: Path, parent: Path) -> bool:
    try:
        child.resolve().relative_to(parent.resolve())
        return True
    except ValueError:
        return False


# ``flask --app webapp.app run`` convenience entry-point.
app = create_app()
