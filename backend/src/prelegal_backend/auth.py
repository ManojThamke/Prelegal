"""Accounts and sessions: /api/auth.

Passwords are hashed with scrypt. Signing in creates a random session token, kept in the
sessions table and sent to the browser in an HttpOnly cookie.
"""

import hashlib
import hmac
import re
import secrets
import sqlite3

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field, field_validator

from .db import get_db
from .documents import CamelModel

SESSION_COOKIE = "prelegal_session"
SESSION_MAX_AGE = 30 * 24 * 60 * 60  # 30 days (the database resets on restart anyway).
# SQL condition for sessions older than SESSION_MAX_AGE.
_EXPIRED = f"sessions.created_at < datetime('now', '-{SESSION_MAX_AGE} seconds')"

# scrypt parameters (N=2^14, r=8, p=1): ~16 MB and tens of milliseconds per hash.
_SCRYPT = {"n": 2**14, "r": 8, "p": 1}


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, **_SCRYPT)
    return f"scrypt${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    _, salt, digest = stored.split("$")
    candidate = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), **_SCRYPT)
    return hmac.compare_digest(candidate.hex(), digest)


# Checked when no account matches the email (see sign_in).
_DUMMY_HASH = hash_password(secrets.token_urlsafe(16))


class User(CamelModel):
    id: int
    name: str
    email: str


_EMAIL = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class Credentials(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(min_length=1, max_length=200)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, email: str) -> str:
        email = email.strip().lower()
        if not _EMAIL.match(email):
            raise ValueError("Enter a valid email address")
        return email


class SignUp(Credentials):
    name: str = Field(max_length=100)
    password: str = Field(min_length=8, max_length=200)

    @field_validator("name")
    @classmethod
    def require_name(cls, name: str) -> str:
        if not name.strip():
            raise ValueError("Enter your name")
        return name.strip()


router = APIRouter(prefix="/api/auth", tags=["auth"])


def _start_session(db: sqlite3.Connection, response: Response, user_id: int) -> None:
    token = secrets.token_urlsafe(32)
    with db:
        db.execute(f"DELETE FROM sessions WHERE {_EXPIRED}")  # Tidy up expired sessions.
        db.execute("INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user_id))
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=SESSION_MAX_AGE,
        httponly=True,
        samesite="lax",
        path="/",
    )


@router.post("/signup", status_code=201)
def sign_up(body: SignUp, response: Response, db: sqlite3.Connection = Depends(get_db)) -> User:
    try:
        with db:
            cursor = db.execute(
                "INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)",
                (body.email, body.name, hash_password(body.password)),
            )
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    _start_session(db, response, cursor.lastrowid)
    return User(id=cursor.lastrowid, name=body.name, email=body.email)


@router.post("/signin")
def sign_in(body: Credentials, response: Response, db: sqlite3.Connection = Depends(get_db)) -> User:
    row = db.execute("SELECT * FROM users WHERE email = ?", (body.email,)).fetchone()
    # Check a password even when there's no such account, so unknown emails take as long
    # to reject as wrong passwords (no account enumeration by timing).
    valid = verify_password(body.password, row["password_hash"] if row else _DUMMY_HASH)
    if row is None or not valid:
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    _start_session(db, response, row["id"])
    return User(id=row["id"], name=row["name"], email=row["email"])


@router.post("/signout", status_code=204)
def sign_out(request: Request, response: Response, db: sqlite3.Connection = Depends(get_db)) -> None:
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        with db:
            db.execute("DELETE FROM sessions WHERE token = ?", (token,))
    response.delete_cookie(SESSION_COOKIE, path="/")


def current_user(request: Request, db: sqlite3.Connection = Depends(get_db)) -> User:
    """FastAPI dependency: the signed-in user, or 401."""
    token = request.cookies.get(SESSION_COOKIE)
    row = token and db.execute(
        "SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id "
        f"WHERE token = ? AND NOT ({_EXPIRED})",
        (token,),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Please sign in.")
    return User(id=row["id"], name=row["name"], email=row["email"])


@router.get("/me")
def me(user: User = Depends(current_user)) -> User:
    return user
