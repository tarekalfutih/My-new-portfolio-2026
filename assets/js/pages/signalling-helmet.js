/* Signalling Helmet: the hero fits one screen with the facts strip under it, so it needs the facts'
   height (--fh); the header height (--hdr) comes from site.js. */
(function () {
  var hero = document.querySelector('[data-ref="hero"]'), facts = document.querySelector('[data-ref="facts"]');
  if (!hero || !facts) return;
  function fit() { hero.style.setProperty('--fh', facts.getBoundingClientRect().height + 'px'); }
  fit();
  window.addEventListener('resize', fit);
  window.addEventListener('load', fit);
  if (window.ResizeObserver) new ResizeObserver(fit).observe(facts);
})();
