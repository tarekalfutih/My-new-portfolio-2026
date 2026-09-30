/* Contact: Copy buttons (label flips to "Copied ✓" for 1.8s, announced via aria-live). */
(function () {
  var status = document.querySelector('[data-copy-status]');
  var timer;

  function fallbackCopy(val) {
    var t = document.createElement('textarea');
    t.value = val; t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); } catch (_) {}
    t.remove();
  }

  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var val = btn.getAttribute('data-copy');
      try { navigator.clipboard.writeText(val).catch(function () { fallbackCopy(val); }); } catch (_) { fallbackCopy(val); }
      document.querySelectorAll('[data-copy]').forEach(function (b) { b.textContent = 'Copy'; });
      btn.textContent = 'Copied ✓';
      if (status) status.textContent = 'Copied to clipboard';
      clearTimeout(timer);
      timer = setTimeout(function () {
        btn.textContent = 'Copy';
        if (status) status.textContent = '';
      }, 1800);
    });
  });
})();
