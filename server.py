"""Local HTTP server and SQLite storage for the grade tracker."""
import argparse
import json
from contextlib import closing
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import re
import sqlite3

ROOT = Path(__file__).resolve().parent
COURSES = {"AS", "CSMAGT", "DPROT", "MALW", "NS", "TMA"}
ASSETS = {
    "/": ("index.html", "text/html; charset=utf-8"),
    "/styles.css": ("styles.css", "text/css; charset=utf-8"),
    "/app.mjs": ("app.mjs", "text/javascript; charset=utf-8"),
    "/courses.mjs": ("courses.mjs", "text/javascript; charset=utf-8"),
}


def valid_draft(data):
    if not isinstance(data, dict) or set(data) != {"grades", "detail", "count", "attendance", "target"}:
        return False
    if type(data["detail"]) is not bool or not isinstance(data["grades"], dict):
        return False
    if len(data["grades"]) > 80:
        return False
    values = [data["count"], data["attendance"], data["target"], *data["grades"].values()]
    return all(isinstance(value, str) and len(value) <= 12 for value in values) and all(
        re.fullmatch(r"[a-z0-9]{1,16}", key) for key in data["grades"]
    )


class Handler(BaseHTTPRequestHandler):
    def respond(self, code, content, content_type):
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(content)

    def send_json(self, code, payload):
        self.respond(code, json.dumps(payload, ensure_ascii=False).encode(), "application/json")

    def do_GET(self):
        if self.path == "/api/grades":
            with closing(sqlite3.connect(self.server.database)) as db:
                rows = db.execute("SELECT course, draft FROM grades").fetchall()
            self.send_json(200, {course: json.loads(draft) for course, draft in rows})
        elif self.path in ASSETS:
            name, content_type = ASSETS[self.path]
            self.respond(200, (ROOT / "web" / name).read_bytes(), content_type)
        else:
            self.send_error(404)

    def do_PUT(self):
        course = self.path.removeprefix("/api/grades/")
        if course not in COURSES or self.path != "/api/grades/" + course:
            self.send_error(404)
            return
        if self.headers.get_content_type() != "application/json":
            self.send_error(415)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 8192:
                raise ValueError("Invalid length")
            draft = json.loads(self.rfile.read(length))
            if not valid_draft(draft):
                raise ValueError("Invalid draft")
        except (ValueError, UnicodeError, RecursionError):
            self.send_json(400, {"error": "Invalid data."})
            return

        try:
            with closing(sqlite3.connect(self.server.database)) as db, db:
                db.execute(
                    "INSERT INTO grades (course, draft) VALUES (?, ?) "
                    "ON CONFLICT(course) DO UPDATE SET draft = excluded.draft",
                    (course, json.dumps(draft, ensure_ascii=False)),
                )
        except sqlite3.Error:
            self.send_json(500, {"error": "Could not save grades."})
            return
        self.send_json(200, {"saved": True})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--data", type=Path, default=ROOT / "data")
    args = parser.parse_args()
    args.data.mkdir(parents=True, exist_ok=True)
    database = args.data / "notas.sqlite3"
    with closing(sqlite3.connect(database)) as db, db:
        db.execute("CREATE TABLE IF NOT EXISTS grades (course TEXT PRIMARY KEY, draft TEXT NOT NULL)")
    with ThreadingHTTPServer((args.host, args.port), Handler) as server:
        server.database = database
        port = server.server_address[1]
        print(f"Open http://localhost:{port} in your browser. Press Ctrl+C to stop.", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
