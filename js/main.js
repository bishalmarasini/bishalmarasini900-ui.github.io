// theme toggle - persisted in localStorage so it survives navigating between pages
try {
  const html = document.documentElement;
  const toggle = document.getElementById('themeToggle');

  let saved = null;
  try { saved = window.localStorage.getItem('bm-theme'); } catch (e) { /* storage may be unavailable */ }

  let initial;
  if (saved === 'light' || saved === 'dark') {
    initial = saved;
  } else {
    initial = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  html.setAttribute('data-theme', initial);

  if (toggle) {
    toggle.addEventListener('click', () => {
      const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      try { window.localStorage.setItem('bm-theme', next); } catch (e) { /* storage may be unavailable */ }
    });
  }
} catch (e) { /* theme toggle is a non-critical enhancement */ }

// active nav link = current page, plus the sliding indicator that tracks it
try {
  const currentPage = document.body.getAttribute('data-page');
  document.querySelectorAll('#navLinks a, #mobileBar a').forEach(a => {
    if (a.getAttribute('data-page') === currentPage) {
      a.classList.add('active');
    }
  });

  const navLinksWrap = document.getElementById('navLinks');
  const indicator = document.getElementById('navIndicator');
  function positionIndicator() {
    if (!navLinksWrap || !indicator) return;
    const activeLink = navLinksWrap.querySelector('a.active');
    if (!activeLink) return;
    indicator.style.transform = 'translateX(' + activeLink.offsetLeft + 'px)';
    indicator.style.width = activeLink.offsetWidth + 'px';
    indicator.classList.add('on');
  }
  window.addEventListener('load', positionIndicator);
  window.addEventListener('resize', positionIndicator);
  positionIndicator();
} catch (e) { /* nav indicator is a non-critical enhancement */ }

// live local-time readout (Kathmandu)
try {
  const clockEl = document.getElementById('navClockTime');
  if (clockEl) {
    const tick = function () {
      const now = new Date();
      clockEl.textContent = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kathmandu', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      }).format(now);
    };
    tick();
    setInterval(tick, 1000);
  }
} catch (e) { /* clock is a non-critical enhancement */ }

// contact form - submits to Formspree (see CONTACT_FORM_SETUP.txt)
try {
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    const statusEl = document.getElementById('formStatus');
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const hp = contactForm.querySelector('.form-honeypot input');
      if (hp && hp.value) return; // bot caught
      const submitBtn = contactForm.querySelector('.form-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = 'SENDING…';
      try {
        const res = await fetch(contactForm.action, {
          method: 'POST',
          body: new FormData(contactForm),
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          statusEl.textContent = 'Message sent. Thank you, I will get back to you soon.';
          statusEl.className = 'form-status ok';
          contactForm.reset();
        } else {
          throw new Error('Form endpoint error');
        }
      } catch (err) {
        statusEl.textContent = 'Something went wrong sending this. Please email me directly instead.';
        statusEl.className = 'form-status err';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'SEND MESSAGE';
      }
    });
  }
} catch (e) { /* contact form JS is progressive enhancement over a plain form POST */ }

