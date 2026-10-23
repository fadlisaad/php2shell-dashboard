"""Token-gated single-URL scan endpoint.

Runs the vendored php2shell-scanner (api/_scanner.py) against one URL and
returns its result in the same shape as the scanner's save_results() file,
so the dashboard can reuse the existing parser.

Requires the SCAN_TOKEN env var; callers must send the same value in the
`x-scan-token` header. Without SCAN_TOKEN set, scanning is disabled.
"""
import json
import os
from http.server import BaseHTTPRequestHandler

from _scanner import check_vulnerability, utc_now, parse_headers

MAX_TIMEOUT = 45
DEFAULT_TIMEOUT = 20
ALLOWED_SAPI = {"auto", "mod_php", "fpm"}


class handler(BaseHTTPRequestHandler):
    def _send(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        self._send(405, {"error": "use POST to start a scan"})

    def do_POST(self):
        expected = os.environ.get("SCAN_TOKEN")
        if not expected:
            self._send(503, {"error": "scanning is disabled: SCAN_TOKEN is not configured"})
            return

        token = self.headers.get("x-scan-token", "")
        if token != expected:
            self._send(401, {"error": "invalid or missing scan token"})
            return

        try:
            length = int(self.headers.get("Content-Length", 0))
            data = json.loads(self.rfile.read(length) or b"{}")
        except (ValueError, json.JSONDecodeError):
            self._send(400, {"error": "request body must be JSON"})
            return

        url = (data.get("url") or "").strip()
        if not url:
            self._send(400, {"error": "`url` is required"})
            return
        if "://" not in url:
            url = "https://" + url
        if not url.lower().startswith(("http://", "https://")):
            self._send(400, {"error": "url must be http(s)"})
            return

        sapi = data.get("sapi") or "auto"
        if sapi not in ALLOWED_SAPI:
            self._send(400, {"error": f"sapi must be one of {sorted(ALLOWED_SAPI)}"})
            return

        try:
            timeout = int(data.get("timeout") or DEFAULT_TIMEOUT)
        except (TypeError, ValueError):
            timeout = DEFAULT_TIMEOUT
        timeout = max(1, min(timeout, MAX_TIMEOUT))

        verify_ssl = not bool(data.get("insecure"))
        custom_headers = parse_headers(data.get("headers")) if data.get("headers") else {}

        try:
            result = check_vulnerability(
                url,
                timeout=timeout,
                verify_ssl=verify_ssl,
                custom_headers=custom_headers,
                sapi=sapi,
            )
        except Exception as exc:  # noqa: BLE001 - surface any scanner failure as JSON
            self._send(500, {"error": f"scan failed: {exc}"})
            return

        self._send(200, {"scan_time": utc_now(), "total_results": 1, "results": [result]})
