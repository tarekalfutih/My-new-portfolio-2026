/* Portfolio video behavior — loaded first in <head> on every page.
   Follows Apple HIG "Playing video" (developer.apple.com/design/human-interface-guidelines/playing-video)
   and Tarek's rules:
   - People choose when a video starts: never autoplays (muted, looping, control-less ambient clips excepted).
   - Original aspect ratio, never cropped (object-fit: contain; the frame letterboxes if needed).
   - Plays inline on iPhone (playsinline); people choose full screen. Full screen exits when playback ends.
   - Controls: the site bar (video-controls.js) mirrors the system player (play/pause, seek, time, sound,
     full screen, Space / K to play-pause) without shading the video on hover.
   - Scrolling away pauses a playing video (less than 25% visible); when it is back on screen (half
     visible) it continues from the same frame automatically, without asking, so nothing is missed.
     Same when the browser tab is hidden and shown again. A video the viewer paused stays paused.
   - Only one video plays at a time (no mixed audio); starting another cancels any pending resume.
   - Leaving the page resets every video: coming back (reload, back / forward) starts at 0:00 with
     the poster showing. */
(function () {
  if (window.__pfVideo) return;
  window.__pfVideo = true;
  var PAUSE_BELOW = 0.25, RESUME_FROM = 0.5;
  var seen = new WeakSet();

  // Videos with the site controls (data-vc) are never ambient, even though video-controls.js removed
  // their native controls attribute.
  function isAmbient(v) { return v.muted && v.loop && !v.controls && !v.hasAttribute('data-vc'); }
  function isFullscreen(v) {
    var fs = document.fullscreenElement || document.webkitFullscreenElement;
    return (!!fs && (fs === v || fs.contains(v))) || !!v.webkitDisplayingFullscreen;
  }
  function play(v) { var p = v.play(); if (p && p.catch) p.catch(function () { v.__resume = false; }); }
  // Pause on the viewer's behalf (scrolled away / tab hidden), remembering to continue later.
  function autoPause(v) {
    if (v.paused || isFullscreen(v)) return;
    v.__auto = true; v.__resume = true;
    v.pause();
  }
  function anotherPlaying(v) {
    return Array.prototype.some.call(document.querySelectorAll('video'), function (o) {
      return o !== v && !o.paused && !isAmbient(o);
    });
  }
  function maybeResume(v) {
    if (!v.__resume || !v.paused || v.ended || document.hidden || v.__ratio < RESUME_FROM || anotherPlaying(v)) return;
    v.__resume = false;
    play(v);
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var v = e.target;
      v.__ratio = e.isIntersecting ? e.intersectionRatio : 0;
      if (isAmbient(v)) {
        if (v.__ratio < PAUSE_BELOW && !v.paused) { v.pause(); v.__ambientPaused = true; }
        else if (v.__ratio >= PAUSE_BELOW && v.__ambientPaused) { v.__ambientPaused = false; play(v); }
        return;
      }
      if (v.__ratio < PAUSE_BELOW) autoPause(v);
      else maybeResume(v);
    });
  }, { threshold: [0, PAUSE_BELOW, RESUME_FROM, 0.75, 1] });

  function reset(v) {
    v.__resume = false;
    v.pause();
    try { v.currentTime = 0; } catch (_) {}
    try { v.load(); } catch (_) {}   // shows the poster again
  }

  function setup(v) {
    if (seen.has(v)) return;
    seen.add(v);
    v.setAttribute('playsinline', '');
    v.style.objectFit = 'contain';
    v.__ratio = 0;
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
    v.addEventListener('pause', function () {
      if (v.__auto) { v.__auto = false; return; }   // our own pause: keep the pending resume
      v.__resume = false;                             // the viewer paused: stay paused
    });
    v.addEventListener('play', function () { v.__resume = false; });
    v.addEventListener('ended', function () {
      v.__resume = false;
      if (isFullscreen(v)) {
        if (document.exitFullscreen && document.fullscreenElement) document.exitFullscreen().catch(function () {});
        else if (document.webkitExitFullscreen && document.webkitFullscreenElement) document.webkitExitFullscreen();
        else if (v.webkitExitFullscreen) v.webkitExitFullscreen();
      }
    });
    io.observe(v);
  }

  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    if (root.tagName === 'VIDEO') setup(root);
    root.querySelectorAll('video').forEach(setup);
  }

  // One video at a time; starting one cancels any other video's pending resume.
  document.addEventListener('play', function (e) {
    var v = e.target;
    if (!v || v.tagName !== 'VIDEO' || isAmbient(v)) return;
    document.querySelectorAll('video').forEach(function (o) {
      if (o === v || isAmbient(o)) return;
      o.__resume = false;
      if (!o.paused) o.pause();
    });
  }, true);

  // Tab hidden / shown: same as scrolling away and back.
  document.addEventListener('visibilitychange', function () {
    document.querySelectorAll('video').forEach(function (v) {
      if (isAmbient(v)) return;
      if (document.hidden) autoPause(v); else maybeResume(v);
    });
  });

  // Leaving the page: pause; coming back (incl. from the back/forward cache) starts every video over.
  window.addEventListener('pagehide', function () {
    document.querySelectorAll('video').forEach(function (v) { if (!isAmbient(v)) { v.__resume = false; v.pause(); } });
  });
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) document.querySelectorAll('video').forEach(function (v) { if (!isAmbient(v)) reset(v); });
  });
  // Clear positions saved by the previous version of this script.
  try { Object.keys(sessionStorage).forEach(function (k) { if (k.indexOf('pfVideoPos:') === 0) sessionStorage.removeItem(k); }); } catch (_) {}

  function start() {
    scan(document.body);
    new MutationObserver(function (muts) {
      muts.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) scan(n); }); });
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
