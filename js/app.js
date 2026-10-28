// Stage viewer: assembles stand + controller + rig variants, renders V1/V2 through their own bloom composers and
// composites them (single, overlay blend, or draggable split).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { makeRenderer, makeStudio } from './env.js';
import { makeLedStrip, makeLogoBox, tickFx, fxUniforms } from './fx.js?v=5';
import { buildRig, loadScreens, materials as rigMat, AIR, MINI, SHELF_SIDE } from './rig.js?v=5';

const Q = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const canvas = $('view');
const renderer = makeRenderer(canvas, { preserve: Q.has('shot') });
const scene = new THREE.Scene();
const studio = makeStudio(renderer, scene, { bg: 0xcdd8e8 });
const camera = new THREE.PerspectiveCamera(32, 1, 10, 60000);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.minDistance = 60; controls.maxDistance = 9000; controls.maxPolarAngle = Math.PI * 0.495;
controls.screenSpacePanning = true;

const state = {
  tableH: 800, tilt: 20, base: 60, miniLevel: false, hl: false, shelfOp: 1,
  mode: Q.get('mode') || 'a', mix: 0.5, split: +(Q.get('split') || 0.5), swap: false,
  bg: { a: new THREE.Color('#a9c0e0'), b: new THREE.Color('#e2b896') },
  show: { cables: true, tablets: true, mounts: true, led: true, logo: true, floor: true },
};

// ---------------- module loading with fallbacks ----------------
async function tryImport(name) {
  try { return await import('./' + name + '.js?v=' + Date.now()); } catch (e) { console.warn('module ' + name + ' unavailable', e); return null; }
}
const [thorMod, flxMod, conMod] = await Promise.all([tryImport('thor'), tryImport('flx10'), tryImport('connectors')]);

function fallbackThor(opts) {
  const h = opts.height || 800, g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.6, metalness: 0.4 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(995, 20, 450), m); top.position.y = h - 10; top.castShadow = top.receiveShadow = true; g.add(top);
  [-1, 1].forEach((s) => { const l = new THREE.Mesh(new THREE.BoxGeometry(40, h - 20, 40), m); l.position.set(s * 440, (h - 20) / 2, -100); g.add(l); });
  return { group: g, info: { topY: h, w: 995, d: 450, rimH: 0, rimW: 0, frontInnerZ: 225, rearInnerZ: -225, rearOuterZ: -225, apron: { h: 60, rearFaceZ: -225, bottomY: h - 60 }, cutout: { x: 0, z: -175, w: 250, d: 100 } } };
}
function fallbackFlx() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.BoxGeometry(713, 42, 387), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 }));
  b.position.y = 29; b.castShadow = true; g.add(b);
  const P = (id, kind, x, label) => ({ id, kind, label, pos: [x, 25, -193.5], dir: [0, 0, -1] });
  return { group: g, info: { w: 713, d: 387, h: 50, deckY: 50, feet: [], ports: [
    P('mic1', 'xlr_trs_combo_in', -300, 'MIC 1'), P('booth_r', 'trs_jack', -236, 'BOOTH R'), P('booth_l', 'trs_jack', -216, 'BOOTH L'),
    P('master1_r', 'xlr_male_out', -168, 'MASTER 1 R'), P('master1_l', 'xlr_male_out', -138, 'MASTER 1 L'),
    P('master2_r', 'rca', -88, 'MASTER 2 R'), P('master2_l', 'rca', -74, 'MASTER 2 L'),
    P('usb1', 'usb_c', 130, 'USB 1'), P('dc_in', 'dc_in', 250, 'DC IN')] } };
}

// Map the controller's ports to the cable roles we plug in.
function roleOf(p, all) {
  const s = (p.id + ' ' + (p.label || '')).toLowerCase();
  const lr = () => {
    if (/(^|[^a-z])(l|left)([^a-z]|$)/.test(s.replace(/master|mic|booth/g, ''))) return 'l';
    if (/(^|[^a-z])(r|right)([^a-z]|$)/.test(s.replace(/master|mic|booth/g, ''))) return 'r';
    const same = all.filter((q) => q.kind === p.kind && (q.id + q.label).toLowerCase().includes(s.includes('booth') ? 'booth' : 'master'));
    return same.indexOf(p) === 0 ? 'l' : 'r';
  };
  if (p.kind === 'dc_in') return 'dc_in';
  if (p.kind === 'usb_c') return all.filter((q) => q.kind === 'usb_c').indexOf(p) === 0 ? 'usb1' : null;
  if (s.includes('booth')) return 'booth_' + lr();
  if (/mic\s*_?1/.test(s)) return 'mic1';
  if (s.includes('master') && p.kind === 'xlr_male_out') return 'master1_' + lr();
  if (s.includes('master') && p.kind === 'rca') return lr() === 'l' ? 'rca_l' : 'rca_r';
  return null;
}

