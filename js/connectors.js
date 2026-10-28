// Cable plugs + cable routing for the DJ setup viewer.
// Units mm, +y up. Every plug: origin = centre of the mating face (the plane that sits flush with the
// socket's front face on the panel). Parts that enter the socket (pins, jack shaft, barrel, XLR insert)
// lie at z < 0; the plug body lies at z > 0. Straight plugs: cable exits along +z at z = userData.length.
// Right-angle (*_ra) plugs: cable exits along -y at y = -userData.drop, z = userData.exit[2].
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ---------------------------------------------------------------- materials (cached)
const M = {};
function mat(key) {
  if (M[key]) return M[key];
  let m;
  switch (key) {
    case 'nickel': m = new THREE.MeshPhysicalMaterial({ color: 0xc9c9c5, metalness: 1, roughness: 0.3, anisotropy: 0.55, anisotropyRotation: Math.PI / 2 }); break;
    case 'nickelIso': m = new THREE.MeshPhysicalMaterial({ color: 0xc9c9c5, metalness: 1, roughness: 0.3 }); break;
    case 'nickelDark': m = new THREE.MeshPhysicalMaterial({ color: 0x8d8d8a, metalness: 1, roughness: 0.45 }); break;
    case 'chrome': m = new THREE.MeshPhysicalMaterial({ color: 0xe2e2e2, metalness: 1, roughness: 0.12 }); break;
    case 'gold': m = new THREE.MeshPhysicalMaterial({ color: 0xe9c77e, metalness: 1, roughness: 0.22 }); break;
    case 'goldBrushed': m = new THREE.MeshPhysicalMaterial({ color: 0xdcb86c, metalness: 1, roughness: 0.3, anisotropy: 0.5, anisotropyRotation: Math.PI / 2 }); break;
    case 'steel': m = new THREE.MeshPhysicalMaterial({ color: 0xd4d6d8, metalness: 1, roughness: 0.2 }); break;
    case 'rubber': m = new THREE.MeshPhysicalMaterial({ color: 0x18181a, metalness: 0, roughness: 0.72, sheen: 0.3, sheenRoughness: 0.8, sheenColor: 0x444444 }); break;
    case 'plastic': m = new THREE.MeshPhysicalMaterial({ color: 0x141416, metalness: 0, roughness: 0.38, clearcoat: 0.35, clearcoatRoughness: 0.35 }); break;
    case 'insulator': m = new THREE.MeshPhysicalMaterial({ color: 0x101012, metalness: 0, roughness: 0.55 }); break;
    case 'hole': m = new THREE.MeshBasicMaterial({ color: 0x020202 }); break;
    default: m = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(key), metalness: 0, roughness: 0.35, clearcoat: 0.4, clearcoatRoughness: 0.3 });
  }
  return (M[key] = m);
}
function colorKey(c, fallback) {
  if (c == null) return fallback;
  if (c === 'red') return '#b8141a';
  if (c === 'white') return '#ecebe6';
  if (c === 'black') return '#151517';
  if (typeof c === 'number') return '#' + c.toString(16).padStart(6, '0');
  return c;
}

