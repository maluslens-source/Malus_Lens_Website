(() => {
  // Runs after js/cms.js has applied any edits saved from /admin.
  const boot = () => {
  const C = window.MALUS_CONFIG, T = window.MALUS_CONTENT;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches && !document.documentElement.classList.contains('force-motion');
  const ph = (text) => C.showPlaceholders ? `<span class="ph-chip">${text}</span>` : '';
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- Analytics hook (platform decided later) ---------- */
  window.dataLayer = window.dataLayer || [];
  const track = (event, data = {}) => window.dataLayer.push({ event, ...data });
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-track]');
    if (t) track(t.dataset.track);
  });

  /* ---------- Toast ---------- */
  const toastEl = $('#toast'); let toastT;
  const toast = (msg) => { toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 3200); };

  /* ---------- Icons ---------- */
  const ICONS = {
    fast: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V9.5M9.5 2.5h5M12 2.5V6M18.5 6.5l1.5-1.5"/>',
    precise: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.5"/><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4"/>',
    reliable: '<path d="M12 2.5l7.5 3v6c0 4.6-3.1 8-7.5 10-4.4-2-7.5-5.4-7.5-10v-6l7.5-3z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    sustainable: '<path d="M4.5 19.5C4.5 10 10 4.5 20 4c-.3 10-5.8 15.5-15.5 15.5z"/><path d="M4.5 19.5l9-9"/>',
    data: '<path d="M3 20.5h18"/><path d="M6.5 16.5v-5M11.5 16.5V6.5M16.5 16.5v-8"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5"/>',
    phone: '<path d="M5 3.5h3.5l1.8 4.6-2.3 1.4a11 11 0 0 0 6.5 6.5l1.4-2.3 4.6 1.8V19a1.5 1.5 0 0 1-1.6 1.5C10.6 20 4 13.4 3.5 5.1A1.5 1.5 0 0 1 5 3.5z"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 1 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    quote: '<path d="M10 7H6a2 2 0 0 0-2 2v4h5v5H4M20 7h-4a2 2 0 0 0-2 2v4h5v5h-5" />',
  };
  const svg = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>`;

  /* ---------- Render config-driven content ---------- */
  $('#benefits-grid').innerHTML = T.benefits.map((b, i) => `
    <article class="bcard" data-reveal style="--d:${i * 0.08}s">
      <span class="bcard__k">0${i + 1}</span>
      <div class="bcard__icon">${svg(b.key)}</div>
      <h3>${esc(b.title)}</h3><p>${esc(b.text)}</p>
    </article>`).join('');

  $('#ops-grid').innerHTML = T.operations.map((o, i) => `
    <article class="ocard" data-reveal style="--d:${i * 0.08}s">
      <div class="ocard__img"><img src="${o.img}" alt="${esc(o.alt)}" loading="lazy" /><span class="ocard__n">0${i + 1}</span></div>
      <div class="ocard__body"><h3>${esc(o.title)}</h3><p>${esc(o.text)}</p></div>
    </article>`).join('');

  $('#why-grid').innerHTML = T.why.map((w, i) => `
    <article class="wcard" data-reveal style="--d:${(i % 2) * 0.1}s">
      <span class="wcard__n">0${i + 1}</span>
      <div><h3>${esc(w.title)}</h3><p>${esc(w.text)}</p></div>
    </article>`).join('');

  // Metrics — approved values only
  const metricsEl = $('#metrics');
  const shown = C.metrics.filter((m) => m.value != null || C.showPlaceholders);
  if (!shown.length) metricsEl.remove();
  else metricsEl.innerHTML = shown.map((m, i) => {
    const has = m.value != null;
    const v = has ? (typeof m.value === 'number' ? `<span data-count="${m.value}" data-suffix="${esc(m.suffix || '')}">0${esc(m.suffix || '')}</span>` : esc(m.value)) : ph(m.placeholder);
    return `<div class="metric ${has ? '' : 'metric--pending'}" data-reveal style="--d:${i * 0.08}s">
      <div class="metric__v">${v}</div><div class="metric__l">${esc(m.label)}</div>
      <div class="metric__d">${has ? esc(m.description || '') : 'Awaiting approved figure'}</div></div>`;
  }).join('');

  // Testimonials — real only, polished placeholders in development
  const vg = $('#voices-grid');
  if (C.testimonials.length) {
    vg.innerHTML = C.testimonials.map((t, i) => `
      <figure class="tcard lg" data-reveal style="--d:${i * 0.08}s">
        <svg class="tcard__q" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${ICONS.quote}</svg>
        <blockquote>“${esc(t.quote)}”</blockquote>
        <figcaption class="tcard__who"><span class="tcard__av">${t.photo ? `<img src="${esc(t.photo)}" alt="" />` : esc(String(t.name || '?').trim().charAt(0).toUpperCase())}</span>
          <span><b>${esc(t.name || '')}</b><small>${esc([t.role, t.organisation].filter(Boolean).join(', '))}</small></span></figcaption>
      </figure>`).join('');
  } else if (C.showPlaceholders) {
    vg.innerHTML = [0, 1, 2].map((i) => `
      <figure class="tcard tcard--ph lg" data-reveal style="--d:${i * 0.08}s">
        <svg class="tcard__q" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">${ICONS.quote}</svg>
        <blockquote>${ph('[TESTIMONIAL]')}<br/>Approved customer feedback will appear here.</blockquote>
        <figcaption class="tcard__who"><span class="tcard__av"></span><span><b>${ph('[NAME]')}</b><small>[ROLE], [ORGANISATION]</small></span></figcaption>
      </figure>`).join('');
  } else if (!(window.MalusCMS && window.MalusCMS.edit)) $('#feedback').hidden = true;

  // Contact
  const ct = C.contact, rows = [];
  const row = (ico, label, valueHtml) => `<li data-reveal><span class="contact__ico">${svg(ico)}</span><div><small>${label}</small>${valueHtml}</div></li>`;
  if (ct.email || C.showPlaceholders) rows.push(row('mail', 'Email', ct.email ? `<a href="mailto:${esc(ct.email)}">${esc(ct.email)}</a>` : `<span class="v">${ph('[CONTACT EMAIL]')}</span>`));
  if (ct.phone || C.showPlaceholders) rows.push(row('phone', 'Phone', ct.phone ? `<a href="tel:${esc(ct.phone.replace(/\s/g, ''))}">${esc(ct.phone)}</a>` : `<span class="v">${ph('[CONTACT PHONE]')}</span>`));
  rows.push(`<li data-reveal><span class="contact__ico">${svg('fast')}</span><div><small>Prefer a call?</small><span class="v">Book a time with the team</span></div><button class="btn btn--primary btn--sm press" data-book data-track="contact_book_meeting">Book a Meeting</button></li>`);
  $('#contact-list').innerHTML = rows.join('');

  // Footer legal — only when URLs exist
  const lg = C.legal;
  if (lg.privacy || lg.terms) {
    $('#footer-legal').innerHTML = '<h3>Legal</h3>' + (lg.privacy ? `<a href="${esc(lg.privacy)}">Privacy Policy</a>` : '') + (lg.terms ? `<a href="${esc(lg.terms)}">Terms &amp; Conditions</a>` : '');
  }
  $('#year').textContent = new Date().getFullYear();

  /* ---------- Use Malus Lens links ---------- */
  $$('[data-app-link]').forEach((a) => {
    if (C.appUrl) { a.href = C.appUrl; a.rel = 'noopener'; }
    else a.addEventListener('click', (e) => { e.preventDefault(); toast('Application URL not configured yet — [APPLICATION URL]'); });
    a.addEventListener('click', () => track('external_app_click'));
  });

  /* ---------- Booking ---------- */
  const dlg = $('#booking'), body = $('#booking-body');
  // Built-in booking: pick a slot → /api/book creates a Google Calendar event with a Meet link.
  // If an external scheduler URL is configured instead, it is embedded as before.
  const fmtDay = (d) => d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
  const isoIST = (d) => new Date(d.getTime() + 5.5 * 3600e3).toISOString().slice(0, 10);
  const nextDays = () => { const out = []; const d = new Date(); for (let i = 0; out.length < 12 && i < 30; i++) { const x = new Date(d.getTime() + i * 864e5); const wd = new Date(isoIST(x) + 'T12:00:00+05:30').getUTCDay(); if (wd !== 0) out.push(x); } return out; };
  const h12 = (hm) => { const [h, m] = hm.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
  const fallbackHTML = (msg) => `<div class="booking__empty"><img src="images/brand/malus-lens-icon.png" alt="" />
      <h3>${msg}</h3><p>Reach the team directly and we will set up a Google Meet with you.</p>
      <div class="booking__alt">${C.contact.email ? `<a class="btn btn--primary" href="mailto:${esc(C.contact.email)}?subject=Meeting%20request">Email ${esc(C.contact.email)}</a>` : ''}
      ${C.contact.phone ? `<a class="btn btn--glass" href="tel:${esc(C.contact.phone.replace(/\s/g, ''))}">Call ${esc(C.contact.phone)}</a>` : ''}</div></div>`;
  const bookingForm = (kind) => {
    const days = nextDays();
    body.innerHTML = `<form class="bk" novalidate>
      <div class="bk__step"><span class="bk__n">1</span><b>Pick a day</b><small>Times in India (IST) · 30 minutes · Google Meet</small></div>
      <div class="bk__days" role="radiogroup" aria-label="Day">${days.map((d) => `<button type="button" class="bk__day" role="radio" aria-checked="false" data-day="${isoIST(d)}">${fmtDay(d).replace(',', '')}</button>`).join('')}</div>
      <div class="bk__step"><span class="bk__n">2</span><b>Pick a time</b></div>
      <div class="bk__slots" aria-live="polite"><p class="bk__hint">Choose a day to see open times.</p></div>
      <div class="bk__step"><span class="bk__n">3</span><b>Your details</b></div>
      <div class="bk__fields">
        <label>Full name<input name="name" autocomplete="name" required maxlength="80" /></label>
        <label>Work email<input name="email" type="email" autocomplete="email" required maxlength="120" /></label>
        <label>Organisation <i>(optional)</i><input name="company" autocomplete="organization" maxlength="120" /></label>
        <label class="bk__full">Anything we should know? <i>(optional)</i><textarea name="note" rows="2" maxlength="600"></textarea></label>
        <input class="bk__hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" />
      </div>
      <p class="bk__err" role="alert"></p>
      <div class="bk__foot"><small>We only use these details to schedule your meeting. <a href="privacy.html" target="_blank">Privacy</a></small>
        <button class="btn btn--primary btn--lg" type="submit" disabled><span>Confirm &amp; get Meet link</span></button></div>
    </form>`;
    const form = $('form', body), slotsEl = $('.bk__slots', form), err = $('.bk__err', form), submit = $('[type=submit]', form);
    let day = '', time = '';
    const ready = () => { submit.disabled = !(day && time); };
    const loadDay = async (btn) => {
      $$('.bk__day', form).forEach((x) => x.setAttribute('aria-checked', String(x === btn)));
      day = btn.dataset.day; time = ''; ready(); err.textContent = '';
      slotsEl.innerHTML = '<p class="bk__hint"><span class="spinner spinner--sm"></span> Checking the calendar…</p>';
      try {
        const r = await fetch('/api/slots?day=' + day);
        if (r.status === 503 || r.status === 404) { body.innerHTML = fallbackHTML('Online booking is being set up'); return; }
        const j = await r.json();
        if (!r.ok) throw new Error('slots');
        slotsEl.innerHTML = j.slots.length ? j.slots.map((t) => `<button type="button" class="bk__slot" data-t="${t}" aria-pressed="false">${h12(t)}</button>`).join('') : '<p class="bk__hint">No open times that day. Try another day.</p>';
        $$('.bk__slot', slotsEl).forEach((sb) => sb.addEventListener('click', () => { $$('.bk__slot', slotsEl).forEach((x) => x.setAttribute('aria-pressed', String(x === sb))); time = sb.dataset.t; ready(); }));
      } catch (e) { slotsEl.innerHTML = '<p class="bk__hint">Could not load times. Please try again.</p>'; }
    };
    $$('.bk__day', form).forEach((btn) => btn.addEventListener('click', () => loadDay(btn)));
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); err.textContent = '';
      const fd = Object.fromEntries(new FormData(form));
      if (!fd.name.trim()) { err.textContent = 'Please add your name.'; form.elements.name.focus(); return; }
      if (!/^\S+@\S+\.\S{2,}$/.test(fd.email)) { err.textContent = 'Please add a valid email. The Meet invite goes there.'; form.elements.email.focus(); return; }
      submit.disabled = true; submit.classList.add('is-busy');
      try {
        const r = await fetch('/api/book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...fd, day, time, kind }) });
        const j = await r.json().catch(() => ({}));
        if (r.status === 503 || r.status === 404) { body.innerHTML = fallbackHTML('Online booking is being set up'); return; }
        if (r.status === 409) { err.textContent = 'That time was just taken. Please pick another.'; loadDay($$('.bk__day', form).find((x) => x.dataset.day === day)); return; }
        if (!r.ok || !j.ok) throw new Error('book');
        track('booking_completed', { kind });
        const when = new Date(j.start).toLocaleString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
        body.innerHTML = `<div class="booking__done"><span class="booking__tick"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>
          <h3>You're booked</h3><p>${esc(when)} (IST). A calendar invite with the Google Meet link is on its way to <b>${esc(fd.email)}</b>.</p>
          ${j.meet ? `<a class="btn btn--primary btn--lg" href="${esc(j.meet)}" target="_blank" rel="noopener">Open Google Meet</a><code>${esc(j.meet)}</code>` : ''}</div>`;
      } catch (e2) { err.textContent = 'Something went wrong. Please try again, or email ' + (C.contact.email || 'the team') + '.'; }
      finally { if (submit.isConnected) { submit.disabled = !(day && time); submit.classList.remove('is-busy'); } }
    });
  };
  const openBooking = (kind) => {
    const url = (kind === 'demo' && C.demoUrl) || C.bookingUrl;
    $('#booking-h').textContent = kind === 'demo' ? 'Book a demo' : 'Book a meeting';
    track('booking_started', { kind });
    if (!url) bookingForm(kind);
    else {
      let src = url;
      try { const u = new URL(url); if (/calendly\.com$/.test(u.hostname)) { u.searchParams.set('embed_domain', location.hostname); u.searchParams.set('embed_type', 'Inline'); u.searchParams.set('hide_gdpr_banner', '1'); } src = u.toString(); } catch (_) {}
      body.innerHTML = `<div class="booking__loading"><span class="spinner"></span><span>Loading booking calendar…</span></div>
        <iframe title="Booking calendar" src="${esc(src)}" loading="eager"></iframe>
        <p class="booking__fallback">Having trouble loading the booking calendar? <a href="${esc(url)}" target="_blank" rel="noopener">Open booking page</a></p>`;
      const fr = $('iframe', body), ld = $('.booking__loading', body);
      const fail = setTimeout(() => { ld.innerHTML = `<span>The calendar is taking a while.</span><a class="btn btn--primary" href="${esc(url)}" target="_blank" rel="noopener">Open booking page</a>`; }, 12000);
      fr.addEventListener('load', () => { clearTimeout(fail); fr.classList.add('ready'); ld.remove(); });
    }
    if (typeof dlg.showModal === 'function') dlg.showModal(); else window.open(url || 'mailto:' + C.contact.email, '_blank');
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-book]');
    if (!b) return;
    e.preventDefault(); closeMenu(); openBooking(b.dataset.book);
  });
  $('#booking-close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  // Calendly completion event
  window.addEventListener('message', (e) => { if (e.data && e.data.event === 'calendly.event_scheduled') track('booking_completed'); });

  /* ---------- Nav ---------- */
  const nav = $('#nav');
  const onScrollNav = () => nav.classList.toggle('is-scrolled', scrollY > 10);
  onScrollNav(); addEventListener('scroll', onScrollNav, { passive: true });

  const toggle = $('#menu-toggle'), menu = $('#mobile-menu');
  function closeMenu() { if (menu.hidden) return; menu.hidden = true; toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', 'Open menu'); document.body.style.overflow = ''; }
  toggle.addEventListener('click', () => {
    const open = menu.hidden;
    menu.hidden = !open; toggle.setAttribute('aria-expanded', String(open)); toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) $('a', menu).focus();
  });
  $$('a', menu).forEach((a) => a.addEventListener('click', closeMenu));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeMenu(); } });
  addEventListener('resize', () => { if (innerWidth > 1024) closeMenu(); });

  // Active section indicator
  const links = $$('.nav__links a');
  const secs = links.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  const io = new IntersectionObserver((es) => es.forEach((en) => {
    if (en.isIntersecting) links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  secs.forEach((s) => io.observe(s));

  /* ---------- Hero title split ---------- */
  const h1 = $('[data-split]');
  let wi = 0;
  const splitNode = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(' '); return; }
          const w = document.createElement('span'); w.className = 'w';
          const s = document.createElement('span'); s.textContent = part; s.style.setProperty('--wd', `${0.1 + wi++ * 0.08}s`);
          w.append(s); frag.append(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) splitNode(n);
    });
  };
  h1.setAttribute('aria-label', h1.textContent.trim());
  splitNode(h1);
  $$('.w', h1).forEach((w) => w.setAttribute('aria-hidden', 'true'));
  const reveal = () => requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('is-loaded')));
  if (document.documentElement.classList.contains('intro-on')) addEventListener('intro:done', reveal, { once: true }); else reveal();

  /* ---------- Reveal on scroll ---------- */
  const rio = new IntersectionObserver((es) => es.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('in'); rio.unobserve(en.target); }
  }), { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  $$('[data-reveal], .why__tags').forEach((el) => rio.observe(el));
  // above-the-fold items reveal immediately
  $$('.hero [data-reveal]').forEach((el) => el.classList.add('in'));

  /* ---------- Count-up for approved metrics ---------- */
  const cio = new IntersectionObserver((es) => es.forEach((en) => {
    if (!en.isIntersecting) return; cio.unobserve(en.target);
    const el = en.target, to = +el.dataset.count, suf = el.dataset.suffix || '', dec = (String(to).split('.')[1] || '').length;
    if (reduced) { el.textContent = to.toFixed(dec) + suf; return; }
    const t0 = performance.now(), dur = 1400;
    const step = (t) => { const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = (to * e).toFixed(dec) + suf; if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }), { threshold: 0.6 });
  $$('[data-count]').forEach((el) => cio.observe(el));

  /* ---------- Detection demo: a real Malus Lens result on a full intake tray ---------- */
  // counts as printed by the model on this photo: 102 apples, 68 Grade A, 34 Grade B
  const DET = { total: 102, a: 68, b: 34 };
  const detect = $('#detect'), dc = $('#det-count'), da = $('#det-a'), db = $('#det-b');
  let detRaf = 0, detTimer = 0, detRunning = false;
  const runDetect = () => {
    cancelAnimationFrame(detRaf); clearTimeout(detTimer);
    detect.classList.remove('is-running'); void detect.offsetWidth; detect.classList.add('is-running');
    if (reduced) { dc.textContent = DET.total; da.textContent = DET.a; db.textContent = DET.b; return; }
    const t0 = performance.now(), dur = 2600; // follows the scan sweep down the tray
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur), e = p < 1 ? 1 - Math.pow(1 - p, 2) : 1;
      dc.textContent = Math.round(DET.total * e); da.textContent = Math.round(DET.a * e); db.textContent = Math.round(DET.b * e);
      if (p < 1) detRaf = requestAnimationFrame(step); else detTimer = setTimeout(() => { if (detRunning) runDetect(); }, 7000);
    };
    detRaf = requestAnimationFrame(step);
  };
  new IntersectionObserver((es) => es.forEach((en) => {
    if (en.isIntersecting && !detRunning) { detRunning = true; runDetect(); }
    else if (!en.isIntersecting && detRunning) { detRunning = false; cancelAnimationFrame(detRaf); clearTimeout(detTimer); }
  }), { threshold: 0.35 }).observe(detect);

  /* ---------- Product showcase tabs ---------- */
  const tabs = $$('.step'), screens = $$('.scr');
  let cur = 0, autoT, userTook = false;
  const DUR = 5200;
  const sample = $('[data-sample]');
  const show = (i, focus) => {
    cur = i;
    tabs.forEach((t, k) => { const on = k === i; t.classList.toggle('is-active', on); t.classList.remove('is-timing'); t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
    screens.forEach((s, k) => { const on = k === i; s.hidden = !on; s.classList.toggle('is-active', false); if (on) requestAnimationFrame(() => s.classList.add('is-active')); });
    if (i === 2 && sample) { // sample count animates — mockup only
      const to = 16, t0 = performance.now();
      const st = (t) => { const p = Math.min(1, (t - t0) / 900); sample.textContent = Math.round(to * p); if (p < 1) requestAnimationFrame(st); };
      requestAnimationFrame(st);
    }
    if (focus) tabs[i].focus();
    clearTimeout(autoT);
    if (!userTook && !reduced && showcaseVisible) {
      const t = tabs[i]; t.style.setProperty('--dur', DUR + 'ms'); void t.offsetWidth; t.classList.add('is-timing');
      autoT = setTimeout(() => show((cur + 1) % tabs.length), DUR);
    }
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => { userTook = true; show(i); });
    t.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); userTook = true; show((cur + 1) % tabs.length, true); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); userTook = true; show((cur + tabs.length - 1) % tabs.length, true); }
    });
  });
  let showcaseVisible = false;
  new IntersectionObserver((es) => es.forEach((en) => {
    showcaseVisible = en.isIntersecting;
    if (showcaseVisible) show(cur); else clearTimeout(autoT);
  }), { threshold: 0.3 }).observe($('.showcase__grid'));

  /* ---------- Vision statement: words light up while scrolling ---------- */
  const hls = [$('#vision-text'), ...$$('[data-highlight]')].filter(Boolean).map((el) => {
    el.innerHTML = el.textContent.split(/(\s+)/).map((w) => /^\s+$/.test(w) ? w : `<span class="vw">${esc(w)}</span>`).join('');
    const ws = $$('.vw', el);
    if (reduced) ws.forEach((w) => w.classList.add('lit'));
    return [el, ws];
  });
  const dash = $('#dash');

  /* ---------- Scroll-linked: parallax + vision words ---------- */
  const par = $$('[data-parallax]');
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const vh = innerHeight;
    if (!reduced && innerWidth > 760) par.forEach((el) => {
      const r = el.getBoundingClientRect(); const c = r.top + r.height / 2 - vh / 2;
      el.style.transform = `translate3d(0, ${(c * +el.dataset.parallax).toFixed(1)}px, 0)`;
    });
    if (!reduced) hls.forEach(([el, ws]) => {
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
      const lit = Math.round(p * ws.length);
      ws.forEach((w, i) => w.classList.toggle('lit', i < lit));
    });
    // dashboard tilts up out of the horizon as you scroll
    if (dash && !reduced) {
      const r = dash.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.7)));
      dash.style.setProperty('--tilt', (1 - p).toFixed(3));
    }
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- Brand film ---------- */
  const film = $('#film'), filmVideo = $('#film-video');
  if (film) {
    document.addEventListener('click', (e) => { if (e.target.closest('[data-film]')) { track('film_open'); film.showModal(); filmVideo.play().catch(() => {}); } });
    const closeFilm = () => { filmVideo.pause(); film.close(); };
    $('#film-close').addEventListener('click', closeFilm);
    film.addEventListener('click', (e) => { if (e.target === film) closeFilm(); });
    film.addEventListener('close', () => filmVideo.pause());
  }

  /* ---------- Scan readout (product panel) ---------- */
  const sp = $('#scan-pct'), sf = $('#scan-fill');
  if (sp) {
    const lab = sp.previousElementSibling; let sOn = false, s0 = 0;
    const tick = (t) => {
      if (!sOn) return;
      const p = reduced ? 1 : Math.min(1, ((t - s0) % 4200) / 3000);
      const pct = Math.round(p * 100);
      sp.textContent = pct + '%'; sf.style.width = pct + '%';
      lab.textContent = p >= 1 ? 'Assessment complete' : 'Assessing sample';
      if (!reduced) requestAnimationFrame(tick);
    };
    new IntersectionObserver((es) => { sOn = es[0].isIntersecting; if (sOn) { s0 = performance.now(); requestAnimationFrame(tick); } }).observe(sp);
  }

  window.MalusUI = { toast, track };
  };
  (window.MalusCMS ? window.MalusCMS.ready : Promise.resolve()).then(boot);
})();
