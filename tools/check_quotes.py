"""Check every quotation of the novel used in the site's templates and scripts
against the verse text in moby_dick_2025-03-22.json (Project Gutenberg #2701).

Run from the repo root:  python tools/check_quotes.py
Exits non-zero if any quotation does not appear word for word in the novel.
"""
import html, json, re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
NOT_MELVILLE = ["American Bible", "guide", "verses", "QUOTES["]  # Philbrick, and scare quotes in the About copy

def norm(s):
    s = html.unescape(s).replace("--", " ")
    return re.sub(r"[^a-z]+", " ", s.lower()).strip()

data = json.load(open(ROOT / "moby_dick_2025-03-22.json"))
novel = norm(" ".join(v["text"] for c in data for v in c["verses"]))

found = []
chapter_titles = {norm(c["title"]) for c in data}
for t in json.load(open(ROOT / "concordance_topics.json"))["topics"]:
    for p in t["intro"]:
        for q in re.findall(r"“([^”]{6,})”", p):
            if norm(q) not in chapter_titles:
                found.append(("concordance_topics.json:" + t["slug"], q))
for path in list((ROOT / "templates").glob("*.html")) + [ROOT / "static/site.js", ROOT / "static/scene.js"]:
    text = path.read_text()
    if path.suffix == ".js":
        text = re.sub(r"\\u([0-9a-fA-F]{4})", lambda m: chr(int(m.group(1), 16)), text)
    text = text.replace("&ldquo;", "“").replace("&rdquo;", "”")
    # skip Jinja expressions: real passages come straight from the data
    for q in re.findall(r"“([^”{}]{12,})”", text):
        found.append((path.name, q))
    if path.name == "site.js":
        block = text[text.index("var QUOTES"): text.index("];", text.index("var QUOTES"))]
        for q in re.findall(r"'((?:[^'\\]|\\.)+)'", block):
            found.append((path.name, q.replace("\\'", "'")))

bad = 0
for name, q in found:
    if any(k in q for k in NOT_MELVILLE):
        continue
    ok = norm(q) in novel
    bad += not ok
    print(("ok   " if ok else "MISS ") + f"{name}: {html.unescape(q)[:90]}")
print(f"\n{len(found)} quotations checked, {bad} not found in the novel.")
sys.exit(1 if bad else 0)