// About page: connect-the-dots scroll illustration that resolves into an
// airplane silhouette. The whole track (path, waypoint dots, plane) is
// built in JS against the essay's REAL measured height, in a 1:1 pixel
// coordinate system (viewBox width == rendered width). That's the fix for
// the old version: it hardcoded a viewBox sized for one essay length and
// let the browser stretch it non-uniformly to fit, which is exactly what
// was warping the plane at the end. Rebuilding on real measurements means
// nothing is ever stretched, so the geometry stays true at any length,
// font, or viewport. Progress is still driven by plain scroll math
// (getBoundingClientRect), which behaves identically across browsers.
try {
  const wrap = document.querySelector('.about-essay-wrap');
  const svg = document.querySelector('.plane-draw');

  if (wrap && svg) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const TRACK_W = 140;
    const MARGIN = 30;
    const X_LEFT = MARGIN;
    const X_RIGHT = TRACK_W - MARGIN;
    const WAYPOINT_COUNT = 7;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let line = null;
    let dots = [];
    let finalGroup = null;
    let waypoints = [];
    let exitPoint = null;
    let lineLen = 0;
    let finalAngle = 0;

    const clamp01 = function (v) { return Math.max(0, Math.min(1, v)); };

    const build = function () {
      const h = wrap.offsetHeight;
      if (!h) return;

      svg.setAttribute('viewBox', '0 0 ' + TRACK_W + ' ' + h);
      svg.textContent = '';
      dots = [];

      // wandering waypoints down the essay's real height, stopping short
      // of the bottom so the plane has room to launch off to the side
      waypoints = [];
      const topY = 8;
      const bottomY = h * 0.86;
      for (let i = 0; i < WAYPOINT_COUNT; i++) {
        const t = i / (WAYPOINT_COUNT - 1);
        waypoints.push({
          x: i % 2 === 0 ? X_LEFT : X_RIGHT,
          y: topY + (bottomY - topY) * t
        });
      }
      exitPoint = { x: TRACK_W + 24, y: h * 0.985 };

      // smooth S-curve through the waypoints (vertical tangent at each
      // point, the standard trick for a wandering vertical connector)
      let d = 'M ' + waypoints[0].x + ' ' + waypoints[0].y;
      for (let i = 1; i < waypoints.length; i++) {
        const p0 = waypoints[i - 1], p1 = waypoints[i];
        const midY = (p0.y + p1.y) / 2;
        d += ' C ' + p0.x + ' ' + midY + ', ' + p1.x + ' ' + midY + ', ' + p1.x + ' ' + p1.y;
      }
      const last = waypoints[waypoints.length - 1];
      const midY2 = (last.y + exitPoint.y) / 2;
      d += ' C ' + last.x + ' ' + midY2 + ', ' + exitPoint.x + ' ' + midY2 + ', ' + exitPoint.x + ' ' + exitPoint.y;

      line = document.createElementNS(svgNS, 'path');
      line.setAttribute('class', 'plane-line');
      line.setAttribute('d', d);
      svg.appendChild(line);
      lineLen = line.getTotalLength();
      line.style.strokeDasharray = String(lineLen);
      line.style.strokeDashoffset = String(reduceMotion ? 0 : lineLen);

      waypoints.forEach(function (p) {
        const dot = document.createElementNS(svgNS, 'circle');
        dot.setAttribute('class', 'plane-dot');
        dot.setAttribute('cx', String(p.x));
        dot.setAttribute('cy', String(p.y));
        dot.setAttribute('r', '3.6');
        if (reduceMotion) { dot.style.opacity = '1'; dot.style.transform = 'scale(1)'; }
        svg.appendChild(dot);
        dots.push(dot);
      });

      // heading of the final launch segment, so the plane points the way it flies
      finalAngle = Math.atan2(exitPoint.y - last.y, exitPoint.x - last.x) * 180 / Math.PI;

      // nose sits at local (0,0) so translate/rotate/scale all pivot from the tip
      finalGroup = document.createElementNS(svgNS, 'g');
      finalGroup.setAttribute('class', 'plane-final');

      const fill = document.createElementNS(svgNS, 'path');
      fill.setAttribute('class', 'plane-final-fill');
      fill.setAttribute('d', 'M0,0 L-88,-22 L-54,-3 L-88,22 Z');
      finalGroup.appendChild(fill);

      const fold = document.createElementNS(svgNS, 'path');
      fold.setAttribute('class', 'plane-fold');
      fold.setAttribute('d', 'M0,0 L-54,-3 M-54,-3 L-88,22');
      finalGroup.appendChild(fold);

      svg.appendChild(finalGroup);

      if (reduceMotion) {
        finalGroup.setAttribute('transform', 'translate(' + exitPoint.x + ',' + exitPoint.y + ') rotate(' + finalAngle + ') scale(0.62)');
        finalGroup.style.opacity = '1';
      }

      if (!reduceMotion) update();
    };

    const update = function () {
      if (!line || reduceMotion) return;
      const rect = wrap.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const total = rect.height + vh;
      const scrolled = vh - rect.top;
      const progress = clamp01(total > 0 ? scrolled / total : 0);

      const lineProgress = clamp01(progress / 0.88);
      line.style.strokeDashoffset = String(lineLen * (1 - lineProgress));

      dots.forEach(function (dot, i) {
        const start = 0.04 + (i / Math.max(1, dots.length - 1)) * 0.66;
        const dp = clamp01((progress - start) / 0.09);
        dot.style.opacity = String(dp);
        dot.style.transform = 'scale(' + (0.3 + 0.7 * dp) + ')';
      });

      const planeProgress = clamp01((progress - 0.78) / 0.14);
      finalGroup.style.opacity = planeProgress > 0.02 ? '1' : '0';
      const scale = 0.28 + 0.34 * planeProgress;
      finalGroup.setAttribute('transform', 'translate(' + exitPoint.x + ',' + exitPoint.y + ') rotate(' + finalAngle + ') scale(' + scale + ')');
    };

    let ticking = false;
    const onScroll = function () {
      if (ticking || reduceMotion) return;
      ticking = true;
      window.requestAnimationFrame(function () { update(); ticking = false; });
    };

    let resizeTimer = null;
    const onResize = function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(build, 120);
    };

    build();
    if (!reduceMotion) {
      window.addEventListener('scroll', onScroll, { passive: true });
    }
    window.addEventListener('resize', onResize);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(build);
    }
  }
} catch (e) { /* about-page scroll illustration is a non-critical enhancement */ }

