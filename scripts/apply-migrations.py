#!/usr/bin/env python3
"""Apply migration files to the live Supabase project through the Management API (used by the Database update workflow).
Large seed files are sent in chunks of whole statements. Needs SUPABASE_ACCESS_TOKEN and PROJECT_REF in the environment.
  python3 scripts/apply-migrations.py 0004_campus.sql 0005_universities.sql
  python3 scripts/apply-migrations.py --sql "select 1;"
"""
import json, os, sys, urllib.request

REF = os.environ["PROJECT_REF"]
TOKEN = os.environ["SUPABASE_ACCESS_TOKEN"]


def run(sql: str):
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{REF}/database/query",
        data=json.dumps({"query": sql}).encode(),
        headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json", "User-Agent": "poe-migrate"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            return r.read().decode()[:300]
    except urllib.error.HTTPError as e:
        sys.exit(f"failed ({e.code}): {e.read().decode()[:2000]}")


def chunks(sql: str, limit=200_000):
    """Split only a seed file (plain INSERT statements ending in ';' at a line end) into chunks of whole statements."""
    parts, cur = [], ""
    for stmt in sql.split(";\n"):
        if not stmt.strip():
            continue
        piece = stmt + ";\n"
        if len(cur) + len(piece) > limit and cur:
            parts.append(cur)
            cur = ""
        cur += piece
    if cur:
        parts.append(cur)
    return parts


args = sys.argv[1:]
if args[:1] == ["--sql"]:
    print(run(args[1]))
    sys.exit()
for name in args:
    path = os.path.join("supabase", "migrations", name)
    sql = open(path, encoding="utf-8").read()
    # functions contain ';' inside $$ bodies, so schema files go in one request; the university seed is chunked
    pieces = chunks(sql) if "universities" in name else [sql]
    for i, p in enumerate(pieces, 1):
        run(p)
        print(f"{name}: part {i}/{len(pieces)} applied")
print("done")
