from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import json
import os
import sys

JOURNEY_RECEIPT_PATH = os.path.join(os.path.dirname(__file__), "..", "Structure", "journey_interaction_receipt.json")

class HangarHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_POST(self):
        if self.path == "/api/record_journey":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")
            try:
                data = json.loads(body)
                with open(JOURNEY_RECEIPT_PATH, "w") as f:
                    json.dump(data, f, indent=2)
                print(f"\n[RECEIPT SAVED] Wrote {len(body)} bytes to {JOURNEY_RECEIPT_PATH}", flush=True)
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
    server = ThreadingHTTPServer(("0.0.0.0", port), HangarHandler)
    print(f"Threading HTTP Server running on 0.0.0.0:{port} in {os.getcwd()}", flush=True)
    server.serve_forever()

