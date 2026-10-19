"""Build a static, server-free preview of the site from the real templates.

PREVIEW ONLY: the output is for looking at the design, not for deploying.
    python preview/build_preview.py OUT_DIR
Pages are rendered by the real Flask app (with OpenAI stubbed out), links are
rewritten to .html files, and preview/preview.js stands in for the POSTs.
"""
import json, os, re, shutil, sys
os.environ.setdefault("OPENAI_API_KEY", "sk-preview")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT); os.chdir(ROOT)
import app as A
from flask import render_template

OUT = os.path.abspath(sys.argv[1])
os.makedirs(os.path.join(OUT, "static", "images"), exist_ok=True)

SAMPLE_Q = "the weight of Sunday nights"
SAMPLE_VERSE = ("The longest voyages are not measured in leagues but in afternoons, and the afternoons are not "
                "measured at all. They are simply endured, as a hull endures water: on every side, without remark, "
                "and with a faint groaning in the timbers that only the carpenter admits to hearing.")
matches = [A.find_verse_by_id(i, A.moby_dick_data) for i in (3, 158, 1253)]

def tag_hits(cat, tag):
    return [{"chapter_number": c["chapter_number"], "chapter_title": c["title"], "verse_number": v["verse_number"], "text": v["text"]}
            for c in A.moby_dick_data for v in c["verses"]
            if tag.lower() in [t.lower() for t in v["open_ai_tags"].get(cat, [])]]

pages = {}
with A.app.test_request_context("/"):
    pages["index.html"] = render_template("home.html")
with A.app.test_request_context("/about"):
    pages["about.html"] = render_template("about.html")
with A.app.test_request_context("/privacy"):
    pages["privacy.html"] = render_template("privacy.html")
with A.app.test_request_context("/somewhere"):
    pages["404.html"] = render_template("404.html")
with A.app.test_request_context("/search"):
    pages["results.html"] = render_template("results.html", query=SAMPLE_Q, generated_verse=SAMPLE_VERSE, matched_verses=matches)
with A.app.test_request_context("/tag_search"):
    pages["tag-results.html"] = render_template("tag-results.html", category="Feeling", tag="Foreboding",
                                                found_texts=tag_hits("feeling", "Foreboding"))

LINKS = {'"/"': '"index.html"', '"/about"': '"about.html"', '"/privacy"': '"privacy.html"',
         '"/#chart"': '"index.html#chart"', '"/#log"': '"index.html#log"', '"/tags.json"': '"static/tags.json"'}

for name, html in pages.items():
    html = html.replace('"/static/', '"static/')
    for a, b in LINKS.items():
        html = html.replace('href=' + a, 'href=' + b).replace('data-tags=' + a, 'data-tags=' + b)
    html = html.replace('href: "/privacy"', 'href: "privacy.html"')
    html = html.replace("<title>", '<meta name="claude:viewport-fit-sides" content="cover">\n  <title>', 1)
    html = html.replace("<meta charset=\"UTF-8\">", "<meta charset=\"UTF-8\">\n  <script>window.MDB_PREVIEW = true;</script>", 1)
    html = html.replace("</body>", '  <script src="static/preview.js"></script>\n</body>')
    if name == "index.html":   # the main artifact page is wrapped in a skeleton at publish time
        html = re.sub(r"<!DOCTYPE html>\s*|<html[^>]*>\s*|</?head>\s*|<body[^>]*>\s*|</body>\s*|</html>\s*", "", html)
        # the charset/viewport come from the skeleton; keep the title first
        html = re.sub(r'\s*<meta charset="UTF-8">', "", html, count=1)
        html = re.sub(r'\s*<meta name="viewport"[^>]*>', "", html, count=1)
        html = html.replace('<meta name="claude:viewport-fit-sides" content="cover">\n  <title>', "<title>", 1)
        html = re.sub(r"(<title>.*?</title>)", r'\1\n<meta name="claude:viewport-fit-sides" content="cover">', html, count=1, flags=re.S)
        html = html.lstrip()
        # put the title at the very top
        t = re.search(r"<title>.*?</title>\n<meta name=\"claude:viewport-fit-sides\" content=\"cover\">", html, re.S).group(0)
        html = t + "\n" + html.replace(t, "", 1)
    open(os.path.join(OUT, name), "w").write(html)

shutil.copytree(os.path.join(ROOT, "static", "images", "sprites"), os.path.join(OUT, "static", "images", "sprites"), dirs_exist_ok=True)
for f in ("pixel.css", "scene.js", "site.js", "tags.json", "images/favicon.png"):
    shutil.copy(os.path.join(ROOT, "static", f), os.path.join(OUT, "static", f))
shutil.copy(os.path.join(ROOT, "preview", "preview.js"), os.path.join(OUT, "static", "preview.js"))
corpus = [[c["chapter_number"], c["title"], [[v["verse_number"], v["text"], v["open_ai_tags"]] for v in c["verses"]]]
          for c in A.moby_dick_data]
json.dump(corpus, open(os.path.join(OUT, "static", "preview-corpus.json"), "w"), separators=(",", ":"))
print("built", sorted(pages), "->", OUT)
