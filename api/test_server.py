import json
import os
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from unittest.mock import patch

import server


class FakeProviderResponse:
    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self):
        return json.dumps({
            "choices": [{"message": {"content": "I hear you. What would help right now?"}}]
        }).encode("utf-8")


class EchoApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base_url = f"http://127.0.0.1:{cls.server.server_port}"
        cls.original_urlopen = urllib.request.urlopen
        os.environ["OPENAI_API_KEY"] = "test-key"
        os.environ["OPENAI_BASE_URL"] = "https://provider.example/v1"
        os.environ["OPENAI_MODEL"] = "test-model"
        os.environ["ECHO_ACCESS_CODE"] = "local-test-code"
        os.environ["ECHO_ALLOWED_ORIGINS"] = "https://zero143zapp-design.github.io"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)
        for key in ("OPENAI_API_KEY", "OPENAI_BASE_URL", "OPENAI_MODEL", "ECHO_ACCESS_CODE", "ECHO_ALLOWED_ORIGINS"):
            os.environ.pop(key, None)

    def post_chat(self, headers=None, payload=None):
        request = urllib.request.Request(
            f"{self.base_url}/api/chat",
            data=json.dumps(payload or {"messages": [{"role": "user", "content": "I feel stuck."}]}).encode(),
            headers={"Content-Type": "application/json", **(headers or {})},
            method="POST",
        )
        return type(self).original_urlopen(request)

    def test_health_endpoint(self):
        with type(self).original_urlopen(f"{self.base_url}/health") as response:
            self.assertEqual(response.status, 200)
            self.assertEqual(json.loads(response.read()), {"ok": True, "chatReady": True})

    def test_chat_proxies_to_provider_without_exposing_key(self):
        def fake_urlopen(request, timeout):
            self.assertEqual(request.full_url, "https://provider.example/v1/chat/completions")
            self.assertEqual(request.get_header("Authorization"), "Bearer test-key")
            self.assertEqual(json.loads(request.data)["model"], "test-model")
            return FakeProviderResponse()

        with patch.object(server.urllib.request, "urlopen", side_effect=fake_urlopen):
            response = self.post_chat({
                "Origin": "https://zero143zapp-design.github.io",
                "X-Echo-Access-Code": "local-test-code",
            })
            with response:
                self.assertEqual(response.status, 200)
                self.assertEqual(
                    json.loads(response.read())["reply"],
                    "I hear you. What would help right now?",
                )
                self.assertEqual(
                    response.headers["Access-Control-Allow-Origin"],
                    "https://zero143zapp-design.github.io",
                )

    def test_chat_requires_private_access_code(self):
        with self.assertRaises(urllib.error.HTTPError) as error:
            self.post_chat({"X-Echo-Access-Code": "wrong"})
        self.assertEqual(error.exception.code, 401)
        error.exception.close()

    def test_chat_fails_closed_when_access_code_is_not_configured(self):
        with patch.dict(os.environ, {"ECHO_ACCESS_CODE": ""}):
            with self.assertRaises(urllib.error.HTTPError) as error:
                self.post_chat()
        self.assertEqual(error.exception.code, 503)
        error.exception.close()

    def test_chat_rejects_unapproved_origins(self):
        with self.assertRaises(urllib.error.HTTPError) as error:
            self.post_chat({"Origin": "https://untrusted.example"})
        self.assertEqual(error.exception.code, 403)
        error.exception.close()

    def test_chat_rejects_oversized_message(self):
        with self.assertRaises(urllib.error.HTTPError) as error:
            self.post_chat(
                {"X-Echo-Access-Code": "local-test-code"},
                {"messages": [{"role": "user", "content": "x" * 4001}]},
            )
        self.assertEqual(error.exception.code, 400)
        error.exception.close()


if __name__ == "__main__":
    unittest.main()
