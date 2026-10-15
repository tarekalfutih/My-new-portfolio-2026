/* An Honest Interface: the hero driver display is one animated image (5 frames × 0.5s = 2.5s loop,
   50 → 100 km/h). The speed bar under it runs on the image's clock, so the lit segment always matches
   the speed in the picture. Scrolling the hero back into view, or coming back to the tab, restarts the
   image and the bar together at 50 km/h. Reduced motion: the 100 km/h still, full bar. */
(function () {
  var hero = document.querySelector('[data-ref="hero"]'), art = document.querySelector('[data-ref="art"]');
  var g = art && art.querySelector('[data-ahi-gif]');
  if (!hero || !g) return;
  var steps = Array.prototype.slice.call(art.querySelectorAll('[data-ahi-step]'));
  var FRAME = 500, LOOP = 2500;
  var sf = -1;
  function show(f) {
    if (f === sf) return;
    sf = f;
    steps.forEach(function (s, i) {
      s.firstElementChild.style.background = i <= f ? '#EC7406' : '#C8C9C7';
      s.lastElementChild.style.color = i === f ? '#000' : '#75787B';
    });
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    g.src = '/assets/img/polestar-3-speed-effect-5.jpg';
    g.alt = 'Driver display at 100 km/h: the trees are bare';
    show(4);
    return;
  }

  // A browser only restarts an animated image when its src changes, so each restart gives it a fresh
  // blob: URL of the same file (fetched once, from the cache). Without fetch, a fresh query string.
  var src = g.currentSrc || g.src, blob = null, url = null, t0 = null, vis = true, timer = 0;
  function restart() {
    t0 = null;
    show(0);
    g.onload = function () { if (t0 == null) { t0 = performance.now(); tick(); } };
    if (blob) {
      if (url) URL.revokeObjectURL(url);
      url = URL.createObjectURL(blob);
      g.src = url;
    } else {
      g.src = src + (src.indexOf('?') < 0 ? '?' : '&') + 'r=' + Date.now();
    }
  }
  function begin() {
    if (!window.fetch || !window.URL || !URL.createObjectURL) { restart(); return; }
    fetch(src).then(function (r) { return r.ok ? r.blob() : null; })
      .then(function (b) { blob = b; restart(); }, restart);
  }
  if (g.complete && g.naturalWidth) begin();
  else g.addEventListener('load', begin, { once: true });

  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) {
    var v = es[0].isIntersecting;
    if (v && !vis) restart();
    vis = v;
  }).observe(hero);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) restart(); });

  // The lit segment = elapsed time on the image's clock, checked just after each frame change.
  function tick() {
    var wait = 100;
    if (t0 != null && vis) {
      var el = performance.now() - t0;
      show(Math.floor((el % LOOP) / FRAME));
      wait = FRAME - (el % FRAME) + 4;
    }
    clearTimeout(timer);
    timer = setTimeout(tick, wait);
  }
  tick();
})();