// ---------------- scene assembly ----------------
const world = new THREE.Group(); scene.add(world);
let thor, flx, rigs = {}, tex, flxInfo, thorInfo;
const fx = {};

async function buildStand() {
  if (thor) world.remove(thor);
  let res = null;
  try { res = thorMod ? await thorMod.build(THREE, { height: state.tableH }) : null; } catch (e) { console.warn('thor build failed', e); }
  if (!res) res = fallbackThor({ height: state.tableH });
  thor = res.group; thorInfo = res.info; world.add(thor);
}
async function buildController() {
  let res = null;
  try { res = flxMod ? await flxMod.build(THREE, {}) : null; } catch (e) { console.warn('flx build failed', e); }
  if (!res) res = fallbackFlx();
  flx = res.group; flxInfo = res.info; world.add(flx);
}
function placeController() {
  // Front face against the inside of the front rim (the DJ's side), centred left-right.
  // The THOR's front/rear frame tubes stand rimH above the panel; the controller's body clears them on its feet,
  // so it sits flush with the table's outer front edge, front feet on the tube (a rimH-thick plate levels the rear feet).
  flx.position.set(0, thorInfo.topY + (thorInfo.rimH || 0), thorInfo.d / 2 - flxInfo.d / 2);
}
// Per-version lighting. V1: the strip runs the full table width on the rear edge band, the logo box hangs directly under it.
// V2: the strip sits near the top of the shelf's rear face (shelf width), the logo box hangs directly under the edge band.
// Both: the box's back face is in the plane of the table's rear edge, its top touching what is above it.
const STRIP_H = 35;
async function buildFx() {
  Object.values(fx).forEach((f) => { world.remove(f.strip); world.remove(f.logo); });
  const ap = thorInfo.apron || { rearFaceZ: thorInfo.rearOuterZ, bottomY: thorInfo.topY - 60, h: 60 };
  const edgeZ = Math.min(ap.rearFaceZ, thorInfo.rearOuterZ) - 0.5;
  const top = thorInfo.topY + (thorInfo.rimH || 0);
  const shelfTop = thorInfo.topY + (flxInfo.deckY || flxInfo.h || 50) + (flx.position.y - thorInfo.topY);
  const spec = {
    a: { width: thorInfo.w, y: top - STRIP_H / 2, logoTop: top - STRIP_H },
    b: { width: flxInfo.w + 2 * SHELF_SIDE, y: shelfTop - 3 - STRIP_H / 2, logoTop: ap.bottomY ?? thorInfo.topY - 52, depth: 10 },
  };
  for (const k of ['a', 'b']) {
    const sp = spec[k];
    const strip = makeLedStrip({ width: sp.width, height: STRIP_H, depth: sp.depth });
    strip.position.set(0, sp.y, edgeZ);
    const logo = fx[k]?.logo || await makeLogoBox({});
    logo.position.set(0, sp.logoTop, edgeZ);
    world.add(strip, logo);
    fx[k] = { strip, logo };
  }
}
function buildRigs() {
  Object.values(rigs).forEach((r) => world.remove(r));
  const fp = flx.position;
  const ports = (flxInfo.ports || []).map((p) => ({ ...p, pos: new THREE.Vector3(p.pos[0] + fp.x, p.pos[1] + fp.y, p.pos[2] + fp.z) }));
  // RCA sockets stand ~8.5 mm proud of the rear face on their collars; the plug seats on the collar tip.
  ports.forEach((p) => { if (p.kind === 'rca') p.pos.z -= 8.5; });
  ports.forEach((p) => { p.role = roleOf(p, ports); p.clear = { xlr_male_out: 13, xlr_trs_combo_in: 16, trs_jack: 10, rca: 8, usb_c: 7, dc_in: 8 }[p.kind] || 9; });
  const base = {
    topY: thorInfo.topY, rearZ: fp.z - flxInfo.d / 2, deckY: flxInfo.deckY || flxInfo.h || 50, flxW: flxInfo.w,
    tableRearInnerZ: thorInfo.rearInnerZ, tableRearOuterZ: thorInfo.rearOuterZ, rimH: thorInfo.rimH || 0,
    cutout: { ...thorInfo.cutout }, ports, plugs: conMod, tex, tilt: state.tilt, base: state.base,
    miniLevel: state.miniLevel, highlight: state.hl, lift: fp.y - thorInfo.topY,
  };
  base.cutout.x = (thorInfo.cutout.x || 0);
  rigs.a = buildRig({ ...base, variant: 'v1' });
  rigs.b = buildRig({ ...base, variant: 'v2', shelfMaterial: shelfMat });
  world.add(rigs.a, rigs.b);
  applyShow(); updateReadout();
}
const shelfMat = rigMat.shelf.clone();

