#!/usr/bin/env python3
"""
Create the MediFlow pre-prod QA backlog in Jira from docs/qa/jira-import.csv.

Creates the Epic first, then every Test/Bug/Task as a child of that Epic.
Uses only the Python standard library (urllib) — no pip install needed.

Usage:
  export JIRA_BASE_URL="https://rajdeephazradev.atlassian.net"
  export JIRA_EMAIL="you@example.com"
  export JIRA_API_TOKEN="<token from https://id.atlassian.com/manage-profile/security/api-tokens>"
  export JIRA_PROJECT_KEY="SCRUM"
  python3 scripts/jira-import.py            # dry-run: prints what it WOULD create
  python3 scripts/jira-import.py --apply    # actually creates the issues

Notes:
- Jira's default scrum project has issue types Epic, Story, Task, Bug, Subtask
  (no "Test"), so CSV "Test" rows are created as ISSUE_TYPE_MAP["Test"] below.
  Change that mapping if you've added a custom Test type.
- The script is defensive: if an optional field (priority, labels, parent) is
  rejected by your project config, it retries without it and logs a warning,
  so a strict project config can't abort the whole run.
- Component / Owner / Severity / Priority / Automation are ALSO folded into the
  description so nothing is lost even if those fields aren't configured.
"""
import base64
import csv
import json
import os
import sys
import urllib.error
import urllib.request

DEFAULT_CSV_PATH = os.path.join(os.path.dirname(__file__), "..", "docs", "qa", "jira-import.csv")
ENV_PATH = os.path.join(os.path.dirname(__file__), "..", ".env")


def load_dotenv(path):
    """Load KEY=VALUE lines from .env WITHOUT overriding real shell env vars."""
    if not os.path.exists(path):
        return
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            key, val = key.strip(), val.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = val

# CSV "Issue Type" value -> Jira issue type name in your project.
ISSUE_TYPE_MAP = {
    "Epic": "Epic",
    "Test": "Story",   # default scrum project has no "Test" type
    "Bug": "Bug",
    "Task": "Task",
}

# CSV priority -> Jira priority name. Set to {} to skip setting priority.
PRIORITY_MAP = {
    "P0 Highest": "Highest",
    "P1 High": "High",
    "P2 Medium": "Medium",
    "P3 Low": "Low",
}

APPLY = "--apply" in sys.argv


def env(name):
    v = os.environ.get(name)
    if not v:
        sys.exit(f"ERROR: environment variable {name} is not set. See the header of this script.")
    return v


def make_request(base, email, token, path, payload):
    url = f"{base.rstrip('/')}{path}"
    data = json.dumps(payload).encode()
    auth = base64.b64encode(f"{email}:{token}".encode()).decode()
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Authorization", f"Basic {auth}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode()), None
    except urllib.error.HTTPError as e:
        return None, f"{e.code} {e.reason}: {e.read().decode()[:500]}"
    except urllib.error.URLError as e:
        return None, str(e)


def build_description(row):
    lines = [row["Description"], ""]
    for label in ("Component", "Owner", "Severity", "Priority", "Automation"):
        # CSV columns are Component/Assignee/Severity/Priority/Automation
        key = "Assignee" if label == "Owner" else label
        val = row.get(key, "").strip()
        if val:
            lines.append(f"{label}: {val}")
    return "\n".join(lines)


def create_issue(base, email, token, project_key, row, epic_key=None):
    itype = ISSUE_TYPE_MAP.get(row["Issue Type"], row["Issue Type"])
    fields = {
        "project": {"key": project_key},
        "summary": row["Summary"][:250],
        "description": build_description(row),
        "issuetype": {"name": itype},
    }
    labels = [l for l in row.get("Labels", "").split() if l]
    if labels:
        fields["labels"] = labels
    pr = PRIORITY_MAP.get(row.get("Priority", ""))
    if pr:
        fields["priority"] = {"name": pr}
    if epic_key and itype != "Epic":
        fields["parent"] = {"key": epic_key}

    # Progressive fallback: drop optional fields if the config rejects them.
    for drop in ([], ["priority"], ["priority", "labels"], ["priority", "labels", "parent"]):
        attempt = {k: v for k, v in fields.items() if k not in drop}
        result, err = make_request(base, email, token, "/rest/api/2/issue", {"fields": attempt})
        if result:
            note = f" (dropped: {', '.join(drop)})" if drop else ""
            return result["key"], note
        last_err = err
    return None, last_err


def main():
    load_dotenv(ENV_PATH)
    base = env("JIRA_BASE_URL")
    email = env("JIRA_EMAIL")
    token = env("JIRA_API_TOKEN")
    project_key = os.environ.get("JIRA_PROJECT_KEY", "SCRUM")

    # Optional first positional arg overrides the CSV; env JIRA_CSV also works.
    csv_arg = next((a for a in sys.argv[1:] if not a.startswith("--")), None)
    csv_path = csv_arg or os.environ.get("JIRA_CSV") or DEFAULT_CSV_PATH

    with open(csv_path, newline="") as f:
        rows = list(csv.DictReader(f))

    epic_rows = [r for r in rows if r["Issue Type"] == "Epic"]
    child_rows = [r for r in rows if r["Issue Type"] != "Epic"]

    print(f"{'APPLY' if APPLY else 'DRY-RUN'}: project={project_key}  csv={os.path.basename(csv_path)}  epics={len(epic_rows)}  children={len(child_rows)}\n")

    if not APPLY:
        for r in rows:
            print(f"  would create [{ISSUE_TYPE_MAP.get(r['Issue Type'], r['Issue Type'])}] {r['Summary']}")
        print("\nRe-run with --apply to create these in Jira.")
        return

    # 1) Epic first, capture its key.
    epic_key = None
    if epic_rows:
        epic_key, note = create_issue(base, email, token, project_key, epic_rows[0])
        if not epic_key:
            sys.exit(f"ERROR creating epic: {note}")
        print(f"  EPIC  {epic_key}  {epic_rows[0]['Summary']}{note}")

    # 2) Children linked to the epic.
    created, failed = 0, 0
    for r in child_rows:
        key, note = create_issue(base, email, token, project_key, r, epic_key)
        if key:
            created += 1
            print(f"  {r['Issue Type']:5} {key}  {r['Summary']}{note}")
        else:
            failed += 1
            print(f"  FAIL  {r['Summary']}\n        -> {note}")

    print(f"\nDone. epic={'1' if epic_key else '0'}  created={created}  failed={failed}")


if __name__ == "__main__":
    main()
