"""Rebuild verse text from Project Gutenberg #2701 (current edition), keeping every
verse id, number, boundary, tag and embedding. Paragraphs become blank lines,
_underscores_ mark italics, footnotes start with "*". para_start says whether a
verse opens a new paragraph in the book (the reading page needs it).
usage: python tools/rebuild_from_gutenberg.py pg2701.txt OLD.json NEW.json REPORT.json"""
import json, re, sys, difflib
GUT, OLD, NEW, REP = sys.argv[1:5]
raw = open(GUT, encoding='utf-8').read().replace('\r\n', '\n')
body = raw[raw.index('\n', raw.index('*** START')):raw.index('*** END')]
heads = list(re.finditer(r'^(CHAPTER (\d+)\.[^\n]*(?:\n[^\n]+)*|Epilogue)\n\n', body, re.M))
heads = heads[len(heads)//2:]            # skip the table of contents
assert len(heads) == 136, len(heads)
chap = {}
for i, m in enumerate(heads):
    n = int(m.group(2)) if m.group(2) else 136
    title = re.sub(r'^CHAPTER \d+\.\s*', '', re.sub(r'\s*\n\s*', ' ', m.group(1))).strip()
    end = heads[i+1].start() if i+1 < len(heads) else len(body)
    paras = [re.sub(r'[ \t]*\n[ \t]*', ' ', p).strip() for p in re.split(r'\n[ \t]*\n', body[m.end():end]) if p.strip()]
    chap[n] = (title, '\n\n'.join(paras))

TOK = r"[A-Za-z0-9]+(?:['’][A-Za-z]+)*"
def toks(s): return [(x.group().lower().replace('’', "'"), x.start()) for x in re.finditer(TOK, s)]
def words(s): return [t for t, _ in toks(s)]

data = json.load(open(OLD)); report = []
for ch in data:
    n = ch['chapter_number']; title, G = chap[n]
    gt = toks(G); gw = [t for t, _ in gt]
    starts = []; pos = 0
    for vi, v in enumerate(ch['verses']):
        vw = words(v['text'])
        if vi == 0: s = 0
        else:
            s = None
            for m in (8, 5, 3):                       # exact opening run
                key = vw[:m]
                for j in range(pos, len(gw) - m + 1):
                    if gw[j:j+m] == key: s = j; break
                if s is not None: break
            if s is None:                             # fuzzy fallback on the opening
                sm = difflib.SequenceMatcher(None, gw[pos:pos+400], vw[:30], autojunk=False)
                b = max(sm.get_matching_blocks(), key=lambda b: b.size)
                s = pos + b.a - b.b
        starts.append(s); pos = s + max(1, len(vw) // 2)
    for vi, v in enumerate(ch['verses']):
        a = 0 if vi == 0 else gt[starts[vi]][1]
        # pull back over opening quote/punctuation
        while a > 0 and G[a-1] not in ' \n': a -= 1
        if vi + 1 < len(starts):
            b = gt[starts[vi+1]][1]
            while b > 0 and G[b-1] not in ' \n': b -= 1
        else: b = len(G)
        new = G[a:b].strip()
        ratio = difflib.SequenceMatcher(None, words(v['text']), words(new), autojunk=False).ratio()
        extra = len(words(new)) - len(words(v['text']))
        report.append(dict(id=v['id'], ch=n, v=v['verse_number'], ratio=round(ratio, 3), extra_words=extra, old=v['text'], new=new))
        v['text'] = new
        v['para_start'] = a == 0 or G[a-1] == '\n'   # plain-text view joins verses that don't
        # key quote: best-matching span in the new verse
        kq = v.get('key_quote_text')
        if kq:
            nt = toks(new); nw = [t for t, _ in nt]; kw = words(kq)
            sm = difflib.SequenceMatcher(None, nw, kw, autojunk=False)
            bl = [x for x in sm.get_matching_blocks() if x.size]
            if bl:
                i0, i1 = bl[0].a, bl[-1].a + bl[-1].size - 1
                qa = nt[i0][1]
                while qa > 0 and new[qa-1] not in ' \n': qa -= 1
                qb = nt[i1][1] + len(nt[i1][0])
                while qb < len(new) and new[qb] not in ' \n': qb += 1
                v['key_quote_text'] = new[qa:qb].strip()
    ch['title'] = title
json.dump(data, open(NEW, 'w'), indent=2, ensure_ascii=False)
json.dump(report, open(REP, 'w'), indent=1, ensure_ascii=False)
bad = [r for r in report if r['ratio'] < 0.97 or abs(r['extra_words']) > 3]
print(len(report), 'verses;', len(bad), 'need a look')
for r in sorted(bad, key=lambda r: r['ratio'])[:40]:
    print(f"ch{r['ch']} v{r['v']} ratio={r['ratio']} extra={r['extra_words']}")
