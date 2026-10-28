// Everything behind the controller: the two iPads, the V1 printed mounts, the V2 cable-hiding shelf, and the rear cables.
import * as THREE from 'three';

export const AIR = { w: 247.6, h: 178.5, t: 6.1, bezel: 8.5, r: 18 };
export const MINI = { w: 195.4, h: 134.8, t: 6.3, bezel: 7.5, r: 16 };
export const GAP = 10;
export const SHELF_SIDE = 80;   // V2 shelf overhangs the controller's width by this much on each side

const M = {
  alu: new THREE.MeshStandardMaterial({ color: 0x3a3b3f, roughness: 0.32, metalness: 0.85 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x050505, roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02 }),
  print: new THREE.MeshStandardMaterial({ color: 0x1b1b1c, roughness: 0.85, metalness: 0 }),   // matte black PETG
  printHl: new THREE.MeshStandardMaterial({ color: 0xf08a4b, roughness: 0.8 }),
  shelf: new THREE.MeshStandardMaterial({ color: 0x141415, roughness: 0.62, metalness: 0.15 }),
};
export const materials = M;

function roundedRect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

// ---------------- screens ----------------
function canvasTex(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
export function loadScreens(renderer) {
  const air = canvasTex(1640, 1180), mini = canvasTex(1488, 1024);
  [air, mini].forEach((t) => { t.anisotropy = renderer.capabilities.getMaxAnisotropy(); const g = t.image.getContext('2d'); g.fillStyle = '#05060a'; g.fillRect(0, 0, t.image.width, t.image.height); });
  const load = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  load('assets/screen-air.png').then((img) => {
    if (!img) return;
    // Re-lay the 2.2:1 desktop performance view for the iPad's 1.39:1 screen: waveform lanes stretched to fill the top,
    // the two deck-panel columns butted together underneath (FX bars, software mixer and sampler dropped: the FLX10 has them).
    const c = air.image, g = c.getContext('2d'), W = img.naturalWidth, H = img.naturalHeight, kx = W / 1920, ky = H / 867;
    const yW0 = 125 * ky, yW1 = 325 * ky, yD1 = 705 * ky, blk = 862 * kx, rx = 1058 * kx;
    const s = c.width / (2 * blk), hDeck = (yD1 - yW1) * s, hWave = c.height - hDeck;
    g.filter = 'brightness(1.12) contrast(1.05)';
    g.drawImage(img, 0, yW0, W, yW1 - yW0, 0, 0, c.width, hWave);
    g.drawImage(img, 0, yW1, blk, yD1 - yW1, 0, hWave, c.width / 2, hDeck);
    g.drawImage(img, rx, yW1, blk, yD1 - yW1, c.width / 2, hWave, c.width / 2, hDeck);
    air.needsUpdate = true;
  });
  load('assets/screen-mini.webp').then((img) => {
    if (!img) return;
    const c = mini.image, g = c.getContext('2d'), W = img.naturalWidth, H = img.naturalHeight;
    const sx = W * 555 / 1920, sw = W * (1525 - 555) / 1920, sy = H * 88 / 1007, sh = sw * c.height / c.width;
    g.filter = 'brightness(1.12) contrast(1.05)';
    g.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height); mini.needsUpdate = true;
  });
  return { air, mini };
}

// ---------------- tablet ----------------
// Pivot at the centre of the tablet's bottom front edge; the tablet leans back (towards -z) by tilt degrees.
function makeTablet(spec, tex) {
  const g = new THREE.Group();
  const geo = new THREE.ExtrudeGeometry(roundedRect(spec.w, spec.h, spec.r), { depth: spec.t - 1.2, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.6, bevelSegments: 3, curveSegments: 16 });
  geo.translate(0, spec.h / 2, -spec.t + 0.6);
  const body = new THREE.Mesh(geo, M.alu); body.castShadow = true; body.receiveShadow = true; g.add(body);
  const glass = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(spec.w - 1.2, spec.h - 1.2, spec.r - 0.6), 16), M.glass);
  glass.position.set(0, spec.h / 2, 0.15); g.add(glass);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(spec.w - 2 * spec.bezel, spec.h - 2 * spec.bezel),
    new THREE.MeshBasicMaterial({ map: tex, toneMapped: true }));
  scr.position.set(0, spec.h / 2, 0.25); g.add(scr);
  // camera bump-free back, small apple-ish camera on the back corner
  const cam = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 0.8, 24), M.glass);
  cam.rotation.x = Math.PI / 2; cam.position.set(-spec.w / 2 + 14, spec.h - 14, -spec.t - 0.2); g.add(cam);
  return g;
}

