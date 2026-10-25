from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import base64
import json
import os
import sys

JOURNEY_RECEIPT_PATH = os.path.join(os.path.dirname(__file__), "..", "Structure", "journey_interaction_receipt.json")
UPGRADE_RECEIPT_PATH = os.path.join(os.path.dirname(__file__), "..", "Structure", "release_upgrade_receipt.json")
WAVE0_RECEIPT_PATH = os.path.join(os.path.dirname(__file__), "..", "Structure", "wave0_diagnostic_receipt.json")
WAVE0_EVIDENCE_DIR = os.path.join(os.path.dirname(__file__), "..", "Structure", "evidence", "wave0")

class HangarHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def _is_local_diagnostic_request(self):
        client_ip = self.client_address[0] if self.client_address else ""
        is_strict_loopback = client_ip in ("127.0.0.1", "::1", "::ffff:127.0.0.1")
        if not is_strict_loopback:
            return False
        if self.headers.get("X-Simulated-Public-Origin") == "1":
            return False
        origin_hdr = (self.headers.get("Origin") or "").strip().lower()
        if origin_hdr and not (
            origin_hdr.startswith("http://127.0.0.1:")
            or origin_hdr.startswith("http://localhost:")
            or origin_hdr.startswith("http://[::1]:")
        ):
            return False
        host_hdr = (self.headers.get("Host") or "").split(":")[0].strip().lower()
        if host_hdr and host_hdr not in ("localhost", "127.0.0.1", "::1", "[::1]"):
            return False
        return True

    def do_POST(self):
        if self.path in ("/api/save_screenshot", "/api/record_journey", "/api/record_upgrade", "/api/record_wave0"):
            if not self._is_local_diagnostic_request():
                print(f"[403 FORBIDDEN] Non-local diagnostic write blocked: {self.path}", flush=True)
                self.send_response(403)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"error": "Diagnostic test endpoints are restricted to local loopback only"}\n')
                return
        if self.path == "/api/save_screenshot":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")
            try:
                data = json.loads(body)
                filename = os.path.basename(data.get("filename", "screenshot.png"))
                data_url = data.get("dataUrl", "")
                if "," in data_url:
                    b64_part = data_url.split(",", 1)[1]
                else:
                    b64_part = data_url
                raw_bytes = base64.b64decode(b64_part)
                os.makedirs(WAVE0_EVIDENCE_DIR, exist_ok=True)
                out_path = os.path.join(WAVE0_EVIDENCE_DIR, filename)
                with open(out_path, "wb") as f:
                    f.write(raw_bytes)
                print(f"[SCREENSHOT SAVED] {filename} ({len(raw_bytes)} bytes) -> {out_path}", flush=True)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"status": "ok", "saved": true}')
                return
            except Exception as e:
                print(f"[SCREENSHOT ERROR] {e}", flush=True)
                self.send_response(400)
                self.end_headers()
                self.wfile.write(f'{{"error": "{str(e)}"}}\n'.encode("utf-8"))
                return
        if self.path in ("/api/record_journey", "/api/record_upgrade", "/api/record_wave0"):
            if self.path == "/api/record_upgrade":
                dest_path = UPGRADE_RECEIPT_PATH
            elif self.path == "/api/record_wave0":
                dest_path = WAVE0_RECEIPT_PATH
            else:
                dest_path = JOURNEY_RECEIPT_PATH
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")
            try:
                data = json.loads(body)
                with open(dest_path, "w") as f:
                    json.dump(data, f, indent=2)
                print(f"\n[RECEIPT SAVED] Wrote {len(body)} bytes to {dest_path}", flush=True)
                print(f"[RECEIPT SUMMARY] Total steps: {len(data.get('steps', []))}, Status: {data.get('verdict')}", flush=True)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"status": "ok", "saved": true}')
                return
            except Exception as e:
                print(f"[RECEIPT ERROR] Failed to save receipt: {e}", flush=True)
                self.send_response(400)
                self.end_headers()
                self.wfile.write(f'{{"error": "{str(e)}"}}\n'.encode("utf-8"))
                return
        print(f"[404 NOT FOUND] {self.path}", flush=True)
        self.send_response(404)
        self.end_headers()

    def send_error(self, code, message=None, explain=None):
        print(f"[{code} ERROR] Path: {self.path} - {message}", flush=True)
        super().send_error(code, message, explain)

    def log_message(self, format, *args):
        # Concise logging
        msg = format % args
        if not msg.startswith('"GET /favicon.ico'):
            print(f"[{self.log_date_time_string()}] {msg}", flush=True)

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8799
    bind_host = "127.0.0.1"
    server = ThreadingHTTPServer((bind_host, port), HangarHandler)
    print(f"Threading HTTP Server running on {bind_host}:{port} in {os.getcwd()}", flush=True)
    server.serve_forever()