// ---------------------------------------------------------------- geometry helpers
// Lathe around the z axis. profile = [[r, z], ...]; walk it so the solid lies on the right
// (front-to-back on the outside, back-to-front on an inner wall). Corners sharper than `crease` get split normals.
function latheGeo(profile, { segs = 48, phiStart = 0, phiLength = Math.PI * 2, crease = 35 } = {}) {
  const n = profile.length, cosC = Math.cos(crease * Math.PI / 180);
  const segN = [];
  for (let i = 0; i < n - 1; i++) {
    const dr = profile[i + 1][0] - profile[i][0], dz = profile[i + 1][1] - profile[i][1];
    const l = Math.hypot(dr, dz) || 1;
    segN.push([dz / l, -dr / l]);
  }
  const rings = []; // {r,z,nr,nz,v}
  let acc = 0;
  for (let i = 0; i < n; i++) {
    if (i > 0) acc += Math.hypot(profile[i][0] - profile[i - 1][0], profile[i][1] - profile[i - 1][1]);
    const [r, z] = profile[i];
    const a = segN[i - 1], b = segN[i];
    if (a && b && a[0] * b[0] + a[1] * b[1] < cosC) {
      rings.push({ r, z, n: a, v: acc }, { r, z, n: b, v: acc, split: true });
    } else {
      let nn = a && b ? [a[0] + b[0], a[1] + b[1]] : (a || b);
      const l = Math.hypot(nn[0], nn[1]) || 1;
      rings.push({ r, z, n: [nn[0] / l, nn[1] / l], v: acc });
    }
  }
  const pos = [], nor = [], uv = [], idx = [];
  for (const rg of rings) {
    for (let i = 0; i <= segs; i++) {
      const p = phiStart + (i / segs) * phiLength, c = Math.cos(p), s = Math.sin(p);
      pos.push(rg.r * c, rg.r * s, rg.z);
      nor.push(rg.n[0] * c, rg.n[0] * s, rg.n[1]);
      uv.push(i / segs, rg.v / (acc || 1));
    }
  }
  const W = segs + 1;
  for (let j = 0; j < rings.length - 1; j++) {
    if (rings[j + 1].split) continue;
    for (let i = 0; i < segs; i++) {
      const a = j * W + i, d = j * W + i + 1, b = (j + 1) * W + i, c = (j + 1) * W + i + 1;
      idx.push(a, d, b, d, c, b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}
function lathe(profile, m, o) { return new THREE.Mesh(latheGeo(profile, o), typeof m === 'string' ? mat(m) : m); }

// rounded transition helper: arc points from (r0,z0) around a corner
function arc(cr, cz, rad, a0, a1, n = 5) {
  const out = [];
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; out.push([cr + rad * Math.cos(a), cz + rad * Math.sin(a)]); }
  return out;
}
// Ribbed taper (crest / groove), from z0 (radius r0) to z1 (radius r1); returns points (no endpoints closure)
function ribs(z0, z1, r0, r1, count, depth, crestFrac = 0.55) {
  const pts = [], L = z1 - z0, p = L / count;
  for (let k = 0; k < count; k++) {
    const za = z0 + k * p, zb = za + p * crestFrac, zc = za + p;
    const ra = r0 + (r1 - r0) * (za - z0) / L, rb = r0 + (r1 - r0) * (zb - z0) / L, rc = r0 + (r1 - r0) * (zc - z0) / L;
    const ch = Math.min(0.35, p * 0.12);
    pts.push([ra - depth * 0.35, za + ch * 0.2], [ra, za + ch], [rb, zb - ch], [rb - depth * 0.35, zb - ch * 0.2],
      [rb - depth, zb + ch], [rc - depth, zc - ch]);
  }
  return pts;
}
function box(w, h, d, m, x = 0, y = 0, z = 0) {
  const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof m === 'string' ? mat(m) : m);
  me.position.set(x, y, z); return me;
}
function rbox(w, h, d, r, m, x = 0, y = 0, z = 0, seg = 3) {
  const me = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, r), typeof m === 'string' ? mat(m) : m);
  me.position.set(x, y, z); return me;
}
function disc(r, z, m, segs = 32) {
  const g = new THREE.CircleGeometry(r, segs); g.rotateY(Math.PI); // face -z
  const me = new THREE.Mesh(g, typeof m === 'string' ? mat(m) : m); me.position.z = z; return me;
}
function stadiumShape(w, h, hole) {
  const r = h / 2, s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -r); s.lineTo(w / 2 - r, -r); s.absarc(w / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2);
  s.lineTo(-w / 2 + r, r); s.absarc(-w / 2 + r, 0, r, Math.PI / 2, Math.PI * 1.5);
  if (hole) {
    const [hw, hh] = hole, hr = hh / 2, p = new THREE.Path();
    p.moveTo(-hw / 2 + hr, -hr); p.absarc(-hw / 2 + hr, 0, hr, Math.PI * 1.5, Math.PI / 2, true);
    p.lineTo(hw / 2 - hr, hr); p.absarc(hw / 2 - hr, 0, hr, Math.PI / 2, -Math.PI / 2, true); p.lineTo(-hw / 2 + hr, -hr);
    s.holes.push(p);
  }
  return s;
}

// ---------------------------------------------------------------- plug parts
// Strain-relief boot from (z0, r0) to (z1, cable radius + wall), ribbed on the back part.
function bootProfile(z0, r0, z1, rc, { ribCount = 6, ribDepth = 0.5, smooth = 0.35 } = {}) {
  const zr = z0 + (z1 - z0) * smooth, rr = r0 - (r0 - rc) * smooth * 0.6;
  const pts = [[r0, z0], [r0 - 0.05, z0 + 0.8], [rr, zr]];
  pts.push(...ribs(zr, z1 - 1.2, rr, rc + 0.35, ribCount, ribDepth));
  pts.push([rc + 0.35, z1 - 0.6], [rc + 0.1, z1], [Math.max(rc - 0.6, 0.1), z1], [0, z1]);
  return pts;
}

// XLR insert faces ------------------------------------------------
const XLR3 = [[-3.95, 2.3], [3.95, 2.3], [0, -4.6]]; // 3-pin positions as seen on the mating face (x mirrored per gender)
const XLR5 = [[-4.9, 1.6], [4.9, 1.6], [-3.5, -4.0], [3.5, -4.0], [0, 0.6]];

