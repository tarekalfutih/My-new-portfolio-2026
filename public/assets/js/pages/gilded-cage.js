/* Gilded Cage: the hero screenshots crossfade through the game's three steps (water, eat, find the
   different one) every 2.2s while the hero is on screen, with the step bar following; a fourth beat
   rests on the empty (black) frame with the bar dimmed. Reduced motion: the third step, still. */
(function () {
  var hero = document.querySelector('[data-ref="hero"]');
  if (!hero) return;
  var frame = hero.querySelector('.gc-frame');
  var shots = frame ? Array.prototype.slice.call(frame.querySelectorAll('img')).slice(0, 3) : [];
  var steps = Array.prototype.slice.call(hero.querySelectorAll('[data-gc-step]'));
  function show(f) {
    shots.forEach(function (s, i) { s.style.opacity = f === i ? 1 : 0; });
    steps.forEach(function (s, i) {
      s.firstElementChild.style.background = f === 3 ? '#2a2824' : (i <= f ? (i === 2 ? '#b8232f' : '#8e7fc8') : '#2a2824');
      s.lastElementChild.style.color = f === 3 ? '#5a5751' : (i === f ? '#fff' : '#8b8880');
    });
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { show(2); return; }
  var f = 0, vis = true;
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; }).observe(hero);
  setInterval(function () { if (vis && !document.hidden) { f = (f + 1) % 4; show(f); } }, 2200);
})();