function applyShow() {
  for (const r of Object.values(rigs)) {
    r.traverse((o) => {
      if (o.name === 'cables') o.visible = state.show.cables;
      if (o.name === 'shelf') o.visible = state.show.mounts;
    });
    r.children.forEach((c) => {
      if (c.name === 'cables' || c.name === 'shelf') return;
      const isTablet = c.children.some((k) => k.isMesh && k.material === rigMat.glass);
      c.visible = isTablet ? state.show.tablets : state.show.mounts;
    });
  }
  studio.floor.visible = state.show.floor;
  shelfMat.transparent = state.shelfOp < 1; shelfMat.opacity = state.shelfOp; shelfMat.depthWrite = state.shelfOp >= 1; shelfMat.needsUpdate = true;
}

function updateReadout() {
  const r = rigs.a?.userData.tablets; if (!r) return;
  const rearEdge = thorInfo.rearOuterZ, rearZ = flx.position.z - flxInfo.d / 2, slotOpen = rearZ - (thorInfo.cutout.z - thorInfo.cutout.d / 2);
  const [air, mini] = r;
  $('readout').innerHTML =
    `Air top <b>${(air.topY - thorInfo.topY).toFixed(0)} mm</b> above table, overhang <b>${Math.max(0, rearEdge - air.topZ).toFixed(0)} mm</b><br>` +
    `mini top <b>${(mini.topY - thorInfo.topY).toFixed(0)} mm</b>, overhang <b>${Math.max(0, rearEdge - mini.topZ).toFixed(0)} mm</b><br>` +
    `behind controller <b>${(rearZ - rearEdge).toFixed(0)} mm</b> to edge, <b>${slotOpen.toFixed(0)} mm</b> open slot · side margins <b>${((thorInfo.w - flxInfo.w) / 2).toFixed(0)} mm</b><br>` +
    `cable slot <b>${thorInfo.cutout.w} × ${thorInfo.cutout.d} mm</b> · Air top <b>${(air.topY).toFixed(0)} mm</b> above floor`;
}

// ---------------- composers ----------------
function makeComposer() {
  const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
  const c = new EffectComposer(renderer, rt);
  c.renderToScreen = false;
  c.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.45, 2.2);
  c.addPass(bloom); c.addPass(new OutputPass());
  c.bloom = bloom;
  return c;
}
const comp = { a: makeComposer(), b: makeComposer() };
const quadMat = new THREE.ShaderMaterial({
  uniforms: { tA: { value: null }, tB: { value: null }, uMode: { value: 0 }, uMix: { value: 0.5 }, uSplit: { value: 0.5 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: /* glsl */`
    varying vec2 vUv; uniform sampler2D tA, tB; uniform int uMode; uniform float uMix, uSplit;
    void main(){
      vec4 a = texture2D(tA, vUv), b = texture2D(tB, vUv);
      if (uMode == 0) gl_FragColor = a;
      else if (uMode == 1) gl_FragColor = b;
      else if (uMode == 2) gl_FragColor = mix(a, b, uMix);
      else if (uMode == 3) gl_FragColor = vUv.x < uSplit ? a : b;
      else gl_FragColor = (1. - vUv.y) < uSplit ? a : b;
    }`,
  depthTest: false, depthWrite: false,
});
const quadScene = new THREE.Scene(), quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), quadMat));

