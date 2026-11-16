/* Older browsers (e.g. TV browsers built on an old Chromium) — every page, does nothing elsewhere.
   - Container units (cqw/cqh, Chromium 105+): the numbered badges on images, the TrailMate hero photo
     and the Color Rotation board are sized relative to their frame. Here every declaration that uses
     them (inline, or in the page's <style> blocks) is worked out in px from the frame's real size.
   - aspect-ratio (Chromium 88+): frames that get their height from it get it from their width here.
   Re-run on load and resize. ?legacy (or ?legacy=cq / ?legacy=ar) forces it on, for testing. */
(function () {
  var m = location.search.match(/[?&]legacy(?:=(\w+))?/);   // ?legacy, ?legacy=cq or ?legacy=ar
  var force = m ? (m[1] || 'all') : '';
  var S = window.CSS && CSS.supports;
  var needCQ = /all|cq/.test(force) || !(S && CSS.supports('width', '1cqw'));
  var needAR = /all|ar/.test(force) || !(S && CSS.supports('aspect-ratio', '1 / 1'));
  if (!needCQ && !needAR) return;

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
  if (needCQ) {
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

  // Every frame whose height comes from aspect-ratio: [{el, ratio, media}]
  var arItems = [];
  if (needAR) {
    var AR = /aspect-ratio\s*:\s*([\d.]+)\s*(?:\/\s*([\d.]+))?/;
    document.querySelectorAll('[style*="aspect-ratio"]').forEach(function (el) {
      var m = (el.getAttribute('style') || '').match(AR);
      if (m) arItems.push({ el: el, ratio: m[1] / (m[2] || 1), media: null });
    });
    RULES.forEach(function (r) {
      var m = r.decls.match(AR);
      if (!m) return;
      var els;
      try { els = document.querySelectorAll(r.sel); } catch (e) { return; }
      els.forEach(function (el) { arItems.push({ el: el, ratio: m[1] / (m[2] || 1), media: r.media }); });
    });
  }

  function active(item) { return !item.media || matchMedia(item.media).matches; }
  function units() {
    cqItems.forEach(function (it) {
      if (!active(it)) return;
      it.el.style.setProperty(it.prop, px(it.value, container(it.el)), 'important');
    });
  }
  // Container units can set a frame's width, aspect-ratio then its height, and units inside it need
  // that height: units, heights, units again.
  function run() {
    units();
    arItems.forEach(function (it) {
      if (!active(it)) return;
      var w = it.el.offsetWidth;   // layout width, not the outline of a rotated/scaled box
      if (w) it.el.style.setProperty('height', (w / it.ratio).toFixed(2) + 'px', 'important');
    });
    units();
  }
  run();
  window.addEventListener('load', run);
  var t;
  window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(run, 120); });
})();
