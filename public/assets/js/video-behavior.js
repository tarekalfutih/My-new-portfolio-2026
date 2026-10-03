/* Portfolio video behavior — loaded in <head> on every page.
   - Never autoplays. Controls come from video-controls.js (native controls without JavaScript).
   - Pauses a playing video when <25% of it is visible; keeps its timestamp; never auto-resumes.
   - Only one video plays at a time.
   - Reload / navigating back: videos reset to 0:00 and show the poster again.
   - Muted, looping, control-less clips (ambient loops) are exempt: they pause off-screen and resume on-screen.
   - Rotate prompt: on phones / iPads held upright, a landscape video that starts playing gets a
     "Rotate your phone for full screen" card over it (once per video). */
(function () {
  if (window.__pfVideo) return;
  window.__pfVideo = true;
  var THRESHOLD = 0.25;
  var seen = new WeakSet();

  // Videos with site controls (data-vc, video-controls.js) are never ambient, even without the attribute.
  function isAmbient(v) { return v.muted && v.loop && !v.controls && !v.hasAttribute('data-vc'); }
  function isFullscreen(v) {
    var fs = document.fullscreenElement || document.webkitFullscreenElement;
    return (!!fs && (fs === v || fs.contains(v))) || !!v.webkitDisplayingFullscreen;
  }
  function play(v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var v = e.target;
      var visible = e.isIntersecting && e.intersectionRatio >= THRESHOLD;
      if (isAmbient(v)) {
        if (!visible && !v.paused) { v.pause(); v.__ambientPaused = true; }
        else if (visible && v.__ambientPaused) { v.__ambientPaused = false; play(v); }
        return;
      }
      if (!visible && !v.paused && !isFullscreen(v)) v.pause();
    });
  }, { threshold: [0, THRESHOLD, 0.5, 1] });

  function setup(v) {
    if (seen.has(v)) return;
    seen.add(v);
    if (isAmbient(v)) { io.observe(v); return; }
    if (v.autoplay) { v.autoplay = false; v.removeAttribute('autoplay'); v.pause(); }
    if (v.getAttribute('preload') === 'auto' || !v.hasAttribute('preload')) v.setAttribute('preload', 'metadata');
    io.observe(v);
  }

  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    if (root.tagName === 'VIDEO') setup(root);
    root.querySelectorAll('video').forEach(setup);
  }

  document.addEventListener('play', function (e) {
    var v = e.target;
    if (!v || v.tagName !== 'VIDEO' || isAmbient(v)) return;
    document.querySelectorAll('video').forEach(function (o) {
      if (o !== v && !o.paused && !isAmbient(o)) o.pause();
    });
  }, true);

  function resetAll() {
    document.querySelectorAll('video').forEach(function (v) {
      if (isAmbient(v)) return;
      v.pause();
      try { v.load(); } catch (_) { try { v.currentTime = 0; } catch (__) {} }
    });
  }
  window.addEventListener('pagehide', function () {
    document.querySelectorAll('video').forEach(function (v) { if (!isAmbient(v)) v.pause(); });
  });
  window.addEventListener('pageshow', function (e) { if (e.persisted) resetAll(); });

  function start() {
    scan(document.body);
    new MutationObserver(function (muts) {
      muts.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) scan(n); }); });
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);

  /* Rotate prompt — touch devices (coarse pointer, width <= 1366px) held in portrait: when a
     landscape video (videoWidth > videoHeight) starts playing, a card covers the whole video,
     including the site control bar (video-controls.js), with a phone that turns 0° → −90°.
     Hides after 3.6s, on rotation to landscape, or on tap. Once per video. Styles: base.css (.rp-ov).
     Test on desktop with ?rotatetest=1 in the URL. */
  var RP_TEST = /[?&]rotatetest=1/.test(location.search);
  var RP_SVG = '<svg width="72" height="72" viewBox="0 0 72 72" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<g class="rp-ph"><rect x="25" y="12" width="22" height="48" rx="3.5"></rect><path d="M32.5 17h7"></path><circle cx="36" cy="54" r="1.4" fill="#fff" stroke="none"></circle></g>' +
    '<path class="rp-ar" pathLength="1" stroke-dasharray="1" d="M54 14a28 28 0 0 1 8 22"></path><path class="rp-ar" d="M58.5 32.5 62 36.5l3.5-4"></path>' +
    '<path class="rp-ar" pathLength="1" stroke-dasharray="1" d="M18 58a28 28 0 0 1-8-22"></path><path class="rp-ar" d="M13.5 39.5 10 35.5l-3.5 4"></path></svg>';

  function rpWanted(v) {
    if (isAmbient(v) || v.__rpShown) return false;
    if (!(v.videoWidth > v.videoHeight)) return false;
    if (RP_TEST) return true;
    return matchMedia('(pointer: coarse)').matches && matchMedia('(orientation: portrait)').matches && window.innerWidth <= 1366;
  }

  function rpShow(v) {
    // The site controls wrap the video in .vc (position: relative); without them, use the parent.
    var host = v.parentElement;
    if (!host) return;
    if (!host.classList.contains('vc') && getComputedStyle(host).position === 'static') host.style.position = 'relative';
    v.__rpShown = true;
    var ov = document.createElement('div');
    ov.className = 'rp-ov';
    ov.setAttribute('role', 'status');
    if (host.classList.contains('vc')) {
      ov.style.inset = '0';
    } else {
      ov.style.left = v.offsetLeft + 'px'; ov.style.top = v.offsetTop + 'px';
      ov.style.width = v.offsetWidth + 'px'; ov.style.height = v.offsetHeight + 'px';
    }
    ov.innerHTML = RP_SVG + '<span>Rotate your phone<br>for full screen</span>';
    host.appendChild(ov);
    void ov.offsetWidth; // start from opacity 0 so the card fades in
    ov.classList.add('on');
    var mq = matchMedia('(orientation: portrait)');
    var timer = setTimeout(hide, 3600);
    function onTurn() { if (!mq.matches) hide(); }
    function hide() {
      if (!ov.parentNode) return;
      ov.classList.remove('on');
      clearTimeout(timer);
      if (mq.removeEventListener) mq.removeEventListener('change', onTurn); else mq.removeListener(onTurn);
      setTimeout(function () { ov.remove(); }, 400);
    }
    // A tap only dismisses the card; it doesn't reach the video or the control bar underneath.
    ov.addEventListener('click', function (e) { e.stopPropagation(); hide(); });
    if (mq.addEventListener) mq.addEventListener('change', onTurn); else mq.addListener(onTurn);
  }

  document.addEventListener('play', function (e) {
    var v = e.target;
    if (v && v.tagName === 'VIDEO' && rpWanted(v) && !isFullscreen(v)) rpShow(v);
  }, true);
})();
