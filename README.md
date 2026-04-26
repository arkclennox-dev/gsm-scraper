# GSMArena Scraper

A Python scraper + lightweight Flask web app that extracts smartphone specifications from [GSMArena](https://www.gsmarena.com) and persists them as JSON / CSV in the exact target schema defined in `PRD_GSMArena_Scraper.md`.

## Features

- CLI with `--brand`, `--url`, `--all`, `--output`, `--limit`, `--resume` flags (PRD §4.1).
- Anti-bot fetcher: rotating User-Agents, randomized delays, exponential backoff on 429/503/403, sequential requests only (PRD §7).
- Parser → transformer → validator pipeline that produces records matching the JSON schema in PRD §5 (Indonesian translations included).
- JSON + CSV writers with checkpoint resume support.
- Optional Flask UI for triggering scrapes, watching live progress, and downloading outputs.
- Pytest suite covering fetch retries, parsing, transformation, storage, and the web app.

## Layout

```
gsm-scraper/
├── scraper/            # fetcher, parser, transformer, storage, runner, utils
├── webapp/             # Flask UI (templates, static, app factory)
├── tests/              # pytest suite + saved HTML fixture
├── data/output/        # generated JSON / CSV files (gitignored)
├── data/checkpoint/    # resume checkpoints (gitignored)
├── config.py           # env-driven configuration
├── main.py             # CLI entry point
├── requirements.txt
└── .env.example
```

## Setup

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # tweak DELAY_MIN / DELAY_MAX / LOG_LEVEL etc.
```

## CLI usage

```bash
# Scrape Samsung phones, JSON + CSV, cap at 50 phones
python main.py --brand samsung --output both --limit 50

# Scrape a single phone by URL
python main.py --url https://www.gsmarena.com/samsung_galaxy_s25_ultra-12821.php --output json

# Scrape every brand (sequential, slow); resume from checkpoint
python main.py --all --resume --output csv
```

Outputs land in `data/output/phones_<brand>_<timestamp>.{json,csv}`. Checkpoints live in `data/checkpoint/checkpoint_<brand>.txt`.

## Web app

```bash
flask --app webapp.app run --port 5000
# or
python -m flask --app webapp.app run --port 5000
```

Then open http://localhost:5000:

- Pick a target (brand, single URL, or all brands), output format, limit, and resume option.
- Progress is polled live via `/api/jobs/<id>`.
- Generated files appear under "Output files" with download links.

When you submit a brand or `all brands` scrape from the UI without specifying a limit, the app defaults to **50 phones per run** (configurable via the `DEFAULT_BRAND_LIMIT` env var). Submit an explicit `Limit` value to override. The CLI keeps `--limit` opt-in: omit it to scrape every phone the brand listing exposes.

## Output schema

Every record matches PRD §5 exactly — top-level keys (`name`, `brand`, `category`, `description`, `rating`, `coverImage`, `published`, `specs`) are always present, with missing values explicitly set to `null`. Indonesian translations are applied for months, statuses, NFC/IR/jack flags, and card-slot wording.

## Testing

```bash
pytest tests/ -v
```

Eight tests cover the deliverables checklist in PRD §11 (fetch happy path, fetch retry, HTML parsing fixture, complete/partial transformation, JSON/CSV writers with UTF-8-BOM, checkpoint round-trip, web app smoke).

## Anti-bot policy

- All requests share a single `requests.Session` for cookies and connection reuse.
- `User-Agent` is rotated per request via `fake-useragent` (with a small offline fallback pool).
- Random sleep `random.uniform(DELAY_MIN, DELAY_MAX)` between requests.
- HTTP 429 honors `Retry-After`; 403/503 trigger exponential backoff (2s → 32s) up to `MAX_RETRIES`.
- No `asyncio` / no concurrent requests. Respect `robots.txt`.

## Acceptance criteria (PRD §13)

- [x] Each JSON object matches the PRD §5 schema exactly.
- [x] Missing values are explicit `null`, never `""`.
- [x] Indonesian translations applied (month, status, Yes/No, card slot).
- [x] `--resume` skips already-scraped phones via checkpoint files.
- [x] All 8 unit tests pass: `pytest tests/ -v`.
- [x] No unhandled exceptions crash the run; errors are logged and skipped.

## Notes

- The shipped fixture HTML in `tests/fixtures/` is a synthetic but structurally faithful sample so tests are deterministic and run offline.
- Live scraping requires outbound HTTPS access to `gsmarena.com` and the `fake-useragent` dataset (with a built-in offline fallback if blocked).