function resize() {
  const w = innerWidth, h = innerHeight, dpr = Math.min(devicePixelRatio || 1, state.mode.length > 1 ? 1.5 : 2);
  renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // portrait screens: keep the same horizontal coverage as a 16:10 desktop view by widening the vertical FOV
  const baseFov = +$('fov').value, a = camera.aspect;
  camera.fov = a < 1.6 ? Math.min(85, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(baseFov) / 2) * 1.6 / a))) : baseFov;
  camera.updateProjectionMatrix();
  for (const c of Object.values(comp)) { c.setPixelRatio(dpr); c.setSize(w, h); }
  placeSplit();
}
addEventListener('resize', resize);

function renderVariant(key) {
  const other = key === 'a' ? 'b' : 'a';
  if (rigs[key]) rigs[key].visible = true;
  if (rigs[other]) rigs[other].visible = false;
  if (fx[key]) { fx[key].strip.visible = state.show.led; fx[key].logo.visible = state.show.logo; }
  if (fx[other]) { fx[other].strip.visible = false; fx[other].logo.visible = false; }
  scene.background = state.bg[key];
  // the floor takes the variant's colour too, so the two halves read apart at a glance
  if (!state.club) studio.floor.material.color.copy(state.bg[key]).multiplyScalar(0.93);
  comp[key].render();
  return comp[key].readBuffer.texture;
}
const MODES = { a: 0, b: 1, overlay: 2, splitv: 3, splith: 4 };
function renderFrame() {
  const m = state.mode, need = m === 'a' ? ['a'] : m === 'b' ? ['b'] : ['a', 'b'];
  const L = state.swap ? 'b' : 'a', R = state.swap ? 'a' : 'b';
  const tex = {};
  for (const k of need) tex[k] = renderVariant(k);
  quadMat.uniforms.tA.value = tex[m.startsWith('split') ? L : 'a'] || tex.b;
  quadMat.uniforms.tB.value = tex[m.startsWith('split') ? R : 'b'] || tex.a;
  quadMat.uniforms.uMode.value = MODES[m];
  quadMat.uniforms.uMix.value = state.mix; quadMat.uniforms.uSplit.value = state.split;
  renderer.setRenderTarget(null); renderer.render(quadScene, quadCam);
}

// ---------------- camera views ----------------
const VIEWS = {
  right45: { label: '45° right', pos: [1150, 1380, 1100], tgt: [0, 830, -20] },
  dj: { label: 'DJ eyes', pos: [0, 1640, 560], tgt: [0, 840, -120] },
  front: { label: 'Front', pos: [0, 1050, 1900], tgt: [0, 800, 0] },
  audience: { label: 'Audience', pos: [0, 1550, -2700], tgt: [0, 700, 0] },
  audLow: { label: 'Audience low', pos: [-950, 1050, -1800], tgt: [0, 720, -120] },
  cables: { label: 'Cables close', pos: [420, 1080, -620], tgt: [0, 830, -190] },
  logo: { label: 'Logo', pos: [260, 680, -1000], tgt: [0, 600, -235] },
  side: { label: 'Side', pos: [2100, 950, -40], tgt: [0, 800, -40] },
  top: { label: 'Top', pos: [0, 2700, 1], tgt: [0, 800, 0] },
};
let tween = null;
function goTo(v) {
  const o = typeof v === 'string' ? VIEWS[v] : v; if (!o) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  tween = { p0: camera.position.clone(), t0v: controls.target.clone(), p1: new THREE.Vector3(...o.pos), t1: new THREE.Vector3(...o.tgt), s: performance.now(), d: reduce ? 0 : 700 };
  document.querySelectorAll('#views button').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
}
Object.entries(VIEWS).forEach(([k, o], i) => {
  const b = document.createElement('button'); b.type = 'button'; b.dataset.v = k; b.textContent = o.label; b.title = 'key ' + (i + 1);
  b.onclick = () => goTo(k); $('views').appendChild(b);
});
controls.addEventListener('start', () => { tween = null; document.querySelectorAll('#views button').forEach((b) => b.classList.remove('on')); });