function xlrFemaleFront(g, zFace, pins = XLR3) {
  g.add(lathe([[0, zFace], [8.45, zFace]], 'insulator'));
  for (const [x, y] of pins) {
    const h = disc(1.25, zFace - 0.02, 'hole', 20); h.position.x = x; h.position.y = y; g.add(h);
    const ring = lathe([[1.25, zFace + 1.2], [1.25, zFace - 0.03], [1.75, zFace - 0.03], [1.95, zFace + 0.2]], 'insulator', { segs: 20 });
    ring.position.set(x, y, 0); g.add(ring);
  }
  // pin numbers moulded in the face: tiny raised ribs (brand neutral)
  const key = box(1.6, 0.6, 0.3, 'insulator', 0, 7.4, zFace - 0.1); g.add(key);
}
function xlrMalePins(g, zFace, zTip, pins = XLR3) {
  g.add(lathe([[0, zFace], [8.6, zFace]], 'insulator'));
  for (const [x, y] of pins) {
    const p = lathe([[0, zTip], [0.55, zTip + 0.12], [0.79, zTip + 0.5], [0.79, zFace - 1.2], [1.35, zFace - 0.6], [1.35, zFace + 0.1]], 'gold', { segs: 16 });
    p.position.set(-x, y, 0); g.add(p);
  }
}

function xlrShellProfileFemale(zFront, zBack, R) {
  return [
    [8.45, zFront + 1.2], [8.45, zFront + 0.25], [8.75, zFront], [R - 0.9, zFront], [R - 0.6, zFront + 0.25],
    [R - 0.6, -1.1], [R - 0.35, -0.8], [R, -0.45], [R, 2], [R - 0.12, 8], [R - 0.15, zBack - 6], [R, zBack - 1.2], [R - 0.3, zBack - 0.2], [R - 0.9, zBack], [6, zBack],
  ];
}
function addLatch(g, R, z0, z1) {
  // latch window (dark) + push tab with grip ridges
  g.add(box(4.6, 0.9, z1 - z0 + 1.6, 'hole', 0, R - 0.25, (z0 + z1) / 2));
  const t = rbox(3.6, 1.8, z1 - z0, 0.5, 'nickel', 0, R + 0.35, (z0 + z1) / 2); g.add(t);
  for (let k = 0; k < 4; k++) g.add(box(3.2, 0.35, 0.45, 'nickelDark', 0, R + 1.3, z0 + 1.4 + k * 1.2));
}
function grooveRing(g, R, z, m = 'nickelDark') {
  g.add(lathe([[R + 0.02, z - 0.35], [R - 0.25, z - 0.15], [R - 0.25, z + 0.15], [R + 0.02, z + 0.35]], m));
}

// ---------------------------------------------------------------- plug builders
const B = {};

B.xlr_female = (o) => {
  const g = new THREE.Group(), R = 9.9, rc = o.radius ?? 3.25;
  g.add(lathe(xlrShellProfileFemale(-12, 30, R), 'nickel', { segs: 56 }));
  xlrFemaleFront(g, -10.8, o.pins === 5 ? XLR5 : XLR3);
  addLatch(g, R - 0.12, -3, 6);
  grooveRing(g, R - 0.1, 22);
  // chuck + boot
  g.add(lathe([[6, 30], [R - 0.5, 30], [R - 0.3, 30.4], [R - 0.3, 35], ...bootProfile(35.2, R - 0.45, 60, rc, { ribCount: 7, ribDepth: 0.45, smooth: 0.3 }).slice(1)], 'rubber', { segs: 48 }));
  return finish(g, { length: 60, radius: rc, insert: 12 });
};

function xlrMaleBody(g, o, R = 9.6, ringColor) {
  // shell: inner wall (back->front), lip, outer (front->back)
  g.add(lathe([[8.7, -0.5], [8.7, -13.6], [8.95, -14], [R - 0.3, -14], [R, -13.6], [R, -1], [R + 0.25, -0.6], [R + 0.25, 2], [R + 0.1, 20], [R + 0.25, 25], [R - 0.05, 26.2], [6, 26.2]], 'nickel', { segs: 56 }));
  // latch slot on top of shell
  g.add(box(2.4, 0.5, 3.2, 'insulator', 0, R - 0.15, -11.6));
  xlrMalePins(g, -1, -12.5, o.pins === 5 ? XLR5 : XLR3);
  grooveRing(g, R + 0.2, 18);
  if (ringColor) g.add(lathe([[R + 0.05, 21.4], [R + 0.3, 21.6], [R + 0.3, 24], [R + 0.05, 24.2]], mat(ringColor)));
  const rc = o.radius ?? 3.25;
  g.add(lathe([[6, 26.2], [R - 0.2, 26.2], [R, 26.6], [R, 31], ...bootProfile(31.2, R - 0.15, 56, rc, { ribCount: 7, ribDepth: 0.45, smooth: 0.3 }).slice(1)], 'rubber', { segs: 48 }));
  return rc;
}
B.xlr_male = (o) => { const g = new THREE.Group(); const rc = xlrMaleBody(g, o); return finish(g, { length: 56, radius: rc, insert: 14 }); };
// FLX10 DMX OUT is a 3-pin XLR (female panel socket) -> 3-pin male cable plug. Coloured ID ring to tell it from audio.
B.dmx_xlr = (o) => {
  const g = new THREE.Group(); const pins = o.pins === 5 ? 5 : 3;
  const rc = xlrMaleBody(g, { ...o, pins, radius: o.radius ?? 3.3 }, 9.6, colorKey(o.ringColor, '#6a2fb0'));
  return finish(g, { length: 56, radius: rc, insert: 14 });
};