// Experience page: read-more toggles. Each card's collapse/expand is pure
// CSS (a 0fr/1fr grid-template-rows transition), so this just flips the
// state and swaps the button label/aria for accessibility.
try {
  const summaries = document.querySelectorAll('.exp-summary');
  summaries.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const card = btn.closest('.exp-card');
      const label = btn.querySelector('.exp-readmore-label');
      const isOpen = card.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      if (label) label.textContent = isOpen ? 'SHOW LESS' : 'READ MORE';
    });
  });
} catch (e) { /* experience read-more toggles are a non-critical enhancement */ }

// Project detail pages: "Show Report" PDF modal. The iframe src is only
// set when the modal opens (and cleared on close) so the PDF isn't fetched
// until the person actually asks to see it, and closing doesn't leave it
// rendering in the background.
try {
  const pdfModal = document.getElementById('pdfModal');
  const pdfFrame = document.getElementById('pdfFrame');
  const showReportBtn = document.getElementById('showReportBtn');
  const closePdfBtn = document.getElementById('closePdfModal');

  if (pdfModal && pdfFrame && showReportBtn) {
    const pdfSrc = showReportBtn.getAttribute('data-pdf');

    const openPdf = function () {
      pdfFrame.setAttribute('src', pdfSrc);
      pdfModal.classList.add('is-open');
      pdfModal.setAttribute('aria-hidden', 'false');
    };
    const closePdf = function () {
      pdfModal.classList.remove('is-open');
      pdfModal.setAttribute('aria-hidden', 'true');
      pdfFrame.setAttribute('src', '');
    };

    showReportBtn.addEventListener('click', openPdf);
    if (closePdfBtn) closePdfBtn.addEventListener('click', closePdf);
    pdfModal.addEventListener('click', function (e) {
      if (e.target === pdfModal) closePdf();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && pdfModal.classList.contains('is-open')) closePdf();
    });
  }
} catch (e) { /* PDF report modal is a non-critical enhancement */ }

// Project detail pages: image/poster lightbox for gallery figures.
try {
  const imgModal = document.getElementById('imgModal');
  const imgModalPic = document.getElementById('imgModalPic');
  const closeImgBtn = document.getElementById('closeImgModal');
  const galleryItems = document.querySelectorAll('.gallery-item, .view-item, .poster-item, .case-fig-btn');

  if (imgModal && imgModalPic && galleryItems.length) {
    const openImg = function (src, alt, immersive) {
      imgModalPic.setAttribute('src', src);
      imgModalPic.setAttribute('alt', alt || '');
      imgModal.classList.toggle('is-poster', !!immersive);
      imgModal.classList.add('is-open');
      imgModal.setAttribute('aria-hidden', 'false');
    };
    const closeImg = function () {
      imgModal.classList.remove('is-open');
      imgModal.setAttribute('aria-hidden', 'true');
      imgModalPic.setAttribute('src', '');
    };

    galleryItems.forEach(function (item) {
      item.addEventListener('click', function () {
        const full = item.getAttribute('data-full');
        const img = item.querySelector('img');
        const immersive = item.classList.contains('is-poster-trigger');
        openImg(full, img ? img.getAttribute('alt') : '', immersive);
      });
    });
    if (closeImgBtn) closeImgBtn.addEventListener('click', closeImg);
    imgModal.addEventListener('click', function (e) {
      if (e.target === imgModal) closeImg();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && imgModal.classList.contains('is-open')) closeImg();
    });
  }
} catch (e) { /* image lightbox is a non-critical enhancement */ }
