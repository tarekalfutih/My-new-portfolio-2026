/* Site video controls — replace the browser's native controls on every <video controls>.
   Why: Safari (and Chrome) draw a dark tint over the whole video while their controls show, and
   pages cannot style it away. These controls never cover the footage with a tint: just a compact
   bar at the bottom (play/pause, seek, time, sound, fullscreen), always shown while paused.
   Without JavaScript the native controls stay (the attribute is only removed here).
   Loaded deferred, so it runs before video-behavior.js scans videos on DOMContentLoaded. */
(function () {
  var videos = document.querySelectorAll('video[controls]');
  if (!videos.length) return;

  var ICON = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/></svg>',
    sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    muted: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 9l6 6M22 9l-6 6" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    full: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    exit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5" fill="none" stroke="currentColor" stroke-width="2"/></svg>'
  };

  function fmt(t) {
    if (!isFinite(t) || t < 0) t = 0;
    var m = Math.floor(t / 60), s = Math.floor(t % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function button(cls, label, icon) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'vc-btn ' + cls;
    b.setAttribute('aria-label', label); b.innerHTML = icon;
    return b;
  }

  function fsElement() { return document.fullscreenElement || document.webkitFullscreenElement; }

  videos.forEach(function (v) {
    v.removeAttribute('controls');
    v.setAttribute('data-vc', '');

    // Wrapper takes the video's place so the controls can sit on top of it.
    var wrap = document.createElement('div');
    wrap.className = 'vc';
    if (/height:\s*100%/.test(v.getAttribute('style') || '')) wrap.style.height = '100%';
    v.parentNode.insertBefore(wrap, v);
    wrap.appendChild(v);

    var bar = document.createElement('div');
    bar.className = 'vc-bar';
    var play = button('vc-play', 'Play', ICON.play);
    var time = document.createElement('span');
    time.className = 'vc-time';
    var seek = document.createElement('input');
    seek.type = 'range'; seek.className = 'vc-seek'; seek.min = 0; seek.max = 1000; seek.step = 1; seek.value = 0;
    seek.setAttribute('aria-label', 'Seek');
    var sound = button('vc-sound', 'Mute', ICON.sound);
    var full = button('vc-full', 'Full screen', ICON.full);
    bar.append(play, seek, time, sound, full);
    wrap.append(bar);

    var hideT;
    function update() {
      var paused = v.paused || v.ended;
      wrap.classList.toggle('is-paused', paused);
      play.innerHTML = paused ? ICON.play : ICON.pause;
      play.setAttribute('aria-label', paused ? 'Play' : 'Pause');
      sound.innerHTML = v.muted ? ICON.muted : ICON.sound;
      sound.setAttribute('aria-label', v.muted ? 'Unmute' : 'Mute');
      var d = v.duration;
      time.textContent = fmt(v.currentTime) + ' / ' + fmt(d);
      if (!seek.matches(':active')) seek.value = d ? Math.round(v.currentTime / d * 1000) : 0;
      seek.style.setProperty('--p', (seek.value / 10) + '%');
      seek.setAttribute('aria-valuetext', fmt(v.currentTime) + ' of ' + fmt(d));
      var isFs = fsElement() === wrap;
      full.innerHTML = isFs ? ICON.exit : ICON.full;
      full.setAttribute('aria-label', isFs ? 'Exit full screen' : 'Full screen');
    }
    function toggle() {
      if (v.paused || v.ended) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      else v.pause();
    }
    function wake() {
      wrap.classList.add('is-active');
      clearTimeout(hideT);
      hideT = setTimeout(function () { if (!wrap.contains(document.activeElement)) wrap.classList.remove('is-active'); }, 2500);
    }

    play.addEventListener('click', toggle);
    v.addEventListener('click', function () { toggle(); wake(); });
    v.addEventListener('dblclick', function () { full.click(); });
    sound.addEventListener('click', function () { v.muted = !v.muted; });
    seek.addEventListener('input', function () {
      if (v.duration) v.currentTime = seek.value / 1000 * v.duration;
      update();
    });
    full.addEventListener('click', function () {
      if (fsElement()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
      if (wrap.requestFullscreen) wrap.requestFullscreen().catch(function () {});
      else if (wrap.webkitRequestFullscreen) wrap.webkitRequestFullscreen();
      else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen(); // iPhone: native player
    });
    wrap.addEventListener('keydown', function (e) {
      if (e.target === seek && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return; // range handles it
      if (e.key === ' ' || e.key === 'k') {
        if (e.target.tagName === 'BUTTON' && e.key === ' ') return; // buttons handle Space
        e.preventDefault(); toggle();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault(); v.currentTime = Math.max(0, v.currentTime + (e.key === 'ArrowRight' ? 5 : -5));
      } else if (e.key === 'm') { v.muted = !v.muted; }
      else if (e.key === 'f') { full.click(); }
      wake();
    });
    wrap.addEventListener('mousemove', wake);
    wrap.addEventListener('focusin', wake);
    wrap.addEventListener('mouseleave', function () { clearTimeout(hideT); if (!wrap.contains(document.activeElement)) wrap.classList.remove('is-active'); });
    ['play', 'pause', 'ended', 'timeupdate', 'durationchange', 'loadedmetadata', 'volumechange', 'emptied', 'seeked']
      .forEach(function (ev) { v.addEventListener(ev, update); });
    document.addEventListener('fullscreenchange', update);
    document.addEventListener('webkitfullscreenchange', update);
    // Narrow frames (e.g. 216px phone videos): drop the time so the bar never overflows.
    function fit() { wrap.classList.toggle('vc-narrow', wrap.clientWidth < 360); }
    fit();
    if ('ResizeObserver' in window) new ResizeObserver(fit).observe(wrap);
    else window.addEventListener('resize', fit);
    update();
  });
})();
