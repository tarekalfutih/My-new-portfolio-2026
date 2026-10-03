/* CV viewer — every link to the CV (/cv.pdf) opens an in-page dialog instead of downloading.
   The dialog (max 1200px wide, full screen on phones) renders the PDF with a local copy of pdf.js
   (assets/js/pdfjs/, loaded on first open) and falls back to an <iframe>. Header: "Download CV"
   and "Close ✕". Esc closes, Tab stays inside, clicking outside does not close.
   Without JavaScript the link still downloads the PDF. No CV links are shown under 768px (base.css). */
(function () {
  if (window.__cvViewer) return;
  window.__cvViewer = true;

  // pdf.js sits next to this script, so the path works under any base path (GitHub Pages).
  var me = document.currentScript && document.currentScript.src;
  var LIB = me ? me.replace(/[^/]*$/, '') + 'pdfjs/' : '/assets/js/pdfjs/';
  var box = null, lastFocus = null, libP = null;

  function isCv(a) { return /\/cv\.pdf$/i.test(a.pathname || ''); }

  function lib() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (!libP) libP = new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = LIB + 'pdf.min.js';
      s.onload = function () {
        if (!window.pdfjsLib) { rej(new Error('pdf.js missing')); return; }
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = LIB + 'pdf.worker.min.js';
        res(window.pdfjsLib);
      };
      s.onerror = rej;
      document.head.appendChild(s);
    });
    return libP;
  }

  function open(link) {
    var url = link.href, name = link.getAttribute('download') || 'Tarek-Alfutih-CV.pdf';
    lastFocus = document.activeElement;
    box = document.createElement('div');
    box.className = 'cvv';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'CV — Tarek Alfutih');
    box.innerHTML =
      '<div class="cvv-panel">' +
        '<div class="cvv-bar">' +
          '<div class="cvv-title">CV <span class="cvv-name">— Tarek Alfutih</span></div>' +
          '<a class="cvv-btn cvv-dl" data-cv-dl href="' + url + '" download="' + name + '">Download CV<span aria-hidden="true">↓</span></a>' +
          '<button type="button" class="cvv-btn cvv-close" data-cv-close aria-label="Close CV">Close<span aria-hidden="true">✕</span></button>' +
        '</div>' +
        '<div class="cvv-pages" data-cv-pages><div class="cvv-msg">Loading CV…</div></div>' +
      '</div>';
    box.addEventListener('click', function (e) { if (e.target.closest('[data-cv-close]')) close(); });
    document.body.appendChild(box);
    document.documentElement.classList.add('cvv-open');
    box.querySelector('[data-cv-close]').focus();
    render(box.querySelector('[data-cv-pages]'), url);
  }

  function render(host, url) {
    var mine = box;
    lib().then(function (pdfjs) { return pdfjs.getDocument(url).promise; }).then(function (doc) {
      if (box !== mine) return;
      host.innerHTML = '';
      var phone = window.matchMedia('(max-width: 767px)').matches;
      var w = Math.min(host.clientWidth - (phone ? 16 : 32), 1100);
      var dpr = Math.min(window.devicePixelRatio || 1, 2), chain = Promise.resolve();
      for (var i = 1; i <= doc.numPages; i++) (function (n) {
        chain = chain.then(function () { return doc.getPage(n); }).then(function (page) {
          if (box !== mine) return;
          var v1 = page.getViewport({ scale: 1 }), sc = w / v1.width, vp = page.getViewport({ scale: sc * dpr });
          var c = document.createElement('canvas');
          c.width = vp.width; c.height = vp.height;
          c.setAttribute('role', 'img'); c.setAttribute('aria-label', 'CV page ' + n);
          c.style.width = w + 'px'; c.style.height = (v1.height * sc) + 'px';
          host.appendChild(c);
          return page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
        });
      })(i);
      return chain;
    }).catch(function () {
      if (box !== mine) return;
      host.innerHTML = '<iframe title="CV — Tarek Alfutih" src="' + url + '#view=FitH"></iframe>';
    });
  }

  function close() {
    if (!box) return;
    box.remove(); box = null;
    document.documentElement.classList.remove('cvv-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.hasAttribute('data-cv-dl') || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !isCv(a)) return;
    e.preventDefault();
    open(a);
  }, true);

  document.addEventListener('keydown', function (e) {
    if (!box) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'Tab') {
      var f = Array.prototype.filter.call(box.querySelectorAll('a,button'), function (el) { return el.offsetParent; });
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
})();