// ---------------- helpers ----------------
function box(w, h, d, mat, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
// Smallest move from x so that [x-half, x+half] avoids every occupied interval and stays inside [lo, hi].
function snapToGap(x, half, occupied, lo, hi) {
  const ok = (c) => c - half >= lo && c + half <= hi && occupied.every(([a, b]) => c + half < a || c - half > b);
  for (let d = 0; d < 200; d += 1) { if (ok(x - d)) return x - d; if (ok(x + d)) return x + d; }
  return x;
}

/**
 * Build the rig for one variant.
 * ctx: { topY, rearZ (FLX rear face, world), deckY (FLX top surface above table), flxW, tableRearInnerZ, tableRearOuterZ,
 *        rimH, cutout, ports (world-space, with kind), plugs (connectors module or null), tex, tilt, base, variant }
 */
export function buildRig(ctx) {
  const root = new THREE.Group(); root.name = 'rig-' + ctx.variant;
  const { topY, rearZ, tilt } = ctx;
  const t = THREE.MathUtils.degToRad(tilt);
  const mountMat = ctx.highlight ? M.printHl : M.print;
  const airX = 0, miniX = AIR.w / 2 + GAP + MINI.w / 2;
  const lipZ = rearZ - (ctx.variant === 'v2' ? 6 : 8);             // tablet bottom front edge
  const baseY = topY + ctx.base;
  const miniBase = ctx.miniLevel ? baseY + (AIR.h - MINI.h) * Math.cos(t) : baseY;

  const tablets = [
    { spec: AIR, x: airX, y: baseY, tex: ctx.tex.air },
    { spec: MINI, x: miniX, y: miniBase, tex: ctx.tex.mini },
  ];
  for (const tb of tablets) {
    const p = makeTablet(tb.spec, tb.tex);
    p.position.set(tb.x, tb.y, lipZ); p.rotation.x = -t; root.add(p);
    tb.topY = tb.y + tb.spec.h * Math.cos(t); tb.topZ = lipZ - tb.spec.h * Math.sin(t) - tb.spec.t;
  }

  const cables = ctx.variant === 'v2'
    ? ctx.ports.filter((p) => ['booth_l', 'booth_r', 'mic1', 'usb1', 'dc_in'].includes(p.role))
    : ctx.ports.filter(pluggable);
  const cableGroup = new THREE.Group(); cableGroup.name = 'cables'; root.add(cableGroup);
  buildCables(cableGroup, cables, ctx);

  if (ctx.variant === 'v1') {
    // Bridge plate under the controller's rear feet (the controller's weight pins it), spanning over the cable slot.
    // Its thickness equals the frame tube's step above the panel, so the controller (front feet on the tube) sits level.
    const plateT = Math.max(2, ctx.lift || 0), plateD = 58;
    box(ctx.flxW - 30, plateT, plateD, mountMat, 0, topY + plateT / 2, rearZ + plateD / 2 - 12, root);
    const occupied = cables.map((p) => [p.pos.x - (p.clear || 12), p.pos.x + (p.clear || 12)]);
    for (const tb of tablets) {
      const half = 7, lo = tb.x - tb.spec.w / 2 + 4, hi = tb.x + tb.spec.w / 2 - 4;
      const xs = [tb.x - tb.spec.w / 2 + 22, tb.x + tb.spec.w / 2 - 22].map((x) => snapToGap(x, half, occupied, lo, hi));
      for (const ux of xs) {
        const upH = tb.y - topY - plateT;
        box(14, upH, 9, mountMat, ux, topY + plateT + upH / 2, rearZ - 5.5, root);                 // upright
        box(14, 5, 7, mountMat, ux, topY + plateT + 2.5, rearZ - 1 + 3.5 - 6, root);                  // foot fillet onto the plate
        // cradle: lip in front of the tablet's bottom edge + seat, both tilted with the tablet
        const c = new THREE.Group(); c.position.set(ux, tb.y, lipZ); c.rotation.x = -t; root.add(c);
        box(14, 4, tb.spec.t + 7, mountMat, 0, -2, -tb.spec.t / 2 + 1.5, c);                          // seat
        box(14, 9, 3, mountMat, 0, 2.5, 2.2, c);                                                      // front lip
        box(14, 64, 3.5, mountMat, 0, 30, -tb.spec.t - 1.75, c);                                      // backrest
      }
    }
  } else {
    // V2: a printed shelf that continues the controller's top surface back to the table edge and hides the cables.
    const shelf = new THREE.Group(); shelf.name = 'shelf'; root.add(shelf);
    const mat = ctx.shelfMaterial || M.shelf;
    // top surface flush with the controller's deck; a hollow printed shell (walls drawn as solid blocks here)
    const h = ctx.deckY + (ctx.lift || 0), z0 = rearZ - 0.8, z1 = ctx.tableRearInnerZ, z2 = ctx.tableRearOuterZ;
    const W = ctx.flxW + 2 * SHELF_SIDE;
    const body = box(W, h, z0 - z1, mat, 0, topY + h / 2, (z0 + z1) / 2, shelf);
    const capH = h - ctx.rimH;
    box(W, capH, z1 - z2 + 0.5, mat, 0, topY + ctx.rimH + capH / 2, (z1 + z2) / 2, shelf);   // over the rear frame tube
    // a shallow groove in the top that the tablets stand in, matching the lip line
    for (const tb of tablets) {
      const c = new THREE.Group(); c.position.set(tb.x, tb.y, lipZ); c.rotation.x = -t; shelf.add(c);
      box(tb.spec.w - 30, 6, 3, mat, 0, 3, 2.2, c);                                                  // continuous low lip
      box(tb.spec.w - 60, 50, 3.5, mat, 0, 25, -tb.spec.t - 1.75, c);                               // backrest
    }
    shelf.userData.body = body;
    root.userData.shelf = shelf;
  }
  root.userData.tablets = tablets;
  return root;
}

// ---------------- cables ----------------
// All cables and plug boots are black. Straight plugs only: each one sticks straight out of its socket, then the cable
// bends down onto the rear frame tube and converges on the cable slot in the middle.
const CABLE = 0x121214;
const BLACK_METAL = new THREE.MeshStandardMaterial({ color: 0x1c1c1f, roughness: 0.3, metalness: 0.85 });
const STRAIGHT = { xlr_male_out: 'xlr_female', xlr_trs_combo_in: 'xlr_male', trs_jack: 'trs_635', rca: 'rca', usb_c: 'usb_c', dc_in: 'dc_barrel', dmx_xlr: 'dmx_xlr' };
export const pluggable = (p) => !!STRAIGHT[p.kind];

function fallbackPlug(kind) {
  const g = new THREE.Group();
  const r = { xlr_female: 10, xlr_male: 10, dmx_xlr: 10, trs_635: 7, rca: 5, usb_c: 4, dc_barrel: 5 }[kind] || 6;
  const len = { xlr_female: 60, xlr_male: 56, dmx_xlr: 60, trs_635: 60, rca: 36, usb_c: 31, dc_barrel: 34 }[kind] || 30;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.6, len, 24), new THREE.MeshStandardMaterial({ color: CABLE, roughness: 0.7 }));
  body.rotation.x = Math.PI / 2; body.position.z = len / 2; g.add(body);
  g.userData = { length: len, radius: r * 0.35, exit: [0, 0, len], exitDir: [0, 0, 1] };
  return g;
}

