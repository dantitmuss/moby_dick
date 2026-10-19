/* The night sea. Drawn at low resolution on a canvas and scaled up with
   pixelated rendering, so every art pixel is a crisp square.

   Rule of the house: a certain whale is never drawn. Only the evidence of
   him: a white bubble near the horizon,
   gulls circling empty water, an old harpoon drifting past.

   With prefers-reduced-motion the scene draws one still frame and stops. */

(function () {
  'use strict';

  var C = {
    sky0: '#0a1324', sky1: '#0e1a2f', sky2: '#132240', sky3: '#1a2b4b',
    sea0: '#1d3354', sea1: '#16294a', sea2: '#11213d', sea3: '#0c182e',
    crest: '#35507a', crestHi: '#5b7aa6', foam: '#f7f4ea',
    star: '#c9d2e3', starDim: '#5d6c88',
    moon: '#ece3cb', moonShade: '#c9bea0', glint: '#d9c995',
    mast: '#8a6646', sail: '#d8cfb6', sailShade: '#a99f86',
    hull: '#2a1d14', band: '#8c6a2c', lantern: '#f3c45f', flag: '#b0563e',
    gull: '#dcd6c6', rope: '#b38e5e', iron: '#7c8696'
  };

  var SHIP = [
    '........f.........f.........f.....',
    '........m.........m.........m.....',
    '.......sss.......sss.......sss....',
    '......sssss.....sssss.....sssss...',
    '......sssSs.....sssSs.....sssSs...',
    '........m.........m.........m.....',
    '.....sssssss...sssssss...sssssss..',
    '.....sssssSs...sssssSs...sssssSs..',
    '.....sssssSs...sssssSs...sssssSs.m',
    '........m.........m.........m...m.',
    '....sssssssss.sssssssss.sssssss.m.',
    '....sssssssSs.sssssssSs.ssssssSm..',
    '....sssssssSs.sssssssSs.sssssm....',
    '........m.........m........mm.....',
    'l.......m.........m.......m.......',
    'hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh..',
    '.hbbbbbbbbbbbbbbbbbbbbbbbbbbbbh...',
    '..hhhhhhhhhhhhhhhhhhhhhhhhhhhh....',
    '...hhhhhhhhhhhhhhhhhhhhhhhhhh.....'
  ];
  var SHIP_C = { m: C.mast, s: C.sail, S: C.sailShade, h: C.hull, b: C.band, l: C.lantern, f: C.flag };

  var GULL = [
    ['x...x', '.x.x.'],
    ['.....', 'xx.xx']
  ];

  /* What the lookout calls down. Each kind has a few wordings, picked at
     random, so the report doesn't repeat itself word for word. */
  var REPORTS = {
    calm: [
      'Mast-head report: <b>sea calm, sky clear, nothing white.</b>',
      'Mast-head report: <b>wind steady from the south-west.</b> Nothing white.',
      'Mast-head report: <b>a long, slow swell.</b> No sail in sight.',
      'Mast-head report: <b>the watch has changed.</b> Nothing to report but stars.',
      'Mast-head report: <b>all quiet.</b> Suspiciously so.',
      'Mast-head report: <b>moon high, sea dark.</b> Nothing white. Yet.'
    ],
    bubble: [
      'Mast-head report: <b>a white bubble, off the lee bow.</b> Probably nothing.',
      'Mast-head report: <b>something breathed out there.</b> The sea has closed over it.',
      'Mast-head report: <b>a bubble, very white,</b> and then no bubble at all.',
      'Mast-head report: <b>white water, two points to leeward.</b> Gone again.'
    ],
    harpoon: [
      'Mast-head report: <b>an old harpoon drifted past,</b> bent and rusted. Not ours.',
      'Mast-head report: <b>somebody’s iron, adrift.</b> It went in straight and came out crooked.'
    ],
    'debris-oar': [
      'Mast-head report: <b>a broken oar, drifting.</b> Some boat came off worse.',
      'Mast-head report: <b>half an oar.</b> Nobody wants to guess where the other half went.'
    ],
    'debris-plank': [
      'Mast-head report: <b>a stove plank, drifting.</b> Nobody asks whose.',
      'Mast-head report: <b>wreckage, small and old.</b> The carpenter crosses himself.'
    ],
    tryworks: [
      'Mast-head report: <b>the try-works are lit.</b> Smoke and a red glow amidships.',
      'Mast-head report: <b>the try-works are burning.</b> The ship smells terrible and looks like a church.'
    ],
    ahab: [
      'Mast-head report: <b>the captain is on deck.</b> Everyone is suddenly very busy.',
      'Mast-head report: <b>the ivory leg, on the planks.</b> You can hear him before you see him.'
    ],
    ahabClick: ['<b>Ahab, at the rail.</b> He is looking at the gulls again.'],
    gulls: ['Mast-head report: <b>gulls circling empty water.</b> They know something.'],
    pip: ['<b>Pip, from the rigging:</b> “I look, you look, he looks; we look, ye look, they look.”'],
    line: ['Mast-head report: <b>the line is out.</b> Stand clear of the tub.'],
    ship: ['<b>The Pequod, of Nantucket.</b> Three years’ provisions, one captain’s purpose.']
  };
  function pick(kind) {
    var list = REPORTS[kind] || REPORTS.calm;
    return list[Math.floor(Math.random() * list.length)];
  }

  /* Sprites from the first pixel prototype, drawn at 1x and scaled with the
     canvas. If any fail to load, the hand-coded fallbacks below are used. */
  var IMG = {};
  function loadSprites(base, done) {
    var names = ['pequod', 'moon', 'gull', 'bubble', 'debris-harpoon', 'debris-oar', 'debris-plank'], left = names.length;
    names.forEach(function (n) {
      var im = new Image();
      im.onload = function () { IMG[n] = im; if (--left === 0) done(); };
      im.onerror = function () { if (--left === 0) done(); };
      im.src = base + n + '.png';
    });
  }

  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // small seeded random so the stars stay put between frames
  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function Scene(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.compact = canvas.hasAttribute('data-compact');
    this.report = document.getElementById(canvas.getAttribute('data-report') || '');
    this.t = 0;
    this.events = [];
    this.nextEvent = 50 + Math.floor(Math.random() * 60);   // the first sighting comes early
    this.nextAhab = 300 + Math.floor(Math.random() * 400);
    this.nextCalm = 300;
    this.ahab = null;
    this.line = null;
    this.reportTimer = 0;
    this.resize();
    var self = this;
    window.addEventListener('resize', function () { self.resize(); self.draw(); });
    canvas.addEventListener('click', function (e) { self.click(e); });
  }

  Scene.prototype.resize = function () {
    var r = this.cv.getBoundingClientRect();
    var px = r.width > 1100 ? 4 : 3;
    this.px = px;
    this.W = Math.max(80, Math.ceil(r.width / px));
    this.H = Math.max(30, Math.ceil(r.height / px));
    this.cv.width = this.W;
    this.cv.height = this.H;
    this.horizon = Math.floor(this.H * (this.compact ? 0.55 : 0.62));
    var rand = rng(1851);
    this.stars = [];
    var n = Math.floor(this.W * this.horizon / 70);
    for (var i = 0; i < n; i++) {
      this.stars.push({ x: Math.floor(rand() * this.W), y: Math.floor(rand() * (this.horizon - 4)), b: rand() });
    }
    this.moon = { x: Math.floor(this.W * 0.78), y: Math.max(7, Math.floor(this.horizon * 0.3)), r: this.compact ? 4 : 6 };
    this.ship = { x: Math.max(4, Math.floor(this.W * 0.16)), y: this.horizon + (this.compact ? 3 : 6) - SHIP.length + 3 };
    this.big = { x: Math.max(2, Math.floor(this.W * (this.W < 140 ? 0.03 : 0.1))), y: this.horizon + 12 - 54 };
    this.gulls = { x: Math.floor(this.W * 0.9), y: this.horizon - (this.compact ? 8 : 14), r: this.compact ? 5 : 8 };
  };

  Scene.prototype.p = function (x, y, c, w, h) {
    this.ctx.fillStyle = c;
    this.ctx.fillRect(x | 0, y | 0, w || 1, h || 1);
  };

  Scene.prototype.drawSky = function () {
    var H = this.horizon, W = this.W;
    var bands = [C.sky0, C.sky1, C.sky2, C.sky3];
    var step = Math.ceil(H / bands.length);
    for (var i = 0; i < bands.length; i++) {
      this.p(0, i * step, bands[i], W, step + 1);
      // dither the seam between bands
      if (i > 0) {
        for (var x = (i % 2); x < W; x += 2) this.p(x, i * step, bands[i - 1]);
        for (var x2 = ((i + 1) % 2); x2 < W; x2 += 4) this.p(x2, i * step + 1, bands[i - 1]);
      }
    }
    var t = this.t;
    for (var s = 0; s < this.stars.length; s++) {
      var st = this.stars[s];
      var tw = st.b > 0.85 ? ((Math.floor(t / 6 + s) % 9) === 0 ? C.starDim : C.star) : (st.b > 0.4 ? C.starDim : null);
      if (tw) this.p(st.x, st.y, tw);
    }
  };

  Scene.prototype.drawMoon = function () {
    var m = this.moon, r = m.r;
    if (!this.compact && IMG.moon) { this.ctx.drawImage(IMG.moon, m.x - 20, Math.max(0, m.y - 14)); return; }
    for (var y = -r - 1; y <= r + 1; y++) {
      for (var x = -r - 1; x <= r + 1; x++) {
        var d = x * x + y * y;
        if (d <= r * r) this.p(m.x + x, m.y + y, (x > r / 3 && y > -r / 3) ? C.moonShade : C.moon);
        else if (d <= (r + 1) * (r + 1) && ((x + y) & 1)) this.p(m.x + x, m.y + y, C.sky3);
      }
    }
    this.p(m.x - 2, m.y - 1, C.moonShade);
    this.p(m.x + 1, m.y + 2, C.moonShade);
  };

  Scene.prototype.drawSea = function () {
    var W = this.W, H = this.H, h0 = this.horizon, t = this.t;
    var depth = H - h0;
    var cols = [C.sea0, C.sea1, C.sea2, C.sea3];
    var bandH = Math.ceil(depth / cols.length);
    for (var i = 0; i < cols.length; i++) this.p(0, h0 + i * bandH, cols[i], W, bandH + 1);
    this.p(0, h0, C.crest, W, 1); // horizon line

    // rows of wave crests; nearer rows are longer and move faster
    for (var row = 2, k = 0; h0 + row < H; row += (k < 3 ? 3 : 4), k++) {
      var y = h0 + row;
      var near = row / depth;
      var period = 9 + Math.floor(near * 18);
      var len = 2 + Math.floor(near * 5);
      var off = Math.floor(t * (0.15 + near * 0.6)) + k * 7;
      var dir = (k % 2) ? 1 : -1;
      for (var x = -period; x < W + period; x++) {
        var phase = ((x + dir * off) % period + period) % period;
        if (phase < len) {
          var bob = (Math.floor((x + t * 0.3) / period) % 2) ? 0 : 1;
          this.p(x, y - bob, near > 0.6 && phase === 0 ? C.crestHi : C.crest);
        }
      }
    }

    // moonlight on the water
    var mx = this.moon.x;
    for (var ry = h0 + 2; ry < H; ry += 2) {
      var spread = 2 + Math.floor((ry - h0) / 3);
      var seed = (ry * 31 + Math.floor(t / 3) * 17) % 97;
      var w = 1 + (seed % (spread));
      var dx = (seed % (spread * 2 + 1)) - spread;
      this.p(mx + dx, ry, C.glint, w, 1);
    }
  };

  Scene.prototype.drawShip = function () {
    var s = this.ship, t = this.t;
    var bob = calm ? 0 : (Math.floor(t / 14) % 2);
    if (!this.compact && IMG.pequod) {
      var b = this.big;
      this.ctx.drawImage(IMG.pequod, b.x, b.y + bob);
      // lantern flicker over the sprite's stern light
      if (Math.floor(t / 10) % 7 === 0) this.p(b.x + 1, b.y + 39 + bob, C.band, 2, 2);
      this.drawTryworks(b, bob);
      this.drawAhab(b, bob);
      var wl = b.y + 53 + bob;
      for (var f2 = 6; f2 < 70; f2 += 4) if (((f2 + Math.floor(t / 4)) % 6) < 2) this.p(b.x + f2, wl, C.crestHi);
      return;
    }
    var scale = this.compact ? 1 : 1;
    for (var y = 0; y < SHIP.length; y++) {
      var row = SHIP[y];
      for (var x = 0; x < row.length; x++) {
        var ch = row.charAt(x);
        if (ch === '.') continue;
        var col = SHIP_C[ch];
        if (ch === 'l') col = (Math.floor(t / 10) % 7 === 0) ? C.band : C.lantern;
        this.p(s.x + x * scale, s.y + y * scale + bob, col);
      }
    }
    // lantern glow on the water under the stern
    this.p(s.x - 1, this.horizon + 8 + bob, C.band, 2, 1);
    // waterline foam
    var wl = s.y + SHIP.length + bob - 1;
    for (var f = 2; f < 30; f += 3) if (((f + Math.floor(t / 4)) % 5) < 2) this.p(s.x + f, wl, C.crestHi);
  };

  Scene.prototype.drawGulls = function () {
    var g = this.gulls, t = this.t;
    for (var i = 0; i < 3; i++) {
      var a = (calm ? 0 : t * 0.035) + i * (Math.PI * 2 / 3);
      var x = g.x + Math.round(Math.cos(a) * g.r * 1.6);
      var y = g.y + Math.round(Math.sin(a) * g.r * 0.6);
      if (IMG.gull) { this.ctx.drawImage(IMG.gull, ((Math.floor(t / 5) + i) % 2) * 10, 0, 10, 7, x - 5, y - 3, 10, 7); continue; }
      var fr = GULL[(Math.floor(t / 5) + i) % 2];
      for (var yy = 0; yy < fr.length; yy++)
        for (var xx = 0; xx < fr[yy].length; xx++)
          if (fr[yy].charAt(xx) === 'x') this.p(x + xx - 2, y + yy, C.gull);
    }
  };

  /* --- aboard: the try-works and the captain --------------------------- */

  Scene.prototype.drawTryworks = function (b, bob) {
    var ev = null;
    for (var i = 0; i < this.events.length; i++) if (this.events[i].kind === 'tryworks') ev = this.events[i];
    if (!ev) return;
    var a = ev.age, x = b.x + 40, y = b.y + 38 + bob;
    var flick = (Math.floor(a / 3) % 3);
    this.p(x - 1, y, flick ? '#c0353d' : '#f2a93b', 4, 1);           // fire under the pots
    if (flick !== 1) this.p(x, y - 1, '#ffd27d', 2, 1);
    for (var k = 0; k < 6; k++) {                                     // smoke drifting aft
      var age = (a - k * 9);
      if (age < 0 || a > ev.life - 20 + k * 3) continue;
      var sx = x + 1 - Math.floor(age / 4), sy = y - 3 - Math.floor(age / 3);
      if (sy < 2) continue;
      this.p(sx, sy, k % 2 ? '#3a3f4d' : '#4b5163', 2, 1);
      this.p(sx - 1, sy - 1, '#2e3240', 2, 1);
    }
  };

  // Ahab: a coat, a slouch hat, one dark leg and one ivory one.
  var AHAB = [
    ['.h..', 'hhhh', '.p..', 'cccc', 'cccc', '.cc.', '.k.i'],
    ['.h..', 'hhhh', '.p..', 'cccc', 'cccc', '.cc.', 'k..i'],
    ['.h..', 'hhhh', '.p..', 'cccc', 'cccc', '.cc.', '.ki.']
  ];
  var AHAB_C = { h: '#0c0d14', c: '#4a5068', p: '#e0d3b0', k: '#1c1f2b', i: '#f4eccf' };

  Scene.prototype.drawAhab = function (b, bob) {
    var A = this.ahab;
    if (!A) return;
    if (!calm) {
      if (A.wait > 0) A.wait--;
      else {
        A.step++;
        // a limp: the ivory leg is slower to come down
        if ([1, 0, 1, 0, 0][A.step % 5]) A.x += A.dir;
        if (A.x >= 34) { A.dir = -1; A.wait = 40; }       // stops at the bow rail, looks out
        if (A.x < 0 && A.dir < 0) { this.ahab = null; this.nextAhab = 700 + Math.floor(Math.random() * 500); return; }
      }
    }
    var fr = AHAB[A.wait > 0 ? 2 : (Math.floor(A.step / 3) % 2)];
    var x0 = b.x + 24 + A.x, y0 = b.y + 33 + bob;
    for (var y = 0; y < fr.length; y++)
      for (var x = 0; x < 4; x++) {
        var ch = fr[y].charAt(A.dir < 0 ? 3 - x : x);
        if (ch !== '.') this.p(x0 + x, y0 + y, AHAB_C[ch]);
      }
  };

  /* --- evidence --------------------------------------------------------- */

  Scene.prototype.spawn = function (kind) {
    var W = this.W, h0 = this.horizon, H = this.H;
    var ev = { kind: kind, age: 0 };
    if (kind === 'bubble') { ev.x = Math.floor(W * (0.5 + Math.random() * 0.35)); ev.y = h0 + 2; ev.life = 70; }
    if (kind === 'harpoon'){ ev.x = W + 4; ev.y = h0 + Math.floor((H - h0) * 0.7); ev.life = W * 3 + 80;
      ev.sprite = ['debris-harpoon', 'debris-harpoon', 'debris-oar', 'debris-plank'][Math.floor(Math.random() * 4)];
      if (ev.sprite !== 'debris-harpoon') kind = ev.sprite; }
    if (kind === 'tryworks') { ev.life = 140; }
    this.events.push(ev);
    this.setReport(kind, 9000);
  };

  Scene.prototype.drawEvents = function () {
    var self = this;
    this.events = this.events.filter(function (ev) {
      ev.age++;
      if (ev.kind === 'bubble' && IMG.bubble) {
        var ab = ev.age, rise = Math.floor(ab / 6);
        if (ab < 40) { self.ctx.globalAlpha = 1 - ab / 48; self.ctx.drawImage(IMG.bubble, ev.x, ev.y - rise - 3); self.ctx.globalAlpha = 1; }
        var rg = Math.min(7, Math.floor(ab / 7));
        if (ab > 8) self.p(ev.x + 2 - rg, ev.y + 1, C.foam, rg * 2, 1);
        return ab < ev.life;
      }
      if (ev.kind === 'harpoon' && IMG['debris-harpoon']) {
        var dx = ev.x - Math.floor(ev.age / 3), dy = ev.y + ((Math.floor(ev.age / 12) % 2) ? 0 : 1) - 4;
        var im = IMG[ev.sprite] || IMG['debris-harpoon'];
        self.ctx.drawImage(im, dx, dy);
        return dx > -20;
      }
      if (ev.kind === 'bubble') {
        var a = ev.age;
        if (a < 20) { for (var i = 0; i < 4; i++) if (((a + i * 3) % 6) < 3) self.p(ev.x + (i % 2), ev.y - Math.floor(a / 4) - i, C.foam); }
        var ring = Math.min(6, Math.floor(a / 8));
        if (a > 10) { self.p(ev.x - ring, ev.y + 1, C.foam, ring * 2 + 2, 1); }
        if (a > 30 && (a % 4) < 2) self.p(ev.x, ev.y, C.foam);
      }
      if (ev.kind === 'harpoon') {
        var hx = ev.x - Math.floor(ev.age / 3);
        var hy = ev.y + ((Math.floor(ev.age / 12) % 2) ? 0 : 1);
        self.p(hx, hy, C.iron, 11, 1);       // shaft
        self.p(hx - 2, hy - 1, C.iron);      // barb
        self.p(hx - 1, hy, C.iron);
        self.p(hx - 2, hy + 1, C.iron);
        self.p(hx + 11, hy - 1, C.mast, 3, 1);  // stub of the pole
        self.p(hx + 14, hy, C.rope, 4, 1);    // frayed line
        if (hx < -24) return false;
      }
      return ev.age < ev.life;
    });
  };

  Scene.prototype.drawLine = function () {
    var L = this.line;
    if (!L) return;
    L.age++;
    var big = !this.compact && IMG.pequod;
    var sx = big ? this.big.x + 72 : this.ship.x + SHIP[0].length - 2, sy = big ? this.big.y + 40 : this.ship.y + 13;
    var ex = Math.floor(this.W * 0.62), ey = this.horizon + 4;
    var prog = Math.min(1, L.age / 22);
    var steps = 60;
    for (var i = 0; i <= steps * prog; i++) {
      var u = i / steps;
      var x = sx + (ex - sx) * u;
      var y = sy + (ey - sy) * u - Math.sin(u * Math.PI) * 14;
      this.p(x, y, C.rope);
    }
    if (prog >= 1) {
      var sp = L.age - 22;
      if (sp < 18) { for (var j = 0; j < 5; j++) this.p(ex - 2 + j, ey - Math.floor(sp / 3) + (j % 2) * 2, C.foam); }
      else this.p(ex - 1, ey + 1, C.foam, 3, 1);
    }
  };

  Scene.prototype.setReport = function (kind, ms) {
    if (!this.report) return;
    this.report.innerHTML = pick(kind);
    this.reportBusy = !!ms;
    var self = this;
    clearTimeout(this.reportTimer);
    if (ms) this.reportTimer = setTimeout(function () { self.report.innerHTML = pick('calm'); self.reportBusy = false; }, ms);
  };

  Scene.prototype.click = function (e) {
    var r = this.cv.getBoundingClientRect();
    var x = (e.clientX - r.left) / this.px, y = (e.clientY - r.top) / this.px;
    var g = this.gulls;
    var b = this.big;
    if (Math.abs(x - g.x) < g.r * 2.5 && Math.abs(y - g.y) < g.r * 2) this.setReport('pip', 7000);
    else if (!this.compact && x > b.x && x < b.x + 76 && y > b.y && y < b.y + 56) this.setReport(this.ahab ? 'ahabClick' : 'ship', 6000);
    else this.setReport('gulls', 5000);
  };

  Scene.prototype.draw = function () {
    this.drawSky();
    this.drawMoon();
    this.drawSea();
    this.drawEvents();
    this.drawGulls();
    this.drawShip();
    this.drawLine();
  };

  Scene.prototype.tick = function () {
    this.t++;
    if (--this.nextEvent <= 0) {
      var kinds = ['bubble', 'bubble', 'bubble', 'harpoon', 'harpoon'];
      if (!this.compact && IMG.pequod) kinds.push('tryworks');
      this.spawn(kinds[Math.floor(Math.random() * kinds.length)]);
      this.nextEvent = 260 + Math.floor(Math.random() * 300);
    }
    if (!this.compact && IMG.pequod && !this.ahab && --this.nextAhab <= 0) {
      this.ahab = { x: 0, dir: 1, step: 0, wait: 0, legs: 0 };
      this.setReport('ahab', 9000);
    }
    if (!this.reportBusy && --this.nextCalm <= 0) { this.setReport('calm'); this.nextCalm = 260 + Math.floor(Math.random() * 120); }
    this.draw();
  };

  Scene.prototype.throwLine = function () {
    this.line = { age: 0 };
    this.setReport('line');
    if (calm) { this.line.age = 40; this.draw(); }
  };

  /* --- boot --------------------------------------------------------------- */

  var scenes = [];
  var canvases = document.querySelectorAll('canvas[data-scene]');
  Array.prototype.forEach.call(canvases, function (cv) {
    var s = new Scene(cv);
    s.setReport('calm');
    s.draw();
    scenes.push(s);
  });
  if (canvases.length) loadSprites(canvases[0].getAttribute('data-sprites') || '/static/images/sprites/', function () {
    scenes.forEach(function (s) { s.draw(); });
  });

  if (!calm && scenes.length) {
    var last = 0, visible = true;
    document.addEventListener('visibilitychange', function () { visible = !document.hidden; });
    (function loop(now) {
      if (visible && now - last > 83) {          // about 12 frames a second, chunky on purpose
        last = now;
        scenes.forEach(function (s) { s.tick(); });
      }
      requestAnimationFrame(loop);
    })(0);
  }

  window.MDBScene = {
    throwLine: function () { scenes.forEach(function (s) { s.throwLine(); }); },
    // for testing from the console: MDBScene.show('ahab'), 'tryworks', 'bubble', 'harpoon'
    show: function (kind) {
      scenes.forEach(function (s) {
        if (kind === 'ahab') { if (!s.compact) { s.ahab = { x: 0, dir: 1, step: 0, wait: 0 }; s.setReport('ahab', 9000); } }
        else s.spawn(kind);
      });
    }
  };
})();
