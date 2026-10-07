/* An Honest Interface: the hero driver display steps through five speeds (50 → 100 km/h) every 1.6s
   while the hero is on screen: the frames crossfade, the speed bar fills, and only the visible frame
   has alt text. Reduced motion: the 100 km/h frame, still. */
(function () {
  var hero = document.querySelector('[data-ref="hero"]'), art = document.querySelector('[data-ref="art"]');
  if (!hero || !art) return;
  var frames = Array.prototype.slice.call(art.querySelectorAll('img')).slice(0, 5);
  var steps = Array.prototype.slice.call(art.querySelectorAll('[data-ahi-step]'));
  var kmh = ['50 km/h', '60 km/h', '70 km/h', '80 km/h', '100 km/h'];
  function show(sf) {
    frames.forEach(function (f, i) {
      f.style.opacity = i === sf ? 1 : 0;
      f.alt = i === sf ? 'Driver display at ' + kmh[i] + ': as speed increases, the trees thin out' : '';
    });
    steps.forEach(function (s, i) {
      s.firstElementChild.style.background = i <= sf ? '#EC7406' : '#C8C9C7';
      s.lastElementChild.style.color = i === sf ? '#000' : '#75787B';
    });
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { show(4); return; }
  var sf = 0, vis = true;
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; }).observe(hero);
  setInterval(function () { if (vis && !document.hidden) { sf = (sf + 1) % 5; show(sf); } }, 1600);
})();