// 6.35 mm TRS shaft (z<0) ------------------------------------------------
function trsShaft(g) {
  const T = 3.175;
  g.add(lathe([[0, -31.2], ...arc(0, -28.7, 2.5, -Math.PI / 2, -0.35, 6).slice(1), [3.12, -27.9], [3.12, -27.1], [2.25, -25.9], [2.2, -24.3], [0.5, -24.3]], 'chrome', { segs: 40 }));
  g.add(lathe([[2.2, -24.3], [3.05, -24.2], [3.08, -21.6], [2.6, -21.5]], 'insulator', { segs: 40 }));
  g.add(lathe([[2.6, -21.6], [3.1, -21.55], [T, -21.3], [T, -16.9], [3.1, -16.65], [2.6, -16.6]], 'chrome', { segs: 40 }));
  g.add(lathe([[2.6, -16.7], [3.05, -16.6], [3.08, -14.6], [2.6, -14.5]], 'insulator', { segs: 40 }));
  g.add(lathe([[2.6, -14.6], [3.1, -14.55], [T, -14.3], [T, -0.5], [3.6, 0], [4, 0]], 'chrome', { segs: 40 }));
}
B.trs_635 = (o) => {
  const g = new THREE.Group(), R = 7.0, rc = o.radius ?? 3.0;
  trsShaft(g);
  g.add(lathe([[0, -0.01], [4.6, -0.01], [5.0, 0.3], [5.6, 1.6], [6.3, 2.4], [R - 0.1, 3.6], [R, 5], [R, 26], [R - 0.15, 28], [R - 0.6, 28.6], [5, 28.6]], 'nickel', { segs: 56 }));
  grooveRing(g, R, 7.5); grooveRing(g, R, 24.5);
  g.add(lathe([[5, 28.6], [R - 0.4, 28.6], [R - 0.1, 29], [R - 0.05, 36], ...bootProfile(36.2, R - 0.1, 60, rc, { ribCount: 8, ribDepth: 0.5, smooth: 0.15 }).slice(1)], 'rubber', { segs: 48 }));
  return finish(g, { length: 60, radius: rc, insert: 31.2 });
};

// RCA ------------------------------------------------
function rcaFront(g, metal) {
  // centre pin (hollow-tipped look), insulator, split ground sleeve
  g.add(lathe([[0, -13.4], [0.9, -13.25], [1.45, -12.8], [1.58, -12.2], [1.58, -3], [1.9, -2.6]], metal, { segs: 28 }));
  g.add(disc(0.55, -13.42, 'hole', 12));
  g.add(lathe([[0, -2.2], [3.6, -2.2]], 'insulator', { segs: 32 }));
  for (let k = 0; k < 4; k++) {
    const gap = 0.16, a0 = k * Math.PI / 2 + gap / 2;
    const s = lathe([[3.65, -0.5], [3.65, -8.6], [3.9, -8.9], [4.2, -8.6], [4.25, -7.6], [4.12, -6.8], [4.15, -0.5]], metal, { segs: 12, phiStart: a0, phiLength: Math.PI / 2 - gap });
    s.material = s.material.clone(); s.material.side = THREE.DoubleSide; g.add(s);
  }
}
B.rca = (o) => {
  const g = new THREE.Group(), metal = o.finish === 'nickel' ? 'nickel' : 'goldBrushed', R = 5.0, rc = o.radius ?? 2.4;
  rcaFront(g, o.finish === 'nickel' ? 'chrome' : 'gold');
  const col = mat(colorKey(o.color, 'red'));
  g.add(lathe([[0, -0.4], [3.9, -0.4], [4.4, 0], [R, 0.6], [R, 4], [R - 0.35, 4.5], [R - 0.35, 5.5], [R, 6], [R, 9], [R - 0.35, 9.5], [R - 0.35, 10.5], [R, 11], [R, 15.4], [R - 0.3, 15.9], [3.5, 15.9]], metal, { segs: 48 }));
  g.add(lathe([[3.5, 15.9], [R - 0.15, 15.9], [R + 0.05, 16.2], [R + 0.05, 19.2], [R - 0.2, 19.6], [3.5, 19.6]], col, { segs: 48 }));
  g.add(lathe([[3.5, 19.6], [4.3, 19.6], [4.4, 20.2], ...bootProfile(20.4, 4.35, 36, rc, { ribCount: 6, ribDepth: 0.45, smooth: 0.1 }).slice(1)], 'rubber', { segs: 40 }));
  return finish(g, { length: 36, radius: rc, insert: 13.4 });
};

