import json
import os
import threading
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


MAX_BODY_BYTES = 16_384
MAX_MESSAGES = 20
RATE_WINDOW_SECONDS = 60
RATE_LIMIT = 20
rate_records = {}
rate_lock = threading.Lock()


def allowed_origins():
    return {
        origin.strip()
        for origin in os.environ.get("ECHO_ALLOWED_ORIGINS", "").split(",")
        if origin.strip()
    }


class Handler(BaseHTTPRequestHandler):
    def send_json(self, status, data, origin=None):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_cors(origin)
        self.end_headers()
        self.wfile.write(body)

    def send_cors(self, origin):
        if origin and origin in allowed_origins():
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Echo-Access-Code")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")

    def do_OPTIONS(self):
        origin = self.headers.get("Origin")
        self.send_response(204)
        self.send_cors(origin)
        self.end_headers()

    def do_GET(self):
        if self.path == "/health":
            configured = bool(
                os.environ.get("OPENAI_API_KEY")
                and os.environ.get("ECHO_ACCESS_CODE")
            )
            return self.send_json(200, {"ok": True, "chatReady": configured}, self.headers.get("Origin"))
        return self.send_json(404, {"error": "Not found"})

    def do_POST(self):
        origin = self.headers.get("Origin")
        if self.path != "/api/chat":
            return self.send_json(404, {"error": "Not found"}, origin)
        if origin and origin not in allowed_origins():
            return self.send_json(403, {"error": "This origin is not allowed."}, origin)

        if not self.allow_request():
            return self.send_json(429, {"error": "Too many messages. Please wait a minute and try again."}, origin)

        access_code = os.environ.get("ECHO_ACCESS_CODE", "")
        if not access_code:
            return self.send_json(503, {"error": "The widget owner has not configured private access yet."}, origin)
        if self.headers.get("X-Echo-Access-Code", "") != access_code:
            return self.send_json(401, {"error": "Enter the access code configured by the widget owner."}, origin)

        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length < 1 or length > MAX_BODY_BYTES:
            return self.send_json(413, {"error": "Message payload is empty or too large."}, origin)

        try:
            payload = json.loads(self.rfile.read(length))
            messages = payload.get("messages")
            if not isinstance(messages, list) or not messages or len(messages) > MAX_MESSAGES:
                raise ValueError("Send between 1 and 20 messages.")
            clean_messages = []
            for item in messages:
                role = item.get("role")
                content = item.get("content")
                if role not in ("user", "assistant") or not isinstance(content, str):
                    raise ValueError("Messages must have a user or assistant role and text content.")
                if len(content) > 4000:
                    raise ValueError("Each message must be 4,000 characters or less.")
                clean_messages.append({"role": role, "content": content})
        except (json.JSONDecodeError, ValueError, AttributeError) as error:
            return self.send_json(400, {"error": str(error)}, origin)

        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            return self.send_json(503, {"error": "The AI service is not configured yet."}, origin)

        base_url = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
        model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
        request_body = json.dumps({
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are Echo, a warm, thoughtful desktop companion. Be personable and "
                        "grounded, remember the conversation provided, ask useful follow-up "
                        "questions, and never claim to have performed actions you cannot perform. "
                        "Ask before suggesting any consequential action. Keep replies concise."
                    ),
                },
                *clean_messages,
            ],
            "max_tokens": 500,
            "temperature": 0.8,
        }).encode("utf-8")
        request = urllib.request.Request(
            f"{base_url}/chat/completions",
            data=request_body,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                result = json.loads(response.read())
            reply = result["choices"][0]["message"]["content"]
            if not isinstance(reply, str) or not reply.strip():
                raise ValueError("The AI provider returned an empty reply.")
            self.send_json(200, {"reply": reply.strip()}, origin)
        except urllib.error.HTTPError as error:
            self.send_json(502, {"error": f"AI provider returned HTTP {error.code}."}, origin)
        except (urllib.error.URLError, TimeoutError, KeyError, IndexError, ValueError, json.JSONDecodeError):
            self.send_json(502, {"error": "Echo could not reach the AI service. Check backend configuration and try again."}, origin)

    def allow_request(self):
        now = time.monotonic()
        client = self.client_address[0]
        with rate_lock:
            recent = [stamp for stamp in rate_records.get(client, []) if now - stamp < RATE_WINDOW_SECONDS]
            if len(recent) >= RATE_LIMIT:
                rate_records[client] = recent
                return False
            recent.append(now)
            rate_records[client] = recent
            return True

    def log_message(self, format, *args):
        pass


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "10000"))
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    server.serve_forever()