// saved views (per-viewer convenience)
const store = { get() { try { return JSON.parse(localStorage.getItem('flx-views') || '[]'); } catch { return []; } }, set(v) { try { localStorage.setItem('flx-views', JSON.stringify(v)); } catch {} } };
function drawSaved() {
  const box = $('saved'); box.innerHTML = '';
  store.get().forEach((v, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = 'View ' + (i + 1); b.title = 'click: go · shift-click: delete';
    b.onclick = (e) => { if (e.shiftKey) { const s = store.get(); s.splice(i, 1); store.set(s); drawSaved(); } else goTo(v); };
    box.appendChild(b);
  });
}
$('saveView').onclick = () => { const s = store.get(); s.push({ pos: camera.position.toArray().map(Math.round), tgt: controls.target.toArray().map(Math.round) }); store.set(s); drawSaved(); };
drawSaved();

// double-click: orbit around the clicked point
const ray = new THREE.Raycaster();
canvas.addEventListener('dblclick', (e) => {
  ray.setFromCamera(new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1), camera);
  const hit = ray.intersectObjects(world.children, true).find((h) => h.object.visible);
  if (hit) {
    const off = camera.position.clone().sub(controls.target);
    goTo({ pos: hit.point.clone().add(off.multiplyScalar(0.6)).toArray(), tgt: hit.point.toArray() });
  }
});

// walk mode: WASD / arrows move camera and target together, Q/E down/up, shift for faster
const keys = new Set(); let walk = false;
addEventListener('keydown', (e) => {
  if (e.target.closest && e.target.closest('input,select,textarea')) return;
  keys.add(e.key.toLowerCase());
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= 9) { const k = Object.keys(VIEWS)[n - 1]; if (k) goTo(k); }
  if (e.key.toLowerCase() === 'c') { const order = ['a', 'b', 'overlay', 'splitv', 'splith']; setMode(order[(order.indexOf(state.mode) + 1) % order.length]); }
  if (!walk && e.key.toLowerCase() === 'w' && !e.repeat && !e.shiftKey) toggleWalk();
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
function toggleWalk() { walk = !walk; $('walk').classList.toggle('on', walk); if (walk) { const d = new THREE.Vector3(); camera.getWorldDirection(d); controls.target.copy(camera.position).addScaledVector(d, 250); } }
$('walk').onclick = toggleWalk;
const _f = new THREE.Vector3(), _r = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
function walkStep(dt) {
  if (!walk) return;
  const sp = (keys.has('shift') ? 1400 : 500) * dt;
  camera.getWorldDirection(_f); _f.y = 0; _f.normalize(); _r.crossVectors(_f, _up);
  const mv = new THREE.Vector3();
  if (keys.has('w') || keys.has('arrowup')) mv.add(_f);
  if (keys.has('s') || keys.has('arrowdown')) mv.sub(_f);
  if (keys.has('d') || keys.has('arrowright')) mv.add(_r);
  if (keys.has('a') || keys.has('arrowleft')) mv.sub(_r);
  if (keys.has('e')) mv.y += 1; if (keys.has('q')) mv.y -= 1;
  if (mv.lengthSq()) { mv.normalize().multiplyScalar(sp); camera.position.add(mv); controls.target.add(mv); }
}
$('spin').onclick = () => { controls.autoRotate = !controls.autoRotate; controls.autoRotateSpeed = 0.8; $('spin').classList.toggle('on', controls.autoRotate); };
$('fov').oninput = (e) => { $('fovV').textContent = e.target.value + '°'; resize(); };
$('shot').onclick = () => {
  renderFrame();
  const a = document.createElement('a'); a.download = 'flx10-stage-' + state.mode + '.png'; a.href = canvas.toDataURL('image/png'); a.click();
};
$('min').onclick = () => { $('panel').classList.toggle('min'); $('min').textContent = $('panel').classList.contains('min') ? '+' : '–'; };

// ---------------- light presets ----------------
const LIGHTS = {
  studio: { label: 'Studio', env: 0.6, key: 1.6, fill: 0.35, exp: 1.0, bloom: 0.55 },
  bright: { label: 'Daylight', env: 1.0, key: 2.4, fill: 0.6, exp: 1.1, bloom: 0.35 },
  club: { label: 'Club (dark)', env: 0.14, key: 0.18, fill: 0.08, exp: 1.0, bloom: 0.9, bg: ['#0a0d14', '#140d0a'] },
};
function setLight(k) {
  const L = LIGHTS[k];
  scene.environmentIntensity = L.env; studio.key.intensity = L.key; studio.fill.intensity = L.fill;
  setExp(L.exp); setBloom(L.bloom);
  if (L.bg) { $('bgA').value = L.bg[0]; $('bgB').value = L.bg[1]; } else if ($('bgA').value === '#0a0d14') { $('bgA').value = '#a9c0e0'; $('bgB').value = '#e2b896'; }
  state.bg.a.set($('bgA').value); state.bg.b.set($('bgB').value);
  state.club = k === 'club'; studio.floor.material.color.set(state.club ? 0x1a1a1c : 0xcfcfcc);
  document.querySelectorAll('#lights button').forEach((b) => b.classList.toggle('on', b.dataset.l === k));
}
Object.entries(LIGHTS).forEach(([k, o]) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.l = k; b.textContent = o.label; b.onclick = () => setLight(k); $('lights').appendChild(b); });
function setExp(v) { renderer.toneMappingExposure = v; $('exp').value = Math.round(v * 100); $('expV').textContent = v.toFixed(2); }
function setBloom(v) { comp.a.bloom.strength = comp.b.bloom.strength = v; $('bloom').value = Math.round(v * 100); $('bloomV').textContent = v.toFixed(2); }
$('exp').oninput = (e) => setExp(e.target.value / 100);
$('bloom').oninput = (e) => setBloom(e.target.value / 100);
$('ledB').oninput = (e) => { fxUniforms.uBright.value = e.target.value / 10; $('ledBV').textContent = (e.target.value / 10).toFixed(1); };
$('ledS').oninput = (e) => { fxUniforms.uSpeed.value = e.target.value / 100; $('ledSV').textContent = (e.target.value / 100).toFixed(2); };
$('ledW').oninput = (e) => { fxUniforms.uWave.value = +e.target.value; $('ledWV').textContent = e.target.value + ' mm'; };

