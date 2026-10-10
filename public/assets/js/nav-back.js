// "← Back" links (a[data-back]): go to the previous page in history when it is on this site (but not the
// browser game in /play/); otherwise follow href.
(function () {
  if (window.__navBack) return; window.__navBack = 1;
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-back]');
    if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var same = false;
    try {
      var ref = document.referrer ? new URL(document.referrer) : null;
      // Never "back" into the browser game (/play/…): follow the link instead.
      same = !!ref && ref.origin === location.origin && document.referrer !== location.href && ref.pathname.indexOf('/play/') === -1;
    } catch (_) {}
    if (same && history.length > 1) { e.preventDefault(); history.back(); }
  }, true);
})();
