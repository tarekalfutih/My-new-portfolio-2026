/* Home page: hero typing line, hero spec overlay, and the "digital + physical" second-screen entrance. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Typing line under the hero heading. Screen readers get every phrase once from the
     visually hidden copy; the animated text is aria-hidden. Reduced motion: first phrase, no caret. */
  function initTyper() {
    var el = document.querySelector('[data-typer-text]');
    if (!el || reduce) return;
    var P = ['Based in Gothenburg, Sweden', 'Usability first, always', 'Turning feedback into better design',
      'Accessible design for everyone', "Designer with an illustrator's eye"];
    var i = 0, n = 0, del = false;
    el.textContent = '';
    function tick() {
      var w = P[i];
      if (!del) {
        n++; el.textContent = w.slice(0, n);
        if (n >= w.length) { del = true; setTimeout(tick, 2600); return; }
        setTimeout(tick, 55 + Math.random() * 45);
      } else {
        n--; el.textContent = w.slice(0, n);
        if (n <= 0) { del = false; i = (i + 1) % P.length; setTimeout(tick, 450); return; }
        setTimeout(tick, 28);
      }
    }
    setTimeout(tick, 1300);
  }

  /* Design-tool "spec" overlay: briefly measures the hero's paddings, gaps, headline and
     portrait at runtime and labels them, then fades out. Desktop only. */
  function intro() {
    var sec = document.querySelector('[data-sp-hero]');
    if (!sec || window.innerWidth < 901 || reduce) return;
    var t = function (fn, ms) { setTimeout(fn, ms); };
    var B = '#1b3ac4', P = '#ff4d6d';
    var get = function (s) { var n = sec.querySelector('[data-sp="' + s + '"]'); return n ? n.getBoundingClientRect() : null; };
    var S = sec.getBoundingClientRect(), cs = getComputedStyle(sec);
    var role = get('role'), h1 = get('h1'), text = get('text'), photo = get('photo');
    var pl = parseFloat(cs.paddingLeft), pr = parseFloat(cs.paddingRight);
    var top = Math.min(role.top, photo ? photo.top : role.top) - S.top;
    var zones = [
      { x: 0, y: 0, w: pl, h: S.height, v: pl, g: 0, outer: 1, lab: 1 },
      { x: S.width - pr, y: 0, w: pr, h: S.height, v: pr, g: 0, outer: 1, lab: 0 },
      { x: pl, y: 0, w: S.width - pl - pr, h: top, v: top, g: 0, outer: 1, lab: 1 },
      { x: role.left - S.left, y: role.bottom - S.top, w: text.width, h: h1.top - role.bottom, v: h1.top - role.bottom, g: 1, lab: 1 }
    ];
    if (photo) zones.push({ x: text.right - S.left, y: photo.top - S.top, w: photo.left - text.right, h: photo.height, v: photo.left - text.right, g: 2, lab: 1 });
    var els = [];
    var add = function (d, g) { d.setAttribute('aria-hidden', 'true'); sec.appendChild(d); els.push({ d: d, g: g }); return d; };
    var pill = function (txt, c) {
      var s = document.createElement('span'); s.textContent = txt;
      s.style.background = c; s.style.color = '#fff'; s.style.borderColor = c; return s;
    };
    zones.filter(function (z) { return z.w > 1 && z.h > 1; }).forEach(function (z) {
      var c = z.outer ? P : B;
      var d = document.createElement('div'); d.className = 'sp-zone';
      d.style.left = z.x + 'px'; d.style.top = z.y + 'px'; d.style.width = z.w + 'px'; d.style.height = z.h + 'px';
      if (c === P) d.style.background = 'repeating-linear-gradient(45deg,rgba(255,77,109,.2) 0 1px,transparent 1px 6px)';
      if (z.lab) d.appendChild(pill(String(Math.round(z.v)), c));
      add(d, z.g);
    });
    var box = function (r, txt, g) {
      var d = document.createElement('div'); d.className = 'sp-extra sp-box';
      d.style.left = (r.left - S.left) + 'px'; d.style.top = (r.top - S.top) + 'px';
      d.style.width = r.width + 'px'; d.style.height = r.height + 'px';
      ['tl', 'tr', 'bl', 'br'].forEach(function (k) { var h = document.createElement('i'); h.className = 'sp-h ' + k; d.appendChild(h); });
      var s = pill(txt, B); s.className = 'sp-boxlab'; d.appendChild(s); add(d, g);
    };
    var hcs = getComputedStyle(sec.querySelector('[data-sp="h1"]'));
    box(h1, 'Headline · ' + hcs.fontFamily.split(',')[0].replace(/["']/g, '') + ' ' + hcs.fontWeight + ' · ' +
      Math.round(parseFloat(hcs.fontSize)) + '/' + Math.round(parseFloat(hcs.lineHeight)), 3);
    if (photo) box(photo, 'Portrait · ' + Math.round(photo.width) + ' × ' + Math.round(photo.height), 3);
    var hideAt = 3400;
    requestAnimationFrame(function () { els.forEach(function (e) { t(function () { e.d.classList.add('on'); }, e.g * 450); }); });
    t(function () { els.forEach(function (e) { t(function () { e.d.classList.remove('on'); }, Math.min(e.g, 3) * 120); }); }, hideAt);
    t(function () { els.forEach(function (e) { e.d.remove(); }); }, hideAt + 1100);
  }

  /* Second screen, "How I work" whiteboard. Plays once on scroll into view:
     a "Tarek" cursor drags a selection marquee to the frame (live W × H label), the heading types
     in and the tags stagger in; then the cobalt pen leaves its tray, underlines "How I work" and the
     seven key phrases, draws the arrows between the notes, hand-writes "Explore selected work ↓"
     and returns to the tray. Reduced motion: everything is shown in its final state. */
  var PEN_UL = 800, PEN_MOVE = 190, PEN_SW = 250, PEN_AR = 380;

  function initSkills() {
    var sec = document.getElementById('skills');
    if (!sec) return;
    if (reduce || !('IntersectionObserver' in window) || !sec.animate) {
      var u = sec.querySelector('.hw-ul'); if (u) u.style.clipPath = 'none';
      sec.querySelectorAll('.sk-arw path').forEach(function (p) { p.style.strokeDashoffset = '0'; });
      return;
    }
    sec.classList.add('sk-armed');
    var io = new IntersectionObserver(function (es) {
      if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); playSkills(sec); }
    }, { threshold: window.innerWidth < 768 ? 0.1 : 0.4 });
    io.observe(sec);
  }

  function visibleArrows() {
    return Array.prototype.filter.call(document.querySelectorAll('.sk-board .sk-arw'),
      function (s) { return s.getClientRects().length; }).length;
  }
  function penTotal() { return PEN_UL + 7 * (PEN_MOVE + PEN_SW) + visibleArrows() * (PEN_MOVE + PEN_AR); }

  // The pen tip's resting point and the pose it ends on after the last arrow (shared with penButton).
  var pen = { tip: null, end: null, anim: null };

  function penMark(hwm) {
    var board = hwm.closest('.sk-board'), pa = board && board.querySelector('.pen-a');
    var ul = hwm.querySelector('.hw-ul');
    var steps = board ? Array.prototype.slice.call(board.querySelectorAll('.sk-step')) : [];
    var show = function (d, dl) { if (ul) ul.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: d, delay: dl, easing: 'cubic-bezier(.4,.1,.4,1)', fill: 'both' }); };
    var hlw = function (w, d, dl) { w.animate([{ backgroundSize: '0% 1.5px' }, { backgroundSize: '100% 1.5px' }], { duration: d, delay: dl, easing: 'linear', fill: 'both' }); };
    var drawP = function (p, d, dl) { p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: d, delay: dl, easing: 'linear', fill: 'both' }); };
    if (!pa || !pa.offsetParent) {
      // Board hidden (phones): show everything at once.
      show(1, 0);
      if (board) {
        board.querySelectorAll('.hw-hl').forEach(function (w) { hlw(w, 1, 0); });
        board.querySelectorAll('.sk-arw path').forEach(function (p) { drawP(p, 1, 0); });
      }
      return;
    }
    var r = ul.getBoundingClientRect();
    var b = pa.getBoundingClientRect(), tx = b.left, ty = b.top + b.height / 2;
    pen.tip = { x: tx, y: ty };
    var mv = function (x, y) { return 'translate(' + (x - tx) + 'px,' + (y - ty) + 'px) rotate(-58deg)'; };
    var y = r.top + r.height / 2;
    var T = penTotal();
    var pts = [[0, 'none'], [450, mv(r.left, y)], [PEN_UL, mv(r.right, y)]];
    var t = PEN_UL, last = mv(r.right, y);
    var scr = function (p, len) {
      var pt = p.getPointAtLength(len), m = p.getScreenCTM();
      return { x: m.a * pt.x + m.c * pt.y + m.e, y: m.b * pt.x + m.d * pt.y + m.f };
    };
    steps.forEach(function (st) {
      st.querySelectorAll('.hw-hl').forEach(function (w) {
        var rs = Array.prototype.filter.call(w.getClientRects(), function (q) { return q.width > 1; });
        var tw = rs.reduce(function (s, q) { return s + q.width; }, 0) || 1;
        t += PEN_MOVE; pts.push([t, mv(rs[0].left, rs[0].bottom - 1)]);
        hlw(w, PEN_SW, t);
        rs.forEach(function (q, qi) {
          if (qi) pts.push([t, mv(q.left, q.bottom - 1)]);
          t += PEN_SW * q.width / tw; last = mv(q.right, q.bottom - 1); pts.push([t, last]);
        });
      });
      var svg = st.querySelector('.sk-arw');
      var paths = svg && svg.getClientRects().length ? Array.prototype.slice.call(svg.querySelectorAll('path')) : [];
      if (paths.length === 2) {
        var shaft = paths[0], head = paths[1], L1 = shaft.getTotalLength(), L2 = head.getTotalLength();
        var d1 = PEN_AR * .68, d2 = PEN_AR - d1 - 60, k, q;
        var a0 = scr(shaft, 0); t += PEN_MOVE; pts.push([t, mv(a0.x, a0.y)]);
        drawP(shaft, d1, t);
        for (k = 1; k <= 6; k++) { q = scr(shaft, L1 * k / 6); pts.push([t + d1 * k / 6, mv(q.x, q.y)]); }
        t += d1 + 60; var h0 = scr(head, 0); pts.push([t, mv(h0.x, h0.y)]);
        drawP(head, d2, t);
        for (k = 1; k <= 3; k++) { q = scr(head, L2 * k / 3); pts.push([t + d2 * k / 3, mv(q.x, q.y)]); }
        t += d2; q = scr(head, L2); last = mv(q.x, q.y);
      }
    });
    pen.end = last;
    pen.anim = pa.animate(pts.map(function (p) { return { offset: Math.min(1, p[0] / T), transform: p[1] }; }),
      { duration: T, easing: 'linear', fill: 'forwards' });
    show(800, 450);
  }

  // Hand-writes the "Explore selected work ↓" link letter by letter, the pen following, then
  // returns the pen to the tray.
  function penButton(cta, B) {
    var lb = cta.querySelector('.sk-out-lb'), pa = document.querySelector('.sk-board .pen-a');
    cta.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1, delay: B, fill: 'both' });
    if (!lb || !pa || !pa.offsetParent) return;
    if (!lb.dataset.split) {
      lb.dataset.split = '1';
      var tn = Array.prototype.find.call(lb.childNodes, function (n) { return n.nodeType === 3; });
      if (tn) {
        var frag = document.createDocumentFragment();
        Array.prototype.forEach.call(tn.textContent, function (ch) {
          var s = document.createElement('span');
          s.className = 'hw-ch'; s.setAttribute('aria-hidden', 'true');
          s.style.display = 'inline-block'; s.style.whiteSpace = 'pre'; s.textContent = ch;
          frag.appendChild(s);
        });
        lb.replaceChild(frag, tn);
        lb.style.gap = '0';
        var ar = lb.querySelector('.ar'); if (ar) ar.style.marginLeft = '.3em';
      }
    }
    var chars = Array.prototype.slice.call(lb.querySelectorAll('.hw-ch')).concat([lb.querySelector('.ar')]).filter(Boolean);
    var START = 300, t = START, times = [];
    chars.forEach(function (c) { times.push(t); t += c.textContent.trim() ? 40 : 20; });
    var END = t;
    chars.forEach(function (c, i) {
      c.animate([{ opacity: 0, transform: 'translateY(3px) scale(.92)', filter: 'blur(1.5px)' }, { opacity: 1, transform: 'none', filter: 'none' }],
        { duration: 220, delay: B + times[i], easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'backwards' });
    });
    setTimeout(function () {
      var tx, ty;
      if (pen.tip) { tx = pen.tip.x; ty = pen.tip.y; } else { var p = pa.getBoundingClientRect(); tx = p.left; ty = p.top + p.height / 2; }
      var mv = function (x, y) { return 'translate(' + (x - tx) + 'px,' + (y - ty) + 'px) rotate(-52deg)'; };
      var T = END + 500, kf = [{ transform: pen.end || 'none' }];
      chars.forEach(function (c, i) {
        var r = c.getBoundingClientRect();
        kf.push({ offset: (times[i] + 40) / T, transform: mv(r.left + r.width * .7, r.top + r.height * (i % 2 ? .62 : .7)) });
      });
      kf[1] = { offset: START / T, transform: kf[1].transform };
      kf.push({ transform: 'none' });
      pa.animate(kf, { duration: T, easing: 'linear' });
      if (pen.anim) { pen.anim.cancel(); pen.anim = null; }
    }, B);
  }

  function playSkills(sec) {
    var q = function (s) { return sec.querySelector(s); };
    var edu = q('.sk-edu'), fr = q('.sk-frame'), mq = q('.sk-mq'), cur = q('.sk-cur'), size = q('.sk-size'), h = q('.sk-h');
    var tags = Array.prototype.slice.call(sec.querySelectorAll('.sk-tag'));
    var s = sec.getBoundingClientRect(), f = fr.getBoundingClientRect(), e = edu.getBoundingClientRect();
    var fx = f.left - s.left, fy = f.top - s.top, fw = f.width, fh = f.height;
    var narrow = window.innerWidth <= 900;
    var ex = narrow ? e.left - s.left + 40 : e.right - s.left - 24, ey = narrow ? e.bottom - s.top - 8 : e.top - s.top + 28;
    mq.style.left = fx + 'px'; mq.style.top = fy + 'px';
    var OUT = 'cubic-bezier(.2,.7,.3,1)', DRAG = 'cubic-bezier(.45,0,.25,1)', T = 1700, D0 = 100;
    var at = function (x, y, sc) { return 'translate(' + x + 'px,' + y + 'px)' + (sc ? ' scale(.88)' : ''); };
    edu.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 350, easing: OUT, fill: 'both' });
    var ca = cur.animate([
      { transform: at(ex, ey), opacity: 0, offset: 0 },
      { transform: at(ex, ey), opacity: 1, offset: .06, easing: DRAG },
      { transform: at(fx, fy), opacity: 1, offset: .25 },
      { transform: at(fx, fy, 1), opacity: 1, offset: .28, easing: DRAG },
      { transform: at(fx + fw, fy + fh, 1), opacity: 1, offset: .6 },
      { transform: at(fx + fw, fy + fh), opacity: 1, offset: .64, easing: OUT },
      { transform: at(fx + fw + 28, fy + fh + 18), opacity: 0, offset: .86 },
      { transform: at(fx + fw + 28, fy + fh + 18), opacity: 0, offset: 1 }
    ], { duration: T, delay: D0, fill: 'both' });
    var ma = mq.animate([
      { width: '0px', height: '0px', opacity: 0, offset: 0 },
      { width: '0px', height: '0px', opacity: 0, offset: .27 },
      { width: '0px', height: '0px', opacity: 1, offset: .28, easing: DRAG },
      { width: fw + 'px', height: fh + 'px', opacity: 1, offset: .6 },
      { width: fw + 'px', height: fh + 'px', opacity: 1, offset: .64 },
      { width: fw + 'px', height: fh + 'px', opacity: 0, offset: .76 },
      { width: fw + 'px', height: fh + 'px', opacity: 0, offset: 1 }
    ], { duration: T, delay: D0, fill: 'both' });
    var rel = D0 + T * .6;
    fr.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: rel - 40, easing: OUT, fill: 'both' });

    // Heading types in (36ms a letter, +24ms after spaces); the untyped remainder stays in place
    // (hidden) so line breaks don't jump.
    var tn = Array.prototype.find.call(h.childNodes, function (n) { return n.nodeType === 3; });
    var full = tn ? tn.nodeValue : '';
    var caret = document.createElement('span'), rest = document.createElement('span');
    caret.setAttribute('aria-hidden', 'true');
    caret.style.cssText = 'display:inline-block;width:0;height:.9em;margin-right:-2px;border-left:2px solid #1b3ac4;vertical-align:-.08em';
    rest.setAttribute('aria-hidden', 'true'); rest.style.visibility = 'hidden';
    if (tn) { h.setAttribute('aria-label', full); tn.nodeValue = ''; rest.textContent = full; h.appendChild(caret); h.appendChild(rest); }
    h.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1, delay: rel, fill: 'both' });
    var blink = caret.animate([{ opacity: 1 }, { opacity: 1, offset: .5 }, { opacity: 0, offset: .51 }, { opacity: 0 }], { duration: 900, iterations: Infinity });
    var CH = 36, t = 0, times = [];
    for (var i = 0; i < full.length; i++) { t += CH + (full[i - 1] === ' ' ? 24 : 0) + ((i * 37) % 15) - 7; times.push(t); }
    var typeEnd = rel + 200 + t;
    setTimeout(function () {
      if (!tn) return;
      blink.pause(); caret.style.opacity = '1';
      var t0 = performance.now();
      var step = function () {
        var el = performance.now() - t0, n = 0;
        while (n < times.length && times[n] <= el) n++;
        tn.nodeValue = full.slice(0, n); rest.textContent = full.slice(n);
        if (n < full.length) requestAnimationFrame(step);
        else {
          rest.remove(); blink.play();
          setTimeout(function () { caret.remove(); tn.nodeValue = full; h.removeAttribute('aria-label'); }, 1400);
        }
      };
      requestAnimationFrame(step);
    }, rel + 200);

    tags.forEach(function (el, i) {
      el.animate([{ opacity: 0, transform: 'translateY(6px) scale(.96)' }, { opacity: 1, transform: 'none' }],
        { duration: 300, delay: typeEnd + 120 + i * 100, easing: OUT, fill: 'both' });
    });
    var howT = typeEnd + 120 + tags.length * 100 + 120;
    var hwm = q('.hw-mark');
    if (hwm) setTimeout(function () { penMark(hwm); }, howT + 350);
    sec.querySelectorAll('.sk-step').forEach(function (el, i) {
      el.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
        { duration: 450, delay: howT + 120 + i * 140, easing: OUT, fill: 'both' });
    });
    var cta = q('.sk-cta-wrap');
    if (cta) penButton(cta, howT + 350 + penTotal() + 150);
    // Hand the hidden start state from the class to inline styles, so removing the class
    // doesn't flash the marks before the pen draws them.
    sec.querySelectorAll('.sk-arw path').forEach(function (p) { p.style.strokeDashoffset = '1'; });
    sec.querySelectorAll('.hw-hl').forEach(function (w) { w.style.backgroundSize = '0% 1.5px'; });
    sec.classList.remove('sk-armed');

    var tick = function () {
      var r = mq.getBoundingClientRect();
      size.textContent = r.width > 2 ? Math.round(r.width) + ' × ' + Math.round(r.height) : '';
      if (ma.playState !== 'finished') requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    ca.finished.then(function () { cur.style.display = 'none'; mq.style.display = 'none'; }).catch(function () {});
  }

  initTyper();
  initSkills();
  setTimeout(intro, 700);
})();

/* Phones: the lead and second-featured covers wipe in from the bottom, the photo settles from a
   slight zoom and the title fades up, once each as they scroll into view. Not with reduced motion. */
(function () {
  if (!window.matchMedia('(max-width: 767px)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  var els = document.querySelectorAll('.lead-grid,.two-col');
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('m-in'); io.unobserve(e.target); } });
  }, { threshold: 0.2 });
  els.forEach(function (el) { el.classList.add('m-arm'); io.observe(el); });
})();
