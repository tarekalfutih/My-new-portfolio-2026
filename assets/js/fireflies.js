/* Fireflies — wandering, blinking, never over text.
   Put data-fireflies="N" on a positioned container and data-ff-avoid="selector list" for
   everything they must stay away from (text, buttons, cover). Paths and positions are
   recomputed from the live layout on load and resize. Reduced motion = still, softly lit. */
(function () {
  const PAD = 26;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  function build(box) {
    box.querySelectorAll('.ff-fly').forEach(n => n.remove());
    const W = box.clientWidth, H = box.clientHeight;
    if (W < 50 || H < 50) return;
    const phone = W < 768;
    const n = Math.round((+box.dataset.fireflies || 16) * (phone ? .5 : 1));
    const b = box.getBoundingClientRect();
    const avoid = [...box.querySelectorAll(box.dataset.ffAvoid || 'h1,h2,h3,p,a,button')]
      .map(e => e.getBoundingClientRect()).filter(r => r.width && r.height)
      .map(r => ({ l: r.left - b.left - PAD, t: r.top - b.top - PAD, r: r.right - b.left + PAD, b: r.bottom - b.top + PAD }));
    const free = (x, y) => x > 8 && y > 8 && x < W - 8 && y < H - 8 && !avoid.some(a => x > a.l && x < a.r && y > a.t && y < a.b);
    const segFree = (p, q) => { for (let i = 1; i <= 10; i++) { const t = i / 10; if (!free(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t)) return false; } return true; };
    const frag = document.createDocumentFragment();
    for (let k = 0; k < n; k++) {
      let home = null;
      for (let i = 0; i < 400 && !home; i++) { const p = [rnd(0, W), rnd(0, H)]; if (free(p[0], p[1])) home = p; }
      if (!home) continue;
      // a looping wander: 5–7 waypoints around home, each leg checked so it never crosses text
      const pts = [home], R = rnd(50, phone ? 90 : 150);
      const legs = Math.round(rnd(5, 7));
      let ang = rnd(0, Math.PI * 2);
      for (let i = 1; i < legs; i++) {
        let ok = null;
        for (let tries = 0; tries < 60 && !ok; tries++) {
          ang += rnd(.6, 1.6) * (Math.random() < .2 ? -1 : 1);
          const r = rnd(R * .35, R);
          const p = [home[0] + Math.cos(ang) * r, home[1] + Math.sin(ang) * r * .7];
          if (free(p[0], p[1]) && segFree(pts[pts.length - 1], p)) ok = p;
        }
        pts.push(ok || pts[pts.length - 1]);
      }
      if (!segFree(pts[pts.length - 1], home)) pts.push(pts[pts.length - 2] || home);
      pts.push(home);

      const depth = Math.random();               // 0 = far, 1 = near
      const size = 3 + depth * 5;
      const f = document.createElement('span');
      f.className = 'ff-fly'; f.setAttribute('aria-hidden', 'true');
      f.style.cssText = `position:absolute;left:0;top:0;width:${size}px;height:${size}px;margin:${-size / 2}px 0 0 ${-size / 2}px;pointer-events:none;z-index:1;transform:translate(${home[0]}px,${home[1]}px)`;
      const g = document.createElement('span');
      g.style.cssText = `position:absolute;inset:0;border-radius:50%;background:#fff3c4;box-shadow:0 0 ${10 + depth * 12}px ${3 + depth * 4}px rgba(255,214,110,${.45 + depth * .35}),0 0 3px 1px #fff;${depth < .3 ? 'filter:blur(.6px);' : ''}opacity:.6`;
      f.appendChild(g); frag.appendChild(f);

      if (still()) continue;
      const total = rnd(16, 28) * 1000;
      const kf = pts.map((p, i) => ({ transform: `translate(${p[0].toFixed(1)}px,${p[1].toFixed(1)}px)`, offset: i / (pts.length - 1), easing: 'cubic-bezier(.45,.05,.55,.95)' }));
      f.animate(kf, { duration: total, iterations: Infinity, delay: -rnd(0, total) });
      // firefly blink: long soft glow, a quick bright flash, then a dim rest
      const bl = rnd(2600, 5200);
      g.animate([
        { opacity: .12, transform: 'scale(.7)' },
        { opacity: .35, transform: 'scale(.85)', offset: .45 },
        { opacity: 1, transform: 'scale(1.15)', offset: .55 },
        { opacity: .85, transform: 'scale(1)', offset: .66 },
        { opacity: .12, transform: 'scale(.7)', offset: .9 },
        { opacity: .12, transform: 'scale(.7)' }
      ], { duration: bl, iterations: Infinity, delay: -rnd(0, bl), easing: 'ease-in-out' });
    }
    box.insertBefore(frag, box.firstElementChild ? box.firstElementChild.nextSibling : null);
  }

  function setup(box) {
    if (box._ff) return; box._ff = true;
    let t; const re = () => { clearTimeout(t); t = setTimeout(() => build(box), 180); };
    build(box);
    new ResizeObserver(re).observe(box);
    setTimeout(re, 900); setTimeout(re, 2500);   // images / fonts settle
    new IntersectionObserver(es => es.forEach(e => box.querySelectorAll('.ff-fly, .ff-fly > span')
      .forEach(el => el.getAnimations().forEach(a => e.isIntersecting ? a.play() : a.pause()))))
      .observe(box);
  }
  const scan = () => document.querySelectorAll('[data-fireflies]').forEach(setup);
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
  scan();
})();
