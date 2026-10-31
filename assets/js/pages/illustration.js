/* Skräphjältarna hero (tablets and up): "Buy the book" and "Read a preview (PDF)" sit side by side as
   long as they stay clear of the cover; when the second one would come within 24px of it (or not fit),
   it moves under the first and both get the same width. Re-checked on every resize. Phones: CSS. */
(function () {
  var bt = document.querySelector('.ih-bt'), cover = document.querySelector('.ih-cv > div');
  if (!bt || !cover) return;
  var CLEAR = 24;
  function check() {
    bt.classList.remove('ih-bt--row', 'ih-bt--stack');
    if (window.innerWidth < 768) return;
    bt.classList.add('ih-bt--row');
    var a = bt.firstElementChild.getBoundingClientRect(), b = bt.lastElementChild.getBoundingClientRect();
    var c = cover.getBoundingClientRect();
    if (b.top > a.bottom - 1 || b.right > c.left - CLEAR) {
      bt.classList.remove('ih-bt--row');
      bt.classList.add('ih-bt--stack');
    }
  }
  check();
  var t;
  window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(check, 60); });
  window.addEventListener('load', check);
})();
