// Everything behind the controller: the two iPads, the V1 printed mounts, the V2 cable-hiding shelf, and the rear cables.
import * as THREE from 'three';

export const AIR = { w: 247.6, h: 178.5, t: 6.1, bezel: 8.5, r: 18 };
export const MINI = { w: 195.4, h: 134.8, t: 6.3, bezel: 7.5, r: 16 };
export const GAP = 10;

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
    : ctx.ports.filter((p) => p.role);
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
    const body = box(ctx.flxW, h, z0 - z1, mat, 0, topY + h / 2, (z0 + z1) / 2, shelf);
    const capH = h - ctx.rimH;
    box(ctx.flxW, capH, z1 - z2 + 0.5, mat, 0, topY + ctx.rimH + capH / 2, (z1 + z2) / 2, shelf);   // over the rear frame tube
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
const CABLE_COL = { xlr: 0x111111, trs: 0x161616, rca_l: 0xe8e8e2, rca_r: 0xb3141c, usb: 0x1d1d1d, dc: 0x101010 };
function fallbackPlug(kind) {
  const g = new THREE.Group();
  const r = { xlr_female_ra: 10, trs_635_ra: 7, rca_ra: 5, usb_c_ra: 4, dc_barrel_ra: 5 }[kind] || 6;
  const mat = new THREE.MeshStandardMaterial({ color: 0x9fa3a8, roughness: 0.3, metalness: 0.9 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 22, 24), mat);
  body.rotation.x = Math.PI / 2; body.position.z = 11; g.add(body);
  const elbow = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r * 0.8, 24, 20), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7 }));
  elbow.position.set(0, -10, 22); g.add(elbow);
  g.userData = { length: 22, drop: 22, radius: r * 0.45 };
  return g;
}

function buildCables(group, ports, ctx) {
  const { topY, rearZ, cutout } = ctx;
  const lib = ctx.plugs;
  const holeHalf = cutout.w / 2 - 8;
  const holeRear = cutout.z - cutout.d / 2;
  // Cables from ports outside the slot's width lie on top of the rear frame tube, then turn forward into the slot.
  const tubeTopY = topY + (ctx.rimH || 0);
  const laneZ = (i) => ctx.tableRearInnerZ - 7 - (i % 3) * 7.5;
  // order cables outward from the slot so the ones furthest out lie on the outside of the bundle
  const sorted = [...ports].sort((a, b) => Math.abs(a.pos.x) - Math.abs(b.pos.x));
  const laneIndex = { left: 0, right: 0 };
  for (const p of sorted) {
    const inHole = Math.abs(p.pos.x) <= holeHalf;
    const sx = Math.sign(p.pos.x) || 1;
    // Right-angle plugs everywhere: there is only ~43 mm of slot behind the controller before the table edge.
    const raKind = lib?.plugKindFor ? lib.plugKindFor(p.kind, { rightAngle: true })
      : { xlr_male_out: 'xlr_female_ra', xlr_trs_combo_in: 'xlr_male_ra', trs_jack: 'trs_635_ra', rca: 'rca_ra', usb_c: 'usb_c_ra', dc_in: 'dc_barrel_ra', dmx_xlr: 'xlr_female_ra' }[p.kind];
    let plug = null;
    try { plug = lib ? lib.makePlug(raKind, { color: p.role === 'rca_r' ? 'red' : p.role === 'rca_l' ? 'white' : undefined }) : null; } catch (e) { plug = null; }
    if (!plug) plug = fallbackPlug(raKind);
    // plug's local -z goes into the socket; the controller's rear face looks along -z, so turn the plug around.
    // Plug's local -z goes into the socket and the rear face looks along -z, so turn it around (Ry = PI).
    // A right-angle plug can be rotated on its own axis: inside the slot's width the cable points straight down;
    // outside it points sideways towards the slot (Rz is applied first, in the plug's own frame).
    plug.position.copy(p.pos);
    plug.rotation.set(0, Math.PI, inHole ? 0 : sx * Math.PI / 2);
    plug.updateMatrix(); group.add(plug);
    plug.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const ud = plug.userData || {};
    const r = ud.radius ?? 2.8;
    const exit = new THREE.Vector3(...(ud.exit || [0, -(ud.drop ?? 22), ud.length ?? 22])).applyMatrix4(plug.matrix);
    const exitDir = new THREE.Vector3(...(ud.exitDir || [0, -1, 0])).applyQuaternion(plug.quaternion).normalize();
    const side = p.pos.x < 0 ? 'left' : 'right';
    const pts = [exit.clone(), exit.clone().addScaledVector(exitDir, 6)];
    if (inHole) {
      // straight down through the slot
      const hz = Math.max(exit.z, holeRear + r + 2);
      pts.push(new THREE.Vector3(exit.x, topY - 25, hz), new THREE.Vector3(exit.x, topY - 90, hz));
    } else {
      // sideways towards the slot, back over the rear frame tube, along it, then forward and down into the slot
      const k = laneIndex[side]++;
      const lane = laneZ(k);
      const onTube = tubeTopY + r + 0.3;
      const xIn = sx * Math.max(10, holeHalf - 14 - k * 9);
      // gravity: the cable sags from the plug onto the tube in one gentle curve, then lies flat along it
      const dx = Math.abs(exit.x - xIn);
      const run = Math.min(60, dx * 0.35);
      pts.push(new THREE.Vector3(exit.x - sx * run * 0.55, (exit.y + onTube) / 2, (exit.z + lane) / 2));
      pts.push(new THREE.Vector3(exit.x - sx * run, onTube, lane));
      if (dx - run > 60) pts.push(new THREE.Vector3((exit.x - sx * run + xIn) / 2, onTube, lane));
      pts.push(new THREE.Vector3(xIn + sx * 22, onTube, lane));
      pts.push(new THREE.Vector3(xIn + sx * 4, topY - 6, holeRear + r + 4));
      pts.push(new THREE.Vector3(xIn, topY - 40, holeRear + r + 7));
      pts.push(new THREE.Vector3(xIn, topY - 90, holeRear + r + 7));
    }
    const colorKey = p.role === 'rca_l' ? 'rca_l' : p.role === 'rca_r' ? 'rca_r' : ({ trs_jack: 'trs', rca: 'rca_l', usb_c: 'usb', dc_in: 'dc' }[p.kind] || 'xlr');
    let mesh = null;
    try { mesh = lib?.makeCable ? lib.makeCable(pts, { radius: r, color: CABLE_COL[colorKey] }) : null; } catch (e) { mesh = null; }
    if (!mesh) {
      const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
      mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, r, 12, false),
        new THREE.MeshStandardMaterial({ color: CABLE_COL[colorKey], roughness: 0.55 }));
    }
    mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
  }
}