// USB-C ------------------------------------------------
function usbcFront(g) {
  const shellGeo = new THREE.ExtrudeGeometry(stadiumShape(8.1, 2.32, [7.5, 1.72]), { depth: 6.4, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 2, curveSegments: 12 });
  shellGeo.translate(0, 0, -6.55);
  g.add(new THREE.Mesh(shellGeo, mat('steel')));
  // interior: dark insulator walls + contact rows
  const inner = new THREE.Mesh(new THREE.ShapeGeometry(stadiumShape(7.5, 1.72), 12), mat('insulator')); inner.position.z = -1.0; inner.rotation.y = Math.PI; g.add(inner);
  const cav = new THREE.Mesh(new THREE.ShapeGeometry(stadiumShape(6.9, 0.75), 12), mat('hole')); cav.position.z = -1.05; cav.rotation.y = Math.PI; g.add(cav);
  for (let s = -1; s <= 1; s += 2) for (let k = 0; k < 12; k++) g.add(box(0.22, 0.12, 4.5, 'gold', -3.0 + k * 0.545, s * 0.62, -3.6));
  // insulator lining the shell so the opening reads dark from the front
  const lin = new THREE.ExtrudeGeometry(stadiumShape(7.5, 1.72, [6.9, 0.75]), { depth: 0.3, bevelEnabled: false, curveSegments: 12 }); lin.translate(0, 0, -6.2);
  g.add(new THREE.Mesh(lin, mat('insulator')));
}
B.usb_c = (o) => {
  const g = new THREE.Group(), rc = o.radius ?? 2.0, body = mat(colorKey(o.color, 'black'));
  usbcFront(g);
  g.add(rbox(10.6, 4.8, 1.4, 0.6, body, 0, 0, 0.6));
  g.add(rbox(12.4, 6.6, 20, 2.4, body, 0, 0, 11.2, 4));
  g.add(lathe([[0, 21.0], [3.4, 21.0], ...bootProfile(21.2, 3.4, 31, rc, { ribCount: 4, ribDepth: 0.3, smooth: 0.2 }).slice(1)], body, { segs: 32 }));
  return finish(g, { length: 31, radius: rc, insert: 6.55 });
};

// DC barrel ------------------------------------------------
// FLX10 DC IN takes the supplied 12 V adapter's straight moulded barrel plug (5.5 mm OD, 2.5 mm ID assumed).
function barrelFront(g) {
  g.add(lathe([[1.25, -0.4], [1.25, -9.25], [1.45, -9.5], [2.5, -9.5], [2.75, -9.25], [2.75, -0.2], [3.3, 0]], 'chrome', { segs: 40 }));
  g.add(disc(1.25, -6.5, 'hole', 20));
  g.add(lathe([[1.27, -1], [1.27, -9.0], [1.3, -9.1]], 'nickelDark', { segs: 24 }));
}
B.dc_barrel = (o) => {
  const g = new THREE.Group(), R = 5.2, rc = o.radius ?? 1.9, body = mat(colorKey(o.color, 'black'));
  barrelFront(g);
  g.add(lathe([[0, -0.05], [4.2, -0.05], [4.8, 0.4], [R, 1.4], [R, 5], ...ribs(5, 15, R, R, 5, 0.3, 0.5), [R, 15], [R, 19], [R - 0.4, 20], [4, 21], [3.4, 23], ...bootProfile(23.1, 3.3, 34, rc, { ribCount: 5, ribDepth: 0.35, smooth: 0.15 }).slice(1)], body, { segs: 40 }));
  return finish(g, { length: 34, radius: rc, insert: 9.5 });
};

// ---------------------------------------------------------------- right-angle variants
// simpler: build the vertical lathe in "down" coordinates (d = distance below axis) and map d -> -y
function downLathe(profileD, m, zc, o) {
  const geo = latheGeo(profileD, o); geo.rotateX(Math.PI / 2); // (r, d) with d along +z -> -y
  const me = new THREE.Mesh(geo, typeof m === 'string' ? mat(m) : m); me.position.z = zc; return me;
}
function raBody(g, { R, z0, zc, dBody, dEnd, rc, m, bootM = 'rubber', ribCount = 6, front }) {
  const mm = typeof m === 'string' ? mat(m) : m;
  g.add(lathe(front || [[R - 0.7, z0], [R - 0.1, z0 + 0.5], [R, z0 + 1.2], [R, zc]], mm, { segs: 48 }));
  const sm = m === 'nickel' ? mat('nickelIso') : mm;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), sm);
  cap.rotation.x = Math.PI / 2; cap.position.z = zc; g.add(cap);
  // upper half-dome above the axis is covered by the sphere cap; vertical part:
  const top = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), sm);
  top.position.z = zc; g.add(top); // dome upward (rounded top of the elbow)
  g.add(downLathe([[R, 0], [R, dBody - 0.8], [R - 0.3, dBody - 0.1], [R - 0.8, dBody]], mm, zc));
  g.add(downLathe(bootProfile(dBody, R - 0.8, dEnd, rc, { ribCount, ribDepth: 0.45, smooth: 0.15 }), bootM, zc));
}

