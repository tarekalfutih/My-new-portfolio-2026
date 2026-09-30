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

  /* Second screen: a "Tarek" cursor drags a selection marquee to the frame's measured size
     (live W × H label), then the heading types in and tags / steps stagger in. Plays once. */
  function initSkills() {
    var sec = document.getElementById('skills');
    if (!sec || reduce || !('IntersectionObserver' in window) || !sec.animate) return;
    sec.classList.add('sk-armed');
    var io = new IntersectionObserver(function (es) {
      if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); playSkills(sec); }
    }, { threshold: 0.4 });
    io.observe(sec);
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
    var OUT = 'cubic-bezier(.2,.7,.3,1)', DRAG = 'cubic-bezier(.45,0,.25,1)', T = 2600, D0 = 150;
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

    // Heading types in; the untyped remainder stays in place (hidden) so line breaks don't jump.
    var tn = Array.prototype.find.call(h.childNodes, function (n) { return n.nodeType === 3; });
    var full = tn ? tn.nodeValue : '';
    var caret = document.createElement('span'), rest = document.createElement('span');
    caret.setAttribute('aria-hidden', 'true');
    caret.style.cssText = 'display:inline-block;width:0;height:.9em;margin-right:-2px;border-left:2px solid #1b3ac4;vertical-align:-.08em';
    rest.setAttribute('aria-hidden', 'true'); rest.style.visibility = 'hidden';
    if (tn) { h.setAttribute('aria-label', full); tn.nodeValue = ''; rest.textContent = full; h.appendChild(caret); h.appendChild(rest); }
    h.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1, delay: rel, fill: 'both' });
    var blink = caret.animate([{ opacity: 1 }, { opacity: 1, offset: .5 }, { opacity: 0, offset: .51 }, { opacity: 0 }], { duration: 900, iterations: Infinity });
    var CH = 58, t = 0, times = [];
    for (var i = 0; i < full.length; i++) { t += CH + (full[i - 1] === ' ' ? 40 : 0) + ((i * 37) % 23) - 11; times.push(t); }
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
        { duration: 300, delay: typeEnd + 180 + i * 160, easing: OUT, fill: 'both' });
    });
    var howT = typeEnd + 180 + tags.length * 160 + 200;
    var howL = q('.sk-how-l');
    if (howL) howL.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: howT, easing: OUT, fill: 'both' });
    var hwm = q('.hw-mark');
    if (hwm) {
      hwm.style.backgroundSize = '0% 100%';
      setTimeout(function () { hwm.style.backgroundSize = ''; hwm.classList.add('go'); }, howT + 350);
    }
    sec.querySelectorAll('.sk-step').forEach(function (el, i) {
      el.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
        { duration: 450, delay: howT + 120 + i * 140, easing: OUT, fill: 'both' });
    });
    var cta = q('.sk-cta-wrap');
    if (cta) cta.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }],
      { duration: 450, delay: howT + 120 + 3 * 140 + 200, easing: OUT, fill: 'both' });
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
