/* PREVIEW ONLY. Not part of the live site and never deployed.

   The static preview has no Flask server, so this script stands in for it:
   - Asking: picks one of a few hand-written stand-in verses (clearly
     labelled), and matches real passages by keyword rather than meaning.
   - The concordance: filters the real tagged verses in the browser, so
     tag results are the same as the live site's.
   Everything else on the page is the real template. */

(function () {
  'use strict';
  var KEY = 'mdb-preview';

  var STAND_INS = [
    'There is a kind of weather that lives only in the hour before a thing begins. The sails hang neither full nor slack, the men speak lower than they need to, and every rope seems to remember a strain it has not yet borne. A sailor learns to stand in that hour as in a doorway, and to take no great comfort from the frame.',
    'I have known mates who could read a squall by the colour of a gull\u2019s underside, and could not read their own hearts by any light at all. It is not that the heart is darker than the sea; it is only that we were never apprenticed to it, and no captain thinks to post a lookout there.',
    'Consider the ship\u2019s cat, who keeps no watch and signs no articles, and yet is fed. She regards the crew as a magistrate regards a docket: with patience, with some contempt, and with the settled conviction that the verdict was reached long before any of us came aboard.',
    'Let a man promise the sea anything, and the sea will hold him to it in its own time. It keeps no ledger, yet forgets no debt; it sends no letters, yet every tide is a reminder. I do not say this to frighten you. I say it because the tide is coming in, and you are standing where you stood.',
    'The longest voyages are not measured in leagues but in afternoons, and the afternoons are not measured at all. They are simply endured, as a hull endures water: on every side, without remark, and with a faint groaning in the timbers that only the carpenter admits to hearing.',
    'Ambition is a harpoon with no line made fast to it. It flies well enough, and strikes, and is gone; and the man who threw it stands with his arm still out, feeling foolish and oddly light, looking at the place in the water where something was.',
    'Every ordinary day at sea is a small sermon preached to a congregation that has stopped listening. The sun comes up out of the same water; the biscuit is no better; the horizon keeps its distance with a courtesy that borders on insult. And yet a man who attends to it closely may come away converted to something, if only to patience.',
    'Fear is a good shipmate so long as he keeps to the forecastle. Let him into the cabin and he will rearrange the charts; let him take the wheel and he will steer for the nearest rock out of sheer terror of missing it.'
  ];

  var STOP = ('a an and are as at be but by do does for from had has have he her his how i if in into is it its me my no not of on or our she so than that the their them then there they this to too up us was we were what when where which who why will with would you your am im dont can just about like get got feel feels make makes'
    ).split(' ').reduce(function (o, w) { o[w] = 1; return o; }, {});
  var SYN = {
    sad: ['sorrow', 'grief', 'woe', 'melancholy'], sadness: ['sorrow', 'grief', 'woe'], lonely: ['alone', 'solitude', 'isolation'],
    loneliness: ['alone', 'solitude', 'isolation'], fear: ['dread', 'terror', 'afraid'], afraid: ['fear', 'dread'],
    anxious: ['anxiety', 'dread'], anxiety: ['dread', 'fear'], work: ['labor', 'labour', 'toil'], job: ['labor', 'toil', 'work'],
    sunday: ['sabbath'], money: ['purse', 'pay', 'dollars'], cat: ['cat', 'cats'], dog: ['dog', 'dogs'], love: ['love', 'heart'],
    death: ['death', 'dead', 'mortality', 'grave'], die: ['death', 'dead'], angry: ['rage', 'wrath', 'fury'], anger: ['rage', 'wrath'],
    ambition: ['ambition', 'glory', 'pride'], promise: ['vow', 'oath', 'pledge'], tuesday: ['day', 'days'], ordinary: ['common'],
    god: ['god', 'heaven', 'deity'], meaning: ['meaning', 'significance'], tired: ['weary', 'weariness'], meeting: ['meeting', 'assembly']
  };

  function stem(w) {
    return w.replace(/(ing|edly|ed|ly|es|s)$/, '').replace(/(.)\1$/, '$1') || w;
  }
  function tokens(s) {
    return String(s).toLowerCase().replace(/[^a-z\s]+/g, ' ').split(/\s+/).filter(function (w) { return w.length > 2 && !STOP[w]; });
  }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  function save(o) {
    var s = JSON.stringify(o);
    try { sessionStorage.setItem(KEY, s); } catch (e) { /* ignore */ }
    try { window.name = 'mdbp:' + s; } catch (e) { /* ignore */ }
  }
  function load() {
    var s = null;
    try { s = sessionStorage.getItem(KEY); } catch (e) { /* ignore */ }
    if (!s && window.name.indexOf('mdbp:') === 0) s = window.name.slice(5);
    try { return s ? JSON.parse(s) : null; } catch (e) { return null; }
  }

  var corpus = null;
  function getCorpus() {
    if (corpus) return Promise.resolve(corpus);
    return fetch('static/preview-corpus.json').then(function (r) { return r.json(); }).then(function (d) {
      corpus = [];
      d.forEach(function (ch) {
        ch[2].forEach(function (v) { corpus.push({ c: ch[0], title: ch[1], n: v[0], text: v[1], tags: v[2] }); });
      });
      return corpus;
    });
  }

  function rank(q, list) {
    var terms = [];
    tokens(q).forEach(function (w) { terms.push(stem(w)); (SYN[w] || []).forEach(function (s) { terms.push(stem(s)); }); });
    if (!terms.length) terms = ['sea'];
    var N = list.length, df = {}, docs = list.map(function (v) {
      var tagWords = [];
      Object.keys(v.tags || {}).forEach(function (k) { (v.tags[k] || []).forEach(function (t) { tagWords.push(t); }); });
      var toks = tokens(v.text).map(stem), tt = tokens(tagWords.join(' ')).map(stem), tf = {};
      toks.forEach(function (t) { tf[t] = (tf[t] || 0) + 1; });
      tt.forEach(function (t) { tf[t] = (tf[t] || 0) + 2; });
      Object.keys(tf).forEach(function (t) { df[t] = (df[t] || 0) + 1; });
      return { v: v, tf: tf, len: toks.length + 1 };
    });
    var avg = docs.reduce(function (a, d) { return a + d.len; }, 0) / N;
    docs.forEach(function (d) {
      var s = 0;
      terms.forEach(function (t) {
        var f = d.tf[t]; if (!f) return;
        var idf = Math.log(1 + (N - df[t] + 0.5) / (df[t] + 0.5));
        s += idf * (f * 2.2) / (f + 1.2 * (0.25 + 0.75 * d.len / avg));
      });
      d.s = s;
    });
    return docs.filter(function (d) { return d.s > 0; }).sort(function (a, b) { return b.s - a.s; }).map(function (d) { return d.v; });
  }

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function gam(v, n) {
    var a = el('article', 'mdb-gam mdb-frame');
    a.setAttribute('data-canon', '');
    if (n != null) {
      var head = el('div', 'mdb-gam-head');
      head.innerHTML = '<svg aria-hidden="true"><use href="#mdb-ship"/></svg>';
      var sp = el('span'); var st = el('strong', null, (['First', 'Second', 'Third'][n] || 'Another') + ' ship hailed us');
      sp.appendChild(st); sp.appendChild(document.createTextNode(' with a passage from the novel'));
      head.appendChild(sp); a.appendChild(head);
    }
    var body = el('div', 'mdb-passage');
    v.text.split('\n\n').forEach(function (para) {
      var p = el('p', para.charAt(0) === '*' ? 'mdb-fnote' : null);
      para.split(/_([^_]+)_/).forEach(function (bit, i) { p.appendChild(i % 2 ? el('em', null, bit) : document.createTextNode(bit)); });
      body.appendChild(p);
    });
    a.appendChild(body);
    var cite = el('p', 'mdb-cite', 'Chapter ' + v.c + ', ' + v.title.replace(/\.$/, '') + ' ');
    cite.appendChild(el('span', null, '\u00b7 verse ' + v.n));
    var row = el('div', 'mdb-cite-row');
    row.appendChild(cite);
    var ctx = el('a', 'mdb-context', 'Read in context >');
    ctx.href = 'chapter-' + v.c + '.html#' + v.n;
    row.appendChild(ctx);
    a.appendChild(row);
    return a;
  }
  function note(text) {
    var col = document.querySelector('.mdb-col');
    if (!col) return;
    var p = el('p', 'mdb-preview-note');
    p.innerHTML = text;
    col.insertBefore(p, col.firstChild);
  }
  function go(url, delay) { setTimeout(function () { location.href = url; }, delay); }

  var page = location.pathname.split('/').pop() || 'index.html';

  // ---- forms: stand in for the POSTs -------------------------------------
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (f.id === 'search-form') {
      e.preventDefault();
      var q = f.querySelector('[name="query"]').value.trim();
      if (!q) return;
      save({ type: 'ask', q: q, n: 0 });
      go('results.html', 2600);
    } else if (f.id === 'mdb-reroll') {
      e.preventDefault();
      var st = load() || { type: 'ask', q: f.querySelector('[name="query"]').value, n: 0 };
      st.n = (st.n || 0) + 1;
      save(st);
      go('results.html', 2200);
    } else if (f.id === 'tag-form') {
      e.preventDefault();
      var cat = f.querySelector('input[name="category"]:checked');
      var tag = f.querySelector('[name="tag"]').value.trim();
      if (!cat || !tag) return;
      save({ type: 'tag', category: cat.value, label: cat.parentNode.textContent.trim(), tag: tag });
      go('tag-results.html', 150);
    }
  }, true);

  // ---- tag links on the reading pages: the live site serves GET /tag ---------
  var LABELS = { themes: 'Themes', feeling: 'Feeling', vibe: 'Vibe', symbolism: 'Symbolism', literary_motifs: 'Literary Motifs', entities: 'Entities' };
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a.rd-tag');
    if (!a) return;
    e.preventDefault();
    var qs = new URLSearchParams(a.getAttribute('href').split('?')[1] || '');
    save({ type: 'tag', category: qs.get('category'), label: LABELS[qs.get('category')] || qs.get('category'), tag: qs.get('tag') });
    location.href = 'tag-results.html';
  }, true);

  // ---- pages ---------------------------------------------------------------
  if (page === 'index.html' || page === '') {
    note('Preview build, not live. Asking uses stand-in verses and keyword matching; the live site writes a new verse and matches by meaning. The concordance and the <a href="read.html" style="color:inherit">reading pages</a> work for real. Also see the <a href="404.html" style="color:inherit">404 page</a>.');
  }

  if (page === 'results.html') {
    var st = load();
    note('Preview: the verse below is one of a few hand-written stand-ins, and the passages are matched by keyword. On the live site both come from your question.');
    if (st && st.type === 'ask' && st.q) {
      getCorpus().then(function (list) {
        var q = st.q, n = st.n || 0;
        var verse = STAND_INS[(hash(q) + n) % STAND_INS.length];
        var hits = rank(q, list);
        if (hits.length < 3 + n * 3) hits = hits.concat(list.filter(function (v, i) { return (i * 7 + hash(q)) % 97 === 0; }));
        var picks = hits.slice((n * 3) % Math.max(3, hits.length - 2), (n * 3) % Math.max(3, hits.length - 2) + 3);
        var title = document.getElementById('mdb-query-title');
        if (title) title.textContent = 'On ' + (q.length > 80 ? q.slice(0, 79) + '\u2026' : q);
        document.getElementById('mdb-verse').textContent = verse;
        var box = document.getElementById('mdb-canon');
        box.innerHTML = '';
        picks.forEach(function (v, i) { box.appendChild(gam(v, i)); });
        var keep = document.getElementById('mdb-keep');
        if (keep) keep.setAttribute('data-query', q);
        var hidden = document.querySelector('#mdb-reroll [name="query"]');
        if (hidden) hidden.value = q;
        if (window.MDBRepaintKeep) window.MDBRepaintKeep();
      });
    }
  }

  if (page === 'tag-results.html') {
    var ts = load();
    note('Preview: these are the real tagged passages, filtered in your browser exactly as the live site does.');
    if (ts && ts.type === 'tag') {
      getCorpus().then(function (list) {
        var want = ts.tag.toLowerCase();
        var found = list.filter(function (v) {
          return ((v.tags || {})[ts.category] || []).some(function (t) { return t.toLowerCase() === want; });
        });
        document.title = ts.tag + ' | The Moby-Dick Bible';
        var path = document.getElementById('mdb-tag-path');
        path.innerHTML = '';
        path.appendChild(document.createTextNode(ts.label + ' '));
        path.appendChild(el('span', null, '\u203a'));
        path.appendChild(document.createTextNode(' ' + ts.tag));
        document.getElementById('mdb-tag-title').textContent = ts.tag;
        document.getElementById('mdb-tag-count').textContent = found.length
          ? found.length + ' passage' + (found.length === 1 ? '' : 's') + ' in the novel carry this mark, in the order they appear.' : '';
        var box = document.getElementById('mdb-tag-list');
        box.innerHTML = '';
        if (!found.length) {
          var d = el('div', 'mdb-frame mdb-prose');
          d.innerHTML = '<p><strong>Nothing is written under this mark.</strong> Check the spelling, or pick one from the list as you type.</p><p class="mdb-crew"><b>Stubb</b> has looked twice and found only water.</p>';
          box.appendChild(d);
        }
        found.forEach(function (v) { box.appendChild(gam(v)); });
      });
    }
  }
})();