B.xlr_female_ra = (o) => {
  // NC3FRX-style: short nickel insert housing, black right-angle body with latch on top
  const g = new THREE.Group(), R = 9.9, rc = o.radius ?? 3.25, zc = 16;
  g.add(lathe([[8.45, -10.8], [8.45, -11.75], [8.75, -12], [R - 0.9, -12], [R - 0.6, -11.75], [R - 0.6, -1.1], [R - 0.35, -0.8], [R, -0.45], [R, 4.6], [R - 0.4, 5], [7, 5]], 'nickel', { segs: 56 }));
  xlrFemaleFront(g, -10.8, o.pins === 5 ? XLR5 : XLR3);
  addLatch(g, R - 0.12, -3, 3.8);
  raBody(g, { R: 10.6, z0: 5, zc, dBody: 30, dEnd: 50, rc, m: 'plastic', ribCount: 6 });
  return finish(g, { length: zc + 10.6, drop: 50, radius: rc, exitZ: zc, insert: 12 });
};
B.xlr_male_ra = (o) => {
  // NC3MRX-style: short nickel male shell with pins, black right-angle body, cable down
  const g = new THREE.Group(), R = 9.6, rc = o.radius ?? 3.25, zc = 16;
  g.add(lathe([[8.7, -0.5], [8.7, -13.6], [8.95, -14], [R - 0.3, -14], [R, -13.6], [R, -1], [R + 0.25, -0.6], [R + 0.25, 4.6], [R - 0.15, 5], [7, 5]], 'nickel', { segs: 56 }));
  g.add(box(2.4, 0.5, 3.2, 'insulator', 0, R - 0.15, -11.6));
  xlrMalePins(g, -1, -12.5, o.pins === 5 ? XLR5 : XLR3);
  raBody(g, { R: 10.6, z0: 5, zc, dBody: 30, dEnd: 50, rc, m: 'plastic', ribCount: 6 });
  return finish(g, { length: zc + 10.6, drop: 50, radius: rc, exitZ: zc, insert: 14 });
};
B.trs_635_ra = (o) => {
  const g = new THREE.Group(), R = 7.2, rc = o.radius ?? 3.0, zc = 9.5;
  trsShaft(g);
  g.add(lathe([[0, -0.01], [4.6, -0.01], [5.0, 0.3], [5.6, 1.6], [6.3, 2.2], [R - 0.2, 2.8], [R, 3.4], [R, 4.2]], 'nickel', { segs: 48 }));
  raBody(g, { R, z0: 4.2, zc, dBody: 24, dEnd: 50, rc, m: 'nickel', ribCount: 8, front: [[R, 4.2], [R, zc]] });
  grooveRing(g, R, 5.2);
  return finish(g, { length: zc + R, drop: 50, radius: rc, exitZ: zc, insert: 31.2 });
};
B.rca_ra = (o) => {
  const g = new THREE.Group(), R = 5.0, rc = o.radius ?? 2.4, zc = 6.5;
  rcaFront(g, o.finish === 'nickel' ? 'chrome' : 'gold');
  const metal = o.finish === 'nickel' ? 'nickel' : 'goldBrushed';
  raBody(g, { R, z0: -0.4, zc, dBody: 13, dEnd: 30, rc, m: metal, ribCount: 5, front: [[0, -0.4], [3.9, -0.4], [4.4, 0], [R, 0.6], [R, zc]] });
  g.add(downLathe([[R + 0.05, 8.2], [R + 0.05, 11.6], [R - 0.2, 12.0]], mat(colorKey(o.color, 'red')), zc));
  g.add(downLathe([[R - 0.2, 7.8], [R + 0.05, 8.2]], mat(colorKey(o.color, 'red')), zc));
  return finish(g, { length: zc + R, drop: 30, radius: rc, exitZ: zc, insert: 13.4 });
};
B.usb_c_ra = (o) => {
  const g = new THREE.Group(), rc = o.radius ?? 2.0, body = mat(colorKey(o.color, 'black'));
  usbcFront(g);
  g.add(rbox(10.6, 4.8, 1.4, 0.6, body, 0, 0, 0.6));
  // L-shaped overmould: 12.4 wide, 7 deep, from +3.3 above axis down to -20
  g.add(rbox(12.4, 23.6, 7.2, 2.4, body, 0, -8.5, 4.9, 4));
    g.add(downLathe(bootProfile(20.2, 3.4, 28, rc, { ribCount: 4, ribDepth: 0.3, smooth: 0.2 }), body, 4.9));
  return finish(g, { length: 8.5, drop: 28, radius: rc, exitZ: 4.9, insert: 6.55 });
};
B.dc_barrel_ra = (o) => {
  const g = new THREE.Group(), R = 5.2, rc = o.radius ?? 1.9, zc = 6.5, body = colorKey(o.color, 'black');
  barrelFront(g);
  raBody(g, { R, z0: -0.05, zc, dBody: 14, dEnd: 28, rc, m: body, bootM: body, ribCount: 5, front: [[0, -0.05], [4.2, -0.05], [4.8, 0.4], [R, 1.4], [R, zc]] });
  return finish(g, { length: zc + R, drop: 28, radius: rc, exitZ: zc, insert: 9.5 });
};

