#!/usr/bin/env python3
"""Safe bootstrap runner for WIFQA autonomous development.

This bootstrap intentionally does not invoke an AI model or edit source code yet.
It provides a durable task ledger and a read-only inspection loop for validating
runtime wiring before a coding engine is added.
"""
from __future__ import annotations

import argparse
import json
import sqlite3
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB = Path(__file__).resolve().parent / "state" / "agent.sqlite3"
CONFIG = Path(__file__).resolve().parent / "config.json"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_config() -> dict:
    return json.loads(CONFIG.read_text(encoding="utf-8"))


def init_db() -> None:
    DB.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB) as db:
        db.execute("""CREATE TABLE IF NOT EXISTS runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            started_at TEXT NOT NULL,
            finished_at TEXT,
            mode TEXT NOT NULL,
            summary TEXT NOT NULL
        )""")
        db.execute("""CREATE TABLE IF NOT EXISTS checkpoints (
            key TEXT PRIMARY PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )""")
        db.commit()


def run_readonly(command: list[str], cwd: Path = ROOT) -> tuple[int, str]:
    proc = subprocess.run(command, cwd=cwd, capture_output=True, text=True, timeout=60)
    return proc.returncode, (proc.stdout + proc.stderr).strip()


def inspect_repo() -> dict:
    result = {}
    for label, cmd in {
        "git_status": ["git", "status", "--short", "--branch"],
        "git_branches": ["git", "branch", "--list"],
    }.items():
        code, output = run_readonly(cmd)
        result[label] = {"exit_code": code, "output": output}
    result["repo_root"] = str(ROOT)
    result["checked_at"] = utc_now()
    return result


def record_run(mode: str, summary: str) -> None:
    with sqlite3.connect(DB) as db:
        cur = db.execute(
            "INSERT INTO runs(started_at, finished_at, mode, summary) VALUES (?, ?, ?, ?)",
            (utc_now(), utc_now(), mode, summary),
        )
        db.commit()


def main() -> None:
    parser = argparse.ArgumentParser(description="WIFQA safe bootstrap runner")
    parser.add_argument("--once", action="store_true", help="Run one read-only inspection cycle")
    parser.add_argument("--interval", type=int, default=900, help="Polling interval in seconds")
    args = parser.parse_args()
    init_db()
    config = load_config()
    print("WIFQA autonomous bootstrap: read-only mode. Coding engine not connected.")
    while True:
        snapshot = inspect_repo()
        record_run("readonly", json.dumps(snapshot, ensure_ascii=False))
        print(json.dumps(snapshot, ensure_ascii=False, indent=2))
        if args.once:
            break
        time.sleep(max(60, args.interval))


if __name__ == "__main__":
    main()
