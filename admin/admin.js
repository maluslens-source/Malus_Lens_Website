/*
 * Malus Lens — website admin.
 * Edits are kept as a draft (sessionStorage) and shown live in the preview iframe;
 * "Publish" saves them to Supabase (ml_site_content) through the ml-admin edge function.
 */
(() => {
  'use strict';
  const SB_URL = 'https://hqatexqeufohkisimqvq.supabase.co';
  const SB_KEY = 'sb_publishable_HMxbfqiTG7fYKWfajXwW3Q_xtoJiPBR';
  const FN = `${SB_URL}/functions/v1/ml-admin`;
  const DRAFT = 'ml_draft', SESSION = 'ml_admin';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const frame = $('#frame'), pane = $('#pane'), statusEl = $('#status');

  let toastT;
  const toast = (m) => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3000); };

  /* ---------- session ---------- */
  const getSession = () => { try { const s = JSON.parse(sessionStorage.getItem(SESSION) || 'null'); return s && Date.parse(s.expires_at) > Date.now() ? s : null; } catch { return null; } };
  async function fn(body, form) {
    const s = getSession();
    const headers = s ? { 'x-ml-token': s.token } : {};
    if (!form) headers['Content-Type'] = 'application/json';
    const r = await fetch(FN, { method: 'POST', headers, body: form || JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && body && body.action !== 'login') { sessionStorage.removeItem(SESSION); showLogin('Your session ended. Please sign in again.'); throw new Error('unauthorized'); }
    if (!r.ok) throw new Error(j.error || `Request failed (${r.status})`);
    return j;
  }

  /* ---------- login ---------- */
  function showLogin(msg) { $('#app').hidden = true; $('#login').hidden = false; $('#login-err').textContent = msg || ''; $('#login-form [name=username]').focus(); }
  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target, err = $('#login-err'), btn = $('[type=submit]', f);
    err.textContent = '';
    const username = f.username.value.trim(), password = f.password.value;
    if (!username || !password) { err.textContent = 'Enter your username and password.'; return; }
    btn.disabled = true; btn.textContent = 'Signing in…';
    try {
      const s = await fn({ action: 'login', username, password });
      sessionStorage.setItem(SESSION, JSON.stringify(s));
      f.password.value = '';
      start();
    } catch (ex) { err.textContent = ex.message === 'invalid' ? 'Wrong username or password.' : 'Could not sign in. Check your connection and try again.'; }
    btn.disabled = false; btn.textContent = 'Sign in';
  });
  $('#logout').addEventListener('click', async () => {
    if (dirty() && !confirm('You have unpublished changes. Log out anyway? They stay saved in this browser tab.')) return;
    try { await fn({ action: 'logout' }); } catch {}
    sessionStorage.removeItem(SESSION); showLogin();
  });

  /* ---------- draft ---------- */
  let published = {}, draft = {}, inv = null, tab = 'text', reloadT;
  const norm = (d) => ({ text: d.text || {}, images: d.images || {}, config: d.config || {}, content: d.content || {} });
  const dirty = () => JSON.stringify(norm(draft)) !== JSON.stringify(norm(published));
  function persist() { sessionStorage.setItem(DRAFT, JSON.stringify(draft)); refreshStatus(); }
  function refreshStatus(busy) {
    const d = dirty();
    statusEl.className = 'status' + (busy ? ' is-busy' : d ? ' is-dirty' : '');
    statusEl.textContent = busy ? busy : d ? 'Unpublished changes' : 'All changes published';
    $('#publish').disabled = !d || !!busy; $('#discard').disabled = !d || !!busy;
  }
  const reloadPreview = (delay = 500) => { clearTimeout(reloadT); reloadT = setTimeout(() => { frame.contentWindow && frame.contentWindow.location.reload(); }, delay); };
  const post = (m) => frame.contentWindow && frame.contentWindow.postMessage({ ml: 1, ...m }, location.origin);

  async function loadPublished() {
    const r = await fetch(`${SB_URL}/rest/v1/ml_site_content?id=eq.site&select=data,updated_at,updated_by`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }, cache: 'no-store' });
    const rows = await r.json();
    return norm((rows[0] && rows[0].data) || {});
  }
  async function start() {
    $('#login').hidden = true; $('#app').hidden = false;
    refreshStatus('Loading…');
    try { published = await loadPublished(); } catch { published = norm({}); toast('Could not load the published content. Check your connection.'); }
    let saved = null; try { saved = JSON.parse(sessionStorage.getItem(DRAFT) || 'null'); } catch {}
    draft = saved ? norm(saved) : clone(published);
    persist();
    frame.src = '/?edit=1';
    requestAnimationFrame(fit);
    renderPane();
  }
  $('#discard').addEventListener('click', () => {
    if (!confirm('Discard all unpublished changes?')) return;
    draft = clone(published); persist(); reloadPreview(0); renderPane();
  });
  $('#publish').addEventListener('click', async () => {
    refreshStatus('Publishing…');
    try {
      await fn({ action: 'save', data: norm(draft) });
      published = clone(norm(draft));
      try { localStorage.removeItem('ml_site_cache_v1'); } catch {}
      refreshStatus(); toast('Published. The live site now shows your changes.');
    } catch (ex) { refreshStatus(); if (ex.message !== 'unauthorized') toast('Publish failed: ' + ex.message); }
  });
  addEventListener('beforeunload', (e) => { if (getSession() && dirty()) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- preview size ---------- */
  // desktop preview renders at a real laptop width and is scaled to fit; phone preview is 390px
  const wrap = $('#frame-wrap');
  function fit() {
    const mobile = wrap.classList.contains('is-mobile'), W = wrap.clientWidth, H = wrap.clientHeight;
    if (mobile || W >= 1280) { frame.style.width = mobile ? '390px' : '100%'; frame.style.height = '100%'; frame.style.transform = 'none'; return; }
    const k = W / 1280;
    frame.style.width = '1280px'; frame.style.height = H / k + 'px'; frame.style.transform = `scale(${k})`;
  }
  addEventListener('resize', fit);
  $$('[data-view]').forEach((b) => b.addEventListener('click', () => {
    $$('[data-view]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    wrap.classList.toggle('is-mobile', b.dataset.view === 'mobile'); fit();
  }));

  /* ---------- messages from the preview ---------- */
  addEventListener('message', (e) => {
    if (e.origin !== location.origin || !e.data || !e.data.ml) return;
    const m = e.data;
    if (m.type === 'inventory') { const first = !inv; inv = { defaults: m.defaults, current: m.current }; if (first) renderPane(); }
    if (m.type === 'text') { setText(m.key, m.html, true); }
    if (m.type === 'focus' && tab === 'text') { const t = $(`[data-key="${CSS.escape(m.key)}"]`, pane); if (t) t.closest('.item').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    if (m.type === 'pickImage') pickFile((url) => setImage(m.key, url));
    if (m.type === 'openPanel') selectTab(m.panel);
  });

  /* ---------- helpers for values ---------- */
  const short = (h) => String(h || '').replace(/ class="serif"/g, '');
  const defText = (k) => (inv ? short(inv.defaults.text[k]) : '');
  const curText = (k) => (typeof draft.text[k] === 'string' ? draft.text[k] : defText(k));
  function setText(key, html, fromPreview) {
    html = short(html);
    if (html === defText(key)) delete draft.text[key]; else draft.text[key] = html;
    persist();
    if (!fromPreview) post({ type: 'setText', key, html });
    const ta = $(`textarea[data-key="${CSS.escape(key)}"]`, pane);
    if (ta && fromPreview) { ta.value = html; ta.closest('.item').classList.toggle('is-changed', key in draft.text); }
  }
  const defImg = (k) => (inv ? inv.defaults.images[k] : { src: '', alt: '' });
  const curImg = (k) => ({ ...defImg(k), ...(draft.images[k] || {}) });
  function setImage(key, url, alt) {
    const v = { ...(draft.images[key] || {}) };
    if (url !== undefined) v.src = url;
    if (alt !== undefined) v.alt = alt;
    draft.images[key] = v; persist();
    if (url !== undefined) post({ type: 'setImage', key, url });
    if (tab === 'photos') renderPane();
  }
  const cfg = (k) => (draft.config[k] !== undefined ? draft.config[k] : inv && inv.defaults.config[k]);
  const setCfg = (k, v, reload = true) => { draft.config[k] = v; persist(); if (reload) reloadPreview(); };
  const list = (k) => { if (!Array.isArray(draft.config[k])) draft.config[k] = clone(cfg(k) || []); return draft.config[k]; };
  const contentList = (k) => { if (!Array.isArray(draft.content[k])) draft.content[k] = clone((inv && inv.defaults.content[k]) || []); return draft.content[k]; };
  const src = (u) => (/^https?:/.test(u) ? u : '/' + String(u || '').replace(/^\.?\//, ''));

  /* ---------- image upload (resized in the browser first) ---------- */
  let pickCb = null;
  const fileInput = $('#file');
  function pickFile(cb, max = 2400) { pickCb = { cb, max }; fileInput.value = ''; fileInput.click(); }
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files[0]; if (!f || !pickCb) return;
    const { cb, max } = pickCb; pickCb = null;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { toast('Please choose a JPG, PNG or WebP image.'); return; }
    const veil = document.createElement('div'); veil.className = 'uploading'; veil.textContent = 'Uploading photo…'; document.body.append(veil);
    try {
      const blob = await shrink(f, max);
      const form = new FormData(); form.append('file', blob, 'photo.jpg');
      const r = await fn(null, form);
      cb(r.url); toast('Photo uploaded. Publish to make it live.');
    } catch (ex) { if (ex.message !== 'unauthorized') toast('Upload failed: ' + ex.message); }
    veil.remove();
  });
  function shrink(file, max) {
    return new Promise((res, rej) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob((b) => (b ? res(b) : rej(new Error('resize'))), 'image/jpeg', 0.86);
      };
      img.onerror = () => rej(new Error('Could not read that image'));
      img.src = url;
    });
  }

  /* ---------- panes ---------- */
  const SECTIONS = { top: 'Hero & values strip', problem: 'The problem', solution: 'The solution', benefits: 'Benefits', operations: 'Operations', accuracy: 'Performance', product: 'Product', why: 'Why Malus Lens', feedback: 'Customer feedback', vision: 'Vision', book: 'Book a meeting', contact: 'Contact', footer: 'Footer' };
  function selectTab(t) { tab = t; $$('.tabs [data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === t))); renderPane(); pane.scrollTop = 0; }
  $$('.tabs [data-tab]').forEach((b) => b.addEventListener('click', () => selectTab(b.dataset.tab)));

  function renderPane() {
    if (!inv) { pane.innerHTML = '<p class="muted">Loading the preview…</p>'; return; }
    ({ text: paneText, photos: panePhotos, testimonials: paneTestimonials, figures: paneFigures, cards: paneCards, contact: paneContact })[tab]();
  }

  function paneText() {
    const keys = Object.keys(inv.defaults.text);
    let html = `<h2>Text</h2><p class="lead">Edit here or click straight into the preview. Wrap words in &lt;em&gt;…&lt;/em&gt; for the red italic style.</p>
      <input class="search" type="search" placeholder="Search text…" aria-label="Search text" id="tsearch" />`;
    let sec = '';
    keys.forEach((k) => {
      const s = k.split('.')[0];
      if (s !== sec) { sec = s; html += `<p class="group" data-group="${esc(s)}">${esc(SECTIONS[s] || s)}</p>`; }
      const v = curText(k), long = v.length > 70;
      const kind = { h1: 'Main heading', h2: 'Heading', h3: 'Sub-heading', p: 'Paragraph', li: 'List item', span: 'Label', small: 'Small text', figcaption: 'Caption', statement: 'Statement' }[(k.split('.')[1] || '').replace(/\d+$/, '')] || 'Text';
      html += `<div class="item ${k in draft.text ? 'is-changed' : ''}" data-item="${esc(k)}"><div class="item__head"><b>${kind}</b><span><button class="link link--muted" type="button" data-show="${esc(k)}">Show</button>${k in draft.text ? `<button class="link" type="button" data-reset="${esc(k)}">Reset</button>` : ''}</span></div>
        <label class="field"><span class="sr" hidden>${esc(k)}</span><textarea data-key="${esc(k)}" rows="${long ? 3 : 1}">${esc(v)}</textarea></label></div>`;
    });
    pane.innerHTML = html;
    $$('textarea[data-key]', pane).forEach((ta) => ta.addEventListener('input', () => { setText(ta.dataset.key, ta.value.replace(/\n/g, ' ')); ta.closest('.item').classList.toggle('is-changed', ta.dataset.key in draft.text); }));
    $$('[data-show]', pane).forEach((b) => b.addEventListener('click', () => post({ type: 'scrollTo', key: b.dataset.show })));
    $$('[data-reset]', pane).forEach((b) => b.addEventListener('click', () => { setText(b.dataset.reset, defText(b.dataset.reset)); renderPane(); }));
    $('#tsearch').addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      $$('.item', pane).forEach((it) => { it.hidden = !!q && !$('textarea', it).value.toLowerCase().includes(q); });
      $$('.group', pane).forEach((g) => { g.hidden = !!q; });
    });
  }

  function panePhotos() {
    const keys = Object.keys(inv.defaults.images);
    pane.innerHTML = `<h2>Photos</h2><p class="lead">Replace a photo here or click it in the preview. Card photos are under <b>Cards</b>. The logo stays fixed.</p>` + keys.map((k) => {
      const v = curImg(k), sec = SECTIONS[k.split('.')[0]] || k;
      return `<div class="item ${draft.images[k] ? 'is-changed' : ''}"><div class="item__head"><b>${esc(sec)}</b><span><button class="link link--muted" type="button" data-show="${esc(k)}">Show</button>${draft.images[k] ? `<button class="link" type="button" data-reset="${esc(k)}">Reset</button>` : ''}</span></div>
        <div class="photo"><img src="${esc(src(v.src))}" alt="" /><div style="display:grid;gap:8px"><button class="btn btn--ghost btn--sm" type="button" data-replace="${esc(k)}">Replace photo</button>
        <label class="field"><span>Description (alt text)</span><input data-alt="${esc(k)}" value="${esc(v.alt)}" /></label></div></div></div>`;
    }).join('');
    $$('[data-replace]', pane).forEach((b) => b.addEventListener('click', () => pickFile((url) => setImage(b.dataset.replace, url))));
    $$('[data-alt]', pane).forEach((i) => i.addEventListener('change', () => setImage(i.dataset.alt, undefined, i.value.trim())));
    $$('[data-show]', pane).forEach((b) => b.addEventListener('click', () => post({ type: 'scrollTo', key: b.dataset.show })));
    $$('[data-reset]', pane).forEach((b) => b.addEventListener('click', () => { delete draft.images[b.dataset.reset]; persist(); reloadPreview(0); renderPane(); }));
  }

  function listControls(i, n) {
    return `<span><button class="link link--muted" type="button" data-up="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button><button class="link link--muted" type="button" data-down="${i}" ${i === n - 1 ? 'disabled' : ''} aria-label="Move down">↓</button><button class="link" type="button" data-del="${i}">Remove</button></span>`;
  }
  function bindList(arr, rerender) {
    $$('[data-up]', pane).forEach((b) => b.addEventListener('click', () => { const i = +b.dataset.up; [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; persist(); reloadPreview(); rerender(); }));
    $$('[data-down]', pane).forEach((b) => b.addEventListener('click', () => { const i = +b.dataset.down; [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; persist(); reloadPreview(); rerender(); }));
    $$('[data-del]', pane).forEach((b) => b.addEventListener('click', () => { if (!confirm('Remove this item?')) return; arr.splice(+b.dataset.del, 1); persist(); reloadPreview(); rerender(); }));
  }
  const bindFields = (arr) => $$('[data-f]', pane).forEach((el) => el.addEventListener('input', () => {
    const [i, f] = el.dataset.f.split(':'); let v = el.value;
    if (f === 'value') v = v.trim() === '' ? null : (/^-?\d+(\.\d+)?$/.test(v.trim()) ? Number(v.trim()) : v);
    arr[+i][f] = v; persist(); reloadPreview(900);
  }));

  function paneTestimonials() {
    const arr = list('testimonials');
    const ph = cfg('showPlaceholders');
    pane.innerHTML = `<h2>Testimonials</h2><p class="lead">Only publish real, approved feedback.</p>
      ${arr.length ? arr.map((t, i) => `<div class="item"><div class="item__head"><b>Testimonial ${i + 1}</b>${listControls(i, arr.length)}</div>
        <label class="field"><span>Quote</span><textarea rows="3" data-f="${i}:quote">${esc(t.quote)}</textarea></label>
        <div class="row"><label class="field"><span>Name</span><input data-f="${i}:name" value="${esc(t.name)}" /></label><label class="field"><span>Role</span><input data-f="${i}:role" value="${esc(t.role)}" /></label></div>
        <label class="field"><span>Organisation</span><input data-f="${i}:organisation" value="${esc(t.organisation)}" /></label>
        <div class="photo photo--round">${t.photo ? `<img src="${esc(src(t.photo))}" alt="" />` : '<img alt="" />'}<span style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn--ghost btn--sm" type="button" data-photo="${i}">${t.photo ? 'Change photo' : 'Add photo'}</button>${t.photo ? `<button class="link" type="button" data-nophoto="${i}">Remove photo</button>` : ''}</span></div></div>`).join('')
        : '<p class="empty">No testimonials yet.</p>'}
      <button class="btn btn--red" type="button" id="add">+ Add testimonial</button>
      <label class="check"><input type="checkbox" id="ph" ${ph ? 'checked' : ''} /><span>While there are no testimonials, show placeholder cards. Untick to hide the feedback section until real ones are added.</span></label>`;
    bindList(arr, paneTestimonials); bindFields(arr);
    $('#add').addEventListener('click', () => { arr.push({ quote: '', name: '', role: '', organisation: '', photo: '' }); persist(); paneTestimonials(); $$('textarea', pane).pop().focus(); });
    $$('[data-photo]', pane).forEach((b) => b.addEventListener('click', () => pickFile((url) => { arr[+b.dataset.photo].photo = url; persist(); reloadPreview(); paneTestimonials(); }, 600)));
    $$('[data-nophoto]', pane).forEach((b) => b.addEventListener('click', () => { arr[+b.dataset.nophoto].photo = ''; persist(); reloadPreview(); paneTestimonials(); }));
    $('#ph').addEventListener('change', (e) => setCfg('showPlaceholders', e.target.checked));
  }

  function paneFigures() {
    const arr = list('metrics');
    pane.innerHTML = `<h2>Figures</h2><p class="lead">Shown in “Built around measurable performance”. Numbers count up on screen; leave the value empty to show a placeholder.</p>
      ${arr.map((m, i) => `<div class="item"><div class="item__head"><b>Figure ${i + 1}</b>${listControls(i, arr.length)}</div>
        <label class="field"><span>Label</span><input data-f="${i}:label" value="${esc(m.label)}" /></label>
        <div class="row"><label class="field"><span>Value</span><input data-f="${i}:value" value="${esc(m.value == null ? '' : m.value)}" inputmode="decimal" /></label><label class="field"><span>Unit (e.g. % or s)</span><input data-f="${i}:suffix" value="${esc(m.suffix)}" /></label></div>
        <label class="field"><span>Small line underneath</span><input data-f="${i}:description" value="${esc(m.description)}" /></label></div>`).join('')}
      <button class="btn btn--red" type="button" id="add">+ Add figure</button>`;
    bindList(arr, paneFigures); bindFields(arr);
    $('#add').addEventListener('click', () => { arr.push({ key: 'm' + Date.now(), label: 'New figure', value: null, suffix: '', description: '', placeholder: '[VALUE]' }); persist(); reloadPreview(); paneFigures(); });
  }

  function paneCards() {
    const ben = contentList('benefits'), ops = contentList('operations'), why = contentList('why');
    const bind = (arr, name) => $$(`[data-c^="${name}:"]`, pane).forEach((el) => el.addEventListener('input', () => { const [, i, f] = el.dataset.c.split(':'); arr[+i][f] = el.value; persist(); reloadPreview(900); }));
    pane.innerHTML = `<h2>Cards</h2><p class="lead">The card lists in Benefits, Operations and Why Malus Lens.</p>
      <p class="group">Benefits</p>${ben.map((b, i) => `<div class="item"><div class="item__head"><b>Benefit ${i + 1}</b></div>
        <label class="field"><span>Title</span><input data-c="ben:${i}:title" value="${esc(b.title)}" /></label><label class="field"><span>Text</span><textarea rows="2" data-c="ben:${i}:text">${esc(b.text)}</textarea></label></div>`).join('')}
      <p class="group">Operations (photo cards)</p>${ops.map((o, i) => `<div class="item"><div class="item__head"><b>Card ${i + 1}</b></div>
        <div class="photo"><img src="${esc(src(o.img))}" alt="" /><div style="display:grid;gap:8px"><button class="btn btn--ghost btn--sm" type="button" data-opsimg="${i}">Replace photo</button><label class="field"><span>Description (alt text)</span><input data-c="ops:${i}:alt" value="${esc(o.alt)}" /></label></div></div>
        <label class="field"><span>Title</span><input data-c="ops:${i}:title" value="${esc(o.title)}" /></label><label class="field"><span>Text</span><textarea rows="2" data-c="ops:${i}:text">${esc(o.text)}</textarea></label></div>`).join('')}
      <p class="group">Why Malus Lens</p>${why.map((w, i) => `<div class="item"><div class="item__head"><b>Point ${i + 1}</b></div>
        <label class="field"><span>Title</span><input data-c="why:${i}:title" value="${esc(w.title)}" /></label><label class="field"><span>Text</span><textarea rows="2" data-c="why:${i}:text">${esc(w.text)}</textarea></label></div>`).join('')}
      <button class="btn btn--ghost" type="button" id="cards-reset">Reset all cards to the original text</button>`;
    bind(ben, 'ben'); bind(ops, 'ops'); bind(why, 'why');
    $$('[data-opsimg]', pane).forEach((b) => b.addEventListener('click', () => pickFile((url) => { ops[+b.dataset.opsimg].img = url; persist(); reloadPreview(); paneCards(); })));
    $('#cards-reset').addEventListener('click', () => { if (!confirm('Reset all cards to the original text and photos?')) return; draft.content = {}; persist(); reloadPreview(0); paneCards(); });
  }

  function paneContact() {
    const c = cfg('contact') || {};
    pane.innerHTML = `<h2>Contact &amp; links</h2>
      <label class="field"><span>Email</span><input id="c-email" type="email" value="${esc(c.email)}" /></label>
      <label class="field"><span>Phone</span><input id="c-phone" type="tel" value="${esc(c.phone)}" /></label>
      <label class="field"><span>“Use Malus Lens” button link</span><input id="c-app" type="url" placeholder="https://…" value="${esc(cfg('appUrl'))}" /></label>
      <label class="field"><span>External booking page (optional)</span><input id="c-book" type="url" placeholder="Leave empty to use the built-in Google Meet booking" value="${esc(cfg('bookingUrl'))}" /></label>
      <p class="note">Contact details appear in the Contact section, the booking dialog and the footer. The Privacy Policy and Terms pages list the email and phone in their own text.</p>`;
    const save = () => {
      draft.config.contact = { ...(cfg('contact') || {}), email: $('#c-email').value.trim(), phone: $('#c-phone').value.trim() };
      draft.config.appUrl = $('#c-app').value.trim(); draft.config.bookingUrl = $('#c-book').value.trim();
      persist(); reloadPreview(900);
    };
    $$('input', pane).forEach((i) => i.addEventListener('input', save));
  }

  /* ---------- boot ---------- */
  if (getSession()) fn({ action: 'me' }).then(start, () => showLogin()); else showLogin();
})();
