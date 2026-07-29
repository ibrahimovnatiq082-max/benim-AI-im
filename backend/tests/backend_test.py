"""Backend tests for AI Website Builder: /api/, /api/chat, /api/validate, /api/publish, /api/site/{id}"""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://builder-ai-30.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Health ----------
def test_root(client):
    r = client.get(f"{API}/")
    assert r.status_code == 200
    assert "message" in r.json()


# ---------- Validate ----------
class TestValidate:
    def test_validate_clean_code(self, client):
        payload = {
            "html": "<!DOCTYPE html><html><body><div>Hello</div></body></html>",
            "css": "body { color: red; } div { padding: 10px; }",
            "js": "function hello() { console.log('hi'); }"
        }
        r = client.post(f"{API}/validate", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert data["valid"] is True
        assert data["errors"] == []
        assert data["checked"] == {"html": True, "css": True, "js": True}

    def test_validate_mismatched_css_braces(self, client):
        payload = {"html": "", "css": "body { color: red;", "js": ""}
        r = client.post(f"{API}/validate", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert data["valid"] is False
        assert any("CSS" in e for e in data["errors"])

    def test_validate_mismatched_js_braces(self, client):
        payload = {"html": "", "css": "", "js": "function x() { if (true) { }"}
        r = client.post(f"{API}/validate", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert data["valid"] is False
        assert any("JavaScript" in e for e in data["errors"])

    def test_validate_empty(self, client):
        r = client.post(f"{API}/validate", json={})
        assert r.status_code == 200
        data = r.json()
        assert data["valid"] is True
        assert data["checked"] == {"html": False, "css": False, "js": False}

    def test_validate_html_unclosed_div_warning(self, client):
        payload = {"html": "<!DOCTYPE html><div><div></div>", "css": "", "js": ""}
        r = client.post(f"{API}/validate", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert any("div" in w for w in data["warnings"])


# ---------- Publish + Site retrieval ----------
class TestPublish:
    def test_publish_and_retrieve_site(self, client):
        payload = {
            "html": "<h1>TEST_SITE</h1>",
            "css": "h1 { color: blue; }",
            "js": "console.log('TEST');",
            "title": "TEST_PublishTitle"
        }
        r = client.post(f"{API}/publish", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True
        assert "site_id" in data
        assert data["url"].startswith("/api/site/")
        site_id = data["site_id"]

        # GET the published site
        r2 = client.get(f"{BASE_URL}{data['url']}")
        assert r2.status_code == 200
        html = r2.text
        assert "TEST_SITE" in html
        assert "color: blue" in html
        assert "TEST_PublishTitle" in html
        assert "console.log('TEST')" in html

    def test_get_nonexistent_site(self, client):
        r = client.get(f"{API}/site/nonexistent-xyz-12345")
        assert r.status_code == 404

    def test_publish_empty_still_works(self, client):
        r = client.post(f"{API}/publish", json={"title": "TEST_Empty"})
        assert r.status_code == 200
        assert r.json()["success"] is True


# ---------- Chat error handling ----------
class TestChat:
    def test_chat_invalid_api_key_streams_error(self, client):
        payload = {
            "messages": [{"role": "user", "content": "Hello"}],
            "api_key": "sk-invalid-test-key-000",
            "provider": "openai",
            "model": "gpt-4o"
        }
        # Streaming response; verify status and that stream contains an error event
        with client.post(f"{API}/chat", json=payload, stream=True, timeout=30) as r:
            assert r.status_code == 200
            content = b""
            for chunk in r.iter_content(chunk_size=1024):
                content += chunk
                if b"error" in content or len(content) > 8000:
                    break
            text = content.decode("utf-8", errors="ignore")
            assert "error" in text.lower()

    def test_chat_missing_fields_returns_422(self, client):
        r = client.post(f"{API}/chat", json={"messages": []})
        assert r.status_code == 422
