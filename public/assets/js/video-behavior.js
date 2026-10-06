/* Portfolio video behavior — loaded first in <head> on every page (from the 6 Oct handoff;
   the rotate prompt is left out at Tarek's request).
   Follows Apple HIG "Playing video" (developer.apple.com/design/human-interface-guidelines/playing-video):
   - System (native) playback controls only; picture-in-picture, full screen and AirPlay stay available.
   - Never autoplays with sound. Muted, looping, control-less clips are ambient (pause off-screen, resume on-screen).
   - Content keeps its original aspect ratio (object-fit:contain enforced; letterbox, never crop).
   - Plays inline on iPhone (playsinline) — people choose full screen themselves.
   - Resume where people left off: position is remembered per video for the session and restored on
     reload / back; a video that played to the end starts over.
   - Full screen exits automatically when playback ends.
   - Pauses when <25% visible (keeps position, never auto-resumes). Only one video plays at a time. */
(function () {
  if (window.__pfVideo) return;
  window.__pfVideo = true;
  var THRESHOLD = 0.25, KEY = 'pfVideoPos:';
  var seen = new WeakSet();

  function isAmbient(v) { return v.muted && v.loop && !v.controls; }
  function isFullscreen(v) {
    var fs = document.fullscreenElement || document.webkitFullscreenElement;
    return (!!fs && (fs === v || fs.contains(v))) || !!v.webkitDisplayingFullscreen;
  }
  function play(v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  function vid(v) { return KEY + location.pathname + '|' + (v.currentSrc || v.getAttribute('src') || v.id || ''); }
  function save(v) {
    if (isAmbient(v)) return;
    try {
      var d = v.duration, t = v.currentTime;
      if (!t || (d && t > d - 1)) sessionStorage.removeItem(vid(v));
      else sessionStorage.setItem(vid(v), String(t));
    } catch (_) {}
  }
  function restore(v) {
    if (isAmbient(v)) return;
    var go = function () {
      try {
        var t = parseFloat(sessionStorage.getItem(vid(v)));
        if (t > 0 && (!v.duration || t < v.duration - 1)) v.currentTime = t;
      } catch (_) {}
    };
    if (v.readyState >= 1) go(); else v.addEventListener('loadedmetadata', go, { once: true });
  }

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
    v.setAttribute('playsinline', '');
    v.style.objectFit = 'contain';
    if (isAmbient(v)) { io.observe(v); return; }
    v.removeAttribute('disablepictureinpicture');
    v.removeAttribute('disableremoteplayback');
    v.removeAttribute('controlslist');
    if (v.autoplay) { v.autoplay = false; v.removeAttribute('autoplay'); v.pause(); }
    if (v.getAttribute('preload') === 'auto' || !v.hasAttribute('preload')) v.setAttribute('preload', 'metadata');
    if (!v.hasAttribute('aria-label') && !v.hasAttribute('title')) {
      var cap = v.closest('figure, div') && v.closest('figure, div').parentElement;
      var txt = cap && cap.querySelector('figcaption, p');
      if (txt && txt.textContent.trim()) v.setAttribute('aria-label', 'Video: ' + txt.textContent.trim().slice(0, 140));
    }
    v.addEventListener('pause', function () { save(v); });
    v.addEventListener('timeupdate', function () { if (!v.__st || Date.now() - v.__st > 2000) { v.__st = Date.now(); save(v); } });
    v.addEventListener('ended', function () {
      try { sessionStorage.removeItem(vid(v)); } catch (_) {}
      if (isFullscreen(v)) {
        if (document.exitFullscreen && document.fullscreenElement) document.exitFullscreen().catch(function () {});
        else if (document.webkitExitFullscreen && document.webkitFullscreenElement) document.webkitExitFullscreen();
        else if (v.webkitExitFullscreen) v.webkitExitFullscreen();
      }
    });
    restore(v);
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

  window.addEventListener('pagehide', function () {
    document.querySelectorAll('video').forEach(function (v) { if (!isAmbient(v)) { save(v); v.pause(); } });
  });
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) document.querySelectorAll('video').forEach(function (v) { if (!isAmbient(v)) restore(v); });
  });

  function start() {
    scan(document.body);
    new MutationObserver(function (muts) {
      muts.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) scan(n); }); });
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
