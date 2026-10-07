/* Smart Fishing.
   - Desktop (>= 1025px): the hero fits one screen. --k scales the hero type down (binary search,
     then fine steps) until the hero's content fits the section's height.
   - The hero waves (SMIL) stand still with reduced motion.
   The phone-only carousels use /assets/js/carousel.js. */
(function () {
  var sec = document.getElementById('overview');
  function fitHero() {
    if (!sec) return;
    if (innerWidth < 1025) { sec.style.removeProperty('--k'); return; }
    var top = sec.querySelector('.wl-top');
    var need = function () { var t = 0; for (var i = 0; i < sec.children.length; i++) t += sec.children[i].getBoundingClientRect().height; return t; };
    var fits = function () { return need() <= sec.clientHeight - 12; };
    if (top) top.style.setProperty('flex', 'none', 'important');
    var lo = .55, hi = 1;
    sec.style.setProperty('--k', 1);
    if (!fits()) {
      for (var i = 0; i < 10; i++) { var m = (lo + hi) / 2; sec.style.setProperty('--k', m); if (fits()) lo = m; else hi = m; }
      sec.style.setProperty('--k', lo);
    }
    if (top) {
      top.style.removeProperty('flex');
      var k = parseFloat(sec.style.getPropertyValue('--k')) || 1;
      while (top.scrollHeight > top.clientHeight + 1 && k > .55) { k -= .02; sec.style.setProperty('--k', k); }
    }
  }
  fitHero();
  setTimeout(fitHero, 300);
  setTimeout(fitHero, 1200);
  if (document.fonts) document.fonts.ready.then(fitHero);
  window.addEventListener('resize', fitHero);

  var waves = document.querySelector('[data-ref="waves"]');
  if (waves && waves.pauseAnimations && window.matchMedia('(prefers-reduced-motion: reduce)').matches) waves.pauseAnimations();
})();