// ---------------- setup controls ----------------
let rebuildTimer = 0;
function rebuildSoon(full) {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(async () => {
    if (full) { await buildStand(); placeController(); await buildFx(); }
    buildRigs();
  }, full ? 120 : 16);
}
$('tableH').oninput = (e) => { state.tableH = +e.target.value; $('tableHV').textContent = state.tableH + ' mm'; rebuildSoon(true); };
$('tilt').oninput = (e) => { state.tilt = +e.target.value; $('tiltV').textContent = state.tilt + '°'; rebuildSoon(); };
$('base').oninput = (e) => { state.base = +e.target.value; $('baseV').textContent = state.base + ' mm'; rebuildSoon(); };
$('miniLevel').onchange = (e) => { state.miniLevel = e.target.checked; rebuildSoon(); };
$('hl').onchange = (e) => { state.hl = e.target.checked; rebuildSoon(); };
$('shelfOp').oninput = (e) => { state.shelfOp = e.target.value / 100; $('shelfOpV').textContent = e.target.value + '%'; applyShow(); };
[['sCables', 'cables'], ['sTablets', 'tablets'], ['sMounts', 'mounts'], ['sLed', 'led'], ['sLogo', 'logo'], ['sFloor', 'floor']]
  .forEach(([id, k]) => { $(id).onchange = (e) => { state.show[k] = e.target.checked; applyShow(); }; });

