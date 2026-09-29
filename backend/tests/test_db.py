import sqlite3
from contextlib import closing

import pytest
from fastapi.testclient import TestClient

from prelegal_backend.db import connect, init_db
from prelegal_backend.main import create_app


def insert_user(path, email="ada@example.com"):
    with closing(connect(path)) as conn, conn:
        conn.execute(
            "INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)",
            (email, "Ada", "x"),
        )


def user_count(path) -> int:
    with closing(connect(path)) as conn:
        return conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]


def test_init_db_creates_users_table(tmp_path):
    path = tmp_path / "nested" / "prelegal.db"

    init_db(path)

    with closing(connect(path)) as conn:
        columns = [row["name"] for row in conn.execute("PRAGMA table_info(users)")]
    assert columns == ["id", "email", "name", "password_hash", "created_at"]
    assert user_count(path) == 0


def test_init_db_starts_from_scratch(tmp_path):
    path = tmp_path / "prelegal.db"
    init_db(path)
    insert_user(path)

    init_db(path)

    assert user_count(path) == 0


def test_user_emails_are_unique_ignoring_case(tmp_path):
    path = tmp_path / "prelegal.db"
    init_db(path)
    insert_user(path, "ada@example.com")

    with pytest.raises(sqlite3.IntegrityError):
        insert_user(path, "ADA@example.com")


def test_app_startup_recreates_database(settings):
    init_db(settings.database_path)
    insert_user(settings.database_path)

    with TestClient(create_app(settings)):
        assert user_count(settings.database_path) == 0
