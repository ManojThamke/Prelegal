from dataclasses import replace

from fastapi.testclient import TestClient

from prelegal_backend.main import create_app


def test_root_serves_login_page(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "Sign in" in response.text


def test_nested_page_is_served(client):
    response = client.get("/nda/")
    assert response.status_code == 200
    assert "NDA" in response.text


def test_page_without_trailing_slash_redirects(client):
    response = client.get("/nda", follow_redirects=False)
    assert response.status_code in (307, 308)
    assert response.headers["location"].endswith("/nda/")


def test_unknown_page_serves_404_page(client):
    response = client.get("/no-such-page/")
    assert response.status_code == 404
    assert "Not found" in response.text


def test_api_still_works_without_frontend_build(settings, tmp_path):
    settings = replace(settings, static_dir=tmp_path / "missing")
    with TestClient(create_app(settings)) as client:
        assert client.get("/api/health").status_code == 200
        assert client.get("/").status_code == 404
