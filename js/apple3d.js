/*
 * Malus Lens — 3D logo mark (apple + lens), built procedurally with three.js.
 * The canvas lives inside the hero slot and scrolls with the page natively (no
 * per-frame repositioning, so it never lags behind the scroll). Other slots show the flat icon.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const root = document.documentElement;
const canvas = document.getElementById('apple-canvas');
const slots = [document.querySelector('[data-apple-slot="hero"]')];
if (slots[0] && canvas) slots[0].appendChild(canvas);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches && !root.classList.contains('force-motion');

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mix = (a, b, t) => a + (b - a) * t;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = (t) => { const c1 = 1.6, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  if (!renderer.getContext()) throw new Error('no gl');
} catch (e) {
  root.classList.add('no-webgl');
}

if (renderer) build();

function build() {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.85;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 12);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xe9e4de, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(4, 6, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffe2d6, 1.6); rim.position.set(-5, 3, -5); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffffff, 0.5); fill.position.set(-4, -2, 5); scene.add(fill);

  /* ---------- Apple body ---------- */
  const PROFILE = [
    [0.001, -0.80], [0.12, -0.86], [0.32, -0.90], [0.56, -0.84], [0.78, -0.66], [0.94, -0.37],
    [1.02, -0.03], [1.02, 0.30], [0.94, 0.55], [0.78, 0.74], [0.56, 0.84], [0.36, 0.83], [0.19, 0.74], [0.07, 0.62], [0.001, 0.58],
  ];
  const prof = new THREE.CatmullRomCurve3(PROFILE.map(([r, y]) => new THREE.Vector3(r, y, 0)), false, 'centripetal')
    .getPoints(160).map((p) => new THREE.Vector2(Math.max(p.x, 0.0005), p.y));

  // outer radius at height y (side of the apple, ignoring dimples)
  const side = prof.filter((p) => p.x > 0.45);
  const rAt = (y) => {
    for (let i = 0; i < side.length - 1; i++) {
      const a = side[i], b = side[i + 1];
      if ((y - a.y) * (y - b.y) <= 0 && a.y !== b.y) return mix(a.x, b.x, (y - a.y) / (b.y - a.y));
    }
    return 0.4;
  };
  const deform = (pos) => {
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const th = Math.atan2(z, x);
      const lobe = 1 + 0.028 * Math.cos(5 * th) * clamp((-y - 0.1) / 0.7) + 0.012 * Math.cos(th - 0.8);
      pos.setXYZ(i, x * lobe, y, z * lobe);
    }
  };
  const fixSeam = (geo, segs, n) => { // average normals across the lathe seam
    const nr = geo.attributes.normal;
    for (let j = 0; j < n; j++) {
      const a = j, b = segs * n + j;
      const v = new THREE.Vector3(nr.getX(a) + nr.getX(b), nr.getY(a) + nr.getY(b), nr.getZ(a) + nr.getZ(b)).normalize();
      nr.setXYZ(a, v.x, v.y, v.z); nr.setXYZ(b, v.x, v.y, v.z);
    }
  };

  const SEG = 128;
  const bodyGeo = new THREE.LatheGeometry(prof, SEG);
  deform(bodyGeo.attributes.position);
  bodyGeo.computeVertexNormals(); fixSeam(bodyGeo, SEG, prof.length);

  const skin = skinTexture(); skin.colorSpace = THREE.SRGBColorSpace; skin.anisotropy = 4;
  const appleMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, map: skin, roughness: 0.34, clearcoat: 0.7, clearcoatRoughness: 0.22,
    sheen: 0.35, sheenRoughness: 0.5, sheenColor: new THREE.Color('#ff9a8f'),
  });
  const body = new THREE.Mesh(bodyGeo, appleMat);

  /* ---------- White band (from the logo) ---------- */
  const BAND = [-0.075, 0.075];
  const bandPts = [];
  for (let k = 0; k <= 12; k++) { const y = mix(BAND[0], BAND[1], k / 12); bandPts.push(new THREE.Vector2(rAt(y) * 1.007, y)); }
  const bandGeo = new THREE.LatheGeometry(bandPts, SEG);
  deform(bandGeo.attributes.position); bandGeo.computeVertexNormals(); fixSeam(bandGeo, SEG, bandPts.length);
  const whiteMat = new THREE.MeshPhysicalMaterial({ color: 0xf7f7f5, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.12 });
  const band = new THREE.Mesh(bandGeo, whiteMat);

  /* ---------- Lens (built Y-up, then turned to face +Z) ---------- */
  const lens = new THREE.Group();
  const barrelPts = [[0.585, -0.5], [0.585, 0.0], [0.583, 0.05], [0.572, 0.083], [0.552, 0.1], [0.44, 0.1], [0.425, 0.093], [0.415, 0.075], [0.415, -0.05]]
    .map(([r, h]) => new THREE.Vector2(r, h));
  const barrel = new THREE.Mesh(new THREE.LatheGeometry(barrelPts, 96), whiteMat);
  lens.add(barrel);

  const engr = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.0045, 8, 120), new THREE.MeshStandardMaterial({ color: 0xc9ccd1, roughness: 0.5 }));
  engr.rotation.x = Math.PI / 2; engr.position.y = 0.1; lens.add(engr);

  const DOME_A = 0.415, DOME_H = 0.075, DOME_BASE = 0.025;
  const R = (DOME_A * DOME_A + DOME_H * DOME_H) / (2 * DOME_H);
  const domeCY = DOME_BASE + DOME_H - R;
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x07080b, roughness: 0.05, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.8 });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 24, 0, Math.PI * 2, 0, Math.asin(DOME_A / R)), glassMat);
  dome.position.y = domeCY; lens.add(dome);

  // inner aperture rings + red "active" ring sit just above the glass
  const ringOnDome = (r0, r1, mat) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(R + 0.003, 96, 1, 0, Math.PI * 2, Math.asin(r0 / R), Math.asin(r1 / R) - Math.asin(r0 / R)), mat);
    m.position.y = domeCY; lens.add(m); return m;
  };
  ringOnDome(0.335, 0.345, new THREE.MeshBasicMaterial({ color: 0x1d2330, transparent: true, opacity: 0.9 }));
  const irisMat = new THREE.MeshBasicMaterial({ color: 0xe53935, transparent: true, opacity: 0, depthWrite: false });
  ringOnDome(0.18, 0.205, irisMat);
  const iris2Mat = new THREE.MeshBasicMaterial({ color: 0xe53935, transparent: true, opacity: 0, depthWrite: false });
  ringOnDome(0.26, 0.268, iris2Mat);

  // the logo's catch-light (upper right of the lens)
  const cl = new THREE.Mesh(new THREE.SphereGeometry(0.068, 24, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  { const r = 0.19, lx = r * 0.72, lz = -r * 0.70; const ly = domeCY + Math.sqrt(R * R - (lx * lx + lz * lz));
    cl.position.set(lx, ly + 0.004, lz);
    cl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(lx, ly - domeCY, lz).normalize());
    cl.scale.set(1, 0.18, 1); }
  lens.add(cl);

  lens.rotation.x = Math.PI / 2;
  // Sit the lens far enough forward that the dark glass covers the whole opening:
  // the apple's shoulders bulge above the middle, so find the furthest-forward skin
  // inside the ring and keep the glass rim in front of it (no red skin inside the white ring).
  let skinZ = 0;
  { const p = bodyGeo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (z > 0 && x * x + y * y < 0.43 * 0.43 && z > skinZ) skinZ = z; } }
  const LENS_Z = Math.max(rAt(0) - 0.065, skinZ - DOME_BASE + 0.012);
  lens.position.z = LENS_Z;

  /* ---------- Stem & leaf (logo green) ---------- */
  const green = new THREE.MeshPhysicalMaterial({ color: '#2E7D32', roughness: 0.45, clearcoat: 0.4, clearcoatRoughness: 0.4, sheen: 0.3, sheenColor: new THREE.Color('#9be7a0') });
  const stemCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.55, 0), new THREE.Vector3(-0.01, 0.82, 0), new THREE.Vector3(-0.06, 1.06, 0.02), new THREE.Vector3(-0.15, 1.22, 0.04)]);
  const stem = new THREE.Group();
  stem.add(new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 40, 0.043, 14, false), green));
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.043, 16, 12), green); tip.position.copy(stemCurve.getPoint(1)); stem.add(tip);

  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0);
  leafShape.bezierCurveTo(0.14, 0.24, 0.52, 0.27, 0.76, 0.02);
  leafShape.bezierCurveTo(0.52, -0.15, 0.18, -0.13, 0, 0);
  const leafGeo = new THREE.ExtrudeGeometry(leafShape, { depth: 0.01, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 32 });
  leafGeo.translate(0, 0, -0.005);
  { const p = leafGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, p.getZ(i) + 0.22 * x * x - 0.08 * y * y); } leafGeo.computeVertexNormals(); }
  const leaf = new THREE.Mesh(leafGeo, green);
  const rib = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([0.03, 0.2, 0.4, 0.6, 0.7].map((x) => new THREE.Vector3(x, 0.03 * Math.sin(x * 3), 0.22 * x * x + 0.018))), 24, 0.006, 6), new THREE.MeshStandardMaterial({ color: '#1b5e20', roughness: 0.6 }));
  leaf.add(rib);
  const leafPivot = new THREE.Group();
  leafPivot.position.set(0.0, 0.86, 0.0);
  leafPivot.rotation.set(0, -0.35, 0.62);
  leaf.scale.setScalar(0.92);
  leafPivot.add(leaf);

  /* ---------- Assemble ---------- */
  const apple = new THREE.Group();        // spins
  apple.add(body, band, lens, stem, leafPivot);
  apple.position.y = -0.12;
  const tilt = new THREE.Group(); tilt.add(apple); // x-tilt
  const holder = new THREE.Group(); holder.add(tilt); // position + scale per slot
  scene.add(holder);

  // contact shadow
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.8), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, opacity: 0.55 }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -1.03; holder.add(shadow);

  // scan ring + faint plane
  const scan = new THREE.Group();
  const scanRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.009, 8, 180), new THREE.MeshBasicMaterial({ color: 0xe53935, transparent: true, opacity: 0, depthWrite: false }));
  scanRing.rotation.x = Math.PI / 2;
  const scanDisc = new THREE.Mesh(new THREE.CircleGeometry(1, 96), new THREE.MeshBasicMaterial({ map: discTexture(), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  scanDisc.rotation.x = -Math.PI / 2;
  scan.add(scanRing, scanDisc); apple.add(scan);

  /* ---------- Layout / slots ---------- */
  let W = 0, H = 0, wpp = 1;
  const resize = () => {
    const r = slots[0].getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    wpp = (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z) / H;
    dirty = true;
  };
  let dirty = true;
  addEventListener('resize', resize);
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(slots[0]);
  resize();

  // only render while the hero is on screen
  let onScreen = true;
  new IntersectionObserver((es) => { onScreen = es[0].isIntersecting; dirty = true; }).observe(slots[0]);

  const mode = 'hero';
  const cur = { x: 0, y: 0, size: 0 };

  /* ---------- Interaction ---------- */
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', (e) => { mouse.tx = (e.clientX / innerWidth) * 2 - 1; mouse.ty = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });
  const heroSlot = document.querySelector('[data-apple-slot="hero"]');
  const viewfinder = document.querySelector('.viewfinder');
  let drag = 0, dragV = 0, dragging = false, lastX = 0;
  const vfOn = (on) => { if (viewfinder) viewfinder.classList.toggle('is-focus', on); };
  heroSlot.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; heroSlot.setPointerCapture(e.pointerId); vfOn(true); });
  heroSlot.addEventListener('pointermove', (e) => { if (!dragging) return; const dx = e.clientX - lastX; lastX = e.clientX; drag += dx * 0.012; dragV = dx * 0.012; });
  const endDrag = () => { dragging = false; vfOn(false); };
  heroSlot.addEventListener('pointerup', endDrag); heroSlot.addEventListener('pointercancel', endDrag);
  heroSlot.addEventListener('pointerenter', () => vfOn(true));
  heroSlot.addEventListener('pointerleave', () => { if (!dragging) vfOn(false); });

  // UI hooks
  const hudRot = document.getElementById('hud-rot');
  const scanPct = document.getElementById('scan-pct'), scanFill = document.getElementById('scan-fill');
  const scanLabel = scanPct && scanPct.previousElementSibling;
  const flowSpans = [...document.querySelectorAll('.hud-flow span')];

  /* ---------- Loop ---------- */
  const st = { rotY: -0.4, rotX: 0.1 };
  let spinAcc = 0, intro = reduced ? 1 : 0, last = performance.now(), time = 0, cleared = false, uiT = 0;
  const DUR = 1.15;

  const frame = (now) => {
    requestAnimationFrame(frame);
    if (document.hidden || root.classList.contains('intro-on')) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt;

    if (!onScreen) return;
    cur.x = W / 2; cur.y = H / 2; cur.size = Math.min(W, H);
    const screenY = cur.y;

    // intro (hero only)
    if (intro < 1) intro = Math.min(1, intro + dt / 2.1);
    const iScale = easeOutBack(clamp(intro / 0.5));
    const iSpin = (1 - easeOutCubic(clamp(intro / 0.85))) * -3.4;
    const iLens = 1 - easeOutBack(clamp((intro - 0.38) / 0.32));
    const iLeaf = easeOutBack(clamp((intro - 0.55) / 0.3));
    const iCl = easeOutBack(clamp((intro - 0.78) / 0.2));

    // position & scale from slot
    const size = cur.size * (mode === 'hero' ? 0.98 : mode === 'scan' ? 0.78 : 0.9);
    const s = (size * wpp) / 2.45 * Math.max(0.0001, iScale);
    holder.position.set((cur.x - W / 2) * wpp, -(screenY - H / 2) * wpp, 0);
    holder.scale.setScalar(s);

    // mode targets
    mouse.x += (mouse.tx - mouse.x) * (1 - Math.exp(-dt * 4));
    mouse.y += (mouse.ty - mouse.y) * (1 - Math.exp(-dt * 4));
    if (!dragging) { drag += dragV; dragV *= Math.pow(0.04, dt); if (Math.abs(dragV) < 0.0005) drag *= Math.pow(0.35, dt); }
    let tY = 0, tX = 0.1, bob = 0;
    const sway = reduced ? 0 : 1;
    if (mode === 'hero') { tY = (0.42 * Math.sin(time * 0.45) * sway) + mouse.x * 0.55 + drag + iSpin; tX = 0.1 + mouse.y * 0.18; bob = Math.sin(time * 1.1) * 0.035 * sway; }
    else if (mode === 'scan') { tY = 0.18 * Math.sin(time * 0.6) * sway; tX = 0.06; }
    else if (mode === 'spin') { spinAcc += dt * 0.55 * sway; tY = spinAcc; tX = 0.16; bob = Math.sin(time * 0.9) * 0.03 * sway; }
    else { tY = -0.38 + 0.22 * Math.sin(time * 0.7) * sway; tX = 0.12; }
    const k = 1 - Math.exp(-dt * (dragging ? 14 : 3.2));
    st.rotY += (tY - st.rotY) * k; st.rotX += (tX - st.rotX) * k;
    apple.rotation.y = st.rotY; tilt.rotation.x = st.rotX;
    tilt.position.y = bob;
    shadow.scale.setScalar(1 - bob * 2);
    shadow.material.opacity = mode === 'cta' ? 0 : 0.5 * iScale;

    lens.position.z = LENS_Z - 0.3 * iLens;
    leafPivot.scale.setScalar(Math.max(0.0001, iLeaf));
    cl.visible = iCl > 0.01; cl.scale.set(iCl, 0.18 * iCl, iCl);

    // lens / scan effects
    let irisO = 0, iris2O = 0, ringO = 0, discO = 0, ringY = 0;
    if (mode === 'scan' && !reduced) {
      const P = 3.6, p = (time % P) / P;
      const sweep = clamp(p / 0.72);
      ringY = mix(1.0, -0.86, easeInOut(sweep));
      ringO = p < 0.72 ? Math.sin(sweep * Math.PI) * 0.95 : 0;
      discO = ringO * 0.55;
      const done = p >= 0.72 ? Math.sin(((p - 0.72) / 0.28) * Math.PI) : 0;
      irisO = 0.35 + done * 0.65; iris2O = 0.2 + done * 0.5;
      uiT += dt;
      if (uiT > 0.05 && scanPct) {
        uiT = 0; const pct = Math.round(sweep * 100);
        scanPct.textContent = pct + '%'; scanFill.style.width = pct + '%';
        scanLabel.textContent = sweep >= 1 ? 'Assessment complete' : 'Assessing sample';
      }
    } else if (mode === 'scan') {
      irisO = 0.6;
      if (scanPct && scanPct.textContent !== '100%') { scanPct.textContent = '100%'; scanFill.style.width = '100%'; scanLabel.textContent = 'Assessment complete'; }
    } else {
      const pulse = Math.pow(Math.max(0, Math.sin(time * 1.3)), 12);
      irisO = 0.12 + pulse * 0.6; iris2O = pulse * 0.4;
    }
    irisMat.opacity = irisO * iCl; iris2Mat.opacity = iris2O * iCl;
    scanRing.material.opacity = ringO; scanDisc.material.opacity = discO;
    const rr = (Math.abs(ringY) < 0.86 ? rAt(ringY) : 0.3) * 1.06;
    scan.position.y = ringY; scanRing.scale.set(rr, rr, rr); scanDisc.scale.set(rr, rr, rr);
    scan.rotation.y = -st.rotY; // keep scan plane stable while the apple sways

    // hero HUD
    if (mode === 'hero' && hudRot && (time * 10 | 0) % 2 === 0) {
      const deg = ((THREE.MathUtils.radToDeg(st.rotY) % 360) + 360) % 360;
      hudRot.textContent = String(Math.round(deg)).padStart(3, '0') + '°';
      const f = Math.floor(time / 1.1) % 3; flowSpans.forEach((sp, i) => sp.classList.toggle('on', i === f));
    }

    renderer.render(scene, camera);
  };
  addEventListener('intro:done', () => { if (!reduced) intro = 0; dirty = true; });
  requestAnimationFrame(frame);
}

