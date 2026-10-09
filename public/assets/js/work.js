/* Work index: filter chips (and, on phones, the "Show" field) show one group (or all). */
(function () {
  var chips = document.querySelectorAll('[data-filter]');
  var groups = document.querySelectorAll('[data-group]');
  var fsel = document.querySelector('[data-fsel]');
  var btn = fsel && fsel.querySelector('.f-sel-btn');
  var list = fsel && fsel.querySelector('.f-sel-list');
  var shade = fsel && fsel.querySelector('.f-sel-shade');
  var cur = fsel && fsel.querySelector('.f-sel-cur');
  var opts = list ? Array.prototype.slice.call(list.querySelectorAll('[role="option"]')) : [];
  function apply(f) {
    chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.getAttribute('data-filter') === f)); });
    opts.forEach(function (o) {
      var on = o.getAttribute('data-value') === f;
      o.setAttribute('aria-selected', String(on));
      if (on && cur) cur.textContent = o.textContent;
    });
    groups.forEach(function (g) {
      var show = f === 'all' || g.getAttribute('data-group') === f;
      g.hidden = !show;
      // newly shown sections should not wait for a scroll to reveal
      if (show) g.querySelectorAll('[data-reveal]').forEach(function (el) { el.classList.add('is-in'); });
    });
  }
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () { apply(chip.getAttribute('data-filter')); });
  });
  if (!btn || !list) return;

  // Phone "Show" field: a button with a listbox hanging below it. Tapping outside (the
  // transparent full-screen shade) or Escape closes it.
  function setOpen(open, refocus) {
    btn.setAttribute('aria-expanded', String(open));
    list.hidden = !open;
    if (shade) shade.hidden = !open;
    if (open) {
      var sel = list.querySelector('[aria-selected="true"]') || opts[0];
      if (sel) sel.focus();
    } else if (refocus) {
      btn.focus();
    }
  }
  btn.addEventListener('click', function () { setOpen(list.hidden); });
  if (shade) shade.addEventListener('click', function () { setOpen(false); });
  opts.forEach(function (o, i) {
    o.addEventListener('click', function () { apply(o.getAttribute('data-value')); setOpen(false, true); });
    o.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        opts[(i + (e.key === 'ArrowDown' ? 1 : opts.length - 1)) % opts.length].focus();
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        opts[e.key === 'Home' ? 0 : opts.length - 1].focus();
      }
    });
  });
  fsel.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !list.hidden) { e.preventDefault(); setOpen(false, true); }
  });
  // Tabbing out of the open list closes it.
  list.addEventListener('focusout', function (e) {
    if (!list.hidden && e.relatedTarget && !fsel.contains(e.relatedTarget)) setOpen(false);
  });
})();