// ---------------- compare bar ----------------
function setMode(m) {
  state.mode = m;
  document.querySelectorAll('#bar [data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === m));
  $('mixWrap').style.display = m === 'overlay' ? 'flex' : 'none';
  resize();
}
document.querySelectorAll('#bar [data-mode]').forEach((b) => (b.onclick = () => setMode(b.dataset.mode)));
$('mix').oninput = (e) => (state.mix = e.target.value / 100);
$('bgA').oninput = (e) => state.bg.a.set(e.target.value);
$('bgB').oninput = (e) => state.bg.b.set(e.target.value);
$('swap').onchange = (e) => { state.swap = e.target.checked; placeSplit(); };

const handle = $('split');
function placeSplit() {
  const m = state.mode, v = m === 'splitv', h = m === 'splith';
  handle.style.display = v || h ? 'block' : 'none';
  handle.className = v ? 'v' : 'h';
  handle.querySelector('i').textContent = v ? '⇆' : '⇅';
  if (v) { handle.style.left = state.split * innerWidth + 'px'; handle.style.top = ''; }
  if (h) { handle.style.top = state.split * innerHeight + 'px'; handle.style.left = ''; }
  const A = $('labA'), B = $('labB'), L = state.swap ? 'V2' : 'V1', R = state.swap ? 'V1' : 'V2';
  const show = v || h; A.style.display = B.style.display = show ? 'block' : 'none';
  A.textContent = L; B.textContent = R;
  A.style.color = L === 'V1' ? 'var(--a)' : 'var(--b)'; B.style.color = R === 'V1' ? 'var(--a)' : 'var(--b)';
  if (v) { A.style.left = Math.max(12, state.split * innerWidth - 60) + 'px'; A.style.top = '50%'; B.style.left = state.split * innerWidth + 16 + 'px'; B.style.top = '50%'; }
  if (h) { A.style.left = B.style.left = 'calc(100vw - 80px)'; A.style.top = Math.max(60, state.split * innerHeight - 36) + 'px'; B.style.top = state.split * innerHeight + 16 + 'px'; }
}
let dragging = false;
handle.addEventListener('pointerdown', (e) => { dragging = true; handle.setPointerCapture(e.pointerId); e.preventDefault(); });
handle.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  state.split = THREE.MathUtils.clamp(state.mode === 'splitv' ? e.clientX / innerWidth : e.clientY / innerHeight, 0.02, 0.98);
  placeSplit();
});
handle.addEventListener('pointerup', () => (dragging = false));
handle.addEventListener('keydown', (e) => { const d = { ArrowLeft: -0.02, ArrowUp: -0.02, ArrowRight: 0.02, ArrowDown: 0.02 }[e.key]; if (d) { state.split = THREE.MathUtils.clamp(state.split + d, 0.02, 0.98); placeSplit(); } });
handle.tabIndex = 0; handle.setAttribute('role', 'slider'); handle.setAttribute('aria-label', 'Split position');

// ---------------- boot ----------------
tex = loadScreens(renderer);
await buildStand(); await buildController(); placeController(); await buildFx(); buildRigs();
$('loading').remove();
camera.position.fromArray(VIEWS[Q.get('view')]?.pos || VIEWS.right45.pos);
controls.target.fromArray(VIEWS[Q.get('view')]?.tgt || VIEWS.right45.tgt); controls.update();
if (Q.get('cam')) camera.position.fromArray(Q.get('cam').split(',').map(Number));
if (Q.get('tgt')) controls.target.fromArray(Q.get('tgt').split(',').map(Number));
if (Q.get('light')) setLight(Q.get('light')); else setLight('studio');
// on a phone, start with the control card collapsed so the scene is visible
if (matchMedia('(max-width: 640px)').matches) { $('panel').classList.add('min'); $('min').textContent = '+'; }
if (Q.get('ui') === '0') ['panel', 'bar', 'hint'].forEach((id) => ($(id).style.display = 'none'));
setMode(state.mode); resize();
const fixedT = Q.has('t') ? +Q.get('t') : null;
const clock = new THREE.Clock(); let frames = 0;
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1), t = fixedT ?? clock.elapsedTime;
  walkStep(dt);
  if (tween) {
    const k0 = tween.d ? Math.min(1, (performance.now() - tween.s) / tween.d) : 1, k = k0 < 0.5 ? 2 * k0 * k0 : -1 + (4 - 2 * k0) * k0;
    camera.position.lerpVectors(tween.p0, tween.p1, k); controls.target.lerpVectors(tween.t0v, tween.t1, k);
    if (k0 >= 1) tween = null;
  }
  controls.update();
  for (const f of Object.values(fx)) tickFx(t, f.strip, f.logo);
  if (flxMod?.tick) flxMod.tick(t, flx);
  renderFrame();
  if (++frames === 20) document.title = 'FLX10 Stage Viewer';
});
window.__app = { scene, camera, controls, state, rigs: () => rigs, info: () => ({ thorInfo, flxInfo }), goTo, setMode };
