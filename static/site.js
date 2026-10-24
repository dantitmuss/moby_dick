/* Page behaviour for the Moby-Dick Bible. Every form still does a real POST;
   nothing here replaces the backend. Each block checks for its own elements
   and quietly does nothing on pages that lack them. */

(function () {
  'use strict';

  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(id) { return document.getElementById(id); }

  /* Every quotation below is checked against the Project Gutenberg text
     (#2701) as held in moby_dick_2025-03-22.json. Run tools/check_quotes.py
     after changing any of them. */
  var QUOTES = [
    'It is not down in any map; true places never are.',
    'Ignorance is the parent of fear.',
    'I know not all that may be coming, but be it what it will, I\u2019ll go to it laughing.',
    'Better sleep with a sober cannibal than a drunken Christian.',
    'Talk not to me of blasphemy, man; I\u2019d strike the sun if it insulted me.',
    'Think not, is my eleventh commandment; and sleep when you can, is my twelfth.',
    'As for me, I am tormented with an everlasting itch for things remote.',
    'All my means are sane, my motive and my object mad.',
    'Real strength never impairs beauty or harmony, but it often bestows it.',
    'An utterly fearless man is a far more dangerous comrade than a coward.',
    'For we are all killers, on land and on sea; Bonapartes and Sharks included.',
    'There is a wisdom that is woe; but there is a woe that is madness.',
    'See how elastic our stiff prejudices grow when love once comes to bend them.',
    'Human madness is oftentimes a cunning and most feline thing.',
    'Consider the subtleness of the sea; how its most dreaded creatures glide under water, unapparent for the most part.',
    'Because no man can ever feel his own identity aright except his eyes be closed.',
    'For as this appalling ocean surrounds the verdant land, so in the soul of man there lies one insular Tahiti.',
    'Yes, as every one knows, meditation and water are wedded for ever.',
    'I try all things; I achieve what I can.'
  ];

  /* Crew talk while the line is out. These are the site's own words, said
     in character, and are never shown in quotation marks. */
  var CREW = [
    ['Stubb', 'hold on, I\u2019m lighting my pipe first.'],
    ['Stubb', 'it\u2019s thinking. Or it\u2019s asleep. Hard to tell with books.'],
    ['Starbuck', 'steady. The sea answers slowly, and that is its right.'],
    ['Starbuck', 'I would not ask it that. But you have, so we wait.'],
    ['Pip', 'the line goes down and down and down.'],
    ['Pip', 'something is reading your question back to itself.'],
    ['Ahab', 'it will answer. It must.'],
    ['Flask', 'I\u2019ve no patience for meaning. Give me the chapter number.'],
    ['The clerk', 'notes the hour, the weather, and one question cast.']
  ];

  /* ---- Sound: off by default, a soft sea made in the browser ------------ */
  (function () {
    var btn = $('mdb-sound');
    if (!btn) return;
    var ctx = null, gain = null;
    function start() {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { btn.hidden = true; return; }
      ctx = new AC();
      var len = ctx.sampleRate * 4;
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var data = buf.getChannelData(0), last = 0;
      for (var i = 0; i < len; i++) {            // brown noise
        var w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        data[i] = last * 3.2;
      }
      var src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
      gain = ctx.createGain(); gain.gain.value = 0;
      var lfo = ctx.createOscillator(); lfo.frequency.value = 0.09;
      var lfoAmt = ctx.createGain(); lfoAmt.gain.value = 0.05;
      lfo.connect(lfoAmt); lfoAmt.connect(gain.gain);
      src.connect(lp); lp.connect(gain); gain.connect(ctx.destination);
      src.start(); lfo.start();
    }
    btn.addEventListener('click', function () {
      var on = btn.getAttribute('aria-pressed') !== 'true';
      if (on && !ctx) start();
      if (!ctx) return;
      if (on && ctx.state === 'suspended') ctx.resume();
      gain.gain.setTargetAtTime(on ? 0.1 : 0, ctx.currentTime, 0.6);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.textContent = on ? 'Sound: on' : 'Sound: off';
    });
  })();

  /* ---- Easier reading: book typeface for long text, remembered here --- */
  (function () {
    // The header button, plus any extra copies (e.g. the reading page's floating switch).
    var btns = document.querySelectorAll('#mdb-easy, [data-easy-toggle]');
    if (!btns.length) return;
    var root = document.documentElement;
    function paint() {
      var on = root.classList.contains('easy-read') ? 'true' : 'false';
      Array.prototype.forEach.call(btns, function (b) { b.setAttribute('aria-pressed', on); });
    }
    paint();
    Array.prototype.forEach.call(btns, function (btn) {
      btn.addEventListener('click', function () {
        var on = !root.classList.contains('easy-read');
        root.classList.toggle('easy-read', on);
        try { localStorage.setItem('mdb-easy', on ? '1' : '0'); } catch (e) { /* not remembered */ }
        paint();
      });
    });
  })();

  /* ---- Ask form: placeholder, count, the line going out ---------------- */
  (function () {
    var form = $('search-form'), field = $('query'), count = $('query-count');
    if (!form || !field) return;

    var PLACEHOLDERS = [
      'the weight of Sunday nights\u2026',
      'why ambition never feels finished\u2026',
      'whether the cat is judging me\u2026',
      'a promise I didn\u2019t keep\u2026',
      'the loneliness of long meetings\u2026',
      'what to do with an ordinary Tuesday\u2026'
    ];
    var ph = 0;
    if (!calm) setInterval(function () {
      if (document.activeElement === field || field.value) return;
      ph = (ph + 1) % PLACEHOLDERS.length;
      field.placeholder = PLACEHOLDERS[ph];
    }, 2800);

    function updateCount() {
      if (count) count.textContent = field.value.length + ' / 500';
    }
    field.addEventListener('input', updateCount);
    updateCount();

    // Enter sends, Shift+Enter makes a new line
    field.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        if (field.value.trim()) form.requestSubmit ? form.requestSubmit() : form.submit();
      }
    });
  })();

  /* ---- Loading overlay, used by ask and reroll ------------------------- */
  var Loading = (function () {
    var overlay = $('mdb-loading');
    if (!overlay) return null;
    var drift = $('mdb-drift'), crew = $('mdb-loading-crew'), reel = $('mdb-reel');
    var timers = [], qi = Math.floor(Math.random() * QUOTES.length), interval = 1600;

    function spawnQuote() {
      var el = document.createElement('div');
      el.className = 'mdb-drift';
      el.textContent = '\u201c' + QUOTES[qi++ % QUOTES.length] + '\u201d';
      var dur = 6 + Math.random() * 3;
      el.style.top = (4 + Math.random() * 80) + '%';
      el.style.left = (2 + Math.random() * 66) + '%';
      el.style.fontSize = (19 + Math.random() * 8) + 'px';
      el.style.setProperty('--dur', dur + 's');
      el.style.setProperty('--peak', (0.12 + Math.random() * 0.12).toFixed(2));
      el.style.setProperty('--drift', (18 + Math.random() * 26) + 'px');
      drift.appendChild(el);
      timers.push(setTimeout(function () { el.remove(); }, (dur + 0.4) * 1000));
    }
    function loop() {
      spawnQuote();
      interval = Math.max(800, interval * 0.88);
      timers.push(setTimeout(loop, interval));
    }
    function sayCrew() {
      var c = CREW[Math.floor(Math.random() * CREW.length)];
      crew.innerHTML = '';
      var b = document.createElement('b'); b.textContent = c[0];
      crew.appendChild(b);
      crew.appendChild(document.createTextNode(' ' + c[1]));
    }

    // the little reel: a line paying out into the swell
    var rctx = reel && reel.getContext('2d'), rt = 0, rraf = 0;
    function drawReel() {
      if (!rctx) return;
      var W = 40, H = 24;
      rctx.fillStyle = '#0a1324'; rctx.fillRect(0, 0, W, H);
      rctx.fillStyle = '#16294a'; rctx.fillRect(0, 14, W, 10);
      rctx.fillStyle = '#35507a';
      for (var x = 0; x < W; x++) if (((x + Math.floor(rt / 3)) % 7) < 2) rctx.fillRect(x, 14 + ((Math.floor((x + rt) / 7)) % 2), 1, 1);
      rctx.fillStyle = '#b38e5e';
      var bob = Math.floor(rt / 8) % 2;
      for (var i = 0; i < 18; i++) rctx.fillRect(4 + i, 2 + Math.floor(i * 0.65) + (i > 14 ? bob : 0), 1, 1);
      rctx.fillStyle = '#f7f4ea'; rctx.fillRect(21, 13 + bob, 2, 1);
      rt++;
      rraf = calm ? 0 : requestAnimationFrame(function () { setTimeout(drawReel, 70); });
    }

    function show() {
      sayCrew();
      overlay.classList.add('active');
      drawReel();
      if (!calm) {
        loop();
        timers.push(setTimeout(spawnQuote, 800));
        timers.push(setInterval(sayCrew, 3800));
      }
    }
    function hide() {
      overlay.classList.remove('active');
      timers.forEach(function (t) { clearTimeout(t); clearInterval(t); });
      timers = [];
      if (drift) drift.textContent = '';
      cancelAnimationFrame(rraf);
    }
    // coming back through the back/forward cache must not leave it showing
    window.addEventListener('pageshow', function (e) { if (e.persisted) hide(); });
    return { show: show, hide: hide };
  })();
  window.MDBLoading = Loading;

  ['search-form', 'mdb-reroll'].forEach(function (id) {
    var f = $(id);
    if (!f || !Loading) return;
    f.addEventListener('submit', function () {
      if (window.MDBScene) window.MDBScene.throwLine();
      setTimeout(Loading.show, calm ? 0 : 450);
    });
  });

  /* ---- The chart: tag categories and autocomplete ---------------------- */
  (function () {
    var form = $('tag-form'), input = $('tag');
    if (!form || !input) return;
    var tagsData = {}, aw = null, current = [];

    function selected() {
      var r = form.querySelector('input[name="category"]:checked');
      return r ? r.value : '';
    }
    function sample(arr, n) { return arr.slice().sort(function () { return 0.5 - Math.random(); }).slice(0, n); }

    function apply() {
      var cat = selected();
      current = (tagsData[cat] || []).slice().sort(function (a, b) {
        return a.toLowerCase().localeCompare(b.toLowerCase());
      });
      input.disabled = !cat;
      input.placeholder = cat ? 'Start typing, or pick from the list' : 'Choose a category first';
      if (!window.Awesomplete) return;
      if (!aw) {
        aw = new Awesomplete(input, {
          list: current, minChars: 1, autoFirst: true, maxItems: 60,
          filter: function (text, typed) {
            var q = typed.toLowerCase();
            return String(text).toLowerCase().split(/\s+/).some(function (w) { return w.indexOf(q) === 0; });
          }
        });
      } else {
        aw.list = current;
      }
    }

    form.addEventListener('change', function (e) {
      if (e.target.name === 'category') { input.value = ''; apply(); input.focus(); }
    });
    input.addEventListener('focus', function () {
      if (aw && !input.value && current.length) { aw.list = sample(current, 10); aw.minChars = 0; aw.evaluate(); }
    });
    input.addEventListener('input', function () {
      if (aw) { aw.list = current; aw.minChars = 1; }
    });
    input.addEventListener('awesomplete-selectcomplete', function () {
      if (form.requestSubmit) form.requestSubmit(); else form.submit();
    });

    fetch(form.getAttribute('data-tags') || '/tags.json')
      .then(function (r) { return r.json(); })
      .then(function (data) { tagsData = data; apply(); })
      .catch(function () { input.placeholder = 'Tags did not load. Type one in and press Show passages.'; input.disabled = false; });
    apply();
  })();

  /* ---- The ship's log: kept verses, on this device only ---------------- */
  var Log = (function () {
    var KEY = 'mdb-kept';
    function read() {
      try {
        var raw = JSON.parse(localStorage.getItem(KEY)) || [];
        // older versions kept bare strings
        return raw.map(function (e) { return typeof e === 'string' ? { verse: e } : e; });
      } catch (e) { return []; }
    }
    function write(list) {
      try { localStorage.setItem(KEY, JSON.stringify(list.slice(-50))); return true; } catch (e) { return false; }
    }
    return { read: read, write: write };
  })();
  window.MDBLog = Log;

  function renderLog() {
    var entries = Log.read().slice().reverse();
    var list = $('mdb-log-list'), empty = $('mdb-log-empty');
    if (!list) return;
    if (empty) empty.hidden = entries.length > 0;
    list.innerHTML = '';
    entries.forEach(function (e, i) {
      var li = document.createElement('li');
      li.className = 'mdb-log-entry';
      var meta = document.createElement('div');
      meta.className = 'mdb-log-meta';
      var no = document.createElement('span');
      no.textContent = 'Entry ' + String(entries.length - i).padStart(2, '0');
      var when = document.createElement('span');
      when.textContent = e.at ? new Date(e.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date not recorded';
      meta.appendChild(no); meta.appendChild(when);
      li.appendChild(meta);
      if (e.q) {
        var q = document.createElement('p');
        q.className = 'mdb-log-q';
        q.textContent = 'On ' + e.q;
        li.appendChild(q);
      }
      var v = document.createElement('p');
      v.textContent = e.verse;
      li.appendChild(v);
      var strike = document.createElement('button');
      strike.type = 'button';
      strike.className = 'mdb-log-strike';
      strike.textContent = 'Strike from the log';
      strike.addEventListener('click', function () {
        var all = Log.read();
        var idx = all.findIndex(function (x) { return x.verse === e.verse; });
        if (idx > -1) { all.splice(idx, 1); Log.write(all); }
        renderLog();
      });
      li.appendChild(strike);
      list.appendChild(li);
    });
  }
  renderLog();

  /* ---- Results: number, copy, share, keep ------------------------------ */
  (function () {
    var verseEl = $('mdb-verse');
    if (!verseEl) return;

    var noEl = $('mdb-verse-no');
    if (noEl) {
      var n = 1;
      try {
        n = (parseInt(localStorage.getItem('mdb-verse-count'), 10) || 0) + 1;
        localStorage.setItem('mdb-verse-count', String(n));
      } catch (e) { /* private window: stays at 01 */ }
      noEl.textContent = String(n).padStart(2, '0');
    }

    function shareText() {
      var parts = ['A new verse (written for you, not from the novel):', verseEl.textContent.trim()];
      Array.prototype.forEach.call(document.querySelectorAll('[data-canon]'), function (g, i) {
        var t = g.querySelector('.mdb-passage'), c = g.querySelector('.mdb-cite');
        if (t && c) parts.push((i === 0 ? 'And from Moby-Dick itself:\n' : '') + t.innerText.trim() + '\n(' + c.innerText.trim() + ')');
      });
      parts.push('mobydickbible.com');
      return parts.join('\n\n');
    }
    window.MDBShareText = shareText;

    function flash(btn, label) {
      var orig = btn.getAttribute('data-label') || btn.textContent;
      btn.setAttribute('data-label', orig);
      btn.textContent = label;
      btn.setAttribute('data-active', 'true');
      clearTimeout(btn._t);
      btn._t = setTimeout(function () { btn.textContent = orig; btn.setAttribute('data-active', 'false'); }, 1800);
    }
    function copy(text, btn, ok) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { flash(btn, ok); }, function () { fallback(text, btn, ok); });
      } else fallback(text, btn, ok);
    }
    function fallback(text, btn, ok) {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var done = false;
      try { done = document.execCommand('copy'); } catch (e) { /* nothing */ }
      ta.remove();
      flash(btn, done ? ok : 'Copy blocked');
    }

    var copyBtn = $('mdb-copy'), shareBtn = $('mdb-share'), keepBtn = $('mdb-keep');
    if (copyBtn) copyBtn.addEventListener('click', function () { copy(shareText(), copyBtn, 'Copied'); });
    if (shareBtn) shareBtn.addEventListener('click', function () {
      var text = shareText();
      if (navigator.share) {
        navigator.share({ title: 'The Moby-Dick Bible', text: text })
          .then(function () { flash(shareBtn, 'Shared'); })
          .catch(function (err) { if (!err || err.name !== 'AbortError') copy(text, shareBtn, 'Copied instead'); });
      } else copy(text, shareBtn, 'Copied instead');
    });

    if (keepBtn) {
      var q = keepBtn.getAttribute('data-query') || '';
      var isKept = function () { var v = verseEl.textContent.trim(); return Log.read().some(function (e) { return e.verse === v; }); };
      var paint = function () {
        var on = isKept();
        keepBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
        keepBtn.setAttribute('data-active', on ? 'true' : 'false');
        keepBtn.textContent = on ? 'Kept in the log' : 'Keep in the log';
      };
      paint();
      keepBtn.addEventListener('click', function () {
        var v = verseEl.textContent.trim(), all = Log.read();
        var idx = all.findIndex(function (e) { return e.verse === v; });
        if (idx > -1) all.splice(idx, 1); else all.push({ q: keepBtn.getAttribute('data-query') || q, verse: v, at: Date.now() });
        if (!Log.write(all)) { flash(keepBtn, 'This browser won\u2019t keep it'); return; }
        paint();
        renderLog();
      });
      window.MDBRepaintKeep = paint;
    }
  })();

  /* ---- Reading the book: verse / plain switch, verse links ------------- */
  (function () {
    var book = $('rd-book');
    if (!book) return;
    var root = document.documentElement;
    var buttons = document.querySelectorAll('.rd-mode button[data-mode]');
    var marks = book.querySelectorAll('.rd-mark');

    function paint() {
      var plain = root.classList.contains('rd-plain');
      Array.prototype.forEach.call(buttons, function (b) {
        b.setAttribute('aria-pressed', (b.getAttribute('data-mode') === 'plain') === plain ? 'true' : 'false');
      });
    }
    /* the verse at the top of the screen, so switching keeps your place */
    function topMark() {
      for (var i = 0; i < marks.length; i++) {
        var sec = marks[i].closest('.rd-verse');
        var r = (root.classList.contains('rd-plain') ? marks[i] : sec).getBoundingClientRect();
        if (r.bottom > 8 || i === marks.length - 1) return { el: marks[i], top: r.top, sec: sec };
      }
      return null;
    }
    function where(m) {
      return (root.classList.contains('rd-plain') ? m.el : m.sec).getBoundingClientRect().top;
    }
    function setMode(mode) {
      var plain = mode === 'plain';
      if (plain === root.classList.contains('rd-plain')) return;
      var m = topMark();
      root.classList.toggle('rd-plain', plain);
      if (m && m.top < window.innerHeight) window.scrollBy(0, where(m) - Math.max(m.top, 0));
      try { localStorage.setItem('mdb-read-mode', mode); } catch (e) { /* stays for this visit */ }
      paint();
    }
    Array.prototype.forEach.call(buttons, function (b) {
      b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); });
    });
    paint();

    /* copy a link to one verse */
    book.addEventListener('click', function (e) {
      var btn = e.target.closest('.rd-copy');
      if (!btn) return;
      var url = location.origin + location.pathname + '#' + btn.getAttribute('data-verse');
      var done = function (ok) {
        btn.textContent = ok ? 'Link copied' : 'Copy blocked';
        btn.setAttribute('data-done', '');
        clearTimeout(btn._t);
        btn._t = setTimeout(function () { btn.textContent = 'Copy link'; btn.removeAttribute('data-done'); }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(false); });
      else done(false);
    });

    /* replay the highlight when the same verse link is followed twice */
    window.addEventListener('hashchange', function () {
      var t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      var sec = t && t.closest('.rd-verse');
      if (!sec) return;
      sec.style.animation = 'none'; void sec.offsetWidth; sec.style.animation = '';
    });
  })();

  /* ---- Header popovers (More, settings): one open at a time ------------ */
  (function () {
    var pops = document.querySelectorAll('.mdb-pop');
    if (!pops.length) return;
    function closeAll(except) {
      Array.prototype.forEach.call(pops, function (d) { if (d !== except) d.open = false; });
    }
    Array.prototype.forEach.call(pops, function (d) {
      d.addEventListener('toggle', function () { if (d.open) closeAll(d); });
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.mdb-pop')) closeAll(null);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var open = document.querySelector('.mdb-pop[open]');
      if (open) { open.open = false; open.querySelector('summary').focus(); }
    });
  })();
})();
