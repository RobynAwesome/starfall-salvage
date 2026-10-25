"""Loopback-only static HTTP server for local Starfall Salvage verification."""
import http.server
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8799
BIND_HOST = "127.0.0.1"
ALLOWED_LOOPBACK_HOSTS = {"127.0.0.1", "::1", "::ffff:127.0.0.1"}


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


class LoopbackHandler(http.server.SimpleHTTPRequestHandler):
    def verify_client(self) -> bool:
        client_ip = self.client_address[0]
        return client_ip in ALLOWED_LOOPBACK_HOSTS

    def do_GET(self):
        if not self.verify_client():
            self.send_error(403, "Forbidden: Loopback access only")
            return
        super().do_GET()

    def do_HEAD(self):
        if not self.verify_client():
            self.send_error(403, "Forbidden: Loopback access only")
            return
        super().do_HEAD()

    def log_message(self, format, *args):
        pass


with ReusableTCPServer((BIND_HOST, PORT), LoopbackHandler) as httpd:
    print(f"Serving strictly on http://{BIND_HOST}:{PORT}")
    httpd.serve_forever()
