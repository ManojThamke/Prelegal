import time
from contextlib import closing

import pytest

from prelegal_backend.auth import User
from prelegal_backend.db import connect
from prelegal_backend.documents import REGISTRY
from prelegal_backend.drafts import ChatMessage, Draft, is_complete, save_draft, title_for

from .conftest import sign_up

MESSAGES = [ChatMessage(role="user", content="Hi"), ChatMessage(role="assistant", content="Hello")]


def save(settings, user_id, draft, draft_id=None):
    with closing(connect(settings.database_path)) as db:
        return save_draft(db, User(id=user_id, name="", email=""), draft_id, draft, MESSAGES)


def test_title_names_the_document_and_companies():
    csa = REGISTRY["csa"]
    assert title_for(csa, Draft(document_id="csa")) == "Cloud Service Agreement"
    draft = Draft(document_id="csa", party1={"company": "Acme"}, party2={"company": "Globex"})
    assert title_for(csa, draft) == "Cloud Service Agreement for Acme and Globex"


def test_is_complete_needs_required_terms_and_parties():
    pilot = REGISTRY["pilot-agreement"]
    fields = {f.key: "x" for f in pilot.fields if f.required}
    party = {"name": "A", "company": "B", "notice_address": "c@d.e"}

    assert not is_complete(pilot, Draft(document_id="pilot-agreement", fields=fields, party1=party))
    assert is_complete(pilot, Draft(document_id="pilot-agreement", fields=fields, party1=party, party2=party))


def test_list_get_and_delete_own_drafts(client, settings, signed_in):
    first = save(settings, signed_in["id"], Draft(document_id="csa", party2={"company": "Globex"}))
    second = save(settings, signed_in["id"], Draft(document_id="sla"))
    time.sleep(0.01)  # Timestamps have millisecond precision.
    update = Draft(document_id="csa", fields={"fees": "$1"}, party2={"company": "Globex"})
    save(settings, signed_in["id"], update, draft_id=first)

    listed = client.get("/api/drafts").json()
    assert [d["id"] for d in listed] == [first, second]  # Most recently updated first.
    assert listed[0] | {"createdAt": None, "updatedAt": None} == {
        "id": first,
        "documentId": "csa",
        "documentName": "Cloud Service Agreement",
        "title": "Cloud Service Agreement for Globex",
        "complete": False,
        "createdAt": None,
        "updatedAt": None,
    }
    assert listed[0]["updatedAt"].endswith("Z")

    saved = client.get(f"/api/drafts/{first}").json()
    assert saved["draft"]["fields"] == {"fees": "$1"}
    assert saved["messages"] == [m.model_dump() for m in MESSAGES]

    assert client.delete(f"/api/drafts/{first}").status_code == 204
    assert [d["id"] for d in client.get("/api/drafts").json()] == [second]
    assert client.get(f"/api/drafts/{first}").status_code == 404


def test_drafts_are_private(client, settings, signed_in):
    draft_id = save(settings, signed_in["id"], Draft(document_id="csa"))
    client.post("/api/auth/signout")
    sign_up(client, email="eve@evil.test", name="Eve")

    assert client.get("/api/drafts").json() == []
    assert client.get(f"/api/drafts/{draft_id}").status_code == 404
    assert client.delete(f"/api/drafts/{draft_id}").status_code == 404
    # Saving to someone else's draft id creates the saver's own draft instead.
    assert save(settings, 2, Draft(document_id="sla"), draft_id=draft_id) != draft_id
    client.post("/api/auth/signout")
    client.post("/api/auth/signin", json={"email": "ada@acme.test", "password": "correct horse"})
    assert client.get(f"/api/drafts/{draft_id}").json()["documentId"] == "csa"


def test_drafts_require_sign_in(client):
    assert client.get("/api/drafts").status_code == 401
    assert client.get("/api/drafts/1").status_code == 401
    assert client.delete("/api/drafts/1").status_code == 401


def test_draft_size_limits():
    with pytest.raises(ValueError):
        Draft(fields={"purpose": "x" * 2001})
    with pytest.raises(ValueError):
        Draft(party1={"name": "x" * 501})
    with pytest.raises(ValueError):
        Draft(fields={f"k{i}": "v" for i in range(101)})


def test_deleting_a_user_deletes_their_sessions_and_drafts(client, settings, signed_in):
    save(settings, signed_in["id"], Draft(document_id="csa"))
    with closing(connect(settings.database_path)) as db, db:
        db.execute("DELETE FROM users")
        assert db.execute("SELECT COUNT(*) FROM drafts").fetchone()[0] == 0
        assert db.execute("SELECT COUNT(*) FROM sessions").fetchone()[0] == 0