function finish(g, { length, radius, drop, exitZ, insert }) {
  g.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
  const ra = drop != null;
  Object.assign(g.userData, {
    length, radius, insert,
    rightAngle: ra,
    drop: ra ? drop : 0,
    exit: ra ? [0, -drop, exitZ] : [0, 0, length],
    exitDir: ra ? [0, -1, 0] : [0, 0, 1],
  });
  return g;
}

// ---------------------------------------------------------------- public API
export const PLUG_KINDS = ['xlr_female', 'xlr_male', 'dmx_xlr', 'trs_635', 'rca', 'usb_c', 'dc_barrel',
  'xlr_female_ra', 'xlr_male_ra', 'trs_635_ra', 'rca_ra', 'usb_c_ra', 'dc_barrel_ra'];

/**
 * makePlug(kind, opts) -> THREE.Group
 * opts: color ('red'|'white'|hex, rca / overmoulds), finish ('gold'|'nickel', rca), pins (3|5, xlr/dmx), radius (cable radius override),
 *       ringColor (dmx ID ring).
 * userData: { length, radius, drop, insert, rightAngle, exit:[x,y,z], exitDir:[x,y,z] } (plug-local).
 */
export function makePlug(kind, opts = {}) {
  const f = B[kind];
  if (!f) throw new Error('makePlug: unknown kind ' + kind);
  const g = f(opts);
  g.name = 'plug_' + kind;
  g.userData.kind = kind;
  return g;
}

const PORT_TO_PLUG = {
  xlr_male_out: 'xlr_female', xlr_trs_combo_in: 'xlr_male', trs_jack: 'trs_635', rca: 'rca',
  usb_c: 'usb_c', dc_in: 'dc_barrel', dmx_xlr: 'dmx_xlr',
};
/** plugKindFor(portKind, { rightAngle }) -> plug kind or null (switch / kensington have no plug). */
export function plugKindFor(portKind, { rightAngle = false } = {}) {
  const k = PORT_TO_PLUG[portKind];
  if (!k) return null;
  if (rightAngle && B[k + '_ra']) return k + '_ra';
  return k;
}

const cableMats = {};
function cableMat(color) {
  const key = colorKey(color, '#141416');
  return cableMats[key] || (cableMats[key] = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(key), metalness: 0, roughness: 0.48, clearcoat: 0.25, clearcoatRoughness: 0.45 }));
}
/** makeCable(points:Vector3[]|[x,y,z][], { radius=3, color, segments, radial=14 }) -> Mesh (centripetal CatmullRom tube) */
export function makeCable(points, { radius = 3, color, segments, radial = 14 } = {}) {
  const pts = points.map((p) => (p.isVector3 ? p.clone() : new THREE.Vector3(...p)));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const n = segments ?? Math.min(600, Math.max(16, Math.round(curve.getLength() / 2.5)));
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, n, radius, radial, false), cableMat(color));
  m.castShadow = true; m.receiveShadow = true;
  // end caps (cut cable face) so the tube never reads hollow
  for (const t of [0, 1]) {
    const c = new THREE.Mesh(new THREE.CircleGeometry(radius, radial), cableMat(color));
    const tan = curve.getTangentAt(t);
    c.position.copy(curve.getPointAt(t));
    c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), t ? tan : tan.clone().negate());
    m.add(c);
  }
  m.userData.curve = curve;
  return m;
}

const V = (p) => (p.isVector3 ? p.clone() : new THREE.Vector3(...p));
/**
 * routeCable({ start, startDir=[0,0,1], plugLength=0, end, endDir=[0,-1,0], sag=0, radius=3, lead, tail, samples=24 }) -> Vector3[]
 * start/startDir: plug origin (or exit point) and cable exit direction (e.g. +z for straight plugs, -y for RA plugs);
 * the cable begins at start + startDir*plugLength, runs straight for `lead` (default 4 diameters), bends with a radius of
 * at least ~5 diameters, sags by `sag` mm, and arrives at `end` travelling along `endDir` (straight for `tail`).
 */
