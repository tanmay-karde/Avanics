# Auto-assembled: shared helpers first, then this endpoint.
import json, os, hmac, hashlib, time, random, urllib.request, urllib.error
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs, quote

SB_URL = os.environ.get("SUPABASE_URL", "https://xvazkkviqzmnrewxygob.supabase.co")
SB_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
TG = os.environ.get("TELEGRAM_BOT_TOKEN", "")
PASSWORD = os.environ.get("DISPATCHER_PASSWORD", "123")
SECRET = (os.environ.get("SESSION_SECRET") or SB_KEY or "dev-secret").encode()


def sb(path, method="GET", body=None):
    """Call Supabase REST (PostgREST) with the service key."""
    headers = {"apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY,
               "Content-Type": "application/json", "Prefer": "return=representation"}
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(SB_URL + "/rest/v1/" + path, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=8) as r:
            text = r.read().decode()
    except urllib.error.HTTPError as e:
        raise RuntimeError(e.read().decode())
    return json.loads(text) if text else None


def patch(table, id_, body):
    return sb(f"{table}?id=eq.{quote(str(id_))}", "PATCH", body)


def ins(table, body):
    return sb(table, "POST", body)


def tg(method, payload=None):
    """Call the Telegram Bot API. Returns Telegram's JSON (ok true/false)."""
    req = urllib.request.Request(f"https://api.telegram.org/bot{TG}/{method}", data=json.dumps(payload or {}).encode(),
                                 method="POST", headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=8) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try:
            return json.loads(e.read().decode())
        except Exception:
            return {"ok": False, "description": f"HTTP {e.code}"}


def esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def fit(req, skills):
    """0..1: how well a technician's skill levels cover what the job needs (level must reach need+1)."""
    num = den = 0
    for i, q in enumerate(req):
        if q:
            num += q * min(1, skills[i] / (q + 1))
            den += q
    return num / den if den else 1


GOOD = ["Quick and tidy work.", "Fixed it first time, great.", "Explained everything clearly.", "Professional and on time.", "Would call again."]
BAD = ["Took long and needed a revisit.", "Not the right person for this job.", "Problem came back next day.", "Seemed unsure about the equipment."]


def finish(job):
    if job["status"] == "done":
        return job
    f = float(job["fit"])
    r = 1 + 4 * f ** 1.3 + (random.random() - 0.5)
    if job["priority"] == "Critical" and f < 0.7:
        r -= 0.8
    r = max(1, min(5, round(r)))
    j = patch("jobs", job["id"], {"status": "done", "rating": r, "comment": random.choice(GOOD if r >= 4 else BAD),
                                  "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())})[0]
    patch("technicians", job["tech_id"], {"status": "ready"})
    ins("job_events", {"job_id": job["id"], "kind": "done"})
    return j


def make_token():
    exp = str(int(time.time()) + 12 * 3600)
    return exp + "." + hmac.new(SECRET, exp.encode(), hashlib.sha256).hexdigest()


def check_token(header):
    t = (header or "").replace("Bearer ", "").strip()
    try:
        exp, sig = t.split(".")
        good = hmac.new(SECRET, exp.encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(sig, good) and int(exp) > time.time()
    except Exception:
        return False


class Base(BaseHTTPRequestHandler):
    def send(self, code, obj):
        b = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def body(self):
        try:
            return json.loads(self.rfile.read(int(self.headers.get("content-length") or 0)) or b"{}")
        except Exception:
            return {}

    def query(self):
        return {k: v[0] for k, v in parse_qs(urlparse(self.path).query).items()}

    def authed(self):
        return check_token(self.headers.get("authorization"))

    def log_message(self, *a):
        pass



class handler(Base):
    def do_POST(self):
        pw = str(self.body().get("password", ""))
        if hmac.compare_digest(pw.encode(), PASSWORD.encode()):
            return self.send(200, {"token": make_token()})
        self.send(401, {"error": "Wrong password"})
