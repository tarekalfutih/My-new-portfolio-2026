/* Apple-style swipe carousels ([data-car], 6 Oct design): the current slide is centred, neighbours
   peek, one snap per swipe. Pill dots fill over 5s and advance (loop); play / pause; arrows (desktop);
   ← / → on the focused track. It only plays while 40% visible and while the track actually scrolls
   (pages lay some carousels out as a static row on wide screens). Reduced motion: no autoplay.

   Markup (from the design's template, see each page):
     [data-car] > [data-car-track] > slides
     [data-car-prev] [data-car-next] [data-car-toggle] > [data-car-when=playing|paused]
     [data-car-dots] > template[data-car-dot] (%label% %cur% %w% %h% %anim% %ps%, [data-car-fill]) + [data-car-count] */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function init(root) {
    var track = root.querySelector('[data-car-track]');
    if (!track) return;
    var slides = Array.prototype.slice.call(track.children);
    var N = slides.length;
    var prev = root.querySelector('[data-car-prev]'), next = root.querySelector('[data-car-next]');
    var toggle = root.querySelector('[data-car-toggle]');
    var dotsBox = root.querySelector('[data-car-dots]');
    var tpl = root.querySelector('template[data-car-dot]');
    var count = root.querySelector('[data-car-count]');
    var unit = (root.getAttribute('data-car-unit') || (count && count.getAttribute('data-unit')) || 'Screen');
    var cur = 0, target = null, targetT, play = !reduce, inView = false;

    function left(i) {
      var el = slides[i];
      return el ? el.offsetLeft - track.offsetLeft - (track.clientWidth - el.offsetWidth) / 2 : 0;
    }
    function nearest() {
      var c = track.scrollLeft + track.clientWidth / 2, best = 0, d = 1e9;
      slides.forEach(function (el, k) {
        var m = Math.abs(el.offsetLeft - track.offsetLeft + el.offsetWidth / 2 - c);
        if (m < d) { d = m; best = k; }
      });
      return best;
    }
    function active() { return track.scrollWidth > track.clientWidth + 2; }
    function go(i) {
      i = Math.max(0, Math.min(N - 1, i));
      target = i;
      clearTimeout(targetT);
      targetT = setTimeout(function () { target = null; }, 900);
      track.scrollTo({ left: left(i), behavior: reduce ? 'auto' : 'smooth' });
      if (cur !== i) { cur = i; render(); }
    }
    function step(d) { go((target != null ? target : cur) + d); }

    var dots = [];
    function buildDots() {
      if (!tpl || !dotsBox) return;
      var html = tpl.innerHTML;
      for (var i = 0; i < N; i++) {
        var holder = document.createElement('div');
        holder.innerHTML = html;
        var b = holder.firstElementChild;
        (function (i) { b.addEventListener('click', function () { go(i); }); })(i);
        dotsBox.insertBefore(b, count || null);
        dots.push({ el: b, html: html });
      }
    }

    function render() {
      var running = play && inView && active();
      var anim = reduce && !play ? 'none' : 'pcFill 5s linear forwards';
      dots.forEach(function (d, i) {
        var on = i === cur, far = Math.abs(i - cur) >= 2;
        var html = d.html
          .replace(/%label%/g, unit + ' ' + (i + 1) + ' of ' + N)
          .replace(/%cur%/g, on ? 'true' : 'false')
          .replace(/%w%/g, on ? '36px' : (far ? '6px' : '8px'))
          .replace(/%h%/g, far && !on ? '6px' : '8px')
          .replace(/%anim%/g, anim)
          .replace(/%ps%/g, running ? 'running' : 'paused');
        var holder = document.createElement('div');
        holder.innerHTML = html;
        var fresh = holder.firstElementChild;
        // Same button element (keeps focus); swap its contents and attributes.
        d.el.setAttribute('aria-current', on ? 'true' : 'false');
        d.el.setAttribute('aria-label', fresh.getAttribute('aria-label'));
        var keep = on && d.el.querySelector('[data-car-fill]');
        var bar = fresh.firstElementChild;
        if (!on) { var f = bar && bar.querySelector('[data-car-fill]'); if (f) f.remove(); }
        if (keep && d.on) {
          // Current dot unchanged: only update play state, so the fill doesn't restart.
          keep.style.animationPlayState = running ? 'running' : 'paused';
          if (anim === 'none') keep.style.animation = 'none';
        } else {
          d.el.innerHTML = '';
          d.el.appendChild(bar);
          var fill = bar.querySelector('[data-car-fill]');
          if (fill) fill.addEventListener('animationend', function () { go(cur + 1 >= N ? 0 : cur + 1); });
        }
        d.on = on;
      });
      if (prev) prev.disabled = cur <= 0;
      if (next) next.disabled = cur >= N - 1;
      if (count) count.textContent = unit + ' ' + (cur + 1) + ' of ' + N;
      if (toggle) {
        toggle.setAttribute('aria-label', play ? 'Pause slideshow' : 'Play slideshow');
        toggle.querySelectorAll('[data-car-when]').forEach(function (s) {
          s.hidden = s.getAttribute('data-car-when') !== (play ? 'playing' : 'paused');
        });
      }
    }

    track.addEventListener('scroll', function () {
      if (target != null) {
        if (Math.abs(track.scrollLeft - left(target)) > 2) return;
        target = null;
      }
      var i = nearest();
      if (i !== cur) { cur = i; render(); }
    }, { passive: true });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    });
    if (prev) prev.addEventListener('click', function () { step(-1); });
    if (next) next.addEventListener('click', function () { step(1); });
    if (toggle) toggle.addEventListener('click', function () { play = !play; render(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (inView !== e.isIntersecting) { inView = e.isIntersecting; render(); } });
      }, { threshold: 0.4 }).observe(track);
    }
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { track.scrollLeft = left(cur); render(); }, 120);
    });
    buildDots();
    render();
    setTimeout(function () { track.scrollLeft = left(cur); }, 300);
  }

  document.querySelectorAll('[data-car]').forEach(init);
})();
