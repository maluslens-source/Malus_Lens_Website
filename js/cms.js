/*
 * Malus Lens — site content layer.
 * Loads the edits saved from /admin (Supabase table ml_site_content) and applies them
 * before main.js renders: text blocks [data-e], photos [data-ei], config (contact,
 * figures, testimonials …) and the card lists in MALUS_CONTENT.
 * Inside the admin preview (?edit=1 in an iframe) it also turns on click-to-edit.
 */
(() => {
  const SB_URL = 'https://hqatexqeufohkisimqvq.supabase.co';
  const SB_KEY = 'sb_publishable_HMxbfqiTG7fYKWfajXwW3Q_xtoJiPBR';
  const CACHE = 'ml_site_cache_v1', DRAFT = 'ml_draft';
  const root = document.documentElement;
  const EDIT = /[?&]edit=1/.test(location.search) && window.parent !== window;
  const C = window.MALUS_CONFIG, T = window.MALUS_CONTENT;

  /* ---------- sanitising: only light inline formatting survives ---------- */
  const ALLOWED = { EM: 1, I: 1, B: 1, STRONG: 1, BR: 1 };
  function clean(html) {
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) return;
        if (n.nodeType !== 1) { n.remove(); return; }
        walk(n);
        // <em>/<i> (and span.serif) are the red italic accent; b/strong stay bold
        const accent = n.tagName === 'EM' || n.tagName === 'I' || (n.tagName === 'SPAN' && n.classList.contains('serif'));
        if (ALLOWED[n.tagName] || accent) {
          const r = document.createElement(accent ? 'em' : n.tagName.toLowerCase());
          if (accent) r.className = 'serif';
          r.append(...n.childNodes); n.replaceWith(r);
        } else n.replaceWith(...n.childNodes);
      });
    };
    const box = doc.body.firstChild; walk(box);
    return box.innerHTML.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  }
  const okUrl = (u) => typeof u === 'string' && (/^https:\/\/[^\s"'<>]+$/.test(u) || /^images\/[\w./-]+$/.test(u));

  /* ---------- defaults (as shipped in the HTML / config) ---------- */
  const defaults = { text: {}, images: {} };
  document.querySelectorAll('[data-e]').forEach((el) => { defaults.text[el.dataset.e] = clean(el.innerHTML); });
  document.querySelectorAll('img[data-ei]').forEach((el) => { defaults.images[el.dataset.ei] = { src: el.getAttribute('src'), alt: el.getAttribute('alt') || '' }; });
  defaults.config = JSON.parse(JSON.stringify({ contact: C.contact, appUrl: C.appUrl, bookingUrl: C.bookingUrl, demoUrl: C.demoUrl, metrics: C.metrics, testimonials: C.testimonials, showPlaceholders: C.showPlaceholders }));
  defaults.content = JSON.parse(JSON.stringify(T));

  /* ---------- apply ---------- */
  function apply(d) {
    if (!d || typeof d !== 'object') return;
    const text = d.text || {}, images = d.images || {}, cfg = d.config || {}, content = d.content || {};
    document.querySelectorAll('[data-e]').forEach((el) => { if (typeof text[el.dataset.e] === 'string') el.innerHTML = clean(text[el.dataset.e]); });
    // values strip repeats its words for the loop: keep the copies in step
    const strip = document.querySelector('.strip__track ul');
    if (strip) { const items = [...strip.children], src = items.filter((li) => li.dataset.e), dup = items.filter((li) => !li.dataset.e); dup.forEach((li, i) => { if (src[i]) li.innerHTML = src[i].innerHTML; }); }
    document.querySelectorAll('img[data-ei]').forEach((el) => {
      const v = images[el.dataset.ei]; if (!v) return;
      const src = typeof v === 'string' ? v : v.src, alt = typeof v === 'object' ? v.alt : null;
      if (okUrl(src)) { el.src = src; el.removeAttribute('width'); el.removeAttribute('height'); }
      if (typeof alt === 'string' && alt) el.alt = alt;
    });
    if (cfg.contact && typeof cfg.contact === 'object') C.contact = { ...C.contact, ...cfg.contact };
    ['appUrl', 'bookingUrl', 'demoUrl'].forEach((k) => { if (typeof cfg[k] === 'string') C[k] = cfg[k]; });
    if (Array.isArray(cfg.metrics)) C.metrics = cfg.metrics;
    if (Array.isArray(cfg.testimonials)) C.testimonials = cfg.testimonials.filter((t) => t && t.quote).map((t) => ({ ...t, photo: okUrl(t.photo) ? t.photo : '' }));
    if (typeof cfg.showPlaceholders === 'boolean') C.showPlaceholders = cfg.showPlaceholders;
    ['benefits', 'operations', 'why'].forEach((k) => {
      if (Array.isArray(content[k]) && content[k].length) T[k] = content[k].map((x, i) => ({ ...(T[k][i] || {}), ...x, ...(k === 'operations' && !okUrl(x.img) ? { img: (T[k][i] || {}).img } : {}) }));
    });
  }

  /* ---------- load: draft (admin preview) → cache → network ---------- */
  let done;
  const ready = new Promise((r) => { done = r; });
  const finish = () => { root.classList.remove('cms-wait'); done(); };
  const fetchLive = () => fetch(`${SB_URL}/rest/v1/ml_site_content?id=eq.site&select=data,updated_at`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }, cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status))).then((rows) => (rows[0] && rows[0].data) || {});

  if (EDIT) {
    let draft = null; try { draft = JSON.parse(sessionStorage.getItem(DRAFT) || 'null'); } catch {}
    if (draft) { apply(draft); finish(); }
    else fetchLive().then(apply, () => {}).finally(finish);
  } else {
    let cached = null; try { cached = JSON.parse(localStorage.getItem(CACHE) || 'null'); } catch {}
    const save = (d) => { try { localStorage.setItem(CACHE, JSON.stringify(d)); } catch {} };
    if (cached) {
      apply(cached); finish();
      fetchLive().then(save, () => {}); // next visit picks up newer edits
    } else {
      const t = setTimeout(finish, 2500);
      fetchLive().then((d) => { clearTimeout(t); save(d); apply(d); finish(); }, () => { clearTimeout(t); finish(); });
    }
  }

  window.MalusCMS = { ready, defaults, clean, edit: EDIT };

  /* ---------- admin preview: click-to-edit ---------- */
  if (!EDIT) return;
  const post = (m) => window.parent.postMessage({ ml: 1, ...m }, location.origin);
  const LISTS = { 'benefits-grid': 'cards', 'ops-grid': 'cards', 'why-grid': 'cards', 'voices-grid': 'testimonials', metrics: 'figures', 'contact-list': 'contact' };
  ready.then(() => setTimeout(() => {
    root.classList.add('cms-edit');
    document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('in'));
    document.querySelectorAll('[data-e]').forEach((el) => {
      el.contentEditable = 'true'; el.spellcheck = true;
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); if (e.shiftKey && /^(P|LI|SMALL|FIGCAPTION)$/.test(el.tagName)) document.execCommand('insertLineBreak'); } });
      el.addEventListener('paste', (e) => { e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain')); });
      el.addEventListener('input', () => post({ type: 'text', key: el.dataset.e, html: clean(el.innerHTML) }));
      el.addEventListener('focus', () => post({ type: 'focus', key: el.dataset.e }));
    });
    document.querySelectorAll('img[data-ei]').forEach((img) => {
      img.closest('figure, .info-card, div')?.classList.add('cms-img');
      img.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); post({ type: 'pickImage', key: img.dataset.ei }); });
    });
    Object.entries(LISTS).forEach(([id, panel]) => {
      const el = document.getElementById(id); if (!el) return;
      el.classList.add('cms-list'); el.dataset.cmsPanel = panel;
      el.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); post({ type: 'openPanel', panel }); }, true);
    });
    // no navigation / dialogs while editing
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a, button');
      if (a && !a.closest('[data-e]')) { e.preventDefault(); e.stopPropagation(); }
    }, true);
    const sendInventory = () => {
      const current = { text: {}, images: {} };
      document.querySelectorAll('[data-e]').forEach((el) => { current.text[el.dataset.e] = clean(el.innerHTML); });
      document.querySelectorAll('img[data-ei]').forEach((el) => { current.images[el.dataset.ei] = { src: el.getAttribute('src'), alt: el.alt }; });
      post({ type: 'inventory', defaults, current });
    };
    sendInventory();
    const y = +sessionStorage.getItem('ml_edit_y') || 0; if (y) window.scrollTo(0, y);
  }, 60));
  addEventListener('pagehide', () => { try { sessionStorage.setItem('ml_edit_y', String(window.scrollY)); } catch {} });
  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin || !e.data || !e.data.ml) return;
    const m = e.data;
    if (m.type === 'setImage') { const img = document.querySelector(`img[data-ei="${CSS.escape(m.key)}"]`); if (img && okUrl(m.url)) { img.src = m.url; img.removeAttribute('width'); img.removeAttribute('height'); } }
    if (m.type === 'setText') { const el = document.querySelector(`[data-e="${CSS.escape(m.key)}"]`); if (el && document.activeElement !== el) el.innerHTML = clean(m.html); }
    if (m.type === 'scrollTo') { const el = document.querySelector(`[data-e="${CSS.escape(m.key)}"], img[data-ei="${CSS.escape(m.key)}"]`); if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('cms-flash'); setTimeout(() => el.classList.remove('cms-flash'), 1400); } }
  });
})();
