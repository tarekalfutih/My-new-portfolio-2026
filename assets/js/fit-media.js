/* Fit images to the screen — every page. A content image (or the frame it fills) is never wider than
   what keeps its height within --ifit of the height under the header, so no single picture is taller
   than the screen on short laptops or wide phones. Shapes are kept, nothing is cropped, and the
   image's own max-width still applies, so large screens keep the full size. Skipped: images cropped
   on purpose (larger than the box that clips them), very tall infographics (meant to be scrolled),
   positioned / background art, and anything inside [data-nofit]. Videos: video-controls.js. */
(function () {
  var MIN = 160;          // px: small images never need it
  var TALLEST = 2.5;      // height / width: taller than this is a long graphic to scroll through

  function same(a, b) {
    var x = a.getBoundingClientRect(), y = b.getBoundingClientRect();
    return Math.abs(x.width - y.width) < 3 && Math.abs(x.height - y.height) < 3;
  }
  // The element that sets the image's size: the image, or the frame(s) it exactly fills.
  function boxOf(img) {
    var box = img, p = img.parentElement;
    while (p && !/^(SECTION|MAIN|ARTICLE|BODY)$/.test(p.tagName) && p.children.length === 1 && same(box, p)) {
      box = p; p = p.parentElement;
    }
    return box;
  }
  function cropped(img, box) {
    var r = img.getBoundingClientRect();
    for (var e = img.parentElement, i = 0; e && i < 4; e = e.parentElement, i++) {
      var cs = getComputedStyle(e);
      if (/(hidden|clip)/.test(cs.overflow)) {
        var b = e.getBoundingClientRect();
        if (r.width > b.width + 4 || r.height > b.height + 4) return true;
      }
    }
    return false;
  }

  var done = new WeakSet();
  function fit(img) {
    if (done.has(img) || img.closest('[data-nofit], header, footer, .vc')) return;
    var cs = getComputedStyle(img);
    if (cs.position === 'absolute' || cs.position === 'fixed' || cs.display === 'none') return;
    var r = img.getBoundingClientRect();
    if (r.width < MIN || r.height < MIN) return;
    if (r.height / r.width > TALLEST) { done.add(img); return; }
    var box = boxOf(img);
    if (cropped(img, box)) { done.add(img); return; }
    var b = box.getBoundingClientRect(), ratio = b.width / b.height;
    if (!isFinite(ratio) || ratio <= 0) return;
    done.add(img);
    var own = getComputedStyle(box).maxWidth;
    var cap = 'calc((100svh - var(--hdr, 80px)) * var(--ifit, .85) * ' + ratio.toFixed(4) + ')';
    box.style.setProperty('max-width', own && own !== 'none' ? 'min(' + own + ', ' + cap + ')' : cap, 'important');
  }

  function scan() {
    document.querySelectorAll('main img').forEach(function (img) {
      if (img.complete && img.naturalWidth) fit(img);
      else img.addEventListener('load', function () { fit(img); }, { once: true });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan);
  else scan();
  window.addEventListener('load', scan);
})();
