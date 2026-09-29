"""AI chat that drafts any supported document: POST /api/chat.

The backend is stateless: each request carries the whole conversation and the current
draft (the chosen document, its key-term values, and both parties). One structured-output
LLM call returns the assistant's reply plus the document it chose and any values it
extracted, which are merged into the draft returned to the client.
"""

import json
import logging
import os
from collections.abc import Callable
from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from .documents import DOCUMENTS, REGISTRY, CamelModel, DocumentSpec

logger = logging.getLogger(__name__)

# Google Gemini via LiteLLM, using GEMINI_API_KEY from Google AI Studio. Free-tier quotas
# are per model (gemini-2.5-flash allows only 20 requests a day), so when a model is
# rate-limited or unavailable the next one is tried.
MODELS = ("gemini/gemini-2.5-flash", "gemini/gemini-3.5-flash-lite")


class QuotaExceeded(Exception):
    """Every model is rate-limited (e.g. the free tier's daily quota is used up)."""


# ---------------------------------------------------------------------------
# The draft, as held by the frontend


class Party(CamelModel):
    name: str = ""
    title: str = ""
    company: str = ""
    notice_address: str = ""


class Draft(CamelModel):
    document_id: str | None = None
    fields: dict[str, str] = {}  # Key-term values, keyed by FieldSpec.key.
    party1: Party = Party()
    party2: Party = Party()


# ---------------------------------------------------------------------------
# Structured output of the LLM. Every field is required but nullable, as strict
# structured outputs require; null means "no change".


class FieldUpdate(CamelModel):
    key: str
    value: str


class PartyUpdates(CamelModel):
    name: str | None
    title: str | None
    company: str | None
    notice_address: str | None


class ChatTurn(CamelModel):
    reply: str
    document_id: str | None
    field_updates: list[FieldUpdate]
    party1: PartyUpdates | None
    party2: PartyUpdates | None


def apply_turn(draft: Draft, turn: ChatTurn) -> Draft:
    """Returns `draft` with the turn's document choice and non-null values applied.

    Choosing a different document keeps the parties and the key terms both documents
    share (e.g. Governing Law); the rest start empty. Unknown documents, unknown keys, and
    invalid values are ignored.
    """
    data = draft.model_dump()
    if turn.document_id in REGISTRY and turn.document_id != draft.document_id:
        data["document_id"] = turn.document_id
        new_keys = {f.key for f in REGISTRY[turn.document_id].fields}
        data["fields"] = {k: v for k, v in data["fields"].items() if k in new_keys}
    spec = REGISTRY.get(data["document_id"])
    if spec is None:
        return Draft.model_validate(data)  # Nothing to fill in until a document is chosen.

    for update in turn.field_updates:
        field = spec.field(update.key)
        if field is None:
            continue
        value = update.value.strip()
        if field.kind == "date" and value:
            value = _iso_date(value)
            if value is None:
                continue
        if value or not field.required:  # Only optional values may be cleared.
            data["fields"][field.key] = value
    for key in ("party1", "party2"):
        party_updates = getattr(turn, key)
        if party_updates is not None:
            changes = party_updates.model_dump(exclude_none=True)
            # An empty string must never wipe a value the user has already given.
            data[key].update({k: v.strip() for k, v in changes.items() if v.strip()})
    return Draft.model_validate(data)


def _iso_date(text: str) -> str | None:
    """Normalizes a date to YYYY-MM-DD, or returns None if it isn't one."""
    try:
        return date.fromisoformat(text).isoformat()
    except ValueError:
        logger.warning("Ignoring invalid date from the model: %r", text)
        return None


# ---------------------------------------------------------------------------
# Prompt

SYSTEM_PROMPT = """\
You are Prelegal's assistant. Through a friendly conversation, you help the user draft a \
legal agreement from Common Paper's standard templates. The Standard Terms of each \
document are fixed; you collect the values for its Key Terms and the details of both parties.

Documents you can draft (documentId: name - description):
{catalog}

Rules:
- Set `documentId` to the id of the document the user wants as soon as it is clear which \
one fits; ask a clarifying question first only if several documents could fit. Otherwise \
set it to null.
- If the user asks for a document that is not in the list, say plainly that you can't \
generate it, then always name the closest document(s) from the list, explain in a sentence \
how each could help (or why none fits well), and ask whether they'd like to draft one. Set \
`documentId` only once they agree.
- If the user seems to want a different document once values have been collected, confirm \
first, and switch (set `documentId` to it) only when they clearly want to. Party details and \
the key terms both documents share carry over; the rest start empty.
- Set values only when the user has stated or clearly confirmed them. Leave everything else \
out of `fieldUpdates` and use null for unchanged parties or party details. Never invent \
names, companies, addresses, amounts, places, or dates.
- If the user corrects a value, set the corrected value.
- Convert relative dates such as "today" or "next Monday" to YYYY-MM-DD. Today is {today}.
- Keep replies short, friendly, and in plain text without markdown. You may briefly explain \
what a term means and mention its example as an illustration, but the choice is the user's: \
do not recommend values or give legal advice, and if they ask whether terms suit them, \
suggest having a lawyer review the document.

{document}"""

NO_DOCUMENT = """\
No document has been chosen yet. Find out what the user needs: ask what kind of agreement \
they want, or what they are trying to do, and recommend the best fit from the list. Leave \
`fieldUpdates` empty and set party1 and party2 to null until a document is chosen."""

