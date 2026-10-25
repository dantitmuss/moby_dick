"""Draw the share cards (Open Graph images) for every indexable page.

Run from the repo root:  python tools/make_og_cards.py
Needs Pillow locally (pip install pillow); the server only serves the PNGs.

Writes static/images/og/<name>.png (1200 x 630) and static/images/og/cards.json,
which app.py reads to pick each page's card, alt text and cache-busting version.
Rerun it whenever a topic, its famous line or a chapter title changes.

The look follows the site: the night sea from static/scene.js drawn at 4x,
the Pequod and moon sprites, Press Start 2P for the site's own words and
Crimson Pro italic for Melville's. Every Melville line is copied verbatim
from the verse data (Gutenberg #2701); a line too long for the card is cut at
a word and ends in an ellipsis, never reworded.
"""
import hashlib, json, pathlib, random, re
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "static/images/og"
PIXEL = str(ROOT / "tools/fonts/PressStart2P-Regular.woff")
SERIF_I = str(ROOT / "tools/fonts/CrimsonPro-Italic.woff")
SPRITES = ROOT / "static/images/sprites"

W, H, PX = 1200, 630, 4
w, h = W // PX, H // PX + 1
C = dict(sky0="#0a1324", sky1="#0e1a2f", sky2="#132240", sky3="#1a2b4b",
         sea0="#1d3354", sea1="#16294a", sea2="#11213d", sea3="#0c182e",
         crest="#35507a", crestHi="#5b7aa6", star="#c9d2e3", starDim="#5d6c88", glint="#d9c995")
BONE, FOG, BRASS, BLOOD = "#ece3cb", "#a3afc0", "#f2a93b", "#a3242c"
X0, TEXT_W, QUOTE_W = 72, 640, 640
QUOTE_MAX = 150          # characters of Melville on a card before it is cut
SCENE_ALT = "Pixel-art night sea with the Pequod under a full moon."


# ---- the scene ------------------------------------------------------------