/* ---------- Procedural textures ---------- */
function skinTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#C8151C'; g.fillRect(0, 0, 1024, 512);
  // deeper red towards the shoulders, a touch lighter at the base
  const v = g.createLinearGradient(0, 0, 0, 512);
  v.addColorStop(0, 'rgba(110,0,10,.35)'); v.addColorStop(0.25, 'rgba(110,0,10,0)'); v.addColorStop(0.85, 'rgba(255,90,70,0)'); v.addColorStop(1, 'rgba(255,120,90,.18)');
  g.fillStyle = v; g.fillRect(0, 0, 1024, 512);
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 320; i++) {
    const x = rnd() * 1024, w = 1 + rnd() * 6, dark = rnd() < 0.6;
    g.fillStyle = dark ? `rgba(105,0,12,${0.04 + rnd() * 0.1})` : `rgba(240,70,55,${0.04 + rnd() * 0.08})`;
    g.fillRect(x, rnd() * 60, w, 512);
  }
  for (let i = 0; i < 1600; i++) {
    g.fillStyle = `rgba(255,214,190,${0.12 + rnd() * 0.25})`;
    g.beginPath(); g.arc(rnd() * 1024, rnd() * 512, 0.5 + rnd() * 1.1, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; return t;
}
function shadowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(15,23,42,.55)'); r.addColorStop(0.45, 'rgba(15,23,42,.18)'); r.addColorStop(1, 'rgba(15,23,42,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
function discTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); const r = g.createRadialGradient(64, 64, 20, 64, 64, 64);
  r.addColorStop(0, 'rgba(229,57,53,0)'); r.addColorStop(0.85, 'rgba(229,57,53,.25)'); r.addColorStop(1, 'rgba(229,57,53,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
