/* Color Rotation (6 Oct design).
   Hero: a CSS game board with three rotating rings. Every 5s a ring turns (chip 1), the piece hops
   to a target tile (chip 2) and the tile's colour flies into the sequence row (last five kept). Only
   while the hero is on screen. Reduced motion: the piece on the first ring, one colour collected.
   Demos (.dm): scripted animations that play once when scrolled into view; [data-replay] buttons
   restart them. On narrow screens an extra Replay button sits directly under an animation, but only
   when the original button is not on the same screen (measured, re-checked on resize). */
(function () {
  var reduced = function () { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; };
  var timers = [];
  var T = function (fn, ms) { timers.push(setTimeout(fn, ms)); };

  function hero() {
    var root = document.querySelector('#intro .crb');
    if (!root) return;
    var L = [null, root.querySelector('.crw.r3'), root.querySelector('.crw.r2'), root.querySelector('.crw.r1')];
    var pcs = Array.prototype.slice.call(root.querySelectorAll('.crp i'));
    var seqEl = document.querySelector('#intro .hr-seq');
    var chips = Array.prototype.slice.call(document.querySelectorAll('#intro .hr-step'));
    if (!L[1] || !L[2] || !L[3] || !pcs.length || !seqEl) return;
    var R = [3.3, 14.4, 28.6, 42.3], step = [0, 90, 45, 22.5], rot = [0, 0, 0, 0], E = 'cubic-bezier(.6,0,.2,1)', D = 1100;
    var tf = function (a, r, s) { return 'rotate(' + a + 'deg) translateY(' + (-r) + 'cqw) rotate(' + (-a) + 'deg) scale(' + (s || 1) + ')'; };
    var sd = function (x) { var d = ((x % 360) + 360) % 360; return d > 180 ? d - 360 : d; };
    var slots = Array.prototype.slice.call(seqEl.children), seq = [];
    var draw = function () {
      slots.forEach(function (s, i) { s.innerHTML = seq[i] ? '<span class="cb c' + seq[i] + '">' + seq[i] + '</span>' : ''; });
    };
    var tileAt = function (l, a) {
      return Array.prototype.slice.call(L[l].querySelectorAll('.crt')).find(function (el) {
        var m = /rotate\(([-\d.]+)deg\)/.exec(el.style.transform);
        return m && Math.abs(sd(+m[1] + rot[l] - a)) < 1;
      });
    };
    var p = { el: pcs[0], l: 0, a: -45 };
    var chip = function (i) { chips.forEach(function (c, k) { c.classList.toggle('on', k === i); }); };
    if (reduced()) {
      p.el.style.transform = tf(0, R[1]);
      var t0 = tileAt(1, 0);
      if (t0) { seq.push(t0.textContent.trim()); draw(); }
      return;
    }
    L.slice(1).forEach(function (el) { el.style.transition = 'transform ' + D + 'ms ' + E; el.style.transform = 'rotate(0deg)'; });
    var hop = function (l, a) {
      var from = tf(p.a, R[p.l]), to = tf(a, R[l]), mid = tf((p.a + a) / 2, (R[p.l] + R[l]) / 2, 1.3);
      p.el.style.transform = to;
      p.el.animate([{ transform: from }, { transform: mid }, { transform: to }], { duration: 700, easing: 'ease-in-out' });
      p.l = l; p.a = a;
    };
    var turnLayer = function (l, d) {
      rot[l] += d * 90; L[l].style.transform = 'rotate(' + rot[l] + 'deg)';
      L[l].classList.add('hl'); T(function () { L[l].classList.remove('hl'); }, D + 150);
    };
    var dir = 1;
    var plan = function () {
      if (p.l === 0) return { rl: 1, to: function () { return [1, 0]; } };
      var t = p.l + dir;
      if (t < 1 || t > 3) { dir = -dir; t = p.l + dir; }
      var m = ((p.a % step[t]) + step[t]) % step[t], al = m < .01 || m > step[t] - .01;
      if (al && Math.random() < .7) return { rl: t, to: function () { return [t, p.a]; } };
      var s = Math.random() < .5 ? 1 : -1;
      return { rl: t, to: function () { return [p.l, p.a + s * step[p.l]]; } };
    };
    var collect = function (tile) {
      if (!tile) return;
      var c = tile.textContent.trim();
      if (seq.length >= 5) { seq.shift(); draw(); }
      var tg = slots[seq.length], a = tile.getBoundingClientRect(), b = tg.getBoundingClientRect();
      var f = document.createElement('span');
      f.className = 'cb c' + c; f.textContent = c; f.setAttribute('aria-hidden', 'true');
      f.style.cssText = '--s:' + b.width + 'px;position:fixed;left:' + b.left + 'px;top:' + b.top + 'px;z-index:4;pointer-events:none';
      document.body.appendChild(f);
      var dx = a.left + a.width / 2 - b.left - b.width / 2, dy = a.top + a.height / 2 - b.top - b.height / 2;
      f.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.7)' }, { transform: 'none' }],
        { duration: 650, easing: 'cubic-bezier(.3,0,.2,1)' }).onfinish = function () { seq.push(c); draw(); f.remove(); };
    };
    var vis = true;
    var run = function () {
      if (document.hidden || !vis) { T(run, 700); return; }
      var pl = plan(), d = Math.random() < .5 ? 1 : -1;
      chip(0); T(function () { turnLayer(pl.rl, d); }, 150);
      T(function () {
        chip(1);
        var la = pl.to(), tile = tileAt(la[0], la[1]);
        if (tile) tile.classList.add('tgt');
        T(function () { hop(la[0], la[1]); T(function () { if (tile) tile.classList.remove('tgt'); collect(tile); }, 600); }, 600);
      }, 1500);
      T(function () { chip(-1); }, 3600);
      T(run, 5000);
    };
    var sec = document.getElementById('intro');
    if (sec && 'IntersectionObserver' in window) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; }).observe(sec);
    T(run, 900);
  }

  function demos() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-replay]');
      if (!btn || reduced()) return;
      btn.dataset.replay.split(' ').forEach(function (id) {
        var d = document.getElementById(id);
        if (!d) return;
        d.classList.remove('armed', 'run'); void d.offsetWidth; d.classList.add('armed', 'run');
      });
    });
    var tpl = document.querySelector('.rp');
    if (tpl) document.querySelectorAll('.dm').forEach(function (d) {
      var fig = d.querySelector('[role="img"]');
      if (!fig || d.querySelector('.rp-row')) return;
      var row = document.createElement('div'); row.className = 'rp-row';
      var b = tpl.cloneNode(true); b.dataset.replay = d.id; b.setAttribute('aria-label', 'Replay this animation');
      row.appendChild(b); fig.insertAdjacentElement('afterend', row);
    });
    var fit = function () {
      document.querySelectorAll('.rp-row').forEach(function (row) {
        var dm = row.closest('.dm');
        var orig = Array.prototype.slice.call(document.querySelectorAll('.dmbar .rp')).find(function (x) { return x.dataset.replay.split(' ').indexOf(dm.id) >= 0; });
        row.style.display = '';
        if (!orig || getComputedStyle(row).display === 'none') return;
        var fig = row.previousElementSibling || row;
        var hdr = document.querySelector('header'), hh = hdr ? hdr.getBoundingClientRect().height : 0;
        var span = orig.getBoundingClientRect().bottom - fig.getBoundingClientRect().top;
        row.style.display = span <= window.innerHeight - hh - 24 ? 'none' : '';
      });
    };
    fit();
    window.addEventListener('resize', fit);
    if (reduced() || !('IntersectionObserver' in window)) return;
    var ds = Array.prototype.slice.call(document.querySelectorAll('.dm'));
    ds.forEach(function (d) { d.classList.add('armed'); });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('run'); io.unobserve(en.target); } });
    }, { threshold: .35 });
    ds.forEach(function (d) { io.observe(d); });
  }

  hero();
  demos();
})();
