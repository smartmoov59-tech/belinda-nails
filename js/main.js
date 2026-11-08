/* ==========================================================================
   Belinda Nails — animations & interactions
   GSAP + ScrollTrigger + Lenis (tout en local, aucun service externe)
   ========================================================================== */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;
  const reduce = root.classList.contains('reduce');
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const PHONE_E164 = '+33613102866';
  const SVGNS = 'http://www.w3.org/2000/svg';

  let lenis = null;
  let menuOpen = false;

  /* ------------------------------------------------------------------
     1. Fonctions indépendantes de GSAP
     ------------------------------------------------------------------ */

  // Année du pied de page
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Horaires : ligne du jour + état « ouvert / fermé » (heure de Paris)
  const HOURS = { 0: null, 1: [600, 960], 2: [600, 1110], 3: [720, 1110], 4: [600, 1080], 5: [600, 1110], 6: [570, 810] };
  const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const fmtTime = (m) => { const h = Math.floor(m / 60), mm = m % 60; return mm ? `${h} h ${String(mm).padStart(2, '0')}` : `${h} h`; };
  function parisNow() {
    try {
      const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
      const get = (t) => parts.find((p) => p.type === t).value;
      const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      return { d: map[get('weekday')], m: parseInt(get('hour'), 10) * 60 + parseInt(get('minute'), 10) };
    } catch (e) {
      const n = new Date();
      return { d: n.getDay(), m: n.getHours() * 60 + n.getMinutes() };
    }
  }
  function renderHours() {
    const { d, m } = parisNow();
    $$('.hours tr').forEach((tr) => tr.classList.toggle('is-today', Number(tr.dataset.d) === d));
    const state = $('#openState');
    if (!state) return;
    const label = $('span', state);
    const today = HOURS[d];
    state.classList.remove('is-open', 'is-closed');
    if (today && m >= today[0] && m < today[1]) {
      state.classList.add('is-open');
      label.textContent = `Ouvert · ferme à ${fmtTime(today[1])}`;
      return;
    }
    state.classList.add('is-closed');
    if (today && m < today[0]) { label.textContent = `Fermé · ouvre à ${fmtTime(today[0])}`; return; }
    for (let i = 1; i <= 7; i++) {
      const nd = (d + i) % 7;
      if (HOURS[nd]) {
        label.textContent = `Fermé · ouvre ${i === 1 ? 'demain' : DAYS[nd]} à ${fmtTime(HOURS[nd][0])}`;
        return;
      }
    }
  }
  renderHours();

  // FAQ en accordéon
  $$('.qa button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const qa = btn.closest('.qa');
      const open = !qa.classList.contains('is-open');
      qa.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      if (window.ScrollTrigger) setTimeout(() => ScrollTrigger.refresh(), 760);
    });
  });

  // Demande de rendez-vous par SMS pré-rempli (microblading, henné, retouches)
  const smsForm = $('#smsForm');
  if (smsForm) {
    smsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('#smsName').value.trim();
      const service = $('#smsService').value;
      const day = $('#smsDay').value;
      const moment = $('#smsMoment').value;
      const dayTxt = day === 'Peu importe' ? 'sur n’importe quel jour' : `le ${day.toLowerCase()}`;
      const msg = `Bonjour Belinda, ${name ? `c’est ${name}. ` : ''}J’aimerais prendre rendez-vous pour : ${service}. Je suis disponible ${dayTxt}, ${moment}. Merci !`;
      const href = `sms:${PHONE_E164}?&body=${encodeURIComponent(msg)}`;
      const out = $('#smsOut');
      out.textContent = '';
      const intro = document.createElement('span');
      intro.textContent = 'Votre SMS est prêt : ';
      const link = document.createElement('a');
      link.href = href; link.className = 'u-link'; link.textContent = 'ouvrir mon application Messages';
      const sep = document.createTextNode(' ou ');
      const copy = document.createElement('button');
      copy.type = 'button'; copy.textContent = 'copier le texte';
      copy.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(`${msg}\n(à envoyer au ${PHONE_E164.replace('+33', '0').replace(/(\d)(?=(\d{2})+$)/g, '$1 ')})`); copy.textContent = 'copié ✓'; }
        catch (err) { copy.textContent = 'copie impossible'; }
      });
      out.append(intro, link, sep, copy);
      window.location.href = href;
    });
  }

  // Visionneuse photo (dialog natif)
  const lb = $('#lightbox');
  const shots = $$('.shot');
  let lbIndex = 0;
  function lbShow(i) {
    lbIndex = (i + shots.length) % shots.length;
    const shot = shots[lbIndex];
    const img = $('img', shot);
    const cap = $('figcaption', shot);
    $('#lbImg').src = img.currentSrc || img.src;
    $('#lbImg').alt = img.alt;
    $('#lbCap').textContent = cap ? cap.innerText.replace(/\n+/g, ' · ') : '';
  }
  if (lb && shots.length) {
    shots.forEach((s, i) => {
      s.tabIndex = 0;
      s.setAttribute('role', 'button');
      s.setAttribute('aria-label', `Agrandir la photo : ${$('img', s).alt}`);
      s.addEventListener('click', () => { lbShow(i); lb.showModal(); if (lenis) lenis.stop(); });
      s.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s.click(); } });
    });
    $('#lbClose').addEventListener('click', () => lb.close());
    $('#lbPrev').addEventListener('click', () => lbShow(lbIndex - 1));
    $('#lbNext').addEventListener('click', () => lbShow(lbIndex + 1));
    lb.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });
    lb.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') lbShow(lbIndex - 1); if (e.key === 'ArrowRight') lbShow(lbIndex + 1); });
    lb.addEventListener('close', () => { if (lenis && !menuOpen) lenis.start(); });
  }

  // Vidéo d'ambiance du bloc réservation : chargée seulement à l'approche
  const ctaVideo = $('#ctaVideo');
  if (ctaVideo && !reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting && !ctaVideo.src) {
          ctaVideo.src = ctaVideo.dataset.src;
          ctaVideo.play().catch(() => {});
          io.disconnect();
        }
      });
    }, { rootMargin: '600px 0px' });
    io.observe($('.cta'));
  }

  // Vidéo du hero : version légère sur mobile / économie de données, image fixe si mouvement réduit
  const heroVideo = $('#heroVideo');
  if (heroVideo) {
    const saveData = navigator.connection && navigator.connection.saveData;
    if (reduce) { heroVideo.removeAttribute('autoplay'); heroVideo.pause(); }
    else if (innerWidth > 900 && !saveData) { heroVideo.src = 'video/hero-1080.mp4'; heroVideo.play().catch(() => {}); }
  }

  // Menu mobile (repli sans GSAP géré plus bas)
  const menu = $('#mobileMenu');
  const burger = $('#burger');

  /* ------------------------------------------------------------------
     2. Animations (GSAP requis)
     ------------------------------------------------------------------ */
  const killLoader = () => { const l = $('#loader'); if (l) l.remove(); };

  if (!window.gsap || !window.ScrollTrigger) {
    killLoader();
    if (burger) burger.addEventListener('click', () => {
      menuOpen = !menuOpen;
      menu.style.visibility = menuOpen ? 'visible' : 'hidden';
      burger.setAttribute('aria-expanded', String(menuOpen));
    });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  try {
    init();
  } catch (err) {
    console.error('[Belinda Nails] animations désactivées :', err);
    root.classList.add('anim-fail');
    killLoader();
    if (lenis) lenis.start();
  }

  function init() {
    /* ---------- Smooth scroll (Lenis) ---------- */
    if (!reduce && window.Lenis) {
      lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true, touchMultiplier: 1.4 });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
      lenis.stop();
    }

    // Vitesse de scroll lissée (utilisée par le marquee et les cartes)
    const scroll = { vel: 0, dir: 1 };
    gsap.ticker.add(() => {
      const v = lenis ? lenis.velocity : 0;
      scroll.vel += (v - scroll.vel) * 0.12;
      if (lenis && lenis.direction) scroll.dir += ((lenis.direction === -1 ? -1 : 1) - scroll.dir) * 0.08;
    });

    const goTo = (target) => {
      if (lenis) lenis.scrollTo(target, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4), offset: target === 0 ? 0 : -8 });
      else if (target === 0) window.scrollTo({ top: 0, behavior: 'smooth' });
      else target.scrollIntoView({ behavior: 'smooth' });
    };

    /* ---------- Menu mobile ---------- */
    function toggleMenu(force) {
      menuOpen = typeof force === 'boolean' ? force : !menuOpen;
      burger.setAttribute('aria-expanded', String(menuOpen));
      burger.setAttribute('aria-label', menuOpen ? 'Fermer le menu' : 'Ouvrir le menu');
      menu.setAttribute('aria-hidden', String(!menuOpen));
      if (menuOpen) {
        menu.style.visibility = 'visible';
        if (lenis) lenis.stop(); else document.body.style.overflow = 'hidden';
        gsap.fromTo('.mobile-menu__bg', { yPercent: -101 }, { yPercent: 0, duration: 0.9, ease: 'expo.inOut' });
        gsap.fromTo('.mobile-menu__nav a', { yPercent: 110 }, { yPercent: 0, duration: 1, ease: 'expo.out', stagger: 0.07, delay: 0.3 });
        gsap.fromTo('.mobile-menu__foot', { opacity: 0, y: 30 }, { opacity: 1, y: 0, delay: 0.6, duration: 0.9, ease: 'power3.out' });
      } else {
        if (lenis) lenis.start(); else document.body.style.overflow = '';
        gsap.to('.mobile-menu__bg', { yPercent: -101, duration: 0.8, ease: 'expo.inOut', onComplete: () => { if (!menuOpen) menu.style.visibility = 'hidden'; } });
      }
    }
    burger.addEventListener('click', () => toggleMenu());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) toggleMenu(false); });

    /* ---------- Ancres internes ---------- */
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      const target = id === '#top' ? 0 : $(id);
      if (target === null) return;
      e.preventDefault();
      if (menuOpen) { toggleMenu(false); setTimeout(() => goTo(target), 80); }
      else goTo(target);
    });

    /* ---------- Découpage du texte (mots / lettres sous masque) ---------- */
    function split(el, mode) {
      const chars = mode === 'chars';
      const out = [];
      const walk = (node, parent) => {
        node.childNodes.forEach((child) => {
          if (child.nodeType === 3) {
            child.textContent.split(/(\s+)/).forEach((tok) => {
              if (!tok) return;
              if (/^\s+$/.test(tok)) { parent.appendChild(document.createTextNode(' ')); return; }
              const w = document.createElement('span');
              w.className = 'w'; w.setAttribute('aria-hidden', 'true');
              if (chars) {
                Array.from(tok).forEach((ch) => { const c = document.createElement('span'); c.className = 'c'; c.textContent = ch; w.appendChild(c); out.push(c); });
              } else {
                const c = document.createElement('span'); c.className = 'c'; c.textContent = tok; w.appendChild(c); out.push(c);
              }
              parent.appendChild(w);
            });
          } else if (child.nodeName === 'BR') {
            parent.appendChild(child.cloneNode());
          } else if (child.nodeType === 1) {
            const clone = child.cloneNode(false);
            parent.appendChild(clone);
            walk(child, clone);
          }
        });
      };
      const label = el.textContent.replace(/\s+/g, ' ').trim();
      const holder = document.createElement('div');
      walk(el, holder);
      el.textContent = '';
      while (holder.firstChild) el.appendChild(holder.firstChild);
      if (/^H[1-6]$/.test(el.tagName) && !el.hasAttribute('aria-label')) el.setAttribute('aria-label', label);
      return out;
    }

    const heroChars = $$('.hero [data-split]').flatMap((el) => split(el, 'chars'));
    const headings = $$('[data-split]').filter((el) => !el.closest('.hero') && !el.hasAttribute('data-giant'));
    const headingData = headings.map((el) => ({ el, chars: split(el, el.dataset.split === 'chars' ? 'chars' : 'words'), mode: el.dataset.split }));
    const giant = $('[data-giant]');
    const giantChars = giant ? split(giant, 'chars') : [];

    /* ---------- Étincelles dorées ---------- */
    function makeSparks(container, n) {
      if (!container) return;
      for (let i = 0; i < n; i++) {
        const s = document.createElementNS(SVGNS, 'svg');
        const u = document.createElementNS(SVGNS, 'use');
        u.setAttribute('href', '#i-spark');
        s.appendChild(u);
        s.setAttribute('class', 'spark');
        const size = gsap.utils.random(10, 34);
        s.style.cssText = `left:${gsap.utils.random(3, 96)}%;top:${gsap.utils.random(6, 94)}%;width:${size}px;height:${size}px`;
        container.appendChild(s);
        gsap.set(s, { opacity: 0, scale: 0.3, rotate: gsap.utils.random(-30, 30) });
        if (!reduce) gsap.to(s, { opacity: gsap.utils.random(0.45, 1), scale: gsap.utils.random(0.7, 1.25), rotate: `+=${gsap.utils.random(-50, 50)}`, duration: gsap.utils.random(1.2, 2.6), repeat: -1, yoyo: true, delay: gsap.utils.random(0, 3.5), ease: 'sine.inOut' });
        else gsap.set(s, { opacity: 0.7, scale: 1 });
      }
    }
    makeSparks($('.hero__sparks'), innerWidth < 700 ? 9 : 16);
    makeSparks($('.cta__sparks'), innerWidth < 700 ? 8 : 14);

    /* ---------- États initiaux (cachés derrière le préchargeur) ---------- */
    if (!reduce) {
      gsap.set(heroChars, { yPercent: 118, rotate: 6 });
      gsap.set('#nav', { yPercent: -170, opacity: 0 });
      headingData.forEach(({ chars }) => gsap.set(chars, { yPercent: 112, rotate: 3 }));
      gsap.set(giantChars, { yPercent: 112 });
      $$('[data-reveal]').forEach((el) => gsap.set(el, { opacity: 0, y: 36 }));
    }

    /* ---------- Préchargeur + entrée du hero ---------- */
    const seen = (() => { try { return sessionStorage.getItem('bn_seen') === '1'; } catch (e) { return false; } })();

    const assetsReady = Promise.race([
      Promise.all([
        document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve(),
        new Promise((res) => { const im = new Image(); im.onload = im.onerror = res; im.src = 'img/stock/hero-poster.jpg'; }),
      ]),
      new Promise((res) => setTimeout(res, 4500)),
    ]);

    function runLoader() {
      return new Promise((resolve) => {
        const loader = $('#loader');
        if (!loader || reduce) { killLoader(); resolve(); return; }
        const count = $('#loaderCount');
        const path = $('.loader__almond path');
        const len = path.getTotalLength();
        gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
        gsap.set('.loader__word', { yPercent: 115 });
        gsap.set('.loader__sub', { opacity: 0, y: 10 });
        const st = { v: 0 };
        const speed = seen ? 2.2 : 1;

        const intro = gsap.timeline();
        intro.timeScale(speed);
        intro
          .to('.loader__word', { yPercent: 0, duration: 1.2, ease: 'expo.out' }, 0.15)
          .to('.loader__sub', { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' }, 0.6)
          .to(path, { strokeDashoffset: 0, duration: 2, ease: 'power2.inOut' }, 0)
          .to(st, { v: 100, duration: 2.1, ease: 'power2.inOut', onUpdate: () => { count.textContent = Math.round(st.v); } }, 0.1);

        intro.eventCallback('onComplete', () => {
          assetsReady.then(() => {
            const out = gsap.timeline({ onComplete: () => { killLoader(); } });
            out.timeScale(seen ? 1.6 : 1);
            out
              .to('.loader__inner', { yPercent: -14, opacity: 0, duration: 0.6, ease: 'power3.in' }, 0)
              .to('.loader__panel--prune', { yPercent: -100, y: -170, duration: 1.15, ease: 'expo.inOut' }, 0.35)
              .to('.loader__panel--rose', { yPercent: -100, y: -170, duration: 1.15, ease: 'expo.inOut' }, 0.55)
              .add(() => resolve(), 0.95);
          });
        });
      });
    }

    function heroIntro() {
      if (reduce) return;
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      tl.fromTo('.hero__media', { scale: 1.28 }, { scale: 1, duration: 2.6, ease: 'power3.out' }, 0)
        .to('.hero__line--1 .c', { yPercent: 0, rotate: 0, duration: 1.6, stagger: 0.06 }, 0.05)
        .to('.hero__line--2 .c', { yPercent: 0, rotate: 0, duration: 1.6, stagger: 0.06 }, 0.3)
        .from('.hero__kicker', { y: 24, opacity: 0, duration: 1.1 }, 0.3)
        .from('.hero__almond', { scale: 0.55, opacity: 0, rotate: -10, duration: 1.8 }, 0.45)
        .from('.hero__lead', { y: 34, opacity: 0, duration: 1.2 }, 0.8)
        .from('.hero__actions > *', { y: 34, opacity: 0, duration: 1.1, stagger: 0.12 }, 0.9)
        .from('.hero__proof > *', { y: 34, opacity: 0, duration: 1.1, stagger: 0.12 }, 1.0)
        .to('#nav', { yPercent: 0, opacity: 1, duration: 1.3 }, 0.9);
    }

    runLoader().then(() => {
      if (reduce) gsap.set('#nav', { clearProps: 'all' });
      heroIntro();
      if (lenis) lenis.start();
      try { sessionStorage.setItem('bn_seen', '1'); } catch (e) { /* ignore */ }
      setTimeout(() => ScrollTrigger.refresh(), 400);
    });

    /* ---------- Barre de progression + menu qui se cache ---------- */
    const progress = $('#progress');
    const nav = $('#nav');
    let navHidden = false;
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: (self) => {
        gsap.set(progress, { scaleX: self.progress });
        const y = self.scroll();
        if (reduce || menuOpen) return;
        if (y > 220 && self.direction === 1 && !navHidden) { navHidden = true; gsap.to(nav, { yPercent: -170, duration: 0.7, ease: 'power3.inOut' }); }
        else if ((self.direction === -1 || y <= 220) && navHidden) { navHidden = false; gsap.to(nav, { yPercent: 0, duration: 0.7, ease: 'power3.out' }); }
      },
    });

    // Boutons flottants mobile : masqués pendant la section réservation / contact
    const fab = $('#fab');
    if (fab) {
      const fabState = {};
      ['.cta', '.find'].forEach((sel) => ScrollTrigger.create({
        trigger: sel, start: 'top 70%', end: 'bottom 30%',
        onToggle: (self) => { fabState[sel] = self.isActive; fab.classList.toggle('is-hidden', Object.values(fabState).some(Boolean)); },
      }));
    }

    if (reduce) { finishStatic(); return; }

    /* ---------- Parallax multicouche du hero ---------- */
    const heroTl = gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    heroTl
      .to('.hero__media', { yPercent: 9, ease: 'none' }, 0)
      .to('.hero__stage', { yPercent: -16, ease: 'none' }, 0)
      .to('.hero__almond', { yPercent: -42, ease: 'none' }, 0)
      .to('.hero__sparks', { yPercent: -70, ease: 'none' }, 0)
      .to('.hero__foot', { yPercent: -8, opacity: 0.1, ease: 'none' }, 0);

    // Parallax à la souris (bureau)
    if (fine) {
      const layers = [
        { el: '.hero__video', x: 14, y: 10 },
        { el: '.hero__almond', x: 30, y: 22 },
        { el: '.hero__sparks', x: 56, y: 34 },
        { el: '.hero__stage', x: -10, y: -6 },
      ].map((l) => ({ ...l, qx: gsap.quickTo(l.el, 'x', { duration: 1.1, ease: 'power3' }), qy: gsap.quickTo(l.el, 'y', { duration: 1.1, ease: 'power3' }) }));
      $('.hero').addEventListener('pointermove', (e) => {
        const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
        layers.forEach((l) => { l.qx(nx * l.x); l.qy(ny * l.y); });
      });
    }

    /* ---------- Marquee piloté par le scroll ---------- */
    // Construit une fois les polices prêtes (sinon la largeur d'un « tour » serait faussée)
    assetsReady.then(() => {
      const rows = $$('.marquee__row').map((row) => {
        const track = $('.marquee__track', row);
        const base = track.innerHTML;
        const unit0 = track.scrollWidth;
        const copies = Math.ceil((innerWidth * 1.8) / unit0) + 1;
        for (let i = 0; i < copies; i++) track.insertAdjacentHTML('beforeend', base);
        const dir = Number(row.dataset.dir);
        return { track, copies, unit: unit0, dir, x: dir > 0 ? -unit0 / 2 : 0, set: gsap.quickSetter(track, 'x', 'px') };
      });
      const measure = () => rows.forEach((r) => { r.unit = r.track.scrollWidth / (r.copies + 1); });
      ScrollTrigger.addEventListener('refresh', measure);
      let marqueeOn = false;
      ScrollTrigger.create({ trigger: '.marquee', start: 'top bottom', end: 'bottom top', onToggle: (s) => { marqueeOn = s.isActive; } });
      gsap.ticker.add((time, delta) => {
        if (!marqueeOn) return;
        const dt = Math.min(delta, 64) / 1000;
        const boost = 1 + Math.min(Math.abs(scroll.vel) * 0.28, 7);
        rows.forEach((r) => {
          r.x += r.dir * 78 * boost * scroll.dir * dt;
          if (r.x <= -r.unit) r.x += r.unit;
          if (r.x > 0) r.x -= r.unit;
          r.set(r.x);
        });
      });
    });

    /* ---------- Révélations de titres et de blocs ---------- */
    headingData.forEach(({ el, chars, mode }) => {
      const inCarte = el.closest('.carte__intro');
      ScrollTrigger.create({
        trigger: inCarte ? '.carte' : el, start: inCarte ? 'top 62%' : 'top 88%', once: true,
        onEnter: () => gsap.to(chars, { yPercent: 0, rotate: 0, duration: 1.4, ease: 'expo.out', stagger: mode === 'chars' ? 0.03 : 0.07 }),
      });
    });
    $$('[data-reveal]').forEach((el) => {
      const inCarte = el.closest('.carte__intro');
      ScrollTrigger.create({
        trigger: inCarte ? '.carte' : el, start: inCarte ? 'top 62%' : 'top 90%', once: true,
        onEnter: () => gsap.to(el, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', delay: inCarte ? 0.25 : 0 }),
      });
    });
    if (giant) ScrollTrigger.create({ trigger: giant, start: 'top 95%', once: true, onEnter: () => gsap.to(giantChars, { yPercent: 0, duration: 1.6, ease: 'expo.out', stagger: 0.05 }) });

    /* ---------- Rideaux d'images (masque qui se lève) ---------- */
    $$('.img-reveal').forEach((el) => {
      const img = $('img', el);
      const isCircle = el.classList.contains('regard__b');
      if (isCircle) {
        gsap.set(el, { clipPath: 'circle(0% at 50% 50%)' });
        gsap.set(img, { scale: 1.4 });
        ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: () => {
          gsap.to(el, { clipPath: 'circle(72% at 50% 50%)', duration: 1.7, ease: 'expo.out', onComplete: () => gsap.set(el, { clearProps: 'clipPath' }) });
          gsap.to(img, { scale: 1, duration: 2, ease: 'expo.out' });
        } });
        return;
      }
      const curtain = document.createElement('div');
      curtain.setAttribute('aria-hidden', 'true');
      curtain.style.cssText = 'position:absolute;inset:0;z-index:3;background:var(--rose);will-change:transform';
      el.appendChild(curtain);
      gsap.set(img, { scale: 1.35 });
      ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => {
        gsap.to(curtain, { yPercent: -101, duration: 1.4, ease: 'expo.inOut', onComplete: () => curtain.remove() });
        gsap.to(img, { scale: 1, duration: 2.2, ease: 'expo.out', delay: 0.15 });
      } });
    });

    /* ---------- Compteurs et jauges ---------- */
    $$('[data-count]').forEach((el) => {
      const target = parseFloat(el.dataset.count);
      const dec = Number(el.dataset.dec || 0);
      const fmt = (v) => v.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
      el.textContent = fmt(0);
      ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => {
        const o = { v: 0 };
        gsap.to(o, { v: target, duration: 2.4, ease: 'power3.out', onUpdate: () => { el.textContent = fmt(o.v); } });
      } });
    });
    gsap.set('.criteria b', { scaleX: 0 });
    ScrollTrigger.create({ trigger: '.criteria', start: 'top 88%', once: true, onEnter: () => gsap.to('.criteria b', { scaleX: 1, duration: 1.8, ease: 'expo.out', stagger: 0.14 }) });

    /* ---------- Inclinaison 3D + reflet (cartes et photos) ---------- */
    if (fine) {
      $$('[data-tilt]').forEach((el) => {
        const max = el.classList.contains('card') ? 7 : 6;
        gsap.set(el, { transformPerspective: 900 });
        const rx = gsap.quickTo(el, 'rotationX', { duration: 0.7, ease: 'power3' });
        const ry = gsap.quickTo(el, 'rotationY', { duration: 0.7, ease: 'power3' });
        el.addEventListener('pointermove', (e) => {
          const r = el.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
          ry((px - 0.5) * max * 2); rx(-(py - 0.5) * max * 2);
          el.style.setProperty('--gx', `${px * 100}%`); el.style.setProperty('--gy', `${py * 100}%`);
        });
        el.addEventListener('pointerleave', () => { rx(0); ry(0); });
      });
    }

    /* ---------- Boutons magnétiques ---------- */
    if (fine) {
      $$('[data-magnetic]').forEach((el) => {
        const qx = gsap.quickTo(el, 'x', { duration: 0.7, ease: 'power3' });
        const qy = gsap.quickTo(el, 'y', { duration: 0.7, ease: 'power3' });
        el.addEventListener('pointermove', (e) => {
          const r = el.getBoundingClientRect();
          qx((e.clientX - (r.left + r.width / 2)) * 0.32);
          qy((e.clientY - (r.top + r.height / 2)) * 0.4);
        });
        el.addEventListener('pointerleave', () => { qx(0); qy(0); });
      });
    }

    /* ---------- Curseur personnalisé ---------- */
    if (fine) {
      const cur = $('#cursor');
      gsap.set(cur, { opacity: 0 });
      const cx = gsap.quickTo(cur, 'x', { duration: 0.4, ease: 'power3' });
      const cy = gsap.quickTo(cur, 'y', { duration: 0.4, ease: 'power3' });
      let shown = false;
      window.addEventListener('pointermove', (e) => {
        if (!shown) { shown = true; gsap.set(cur, { x: e.clientX, y: e.clientY }); gsap.to(cur, { opacity: 1, duration: 0.4 }); }
        cx(e.clientX); cy(e.clientY);
      }, { passive: true });
      document.addEventListener('pointerover', (e) => {
        const t = e.target.closest('[data-cursor]');
        const l = e.target.closest('a,button,[role="button"],input,select,summary');
        cur.classList.toggle('has-label', !!t);
        if (t) cur.dataset.label = t.dataset.cursor;
        cur.classList.toggle('is-link', !t && !!l);
      });
      document.documentElement.addEventListener('pointerleave', () => gsap.to(cur, { opacity: 0, duration: 0.3 }));
      document.documentElement.addEventListener('pointerenter', () => gsap.to(cur, { opacity: 1, duration: 0.3 }));
    }

    /* ---------- Sections pinnées / horizontales (bureau uniquement) ---------- */
    const mm = gsap.matchMedia();
    mm.add('(min-width: 901px) and (prefers-reduced-motion: no-preference)', () => {
      /* Le geste : storytelling pinné en 4 étapes */
      const steps = $$('.story__step');
      const imgs = $$('.story__img');
      const n = steps.length;
      gsap.set(steps.slice(1), { autoAlpha: 0, y: 60 });
      gsap.set(imgs.slice(1), { autoAlpha: 0, scale: 1.2 });
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: '.story__pin', start: 'top top', end: () => `+=${innerHeight * 3.4}`, pin: true, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true },
      });
      tl.to('.story__bar-fill', { scaleY: 1, duration: n - 1 + 0.4 }, 0)
        .to('.story__orb', { yPercent: -40, xPercent: 18, rotate: 40, duration: n - 1 + 0.4 }, 0)
        .to('.story__line', { rotate: 3, duration: n - 1 + 0.4 }, 0);
      for (let i = 1; i < n; i++) {
        tl.to(steps[i - 1], { autoAlpha: 0, y: -50, duration: 0.4, ease: 'power2.in' }, i - 0.25)
          .to(imgs[i - 1], { scale: 0.94, duration: 0.7 }, i - 0.05)
          .fromTo(imgs[i], { autoAlpha: 0, scale: 1.22 }, { autoAlpha: 1, scale: 1, duration: 0.75, ease: 'power2.out' }, i - 0.1)
          .fromTo(steps[i], { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, i + 0.1);
      }
      tl.to({}, { duration: 0.4 });

      /* La carte : défilement horizontal piloté par le scroll vertical */
      const track = $('.carte__track');
      const wraps = $$('.card-wrap');
      const dist = () => Math.max(0, track.scrollWidth - innerWidth);
      const idx = $('#carteIdx'), bar = $('#carteBar');
      const hTween = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: '.carte__pin', start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true,
          onUpdate: (self) => {
            gsap.set(bar, { scaleX: 0.16 + 0.84 * self.progress });
            const i = Math.min(wraps.length, Math.max(1, Math.round(self.progress * (wraps.length - 1)) + 1));
            idx.textContent = String(i).padStart(2, '0');
          },
        },
      });
      wraps.forEach((w) => {
        gsap.fromTo(w, { opacity: 0.25, y: 50, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, ease: 'power2.out',
          scrollTrigger: { trigger: w, containerAnimation: hTween, start: 'left 98%', end: 'left 62%', scrub: true } });
      });
      const skewTo = gsap.quickSetter(wraps, 'skewX', 'deg');
      const skewTick = () => { skewTo(gsap.utils.clamp(-5, 5, -scroll.vel * 0.22)); };
      gsap.ticker.add(skewTick);

      /* Galerie : colonnes à vitesses différentes */
      $$('.gcol').forEach((col) => {
        const sp = parseFloat(col.dataset.speed || 0);
        if (!sp) return;
        gsap.fromTo(col, { y: 90 * sp }, { y: -90 * sp, ease: 'none', scrollTrigger: { trigger: '.gallery__cols', start: 'top bottom', end: 'bottom top', scrub: 0.8 } });
      });

      return () => gsap.ticker.remove(skewTick);
    });

    /* ---------- Galerie : images qui bougent dans leur cadre ---------- */
    $$('.shot').forEach((shot) => {
      const img = $('.shot__in img', shot);
      gsap.fromTo(img, { yPercent: -2.5 }, { yPercent: 2.5, ease: 'none', scrollTrigger: { trigger: shot, start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.from(shot, { y: 70, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: shot, start: 'top 94%', once: true } });
    });

    /* ---------- Le salon : cartes empilées ---------- */
    const scards = $$('.scard');
    scards.forEach((card, i) => {
      const next = scards[i + 1];
      if (!next) return;
      const st = { trigger: next, start: 'top 92%', end: 'top 24%', scrub: true };
      gsap.to(card, { scale: 0.93, ease: 'none', scrollTrigger: st });
      gsap.to($('.scard__shade', card), { opacity: 0.6, ease: 'none', scrollTrigger: st });
    });
    $$('.scard__media img').forEach((img) => {
      gsap.fromTo(img, { scale: 1.12 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: img.closest('.scard'), start: 'top 90%', end: 'top 20%', scrub: true } });
    });

    /* ---------- Le regard : fil qui se dessine + images décalées ---------- */
    const thread = $('.regard__thread path');
    if (thread) {
      const L = thread.getTotalLength();
      gsap.set(thread, { strokeDasharray: L, strokeDashoffset: L });
      gsap.to(thread, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '.regard', start: 'top 75%', end: 'bottom 40%', scrub: 0.7 } });
    }
    gsap.fromTo('.regard__b', { y: 60 }, { y: -50, ease: 'none', scrollTrigger: { trigger: '.regard__pics', start: 'top bottom', end: 'bottom top', scrub: 0.8 } });
    gsap.fromTo('.seal', { y: 20 }, { y: -80, ease: 'none', scrollTrigger: { trigger: '.regard__pics', start: 'top bottom', end: 'bottom top', scrub: 0.8 } });

    /* ---------- CTA : texte qui se rapproche ---------- */
    gsap.fromTo('.cta__sparks', { yPercent: 10 }, { yPercent: -25, ease: 'none', scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'bottom top', scrub: true } });

    /* ---------- Carrousel d'avis ---------- */
    setupReviews();

    /* ---------- Recalcul des positions ---------- */
    let rf;
    const refreshSoon = () => { clearTimeout(rf); rf = setTimeout(() => ScrollTrigger.refresh(), 150); };
    $$('img[loading="lazy"]').forEach((im) => { if (!im.complete) im.addEventListener('load', refreshSoon, { once: true }); });
    window.addEventListener('load', () => ScrollTrigger.refresh());
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  }

  /* Mode « mouvement réduit » : tout est déjà visible, on garde seulement l'essentiel */
  function finishStatic() {
    setupReviews();
  }

  /* ------------------------------------------------------------------
     3. Carrousel d'avis (glisser, boutons, points, lecture auto)
     ------------------------------------------------------------------ */
  function setupReviews() {
    const view = $('#avisView'), track = $('#avisTrack');
    if (!view || !track) return;
    const slides = $$('.rev', track);
    const dotsWrap = $('#avisDots');
    let i = 0, timer = null, dragging = false, hovering = false, steps = slides.length, dots = [];

    const padLeft = () => parseFloat(getComputedStyle(view).paddingLeft) || 0;
    const maxX = () => Math.max(0, track.scrollWidth - view.clientWidth + 2 * padLeft());
    const xFor = (k) => -Math.min(slides[k].offsetLeft, maxX());

    // Nombre d'arrêts réels : au-delà, le défilement est bloqué en fin de piste
    function buildSteps() {
      const m = maxX();
      const k = slides.findIndex((s) => s.offsetLeft >= m - 1);
      steps = k === -1 ? slides.length : k + 1;
      dotsWrap.textContent = '';
      for (let n = 0; n < steps; n++) {
        const b = document.createElement('button');
        b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-label', `Avis ${n + 1} sur ${steps}`);
        b.addEventListener('click', () => { go(n); restart(); });
        dotsWrap.appendChild(b);
      }
      dots = $$('button', dotsWrap);
    }

    function go(k, instant) {
      i = (k + steps) % steps;
      dots.forEach((d, n) => d.setAttribute('aria-selected', String(n === i)));
      const x = xFor(i);
      if (instant || reduce) gsap.set(track, { x }); else gsap.to(track, { x, duration: 1.1, ease: 'expo.out', overwrite: true });
    }
    const next = () => go(i + 1), prev = () => go(i - 1);
    const restart = () => { clearInterval(timer); if (!reduce) timer = setInterval(() => { if (!dragging && !hovering && !document.hidden) next(); }, 6500); };

    $('#avisNext').addEventListener('click', () => { next(); restart(); });
    $('#avisPrev').addEventListener('click', () => { prev(); restart(); });
    view.addEventListener('mouseenter', () => { hovering = true; });
    view.addEventListener('mouseleave', () => { hovering = false; });
    view.addEventListener('focusin', () => { hovering = true; });
    view.addEventListener('focusout', () => { hovering = false; });

    let sx = 0, startX = 0, moved = 0;
    view.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = true; moved = 0; sx = e.clientX; startX = gsap.getProperty(track, 'x');
      gsap.killTweensOf(track);
    });
    window.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx));
      if (moved > 4) gsap.set(track, { x: startX + dx });
    });
    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      const dx = (e.clientX || sx) - sx;
      if (dx < -60) next(); else if (dx > 60) prev(); else go(i);
      restart();
    };
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    view.addEventListener('click', (e) => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);
    const rebuild = () => { buildSteps(); go(Math.min(i, steps - 1), true); };
    window.addEventListener('resize', rebuild);
    if (window.ScrollTrigger) ScrollTrigger.addEventListener('refresh', rebuild);

    buildSteps();
    go(0, true);
    restart();
  }
})();
