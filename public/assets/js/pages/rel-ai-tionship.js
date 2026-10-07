/* Rel-AI-tionship: the hero storyboard plays like an editing timeline — a playhead sweeps the
   storyboard for 16s (timecode follows the film's cuts), holds 1.5s and loops. On phones the strip
   pans so the playhead stays in view. Reduced motion: a still frame. The stills and sketch
   carousels use /assets/js/carousel.js. --ra-hd = header height for the one-screen hero. */
(function () {
  var hd = document.querySelector('.wrap > header');
  function hdFit() { if (hd) document.documentElement.style.setProperty('--ra-hd', hd.offsetHeight + 'px'); }
  hdFit();
  window.addEventListener('resize', hdFit);

  var $ = function (n) { return document.querySelector('[data-ref="' + n + '"]'); };
  var sbBox = $('sbBox'), sbInner = $('sbInner'), sbHead = $('sbHead'), sbShade = $('sbShade'), sbTc = $('sbTc');
  var pbBox = $('pbBox'), pbInner = $('pbInner'), pbHead = $('pbHead'), pbShade = $('pbShade');
  if (!sbBox && !pbBox) return;

  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Storyboard x position (of 1896) -> film second, at each cut.
  var L = [[725, 0], [792, 4], [849, 6], [908, 8], [975, 13], [1038, 16], [1102, 18], [1166, 22], [1235, 28], [1295, 30],
    [1352, 34], [1411, 40], [1478, 46], [1542, 53], [1623, 57], [1688, 60], [1771, 63], [1846, 65]];
  var x0 = 725, x1 = 1846, D = 16000, HOLD = 1500, t0 = performance.now(), mq = window.matchMedia('(max-width:767px)');

  function step(now) {
    var p = (now - t0) % (D + HOLD), k = Math.min(1, p / D), x = x0 + (x1 - x0) * k;
    var s = 65;
    for (var i = 1; i < L.length; i++) {
      if (x <= L[i][0]) { var a = L[i - 1], b = L[i]; s = a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); break; }
    }
    var sec = Math.floor(s);
    var xc = mq.matches ? x1 * k : x, xp = Math.max(x0, xc);
    [[sbBox, sbInner, x, -x0], [pbBox, pbInner, xc, 0]].forEach(function (r) {
      var box = r[0], inn = r[1], cx = r[2], lo = r[3];
      if (!box || !inn) return;
      if (mq.matches) {
        var bw = box.clientWidth, iw = box.clientHeight * 1896 / 378, px = cx / 1896 * iw;
        var left = Math.max(bw - iw, Math.min(lo / 1896 * iw, bw * .4 - px));
        inn.style.width = iw + 'px'; inn.style.left = left + 'px';
      } else if (inn.style.width) { inn.style.width = ''; inn.style.left = ''; }
    });
    if (sbHead) sbHead.style.left = (x / 1896 * 100) + '%';
    if (sbShade) sbShade.style.width = ((x - x0) / 1896 * 100) + '%';
    if (pbHead) pbHead.style.left = (xp / 1896 * 100) + '%';
    if (pbShade) pbShade.style.width = ((xp - x0) / 1896 * 100) + '%';
    if (sbTc) sbTc.textContent = String(Math.floor(sec / 60)).padStart(2, '0') + '.' + String(sec % 60).padStart(2, '0');
    if (!still) requestAnimationFrame(step);
  }
  if (still) { var f = function () { step(t0); }; f(); window.addEventListener('resize', f); }
  else requestAnimationFrame(step);
})();
