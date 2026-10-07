/* Resource Booking: in the hero's booking grid a selection grows hour by hour in Svea 221 (16:00 on),
   one step every 1.8s, then starts over. Reduced motion: the finished selection (16–19), as in the
   markup. The images carousel uses /assets/js/carousel.js. */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var cells = Array.prototype.slice.call(document.querySelectorAll('[data-rb-h]'));
  if (!cells.length) return;
  var ht = 0;
  setInterval(function () {
    ht += 1;
    var ph = ht % 6, selN = Math.min(3, Math.max(0, ph - 1));
    cells.forEach(function (c) {
      c.style.background = +c.getAttribute('data-rb-h') < 16 + selN ? '#e61fbf' : 'rgba(98,169,174,.45)';
    });
  }, 1800);
})();
