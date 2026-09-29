"""SQLite storage. The database is temporary: it is recreated on every start."""

import sqlite3
from collections.abc import Iterator
from contextlib import closing
from pathlib import Path

from fastapi import Request

SCHEMA = """
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Documents users have drafted: the draft and its conversation, saved as JSON.
CREATE TABLE drafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    document_id TEXT NOT NULL,
    title TEXT NOT NULL,
    draft TEXT NOT NULL,
    messages TEXT NOT NULL,
    -- ISO 8601 UTC with milliseconds, so the most recently updated draft sorts first.
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX drafts_by_user ON drafts (user_id, updated_at);
"""


def init_db(path: Path) -> None:
    """Deletes any existing database at `path` and creates a fresh, empty one."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.unlink(missing_ok=True)
    with closing(connect(path)) as conn:
        conn.executescript(SCHEMA)


def connect(path: Path) -> sqlite3.Connection:
    # FastAPI may run a request's dependencies and endpoint on different threads; each
    # connection is still used by one request at a time.
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def get_db(request: Request) -> Iterator[sqlite3.Connection]:
    """FastAPI dependency: a connection for the duration of one request."""
    with closing(connect(request.app.state.settings.database_path)) as conn:
        yield conn
