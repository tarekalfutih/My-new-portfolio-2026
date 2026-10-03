/* Work index: filter chips (and, on phones, the "Show" select) show one group (or all). */
(function () {
  var chips = document.querySelectorAll('[data-filter]');
  var groups = document.querySelectorAll('[data-group]');
  var select = document.querySelector('[data-filter-select]');
  function apply(f) {
    chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.getAttribute('data-filter') === f)); });
    if (select) select.value = f;
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
  if (select) select.addEventListener('change', function () { apply(select.value); });
})();
