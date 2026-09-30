/* Portfolio video behavior — loaded in <head> on every page.
   - Never autoplays. Controls come from video-controls.js (native controls without JavaScript).
   - Pauses a playing video when <25% of it is visible; keeps its timestamp; never auto-resumes.
   - Only one video plays at a time.
   - Reload / navigating back: videos reset to 0:00 and show the poster again.
   - Muted, looping, control-less clips (ambient loops) are exempt: they pause off-screen and resume on-screen. */
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
})();