// Wireless mic receiver: an L-shaped dongle on the MIC 1 XLR input (male XLR barrel, then a body turned 90°).
// dir: 'up' (stands up behind the controller) or 'in' (lies flat towards the centre, for inside the V2 shelf).
function makeMicDongle(dir) {
  const g = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.55, metalness: 0.1 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x2a2b2e, roughness: 0.35, metalness: 0.8 });
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(9.6, 9.6, 20, 40), metal);
  barrel.rotation.x = Math.PI / 2; barrel.position.z = 10; g.add(barrel);
  const body = new THREE.Group(); body.position.z = 30; g.add(body);
  const elbow = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, 22, 40), shell);
  elbow.rotation.x = Math.PI / 2; body.add(elbow);
  // the receiver body runs along local +y from the elbow
  const geo = new THREE.ExtrudeGeometry(roundedRect(24, 58, 7), { depth: 18, bevelEnabled: true, bevelThickness: 2, bevelSize: 2, bevelSegments: 3, curveSegments: 10 });
  geo.translate(0, 29, -9);
  const arm = new THREE.Mesh(geo, shell); body.add(arm);
  const led = new THREE.Mesh(new THREE.CircleGeometry(1.4, 16), new THREE.MeshBasicMaterial({ color: 0x3cff6a }));
  led.position.set(0, 46, -11.1); led.rotation.y = Math.PI; body.add(led);
  const nub = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.6, 9, 16), shell); nub.position.set(6, 63, 0); body.add(nub);
  if (dir === 'in') body.rotation.z = Math.PI / 2;   // plug frame is turned by Ry = PI, so this points to world +x
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

