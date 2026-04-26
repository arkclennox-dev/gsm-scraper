"""GSMArena scraper CLI entry point.

Usage examples (see ``README.md`` for the full reference):

    python main.py --brand samsung --output both --limit 50
    python main.py --url https://www.gsmarena.com/samsung_galaxy_s25_ultra-12821.php
    python main.py --all --resume --output csv
"""

from __future__ import annotations

import argparse
import sys

import config
from scraper.runner import scrape


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Scrape GSMArena phone specifications.",
    )
    target = parser.add_mutually_exclusive_group(required=True)
    target.add_argument("--brand", help="Scrape all phones from a specific brand")
    target.add_argument("--url", help="Scrape a single phone by GSMArena URL")
    target.add_argument(
        "--all",
        action="store_true",
        dest="all_brands",
        help="Scrape every brand on GSMArena (slow!)",
    )

    parser.add_argument(
        "--output",
        choices=("json", "csv", "both"),
        default="json",
        help="Output format (default: json)",
    )
    parser.add_argument(
        "--limit", type=int, default=None, help="Maximum number of phones to scrape"
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Skip URLs already present in the checkpoint file",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    config.setup_logging()
    args = _build_parser().parse_args(argv)
    result = scrape(
        brand=args.brand,
        url=args.url,
        all_brands=args.all_brands,
        output=args.output,
        limit=args.limit,
        resume=args.resume,
    )
    summary = result.summary()
    print(
        "Done in {duration_seconds}s — scraped {scraped}, "
        "skipped {skipped}, failed {failed}".format(**summary)
    )
    if summary["json_path"]:
        print(f"JSON: {summary['json_path']}")
    if summary["csv_path"]:
        print(f"CSV:  {summary['csv_path']}")
    return 0 if not result.failed else 1


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
