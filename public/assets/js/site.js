/* Shared behaviour for every page. */
(function () {
  // Scroll reveal: [data-reveal] fades up; [data-reveal-lead] staggers its children and
  // draws the heading line. Triggered once per element.
  var targets = document.querySelectorAll('[data-reveal],[data-reveal-lead]');
  if (!('IntersectionObserver' in window)) {
    targets.forEach(function (el) { el.classList.add('is-in'); });
  } else if (targets.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15 });
    targets.forEach(function (el) { io.observe(el); });
  }
})();

/* Image reframing exported from Claude Design (image-slots.manifest.json).
   <img data-view="scale offsetX offsetY">: the image fills the frame like object-fit
   (cover, or contain), is scaled by `scale`, and its centre sits at 50% + offset% of the
   frame. The <img> box is the frame; the crop is recomputed whenever its size changes. */
(function () {
  var imgs = document.querySelectorAll('img[data-view]');
  if (!imgs.length) return;

  function apply(img) {
    var v = img.getAttribute('data-view').split(' ').map(Number);
    var s = v[0] || 1, ox = v[1] || 0, oy = v[2] || 0;
    var iw = img.naturalWidth, ih = img.naturalHeight, fw = img.clientWidth, fh = img.clientHeight;
    if (!iw || !ih || !fw || !fh) return;
    var contain = getComputedStyle(img).objectFit === 'contain';
    var base = contain ? Math.min(fw / iw, fh / ih) : Math.max(fw / iw, fh / ih);
    var w = iw * base, h = ih * base;
    // Like the design tool, limit the pan to half the overflow so the image always fills the
    // frame (the stored offset may have been set on a differently shaped frame).
    var mx = Math.max(0, (w * s / fw - 1) * 50), my = Math.max(0, (h * s / fh - 1) * 50);
    ox = Math.max(-mx, Math.min(mx, ox));
    oy = Math.max(-my, Math.min(my, oy));
    // Position before scaling so that scale(s) about the frame centre lands the image centre
    // at (50% + ox%, 50% + oy%).
    var left = fw / 2 + (fw * ox / 100) / s - w / 2;
    var top = fh / 2 + (fh * oy / 100) / s - h / 2;
    img.style.objectPosition = left.toFixed(2) + 'px ' + top.toFixed(2) + 'px';
    if (Math.abs(s - 1) > 1e-4) {
      var inset = ((1 - 1 / s) / 2 * 100).toFixed(4) + '%';
      img.style.transform = 'scale(' + s + ')';
      img.style.clipPath = 'inset(' + inset + ')'; // clip in local space = the frame after scaling
    }
  }

  var ro = 'ResizeObserver' in window ? new ResizeObserver(function (es) {
    es.forEach(function (e) { apply(e.target); });
  }) : null;
  imgs.forEach(function (img) {
    if (img.complete) apply(img);
    img.addEventListener('load', function () { apply(img); });
    if (ro) ro.observe(img);
    else window.addEventListener('resize', function () { apply(img); });
  });
})();

/* Phone menu (< 768px): the header's hamburger opens a full-screen list of links.
   Esc and link taps close it; focus moves to the first link; the page behind does not scroll. */
(function () {
  var btn = document.querySelector('[data-menu-btn]');
  var menu = document.getElementById('m-menu');
  if (!btn || !menu) return;
  function set(open, refocus) {
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.documentElement.classList.toggle('m-open', open);
    if (open) {
      var first = menu.querySelector('a:not([hidden])');
      if (first) first.focus();
    } else if (refocus) btn.focus();
  }
  btn.addEventListener('click', function () { set(menu.hidden); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !menu.hidden) set(false, true);
  });
  // Rotating or resizing past the phone layout closes the menu.
  var mq = window.matchMedia('(min-width: 768px)');
  function onChange() { if (mq.matches && !menu.hidden) set(false); }
  if (mq.addEventListener) mq.addEventListener('change', onChange); else mq.addListener(onChange);
  // Back/forward cache: never come back to an open menu.
  window.addEventListener('pageshow', function () { if (!menu.hidden) set(false); });
})();
