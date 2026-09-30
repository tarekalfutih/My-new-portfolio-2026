/* LEGO ALMA case study: night-sky stars, mouse meteor trail, and the research question typing in. */
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ~140 twinkling stars (seeded, so the sky is the same on every visit) + two shooting stars.
  function fillStars(box, bi) {
    if (box.childElementCount) return;
    var seed = 7 + bi * 101;
    var r = function () { return (seed = (seed * 16807) % 2147483647) / 2147483647; };
    var frag = document.createDocumentFragment();
    for (var k = 0; k < 140; k++) {
      var s = document.createElement('i');
      var big = r() > .88, sz = big ? 2 + r() * 1.2 : .8 + r() * 1.1;
      s.style.cssText = 'left:' + (r() * 104 - 2).toFixed(2) + '%;top:' + (r() * 100).toFixed(2) + '%;width:' + sz.toFixed(2) + 'px;height:' + sz.toFixed(2) + 'px;' +
        '--lo:' + (.15 + r() * .3).toFixed(2) + ';--hi:' + (.7 + r() * .3).toFixed(2) + ';--d:' + (2.4 + r() * 4).toFixed(2) + 's;--dl:-' + (r() * 6).toFixed(2) + 's;' +
        (big ? 'box-shadow:0 0 6px rgba(169,182,238,.8);' : '') + (r() > .8 ? 'background:#a9b6ee;' : '');
      frag.appendChild(s);
    }
    [[78, 8, 1.5], [46, 4, 6.5]].forEach(function (a) {
      var b = document.createElement('b');
      b.style.cssText = 'left:' + a[0] + '%;top:' + a[1] + '%;animation-delay:' + a[2] + 's';
      frag.appendChild(b);
    });
    box.appendChild(frag);
  }

  // Research question types in the first time it scrolls into view.
  function initRQ() {
    var p = document.querySelector('.rq-text');
    if (!p || reduce || !('IntersectionObserver' in window)) return;
    var full = p.textContent;
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      p.setAttribute('aria-label', full);
      var typed = document.createElement('span'), caret = document.createElement('span'), rest = document.createElement('span');
      typed.setAttribute('aria-hidden', 'true'); rest.setAttribute('aria-hidden', 'true'); rest.style.visibility = 'hidden';
      caret.className = 'rq-caret'; caret.setAttribute('aria-hidden', 'true');
      rest.textContent = full; p.textContent = ''; p.append(typed, caret, rest);
      var i = 0;
      var tick = function () {
        i++; typed.textContent = full.slice(0, i); rest.textContent = full.slice(i);
        if (i < full.length) setTimeout(tick, 30 + (full[i - 1] === ' ' ? 30 : 0) + ((i * 37) % 17));
        else { rest.remove(); setTimeout(function () { caret.remove(); p.textContent = full; p.removeAttribute('aria-label'); }, 1600); }
      };
      setTimeout(tick, 350);
    }, { threshold: .6 });
    io.observe(p);
  }

  // Meteor trail following the pointer inside the night-sky sections. Fine pointers only.
  function trailFor(cv) {
    var sec = cv.closest('section');
    if (!sec || reduce || !matchMedia('(pointer: fine)').matches) return;
    var ctx = cv.getContext('2d'), W = 0, H = 0, dpr = 1;
    var size = function () {
      var r = sec.getBoundingClientRect(); dpr = Math.min(devicePixelRatio || 1, 2);
      W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    if ('ResizeObserver' in window) new ResizeObserver(size).observe(sec);
    var pts = [], sparks = [], raf = 0, LIFE = 420;
    var draw = function (now) {
      raf = 0; ctx.clearRect(0, 0, W, H);
      while (pts.length && now - pts[0].t > LIFE) pts.shift();
      if (pts.length > 1) {
        ctx.lineCap = 'round';
        for (var i = 1; i < pts.length; i++) {
          var a = pts[i - 1], b = pts[i], k = 1 - (now - b.t) / LIFE, f = i / pts.length;
          ctx.strokeStyle = 'rgba(169,182,238,' + (k * f * .35).toFixed(3) + ')'; ctx.lineWidth = 7 * f * k + 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,' + (k * f * .95).toFixed(3) + ')'; ctx.lineWidth = 2.2 * f * k + .3;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
        var hd = pts[pts.length - 1], hk = 1 - (now - hd.t) / LIFE;
        var g = ctx.createRadialGradient(hd.x, hd.y, 0, hd.x, hd.y, 14);
        g.addColorStop(0, 'rgba(255,255,255,' + (.9 * hk).toFixed(3) + ')');
        g.addColorStop(.35, 'rgba(169,182,238,' + (.35 * hk).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(169,182,238,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hd.x, hd.y, 14, 0, 6.2832); ctx.fill();
      }
      for (var j = sparks.length - 1; j >= 0; j--) {
        var s = sparks[j]; s.x += s.vx; s.y += s.vy; s.life -= .028;
        if (s.life <= 0) { sparks.splice(j, 1); continue; }
        ctx.fillStyle = 'rgba(255,255,255,' + (s.life * .85).toFixed(3) + ')'; ctx.fillRect(s.x, s.y, s.s, s.s);
      }
      if (pts.length || sparks.length) raf = requestAnimationFrame(draw);
    };
    sec.addEventListener('pointermove', function (e) {
      var r = sec.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      pts.push({ x: x, y: y, t: performance.now() });
      var p0 = pts[pts.length - 2];
      if (p0) {
        var d = Math.hypot(x - p0.x, y - p0.y);
        for (var k = 0; k < Math.min(3, d / 14); k++) {
          sparks.push({ x: x + (Math.random() - .5) * 6, y: y + (Math.random() - .5) * 6,
            vx: (p0.x - x) * .02 + (Math.random() - .5) * .6, vy: (p0.y - y) * .02 + (Math.random() - .5) * .6 + .15,
            life: 1, s: .6 + Math.random() * 1.4 });
        }
      }
      if (!raf) raf = requestAnimationFrame(draw);
    });
  }

  document.querySelectorAll('.night-stars').forEach(fillStars);
  document.querySelectorAll('.night-trail').forEach(trailFor);
  initRQ();
})();
