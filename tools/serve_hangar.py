from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import os, sys

class HangarHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

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