function buildCables(group, ports, ctx) {
  const { topY, cutout } = ctx;
  const lib = ctx.plugs;
  const holeHalf = cutout.w / 2 - 8;
  const holeRear = cutout.z - cutout.d / 2;
  const tubeTopY = topY + (ctx.rimH || 0);
  const lanes = 4, laneZ = (i) => ctx.tableRearInnerZ - 5 - (i % lanes) * 6;
  // inner ports first, so the cables from further out lie on the outer lanes of the bundle
  const sorted = [...ports].sort((a, b) => Math.abs(a.pos.x) - Math.abs(b.pos.x));
  const laneIndex = { left: 0, right: 0 };
  for (const p of sorted) {
    if (p.role === 'mic1') {
      const d = makeMicDongle(ctx.variant === 'v2' ? 'in' : 'up');
      d.position.copy(p.pos); d.rotation.y = Math.PI; group.add(d);
      continue;
    }
    const kind = STRAIGHT[p.kind];
    let plug = null;
    try { plug = lib ? lib.makePlug(kind, { color: 'black' }) : null; } catch (e) { plug = null; }
    if (!plug) plug = fallbackPlug(kind);
    // plug's local -z goes into the socket and the rear face looks along -z, so turn it around (Ry = PI)
    // all-black look: metal shells and sleeves become black chrome (the contacts are inside the socket anyway)
    plug.traverse((o) => { if (o.isMesh && o.material?.metalness > 0.5) o.material = BLACK_METAL; });
    plug.position.copy(p.pos); plug.rotation.set(0, Math.PI, 0);
    plug.updateMatrix(); group.add(plug);
    const ud = plug.userData || {};
    const r = Math.min(ud.radius ?? 2.8, 3.2);
    const exit = new THREE.Vector3(...(ud.exit || [0, 0, ud.length ?? 30])).applyMatrix4(plug.matrix);
    const dir = new THREE.Vector3(...(ud.exitDir || [0, 0, 1])).applyQuaternion(plug.quaternion).normalize();
    const sx = Math.sign(p.pos.x) || 1, side = sx < 0 ? 'left' : 'right';
    const k = laneIndex[side]++, lane = laneZ(k), onTube = tubeTopY + r + 0.3 + Math.floor(k / lanes) * r * 1.6;
    // where this cable drops into the slot: spread across it, converging to the middle as it goes down
    const xIn = THREE.MathUtils.clamp(p.pos.x * 0.55, -(holeHalf - 12), holeHalf - 12);
    const zIn = holeRear + r + 5 + (k % 3) * 2 * r;
    // straight out of the plug, then a soft bend down onto the tube
    const pts = [exit.clone(), exit.clone().addScaledVector(dir, 7)];
    const bendZ = Math.min(exit.z - 12, lane - 4);
    pts.push(new THREE.Vector3(exit.x - sx * 2, (exit.y + onTube) / 2 + 2, bendZ));
    pts.push(new THREE.Vector3(exit.x - sx * 8, onTube, Math.max(bendZ + 6, lane)));
    const dx = Math.abs(exit.x - sx * 8 - xIn);
    if (dx > 70) pts.push(new THREE.Vector3((exit.x + xIn) / 2, onTube, lane));
    if (dx > 30) pts.push(new THREE.Vector3(xIn + sx * Math.min(26, dx * 0.4), onTube, lane));
    pts.push(new THREE.Vector3(xIn, topY - 4, zIn));
    pts.push(new THREE.Vector3(xIn * 0.6, topY - 45, zIn + 2));
    pts.push(new THREE.Vector3(xIn * 0.35, topY - 95, zIn + 2));
    let mesh = null;
    try { mesh = lib?.makeCable ? lib.makeCable(pts, { radius: r, color: CABLE }) : null; } catch (e) { mesh = null; }
    if (!mesh) {
      const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
      mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, r, 12, false), new THREE.MeshStandardMaterial({ color: CABLE, roughness: 0.55 }));
    }
    mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
  }
}
