#!/usr/bin/env python3
"""Yahoo Fantasy Sports OAuth2 + read-only API client for Bunts.

Usage:
  python3 yahoo.py check             # is Fantasy access provisioned yet?
  python3 yahoo.py exchange <code>   # one-time: swap the oob code for tokens
  python3 yahoo.py dump              # pull league / team / roster JSON
  python3 yahoo.py get <api-path>    # e.g. get "team/458.l.12345.t.6/roster"
"""
import base64, json, os, sys, time, urllib.parse, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
TOKENS = os.path.join(HERE, "tokens.json")
OUT = os.path.join(HERE, "data")
TOKEN_URL = "https://api.login.yahoo.com/oauth2/get_token"
API = "https://fantasysports.yahooapis.com/fantasy/v2"


def env():
    cfg = {}
    with open(os.path.join(HERE, ".env")) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                cfg[k] = v
    return cfg


def post_token(cfg, data):
    body = urllib.parse.urlencode(data).encode()
    req = urllib.request.Request(TOKEN_URL, data=body, method="POST")
    raw = f"{cfg['YAHOO_CLIENT_ID']}:{cfg['YAHOO_CLIENT_SECRET']}".encode()
    req.add_header("Authorization", "Basic " + base64.b64encode(raw).decode())
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    try:
        with urllib.request.urlopen(req) as r:
            tok = json.load(r)
    except urllib.error.HTTPError as e:
        print("Token endpoint returned HTTP %s:" % e.code, file=sys.stderr)
        print(e.read().decode()[:2000], file=sys.stderr)
        sys.exit(1)
    tok["expires_at"] = time.time() + tok.get("expires_in", 3600) - 60
    # Yahoo may rotate the refresh token on ANY refresh -- always persist what came back.
    with open(TOKENS, "w") as f:
        json.dump(tok, f, indent=2)
    os.chmod(TOKENS, 0o600)
    return tok


def exchange(code):
    cfg = env()
    post_token(cfg, {
        "client_id": cfg["YAHOO_CLIENT_ID"],
        "client_secret": cfg["YAHOO_CLIENT_SECRET"],
        "redirect_uri": cfg["YAHOO_REDIRECT_URI"],
        "code": code,
        "grant_type": "authorization_code",
    })
    print("OK - tokens.json written")


def access_token():
    cfg = env()
    with open(TOKENS) as f:
        tok = json.load(f)
    if tok.get("expires_at", 0) > time.time():
        return tok["access_token"]
    tok = post_token(cfg, {
        "client_id": cfg["YAHOO_CLIENT_ID"],
        "client_secret": cfg["YAHOO_CLIENT_SECRET"],
        "redirect_uri": cfg["YAHOO_REDIRECT_URI"],
        "refresh_token": tok["refresh_token"],
        "grant_type": "refresh_token",
    })
    print("(refreshed access token)", file=sys.stderr)
    return tok["access_token"]


def get(path):
    url = f"{API}/{path.lstrip('/')}"
    url += ("&" if "?" in url else "?") + "format=json"
    req = urllib.request.Request(url)
    req.add_header("Authorization", "Bearer " + access_token())
    try:
        with urllib.request.urlopen(req) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:2000]
        print(f"HTTP {e.code} on {path}", file=sys.stderr)
        print(body, file=sys.stderr)
        if e.code in (401, 403):
            print("\n>>> 401/403 here usually means the account is not approved for"
                  "\n>>> Fantasy API access yet, not that the token is bad.", file=sys.stderr)
        raise


def check():
    """Probe whether Fantasy API access has been provisioned yet."""
    import datetime
    stamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    url = f"{API}/game/mlb?format=json"
    req = urllib.request.Request(url)
    try:
        req.add_header("Authorization", "Bearer " + access_token())
    except Exception as e:
        print(f"[{stamp}] TOKEN PROBLEM: {e}")
        return 2
    try:
        with urllib.request.urlopen(req) as r:
            json.load(r)
        print(f"[{stamp}] ACCESS IS LIVE - Fantasy API responded. Run: python3 yahoo.py dump")
        return 0
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        if "additional_authorization_required" in body:
            print(f"[{stamp}] still waiting - not provisioned yet (401 additional_authorization_required)")
        else:
            print(f"[{stamp}] HTTP {e.code}: {body[:300]}")
        return 1


def save(name, obj):
    os.makedirs(OUT, exist_ok=True)
    p = os.path.join(OUT, name + ".json")
    with open(p, "w") as f:
        json.dump(obj, f, indent=2)
    print("wrote " + p)


def walk_keys(obj, suffix):
    """Yahoo's JSON is deeply nested and irregular; just hunt for *_key values."""
    found = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k == suffix and isinstance(v, str):
                found.append(v)
            else:
                found += walk_keys(v, suffix)
    elif isinstance(obj, list):
        for v in obj:
            found += walk_keys(v, suffix)
    return found


def dump():
    leagues = get("users;use_login=1/games;game_codes=mlb/leagues")
    save("leagues", leagues)
    league_keys = sorted(set(walk_keys(leagues, "league_key")))
    print("leagues found:", league_keys)

    teams = get("users;use_login=1/games;game_codes=mlb/teams")
    save("my_teams", teams)
    team_keys = sorted(set(walk_keys(teams, "team_key")))
    print("my teams:", team_keys)

    for lk in league_keys:
        save("league_%s_settings" % lk, get(f"league/{lk}/settings"))
        save("league_%s_standings" % lk, get(f"league/{lk}/standings"))
    for tk in team_keys:
        save("team_%s_roster" % tk, get(f"team/{tk}/roster"))
        save("team_%s_roster_stats" % tk, get(f"team/{tk}/roster/players/stats"))
    print("\nDone. Everything is in ./data/")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "check":
        sys.exit(check())
    elif cmd == "exchange" and len(sys.argv) > 2:
        exchange(sys.argv[2].strip())
    elif cmd == "dump":
        dump()
    elif cmd == "get" and len(sys.argv) > 2:
        print(json.dumps(get(sys.argv[2]), indent=2))
    else:
        print(__doc__)