export function routeCable({ start, startDir = [0, 0, 1], plugLength = 0, end, endDir = [0, -1, 0], sag = 0, radius = 3, lead, tail, samples = 24 }) {
  const sd = V(startDir).normalize(), ed = V(endDir).normalize();
  const p0 = V(start).addScaledVector(sd, plugLength - Math.min(1, plugLength * 0.05 + 0.5));
  const pe = V(end);
  const D = 2 * radius, Rmin = 5 * D;
  lead = lead ?? Math.max(4 * D, 10);
  tail = tail ?? Math.max(3 * D, 10);
  const span = p0.distanceTo(pe);
  if (lead + tail > span * 0.8) { const k = (span * 0.8) / (lead + tail); lead *= k; tail *= k; }
  const a = p0.clone().addScaledVector(sd, lead);
  const b = pe.clone().addScaledVector(ed, -tail);
  const d = a.distanceTo(b);
  const turn = Math.acos(THREE.MathUtils.clamp(sd.dot(ed), -1, 1)); // 0 .. pi
  // cubic handles: ~0.552 R per 90deg of turn (never tighter than Rmin), limited so the curve never doubles back
  const ab = b.clone().sub(a);
  const ps = Math.max(ab.dot(sd), 0), pe2 = Math.max(ab.dot(ed), 0);
  const share = turn < Math.PI / 3 ? 0.5 : 0.95;
  const hArc = Rmin * (4 / 3) * Math.tan(turn / 4) * 1.05;
  const h1 = Math.max(Math.min(Math.max(d * 0.42, hArc), ps * share), Math.min(2, d * 0.2));
  const h2 = Math.max(Math.min(Math.max(d * 0.42, hArc), pe2 * share), Math.min(2, d * 0.2));
  const c1 = a.clone().addScaledVector(sd, h1), c2 = b.clone().addScaledVector(ed, -h2);
  const sagV = new THREE.Vector3(0, -sag * 4 / 3, 0); c1.add(sagV); c2.add(sagV);
  const bez = new THREE.CubicBezierCurve3(a, c1, c2, b);
  const out = [p0];
  const nLead = Math.max(1, Math.round(lead / 12));
  for (let i = 1; i < nLead; i++) out.push(p0.clone().lerp(a, i / nLead));
  if (d < 1e-3) out.push(a); else out.push(...bez.getPoints(samples));
  const nTail = Math.max(1, Math.round(tail / 12));
  for (let i = 1; i <= nTail; i++) out.push(b.clone().lerp(pe, i / nTail));
  // drop near-duplicates (CatmullRom dislikes them)
  return out.filter((p, i) => i === 0 || p.distanceTo(out[i - 1]) > 0.05);
}

/** Convenience: cable for a plug that is already placed in the scene (uses its world matrix). */
export function cableFromPlug(plug, { end, endDir = [0, -1, 0], sag = 0, color, lead, tail } = {}) {
  plug.updateWorldMatrix(true, false);
  const u = plug.userData;
  const start = new THREE.Vector3(...u.exit).applyMatrix4(plug.matrixWorld);
  const dir = new THREE.Vector3(...u.exitDir).transformDirection(plug.matrixWorld);
  const pts = routeCable({ start, startDir: dir, plugLength: 0, end, endDir, sag, radius: u.radius, lead, tail });
  pts[0].addScaledVector(dir, -1.2); // tuck into the boot
  return makeCable(pts, { radius: u.radius, color });
}

function triCount(o) { let t = 0; o.traverse((c) => { if (c.isMesh) { const g = c.geometry; t += (g.index ? g.index.count : g.attributes.position.count) / 3; } }); return t; }

// ---------------------------------------------------------------- demo
export async function build(THREE_, opts = {}) {
  const group = new THREE.Group();
  const info = { plugs: {} };
  const rowA = [['xlr_female'], ['xlr_male'], ['dmx_xlr'], ['trs_635'], ['rca', { color: 'red' }], ['rca', { color: 'white' }], ['usb_c'], ['dc_barrel']];
  const rowB = [['xlr_female_ra'], ['xlr_male_ra'], ['trs_635_ra'], ['rca_ra', { color: 'red' }], ['rca_ra', { color: 'white' }], ['usb_c_ra'], ['dc_barrel_ra']];
  const place = (row, z, y, ra) => {
    const sp = 34, x0 = -((row.length - 1) * sp) / 2;
    row.forEach(([k, o = {}], i) => {
      const p = makePlug(k, o);
      p.position.set(x0 + i * sp, y, z);
      group.add(p);
      const u = p.userData;
      const key = k + (o.color ? '_' + o.color : '');
      info.plugs[key] = { length: u.length, drop: u.drop, radius: u.radius, insert: u.insert, tris: Math.round(triCount(p)) };
      const end = ra ? [p.position.x, 12, z + u.exit[2]] : [p.position.x, u.radius, z + 150];
      group.add(cableFromPlug(p, { end, endDir: ra ? [0, -1, 0] : [0, 0, 1], sag: 0 }));
    });
  };
  place(rowA, 0, 30, false);
  place(rowB, -130, 110, true);
  info.kinds = PLUG_KINDS;
  return { group, info };
}
