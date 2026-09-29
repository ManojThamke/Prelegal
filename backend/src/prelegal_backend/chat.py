"""AI chat that drafts a Mutual NDA: POST /api/chat.

The backend is stateless: each request carries the whole conversation and the current
field values. One structured-output LLM call returns the assistant's reply plus any
field values it extracted, which are merged into the fields returned to the client.
"""

import json
import logging
import os
from collections.abc import Callable, Collection
from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

logger = logging.getLogger(__name__)

# Google Gemini via LiteLLM, using GEMINI_API_KEY from Google AI Studio.
MODEL = "gemini/gemini-2.5-flash"


class CamelModel(BaseModel):
    """Uses the frontend's camelCase JSON keys (see frontend/src/lib/nda.ts)."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


# ---------------------------------------------------------------------------
# Field values, as held by the frontend


class Party(CamelModel):
    name: str = ""
    title: str = ""
    company: str = ""
    notice_address: str = ""


class NdaFields(CamelModel):
    purpose: str = ""
    effective_date: str = ""  # ISO yyyy-mm-dd
    mnda_term_type: Literal["expires", "until-terminated"] = "expires"
    mnda_term_years: str = ""
    confidentiality_type: Literal["years", "perpetual"] = "years"
    confidentiality_years: str = ""
    governing_law: str = ""
    jurisdiction: str = ""
    modifications: str = ""
    party1: Party = Party()
    party2: Party = Party()


# ---------------------------------------------------------------------------
# Structured output of the LLM. Every field is required but nullable, as strict
# structured outputs require; null means "no change".


class PartyUpdates(CamelModel):
    name: str | None
    title: str | None
    company: str | None
    notice_address: str | None


class NdaUpdates(CamelModel):
    purpose: str | None
    effective_date: str | None
    mnda_term_type: Literal["expires", "until-terminated"] | None
    mnda_term_years: int | None
    confidentiality_type: Literal["years", "perpetual"] | None
    confidentiality_years: int | None
    governing_law: str | None
    jurisdiction: str | None
    modifications: str | None
    party1: PartyUpdates | None
    party2: PartyUpdates | None


class ChatTurn(CamelModel):
    reply: str
    updates: NdaUpdates


YEAR_FIELDS = ("mnda_term_years", "confidentiality_years")


def apply_updates(fields: NdaFields, updates: NdaUpdates) -> NdaFields:
    """Returns `fields` with the non-null `updates` applied. Invalid values are ignored."""
    data = fields.model_dump()
    changes = updates.model_dump(exclude={"party1", "party2"}, exclude_none=True)
    for key in YEAR_FIELDS:
        years = changes.pop(key, None)
        if years is not None and years >= 1:
            data[key] = str(years)
    if "effective_date" in changes:
        changes["effective_date"] = _iso_date(changes["effective_date"])
    data.update(_clean(changes, clearable={"modifications"}))
    for key in ("party1", "party2"):
        party_updates = getattr(updates, key)
        if party_updates is not None:
            data[key].update(_clean(party_updates.model_dump(exclude_none=True)))
    return NdaFields.model_validate(data)


def _clean(changes: dict, clearable: Collection[str] = ()) -> dict:
    """Strips strings and drops empty values, except for fields that may be cleared.

    The model should send null for "no change", but an empty string must never wipe a
    value the user has already given.
    """
    cleaned = {}
    for key, value in changes.items():
        if isinstance(value, str):
            value = value.strip()
        if value or (value == "" and key in clearable):
            cleaned[key] = value
    return cleaned


def _iso_date(text: str) -> str | None:
    """Normalizes a date to YYYY-MM-DD, or returns None if it isn't one."""
    try:
        return date.fromisoformat(text.strip()).isoformat()
    except ValueError:
        logger.warning("Ignoring invalid effective date from the model: %r", text)
        return None


# ---------------------------------------------------------------------------
# Prompt

SYSTEM_PROMPT = """\
You are Prelegal's assistant. Through a friendly conversation, you help the user draft a \
Common Paper Mutual Non-Disclosure Agreement (MNDA) by collecting the values for its \
Cover Page. The Standard Terms are fixed and cannot be edited.

Fields (keys of `updates`):
- purpose: how Confidential Information may be used, e.g. "Evaluating a potential partnership".
- effectiveDate: when the MNDA takes effect, as YYYY-MM-DD.
- mndaTermType: "expires" (the MNDA ends mndaTermYears after the Effective Date) or \
"until-terminated" (continues until a party terminates it).
- mndaTermYears: whole number of years; only needed when mndaTermType is "expires".
- confidentialityType: "years" (information protected for confidentialityYears after the \
Effective Date; trade secrets for as long as they remain trade secrets) or "perpetual".
- confidentialityYears: whole number of years; only needed when confidentialityType is "years".
- governingLaw: the US state whose laws govern the MNDA, e.g. "Delaware".
- jurisdiction: city or county and state whose courts hear disputes, e.g. "New Castle, DE".
- modifications: optional changes to the Standard Terms; leave empty unless the user asks.
- party1, party2: each party's name (the person signing), title (optional), company, and \
noticeAddress (email or postal address for legal notices).

Rules:
- In `updates`, set only values the user has stated or clearly confirmed. Use null for \
everything else, including for fields that are unchanged. Never invent names, companies, \
addresses, places, or dates.
- If the user corrects a value, set the corrected value.
- Convert relative dates such as "today" or "next Monday" to YYYY-MM-DD. Today is {today}.
- Ask about one topic at a time (at most two short questions), working through missing \
values in the order listed above. Empty strings in the current values below are missing. \
Values that are already set may be defaults: mention them so the user can change them, \
but don't ask about each one.
- Keep replies short, friendly, and in plain text without markdown. You may briefly explain \
what a field means, but do not give legal advice.
- Once purpose, effectiveDate, the terms, governingLaw, jurisdiction, and each party's \
name, company, and noticeAddress are all set, briefly summarize and tell the user they can \
download the PDF.

Current values:
{fields}"""


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=1000)
    fields: NdaFields
    today: date | None = None  # The user's local date; defaults to the server's.


class ChatResponse(BaseModel):
    reply: str
    fields: NdaFields


# Only the most recent messages are sent to the model; the current field values in the
# system prompt carry everything collected earlier.
MAX_HISTORY = 40


def build_messages(request: ChatRequest) -> list[dict[str, str]]:
    today = request.today or date.today()
    fields = json.dumps(request.fields.model_dump(by_alias=True), indent=2)
    system = SYSTEM_PROMPT.format(today=today.isoformat(), fields=fields)
    history = [m.model_dump() for m in request.messages[-MAX_HISTORY:]]
    return [{"role": "system", "content": system}] + history


# ---------------------------------------------------------------------------
# LLM access

ChatModel = Callable[[list[dict[str, str]]], ChatTurn]


def gemini_chat_model(messages: list[dict[str, str]]) -> ChatTurn:
    """Gemini Flash with Structured Outputs."""
    from litellm import completion  # Imported lazily: litellm is slow to import.

    response = completion(
        model=MODEL,
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


router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("")
def chat(request: ChatRequest, model: ChatModel = Depends(get_chat_model)) -> ChatResponse:
    try:
        turn = model(build_messages(request))
        if not turn.reply.strip():
            raise ValueError("The model returned an empty reply")
    except Exception:
        logger.exception("AI chat request failed")
        raise HTTPException(
            status_code=502,
            detail="The AI assistant is unavailable right now. Please try again.",
        )
    return ChatResponse(reply=turn.reply, fields=apply_updates(request.fields, turn.updates))
