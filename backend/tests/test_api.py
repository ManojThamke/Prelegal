import json

from prelegal_backend.config import REPO_ROOT


def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_list_templates_covers_the_whole_catalog(client):
    catalog = json.loads((REPO_ROOT / "catalog.json").read_text(encoding="utf-8"))

    response = client.get("/api/templates")

    assert response.status_code == 200
    templates = response.json()
    assert [t["name"] for t in templates] == [t["name"] for t in catalog["templates"]]
    assert all(set(t) == {"id", "name", "description"} for t in templates)
    assert {"mutual-nda", "mutual-nda-coverpage", "csa", "ai-addendum"} <= {
        t["id"] for t in templates
    }


def test_every_catalog_template_can_be_fetched(client):
    for summary in client.get("/api/templates").json():
        response = client.get(f"/api/templates/{summary['id']}")
        assert response.status_code == 200, summary["id"]
        assert response.json()["content"].strip(), summary["id"]


def test_get_template_returns_markdown(client):
    response = client.get("/api/templates/mutual-nda")

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Mutual Non-Disclosure Agreement"
    assert "**Introduction**" in body["content"]


def test_unknown_template_is_404(client):
    response = client.get("/api/templates/does-not-exist")
    assert response.status_code == 404
    assert "does-not-exist" in response.json()["detail"]


def test_template_ids_cannot_escape_the_catalog(client):
    assert client.get("/api/templates/..%2Fcatalog").status_code == 404
    assert client.get("/api/templates/../../catalog.json").status_code == 404


def test_unknown_api_path_is_json_404(client):
    response = client.get("/api/nope")
    assert response.status_code == 404
    assert response.json() == {"detail": "Not found"}