DOCUMENT = """\
Current document: {name} (documentId "{id}").

Parties: party1 is the {role1} and party2 is the {role2}. For each, collect name (the person \
signing), title (optional), company, and noticeAddress (email or postal address for legal \
notices).

Key terms (`fieldUpdates` keys):
{fields}

Guide the user through the missing values one topic at a time (at most two short questions), \
in the order listed, then the parties. Mention optional terms briefly and move on if the user \
doesn't need them. Once every required key term and each party's name, company, and \
noticeAddress are set, briefly summarize and tell the user they can download the PDF.

Current values (empty strings are missing):
{values}"""


def build_system_prompt(draft: Draft, today: date) -> str:
    catalog = "\n".join(f"- {d.id}: {d.name} - {d.description}" for d in DOCUMENTS)
    spec = REGISTRY.get(draft.document_id or "")
    document = NO_DOCUMENT if spec is None else _document_prompt(spec, draft)
    return SYSTEM_PROMPT.format(catalog=catalog, today=today.isoformat(), document=document)


def _document_prompt(spec: DocumentSpec, draft: Draft) -> str:
    fields = "\n".join(
        f"- {f.key} ({f.label}; {'required' if f.required else 'optional'}"
        f"{'; YYYY-MM-DD' if f.kind == 'date' else ''}): {f.description}"
        + (f' For example: "{f.example}".' if f.example else "")
        for f in spec.fields
    )
    values = {
        "fields": {f.key: draft.fields.get(f.key, "") for f in spec.fields},
        "party1": draft.party1.model_dump(by_alias=True),
        "party2": draft.party2.model_dump(by_alias=True),
    }
    return DOCUMENT.format(
        name=spec.name,
        id=spec.id,
        role1=spec.roles[0],
        role2=spec.roles[1],
        fields=fields,
        values=json.dumps(values, indent=2),
    )


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=1000)
    draft: Draft
    today: date | None = None  # The user's local date; defaults to the server's.


class ChatResponse(BaseModel):
    reply: str
    draft: Draft


# Only the most recent messages are sent to the model; the current values in the system
# prompt carry everything collected earlier.
MAX_HISTORY = 40


def build_messages(request: ChatRequest, draft: Draft | None = None) -> list[dict[str, str]]:
    """The model's input: the system prompt for `draft` (default: the request's) and history."""
    system = build_system_prompt(draft or request.draft, request.today or date.today())
    history = [m.model_dump() for m in request.messages[-MAX_HISTORY:]]
    return [{"role": "system", "content": system}] + history


# ---------------------------------------------------------------------------
# LLM access

ChatModel = Callable[[list[dict[str, str]]], ChatTurn]


def gemini_chat_model(messages: list[dict[str, str]]) -> ChatTurn:
    """Gemini with Structured Outputs, falling back through MODELS on failure."""
    from litellm.exceptions import RateLimitError  # Imported lazily: litellm is slow to import.

    errors: list[Exception] = []
    for model in MODELS:
        try:
            return _complete(model, messages)
        except Exception as e:
            logger.warning("%s failed (%s)", model, type(e).__name__)
            errors.append(e)
    if all(isinstance(e, RateLimitError) for e in errors):
        raise QuotaExceeded from errors[-1]
    raise errors[-1]


def _complete(model: str, messages: list[dict[str, str]]) -> ChatTurn:
    from litellm import completion

    response = completion(
        model=model,
        messages=messages,
        response_format=ChatTurn,
        reasoning_effort="low",
        timeout=30,
        num_retries=1,
    )
    return ChatTurn.model_validate_json(response.choices[0].message.content)


def get_chat_model() -> ChatModel:
    if not os.environ.get("GEMINI_API_KEY"):
        raise HTTPException(
            status_code=503,
            detail="The AI assistant is not configured (GEMINI_API_KEY is missing).",
        )
    return gemini_chat_model


def _ask(model: ChatModel, messages: list[dict[str, str]]) -> ChatTurn:
    turn = model(messages)
    if not turn.reply.strip():
        raise ValueError("The model returned an empty reply")
    return turn


router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("")
def chat(request: ChatRequest, model: ChatModel = Depends(get_chat_model)) -> ChatResponse:
    try:
        turn = _ask(model, build_messages(request))
    except QuotaExceeded:
        logger.warning("AI chat request failed: every model is rate-limited")
        raise HTTPException(
            status_code=429,
            detail="The AI assistant has reached its usage limit for now. Please try again later.",
        )
    except Exception:
        logger.exception("AI chat request failed")
        raise HTTPException(
            status_code=502,
            detail="The AI assistant is unavailable right now. Please try again.",
        )
    draft = apply_turn(request.draft, turn)
    if draft.document_id != request.draft.document_id:
        turn, draft = _introduce_document(model, request, turn, draft)
    return ChatResponse(reply=turn.reply, draft=draft)


def _introduce_document(
    model: ChatModel, request: ChatRequest, turn: ChatTurn, draft: Draft
) -> tuple[ChatTurn, Draft]:
    """The document was just chosen, but the model hasn't seen its key terms: asks again
    with them so the reply can start guiding the user. Keeps the first turn on failure."""
    try:
        follow_up = _ask(model, build_messages(request, draft))
    except Exception:
        logger.warning("Follow-up for the newly chosen document failed", exc_info=True)
        return turn, draft
    # The document was chosen by the first turn; the follow-up only fills it in.
    follow_up = follow_up.model_copy(update={"document_id": draft.document_id})
    return follow_up, apply_turn(draft, follow_up)
