/* Octotorg case study: the hero illustration swaps between its three frames every 500ms.
   Reduced motion keeps frame 1. Header, back link, section tabs and videos are shared. */
(function () {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var art = document.querySelector('.oc-hero .oc-art');
  if (!art) return;
  // Frame URLs from the image's own src, so a BASE_PATH prefix added by the build is kept.
  var first = art.getAttribute('src');
  if (!/-1\.png$/.test(first)) return;
  var src = [1, 2, 3].map(function (n) { return first.replace(/-1\.png$/, '-' + n + '.png'); });
  src.forEach(function (s) { var im = new Image(); im.src = s; });
  var i = 0;
  setInterval(function () {
    if (document.hidden) return;
    i = (i + 1) % 3;
    art.src = src[i];
  }, 500);
})();
