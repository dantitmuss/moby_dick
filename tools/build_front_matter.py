"""Build front_matter.json (Etymology and Extracts) from Project Gutenberg #2701.

The front matter sits before Chapter 1 and is not part of the verse data, the
FAISS index or search. It is read only by /read/etymology-and-extracts.

usage: python tools/build_front_matter.py data/pg2701.txt front_matter.json

Text is kept exactly as Gutenberg has it: curly quotes, dashes, _italics_.
Only line wrapping and indentation are undone.
"""
import json, re, sys

GUT, OUT = sys.argv[1:3]
raw = open(GUT, encoding="utf-8").read().replace("\r\n", "\n")
body = raw[raw.index("*** START"):raw.index("*** END")]
start = body.index("  ETYMOLOGY.")
ch1 = body.index("CHAPTER 1. Loomings.")
ch1 = body.index("CHAPTER 1. Loomings.", ch1 + 1)      # the second is the chapter, the first the contents
paras = [p for p in re.split(r"\n[ \t]*\n", body[start:ch1]) if p.strip()]

def flat(p):
    return " ".join(line.strip() for line in p.strip().split("\n"))

def split_source(text):
    """'“…” —_Genesis_.' -> ('“…”', '_Genesis_.'). The source is the part after
    the last dash, and is always set in italics."""
    i = text.rfind("—")
    if i == -1 or "_" not in text[i:]:
        return text, None
    return text[:i].rstrip(), text[i + 1:].strip()

# ---- Etymology -----------------------------------------------------------
assert flat(paras[0]) == "ETYMOLOGY.", paras[0]
ety_credit = flat(paras[1])
ety_intro = [flat(paras[2])]
ety_quotes = []
for p in paras[3:6]:
    text, source = split_source(flat(p))
    assert source, p
    ety_quotes.append({"text": text, "source": source})
words = []
for line in paras[6].strip().split("\n"):
    m = re.match(r"\s*(.+?),\s{2,}(_.+_\.)\s*$", line)
    assert m, line
    words.append({"word": m.group(1).strip(), "language": m.group(2)})

# ---- Extracts --------------------------------------------------------------
head = flat(paras[7])
m = re.match(r"EXTRACTS\. (\(.+\))\.?$", head)
assert m, head
ext_credit = m.group(1) + "."                           # "(Supplied by a Sub-Sub-Librarian)."
ext_intro = [flat(paras[8]), flat(paras[9])]
assert flat(paras[10]) == "EXTRACTS."                   # repeated heading before the list itself

extracts, pending = [], []
for p in paras[11:]:
    text = flat(p)
    pending.append(text)
    last, source = split_source(text)
    if source is None:
        continue                                        # this extract runs on to the next paragraph
    pending[-1] = last
    extracts.append({"n": len(extracts) + 1, "paragraphs": [x for x in pending if x], "source": source})
    pending = []
assert not pending, pending

data = {
    "source": "Project Gutenberg eBook #2701",
    "etymology": {"credit": ety_credit, "intro": ety_intro, "quotes": ety_quotes, "words": words},
    "extracts": {"credit": ext_credit, "intro": ext_intro, "list": extracts},
}
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=1)
print(f"etymology: {len(ety_quotes)} quotes, {len(words)} words; extracts: {len(extracts)}")
