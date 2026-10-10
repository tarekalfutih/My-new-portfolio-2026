/* PlayRent: both screen carousels use /assets/js/carousel.js; the hero instruments and logo notes are CSS animations. */

/* Section 03 walkthrough video: iPads and phones show it in a tall frame, so they get the tall poster
   (data-poster-tall); desktop keeps the wide one (poster). */
(function () {
  var v = document.getElementById('playrent-video');
  if (!v || !v.getAttribute('data-poster-tall')) return;
  var wide = v.getAttribute('poster');
  var tall = v.getAttribute('data-poster-tall');
  var mq = window.matchMedia('(max-width: 1024px)');
  function set() { v.setAttribute('poster', mq.matches ? tall : wide); }
  set();
  if (mq.addEventListener) mq.addEventListener('change', set); else mq.addListener(set);
})();
