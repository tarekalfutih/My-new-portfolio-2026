/* Work index: filter chips show one group (or all). */
(function () {
  var chips = document.querySelectorAll('[data-filter]');
  var groups = document.querySelectorAll('[data-group]');
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var f = chip.getAttribute('data-filter');
      chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
      groups.forEach(function (g) {
        var show = f === 'all' || g.getAttribute('data-group') === f;
        g.hidden = !show;
        // newly shown sections should not wait for a scroll to reveal
        if (show) g.querySelectorAll('[data-reveal]').forEach(function (el) { el.classList.add('is-in'); });
      });
    });
  });
})();
