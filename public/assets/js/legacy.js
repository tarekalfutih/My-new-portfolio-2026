/* Older browsers (e.g. TV browsers built on an old Chromium) — every page, does nothing elsewhere.
   - Container units (cqw/cqh, Chromium 105+): the numbered badges on images, the TrailMate hero photo
     and the Color Rotation board are sized relative to their frame. Here every declaration that uses
     them (inline, or in the page's <style> blocks) is worked out in px from the frame's real size.
   Re-run on load and resize. ?legacy in the address bar forces it on, for testing.
   (aspect-ratio isn't faked: TV browsers that lack these units still support it, and copying
   height = width can't reproduce frames that the grid shrinks.) */
(function () {
  var force = /[?&]legacy\b/.test(location.search);
  if (!force && window.CSS && CSS.supports && CSS.supports('width', '1cqw')) return;

  var CQ = /(-?[\d.]+)cq([whib])\b/;

  // Rules from the page's <style> blocks, one @media level deep: [{media, selector, decls}]
  function rules() {
    var out = [];
    document.querySelectorAll('style').forEach(function (st) {
      var css = st.textContent.replace(/\/\*[\s\S]*?\*\//g, '');
      var re = /@media([^{]+)\{((?:[^{}]*\{[^{}]*\})*)\s*\}|([^{}@]+)\{([^{}]*)\}/g, m;
      while ((m = re.exec(css))) {
        if (m[1]) {
          var inner = /([^{}]+)\{([^{}]*)\}/g, n;
          while ((n = inner.exec(m[2]))) out.push({ media: m[1].trim(), sel: n[1].trim(), decls: n[2] });
        } else out.push({ media: null, sel: m[3].trim(), decls: m[4] });
      }
    });
    return out;
  }
  var RULES = rules();
  function decls(text) {
    var o = [];
    text.split(';').forEach(function (d) {
      var i = d.indexOf(':');
      if (i > 0) o.push([d.slice(0, i).trim(), d.slice(i + 1).trim()]);
    });
    return o;
  }

  var containers = RULES.filter(function (r) { return /container-type\s*:/.test(r.decls); });
  function isContainer(el) {
    if (/container-type\s*:/.test(el.getAttribute('style') || '')) return true;
    return containers.some(function (r) {
      try { return (!r.media || matchMedia(r.media).matches) && el.matches(r.sel); } catch (e) { return false; }
    });
  }
  function container(el) {
    for (var p = el.parentElement; p; p = p.parentElement) if (isContainer(p)) return p;
    return document.documentElement;
  }
  function px(value, box) {
    var w = box.clientWidth, h = box.clientHeight;
    return value.replace(new RegExp(CQ.source, 'g'), function (_, n, axis) {
      var size = axis === 'h' || axis === 'b' ? h : w;
      return (parseFloat(n) * size / 100).toFixed(2) + 'px';
    });
  }

  // Every element + declaration that uses container units: [{el, prop, value, important}]
  var cqItems = [];
  {
    document.querySelectorAll('[style*="cq"]').forEach(function (el) {
      decls(el.getAttribute('style')).forEach(function (d) {
        if (CQ.test(d[1])) cqItems.push({ el: el, prop: d[0], value: d[1].replace(/!important/, '').trim(), media: null });
      });
    });
    RULES.forEach(function (r) {
      decls(r.decls).forEach(function (d) {
        if (!CQ.test(d[1])) return;
        var els;
        try { els = document.querySelectorAll(r.sel); } catch (e) { return; }
        els.forEach(function (el) { cqItems.push({ el: el, prop: d[0], value: d[1].replace(/!important/, '').trim(), media: r.media }); });
      });
    });
  }

  function active(item) { return !item.media || matchMedia(item.media).matches; }
  function units() {
    cqItems.forEach(function (it) {
      if (!active(it)) return;
      it.el.style.setProperty(it.prop, px(it.value, container(it.el)), 'important');
    });
  }
  var run = units;
  run();
  window.addEventListener('load', run);
  var t;
  window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(run, 120); });
})();
