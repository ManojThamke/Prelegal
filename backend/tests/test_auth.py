import pytest

from prelegal_backend.auth import SESSION_COOKIE, hash_password, verify_password

from .conftest import sign_up


def test_password_hashing():
    stored = hash_password("correct horse")

    assert stored.startswith("scrypt$")
    assert "correct horse" not in stored
    assert verify_password("correct horse", stored)
    assert not verify_password("wrong horse", stored)
    assert hash_password("correct horse") != stored  # Salted.


def test_sign_up_signs_the_user_in(client):
    user = sign_up(client, email=" Ada@Acme.TEST ")

    assert user == {"id": 1, "name": "Ada Lovelace", "email": "ada@acme.test"}
    assert client.get("/api/auth/me").json() == user


def test_session_cookie_is_http_only(client):
    response = client.post(
        "/api/auth/signup", json={"email": "ada@acme.test", "name": "Ada", "password": "password1"}
    )
    cookie = response.headers["set-cookie"]
    assert cookie.startswith(f"{SESSION_COOKIE}=")
    assert "HttpOnly" in cookie
    assert "SameSite=lax" in cookie


def test_duplicate_email_is_409(client):
    sign_up(client)
    client.post("/api/auth/signout")

    response = client.post(
        "/api/auth/signup", json={"email": "ADA@acme.test", "name": "Ada", "password": "password1"}
    )

    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


@pytest.mark.parametrize(
    "body",
    [
        {"email": "not-an-email", "name": "Ada", "password": "password1"},
        {"email": "ada@acme.test", "name": "  ", "password": "password1"},
        {"email": "ada@acme.test", "name": "Ada", "password": "short"},
    ],
)
def test_sign_up_validation(client, body):
    assert client.post("/api/auth/signup", json=body).status_code == 422


def test_sign_in_and_out(client):
    sign_up(client)
    client.post("/api/auth/signout")
    assert client.get("/api/auth/me").status_code == 401

    response = client.post("/api/auth/signin", json={"email": "ada@acme.test", "password": "correct horse"})

    assert response.status_code == 200
    assert response.json()["name"] == "Ada Lovelace"
    assert client.get("/api/auth/me").status_code == 200


@pytest.mark.parametrize(
    "credentials",
    [
        {"email": "ada@acme.test", "password": "wrong horse"},
        {"email": "nobody@acme.test", "password": "correct horse"},
    ],
)
def test_sign_in_with_wrong_credentials_is_401(client, credentials):
    sign_up(client)
    client.post("/api/auth/signout")

    response = client.post("/api/auth/signin", json=credentials)

    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password."


def test_sign_out_invalidates_the_session(client):
    sign_up(client)
    token = client.cookies.get(SESSION_COOKIE)

    client.post("/api/auth/signout")
    client.cookies.set(SESSION_COOKIE, token)  # Replaying the old cookie doesn't work.

    assert client.get("/api/auth/me").status_code == 401


def test_me_requires_a_session(client):
    assert client.get("/api/auth/me").status_code == 401
    client.cookies.set(SESSION_COOKIE, "forged")
    assert client.get("/api/auth/me").status_code == 401


def test_expired_sessions_are_rejected(client, settings):
    from contextlib import closing

    from prelegal_backend.db import connect

    sign_up(client)
    with closing(connect(settings.database_path)) as db, db:
        db.execute("UPDATE sessions SET created_at = datetime('now', '-31 days')")

    assert client.get("/api/auth/me").status_code == 401