def _scene():
    im = Image.new("RGB", (w, h), C["sky0"]); d = ImageDraw.Draw(im)
    hz = int(h * 0.70)
    bands = [C["sky0"], C["sky1"], C["sky2"], C["sky3"]]; step = -(-hz // 4)
    for i, c in enumerate(bands):
        d.rectangle([0, i * step, w, i * step + step], fill=c)
        if i:  # dither the seam between bands, as scene.js does
            for x in range(i % 2, w, 2): d.point((x, i * step), fill=bands[i - 1])
            for x in range((i + 1) % 2, w, 4): d.point((x, i * step + 1), fill=bands[i - 1])
    r = random.Random(1851)
    for _ in range(w * hz // 70):
        x, y, b = r.randrange(w), r.randrange(hz - 4), r.random()
        if b > 0.4: d.point((x, y), fill=C["star"] if b > 0.85 else C["starDim"])
    sea = [C["sea0"], C["sea1"], C["sea2"], C["sea3"]]; depth = h - hz; bh = -(-depth // 4)
    for i, c in enumerate(sea): d.rectangle([0, hz + i * bh, w, hz + i * bh + bh], fill=c)
    d.line([0, hz, w, hz], fill=C["crest"])
    row, k = 2, 0
    while hz + row < h:  # rows of wave crests, nearer rows longer
        y = hz + row; near = row / depth; period = 9 + int(near * 18); ln = 2 + int(near * 5)
        off, dr = k * 7, (1 if k % 2 else -1)
        for x in range(-period, w + period):
            ph = (x + dr * off) % period
            if ph < ln:
                bob = 0 if (x // period) % 2 else 1
                d.point((x, y - bob), fill=C["crestHi"] if near > 0.6 and ph == 0 else C["crest"])
        row += 3 if k < 3 else 4; k += 1
    mx = int(w * 0.86)
    for ry in range(hz + 2, h, 2):  # moonlight on the water
        spread = 2 + (ry - hz) // 3; s = (ry * 31) % 97
        ww = 1 + s % spread; dx = s % (spread * 2 + 1) - spread
        d.line([mx + dx, ry, mx + dx + ww - 1, ry], fill=C["glint"])
    moon = Image.open(SPRITES / "moon.png"); im.paste(moon, (mx - 20, max(2, int(hz * 0.22) - 14)), moon)
    ship = Image.open(SPRITES / "pequod.png"); im.paste(ship, (int(w * 0.70), hz + 9 - ship.height), ship)
    gull = Image.open(SPRITES / "gull.png")
    for gx, gy in [(0.66, 0.12), (0.71, 0.05)]: im.paste(gull, (int(w * gx), int(hz * gy)), gull)
    return im.resize((w * PX, h * PX), Image.NEAREST).crop((0, 0, W, H))

SCENE = None


# ---- text -----------------------------------------------------------------

def _wrap(text, font, max_w):
    lines = [""]
    for word in text.split():
        t = (lines[-1] + " " + word).strip()
        if font.getlength(t) <= max_w or not lines[-1]: lines[-1] = t
        else: lines.append(word)
    return lines

def clip(line):
    """Melville's words, cut at a word with an ellipsis if too long for a card."""
    line = line.strip()
    if len(line) <= QUOTE_MAX: return line
    cut = line[:QUOTE_MAX].rsplit(" ", 1)[0].rstrip(",;:—-")
    return cut + "…"

def card(name, kicker, title, line=None):
    global SCENE
    if SCENE is None: SCENE = _scene()
    im = SCENE.copy(); d = ImageDraw.Draw(im); d.fontmode = "1"
    y = 72
    d.text((X0, y), kicker.upper(), font=ImageFont.truetype(PIXEL, 24), fill=BRASS); y += 58
    for size, max_lines in [(56, 1), (48, 2), (40, 3), (32, 5)]:
        tf = ImageFont.truetype(PIXEL, size); tl = _wrap(title.upper(), tf, TEXT_W)
        if len(tl) <= max_lines: break
    for ln in tl:
        sh = size // 8
        d.text((X0 + sh, y + sh), ln, font=tf, fill=BLOOD); d.text((X0, y), ln, font=tf, fill=BONE)
        y += int(size * 1.4)
    shown = None
    if line:
        qf = ImageFont.truetype(SERIF_I, 38)
        room = max(1, (H - 72 - 16 - 40 - (y + 14)) // 46)   # lines that fit above the footer
        line = line.replace("_", "")   # the data's _italics_ marks; the card is italic already
        if line.endswith("”") and "“" not in line: line = line[:-1]   # stray close of a longer speech
        ql = _wrap(line if line.startswith("“") else f"“{line}”", qf, QUOTE_W)   # speech has its own marks
        if len(ql) > room:
            ql = ql[:room]; ql[-1] = ql[-1].rstrip("”").rstrip(",;:—-") + "…”"
        d.fontmode = "L"; y += 14
        for ln in ql: d.text((X0, y), ln, font=qf, fill=BONE); y += 46
        shown = " ".join(ql)
    d.fontmode = "1"
    d.text((X0, H - 72 - 16), "MOBYDICKBIBLE.COM", font=ImageFont.truetype(PIXEL, 16), fill=FOG)
    path = OUT / f"{name}.png"
    im.quantize(colors=128, method=Image.Quantize.MEDIANCUT).save(path, optimize=True)
    alt = f"{SCENE_ALT} {kicker}: {title}." + (f" {shown}" if shown else "")
    return {"file": f"images/og/{name}.png", "alt": alt,
            "v": hashlib.sha1(path.read_bytes()).hexdigest()[:10]}


# ---- what goes on each card -------------------------------------------------

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    data = json.load(open(ROOT / "moby_dick_2025-03-22.json", encoding="utf-8"))
    topics = json.load(open(ROOT / "concordance_topics.json", encoding="utf-8"))["topics"]
    front = json.load(open(ROOT / "front_matter.json", encoding="utf-8"))
    verse = {(c["chapter_number"], v["verse_number"]): v for c in data for v in c["verses"]}
    famous = next(t for t in topics if t["slug"] == "famous-quotes")
    rank = {tuple(cv): i for i, cv in enumerate(famous["order"])}   # 0 = most famous

    def best_line(keys, used=()):
        """The most famous line among these verses not already on another card, or None."""
        ranked = sorted((rank[k], k) for k in keys if k in rank and verse[k].get("key_quote_text"))
        lines = [verse[k]["key_quote_text"] for _, k in ranked if verse[k]["key_quote_text"] not in used]
        # the most famous line that fits a card whole and ends a sentence, then one that fits,
        # else the most famous one, cut
        whole = [x for x in lines if len(x) <= 120]
        return next((x for x in whole if x.rstrip("”’")[-1:] in ".!?"), whole[0] if whole else (lines[0] if lines else None))

    def opening(chapter):
        """First sentence of the chapter, word for word."""
        text = chapter["verses"][0]["text"].split("\n\n")[0]
        m = re.match(r"(.+?[.!?](?:[”’])?)(\s|$)", text)
        return m.group(1) if m else text

    def check(line):
        assert line.rstrip("…") in " ".join(v["text"] for v in verse.values()) + json.dumps(front, ensure_ascii=False), line
        return line

    cards = {}
    cards["/"] = card("home", "The Moby-Dick Bible", "Ask the book anything", check("Call me Ishmael."))
    cards["/read"] = card("read", "The Moby-Dick Bible", "Read the whole book",
                          check("It is not down in any map; true places never are."))
    cards["/concordance"] = card("concordance", "The Moby-Dick Bible", "The concordance",
                                 check("I try all things; I achieve what I can."))
    cards["/about"] = card("about", "The Moby-Dick Bible", "About this site",
                           check("This whole book is but a draught—nay, but the draught of a draught."))
    cards["/read/etymology-and-extracts"] = card("etymology-and-extracts", "Before Chapter 1", "Etymology and Extracts",
        check("He loved to dust his old grammars; it somehow mildly reminded him of his mortality."))

    def topic_keys(t):
        if "order" in t:
            return {tuple(x) for x in t["order"]}
        wanted = set(t["tags"])
        keys = {k for k, v in verse.items()
                if any(x.strip().lower() in wanted for tags in v["open_ai_tags"].values() for x in tags)}
        return keys | {tuple(x) for x in t.get("include", [])}

    # Each topic gets its own line, chosen in the order the topics are listed (characters
    # first), so the same famous line never sits on two topic cards. The famous-quotes
    # page is exempt: its card always carries the most famous line of all.
    titles = {c["title"].rstrip(".") for c in data}   # a quoted chapter title is not a line
    keys = {t["slug"]: topic_keys(t) for t in topics}
    order = topics
    used, lines = set(), {}
    for t in order:
        line = t.get("card_line") or (best_line(keys[t["slug"]]) if "order" in t else best_line(keys[t["slug"]], used))
        if not line:   # no famous verse left: the first Melville quotation in the intro
            q = [x for x in re.findall(r"“([^”]{6,})”", " ".join(t["intro"])) if x.rstrip(".") not in titles]
            line = q[0] if q else None
        used.add(line); lines[t["slug"]] = line
    for t in topics:
        line = lines[t["slug"]]
        cards[f"/concordance/{t['slug']}"] = card(f"topic-{t['slug']}", "The concordance", t["name"],
                                                  check(clip(line)) if line else None)

    for ch in data:
        n = ch["chapter_number"]
        title = ch["title"].rstrip(".")
        line = best_line({(n, v["verse_number"]) for v in ch["verses"]}) or opening(ch)
        kicker = "After Chapter 135" if n == 136 else f"Chapter {n}"
        cards[f"/read/chapter-{n}"] = card(f"chapter-{n}", kicker, title, check(clip(line)))

    json.dump(cards, open(OUT / "cards.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    size = sum(p.stat().st_size for p in OUT.glob("*.png"))
    print(f"{len(cards)} cards, {size / 1e6:.1f} MB in {OUT.relative_to(ROOT)}")

if __name__ == "__main__":
    main()
