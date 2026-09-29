"""Drafts: the document being drafted, and the user's saved drafts at /api/drafts.

A draft is saved (with its conversation) once the chat has chosen a document, and
updated after every chat turn, so users can come back to it later.
"""

import json
import sqlite3
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field, field_validator

from .auth import User, current_user
from .db import get_db
from .documents import REGISTRY, CamelModel, DocumentSpec

# Size limits, so a client can't store unbounded data.
Value = Annotated[str, Field(max_length=2000)]
Detail = Annotated[str, Field(max_length=500)]


class Party(CamelModel):
    name: Detail = ""
    title: Detail = ""
    company: Detail = ""
    notice_address: Detail = ""


class Draft(CamelModel):
    document_id: str | None = None  # A REGISTRY id, once the chat has chosen a document.
    # Key-term values, keyed by FieldSpec.key.
    fields: dict[Annotated[str, Field(max_length=100)], Value] = Field(default={}, max_length=100)
    party1: Party = Party()
    party2: Party = Party()

    @field_validator("document_id")
    @classmethod
    def known_document(cls, document_id: str | None) -> str | None:
        if document_id is not None and document_id not in REGISTRY:
            raise ValueError(f"Unknown document: {document_id}")
        return document_id


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


def is_complete(spec: DocumentSpec, draft: Draft) -> bool:
    """Whether every required key term and each party's essential details are set."""
    fields = all(draft.fields.get(f.key, "").strip() for f in spec.fields if f.required)
    parties = all(
        p.name.strip() and p.company.strip() and p.notice_address.strip()
        for p in (draft.party1, draft.party2)
    )
    return fields and parties


def title_for(spec: DocumentSpec, draft: Draft) -> str:
    """E.g. "Cloud Service Agreement for Acme Inc and Globex"."""
    companies = " and ".join(c for c in (draft.party1.company.strip(), draft.party2.company.strip()) if c)
    return f"{spec.name} for {companies}" if companies else spec.name


def save_draft(
    db: sqlite3.Connection, user: User, draft_id: int | None, draft: Draft, messages: list[ChatMessage]
) -> int:
    """Updates the user's saved draft `draft_id`, or saves a new one; returns its id.

    If `draft_id` isn't one of the user's drafts (e.g. it was deleted, or the database was
    reset), the draft is saved as a new one rather than failing after the AI has replied.
    """
    spec = REGISTRY[draft.document_id]
    values = (
        draft.document_id,
        title_for(spec, draft),
        draft.model_dump_json(by_alias=True),
        json.dumps([m.model_dump() for m in messages]),
    )
    with db:
        if draft_id is not None:
            cursor = db.execute(
                "UPDATE drafts SET document_id = ?, title = ?, draft = ?, messages = ?, "
                "updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND user_id = ?",
                (*values, draft_id, user.id),
            )
            if cursor.rowcount == 1:
                return draft_id
        cursor = db.execute(
            "INSERT INTO drafts (document_id, title, draft, messages, user_id) VALUES (?, ?, ?, ?, ?)",
            (*values, user.id),
        )
        return cursor.lastrowid


# ---------------------------------------------------------------------------
# /api/drafts


class DraftSummary(CamelModel):
    id: int
    document_id: str
    document_name: str
    title: str
    complete: bool
    created_at: str
    updated_at: str


class SavedDraft(DraftSummary):
    draft: Draft
    messages: list[ChatMessage]


_COLUMNS = "id, document_id, title, draft, messages, created_at, updated_at"


def _saved(row: sqlite3.Row) -> SavedDraft:
    spec = REGISTRY[row["document_id"]]
    draft = Draft.model_validate_json(row["draft"])
    return SavedDraft(
        id=row["id"],
        document_id=spec.id,
        document_name=spec.name,
        title=row["title"],
        complete=is_complete(spec, draft),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        draft=draft,
        messages=json.loads(row["messages"]),
    )


router = APIRouter(prefix="/api/drafts", tags=["drafts"])


@router.get("")
def list_drafts(
    user: User = Depends(current_user), db: sqlite3.Connection = Depends(get_db)
) -> list[DraftSummary]:
    rows = db.execute(
        f"SELECT {_COLUMNS} FROM drafts WHERE user_id = ? ORDER BY updated_at DESC, id DESC",
        (user.id,),
    ).fetchall()
    return [DraftSummary(**_saved(row).model_dump(exclude={"draft", "messages"})) for row in rows]


@router.get("/{draft_id}")
def get_draft(
    draft_id: int, user: User = Depends(current_user), db: sqlite3.Connection = Depends(get_db)
) -> SavedDraft:
    row = db.execute(
        f"SELECT {_COLUMNS} FROM drafts WHERE id = ? AND user_id = ?", (draft_id, user.id)
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Draft not found")
    return _saved(row)


@router.delete("/{draft_id}", status_code=204)
def delete_draft(
    draft_id: int, user: User = Depends(current_user), db: sqlite3.Connection = Depends(get_db)
) -> Response:
    with db:
        cursor = db.execute("DELETE FROM drafts WHERE id = ? AND user_id = ?", (draft_id, user.id))
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Draft not found")
    return Response(status_code=204)
