// Keychron B1 Pro ultra-slim wireless keyboard (UK ISO layout, Space Grey) — hand-built model.
// Units mm, +y up, +z towards the user (typing edge), +x to the user's right.
// Group origin: centre of the bottom face (footprint centre, y = 0 = underside of the rubber feet).
//
// Sources (see notes/keyboard.md):
//  * 296 x 130 mm, 5.2 mm front / 14.5 mm rear height, 3.2 deg typing angle — Amazon listing image
//    refs/keyboard/az6.jpg and the listing's spec table (also Keychron's product page).
//  * Layout: Keychron's orthographic top view refs/keyboard/az6.jpg. Every key rectangle below was measured
//    (thresholded connected components) in that image; the image is also the albedo of the deck and of the
//    keycap tops (legends, the dished shading, the three status LEDs above F10..F12).
//    Mapping: 4.935 px/mm across (1461 px = 296 mm), 4.889 px/mm along the deck (616 px = 126 mm).

const W = 296, D = 130;                 // overall footprint (incl. rear bar)
const PW = 296, PD = 126;               // deck (key plate) outline
const PZ0 = -61, PZ1 = 65;              // deck rear / front edge in deck-local z
const PR = 12;                          // deck corner radius
const T = 3.4;                          // deck slab thickness at its edge
const ANG = 3.2 * Math.PI / 180;        // typing angle
const H_FRONT = 5.2, H_REAR = 14.5;
const FOOT_H = 0.6;                     // rubber feet
const CAP_H = 1.9;                      // keycap top above the deck surface
const BAR_L = 250;                      // rear bar length (top view: px 385..1618)

// photo (az6.jpg, 2000x2000) -> deck mm
const PX0 = 1001.5, SXP = 4.935, PY0 = 578, SZP = 4.889;
const mx = (px) => (px - PX0) / SXP;
const mz = (py) => PZ0 + (py - PY0) / SZP;

const REF = (p) => new URL('../refs/keyboard/' + p, import.meta.url).href;

// key rectangles in az6.jpg pixels: [x0, x1, y0, y1, name]
function keyRects() {
  const K = [];
  // row 0: esc, F1..F12, del (the F row has its own pitch: 96.5 px)
  const r0 = [[301, 447, 'esc'], [460, 544], [556, 640], [653, 737], [749, 833], [846, 930], [942, 1026], [1039, 1123],
    [1135, 1219], [1232, 1316], [1328, 1412], [1424, 1509], [1521, 1605], [1617, 1702, 'del']];
  r0.forEach(([a, b, n]) => K.push([a, b, 608, 693, n || 'f']));
  // row 1: § 1..0 - = (13) + backspace
  for (let k = 0; k < 13; k++) K.push([301 + 94 * k, 386 + 94 * k, 702, 787, 'n']);
  K.push([1523, 1702, 702, 787, 'backspace']);
  // row 2: tab Q..P [ ] + ISO enter
  K.push([301, 433, 796, 881, 'tab']);
  for (let k = 0; k < 12; k++) K.push([442 + 94 * k, 527 + 94 * k, 796, 881, 'a']);
  // row 3: caps A..L ; ' #
  K.push([301, 456, 890, 975, 'caps']);
  for (let k = 0; k < 12; k++) K.push([466 + 94 * k, 550 + 94 * k, 890, 975, 'a']);
  // row 4: short shift, \ Z..M , . /, right shift
  K.push([301, 410, 984, 1069, 'shift']);
  [418, 512, 606, 700, 794, 888, 983, 1077, 1170, 1265, 1359].forEach((a) => K.push([a, a + 85, 984, 1069, 'a']));
  K.push([1452, 1702, 984, 1069, 'rshift']);
  // row 5
  [[301, 433, 'ctrl'], [442, 550, 'opt'], [559, 668, 'cmd'], [677, 1209, 'space'], [1217, 1326, 'cmd'], [1335, 1420, 'fn'],
    [1429, 1514, 'left'], [1617, 1702, 'right']].forEach(([a, b, n]) => K.push([a, b, 1078, 1164, n]));
  K.push([1523, 1608, 1078, 1121, 'up']);
  K.push([1523, 1608, 1125, 1166, 'down']);
  return K;
}

export async function build(THREE, opts = {}) {
  const g = new THREE.Group();
  g.name = 'Keychron B1 Pro';

  // ------------------------------------------------------------------ photo texture
  const img = await new Promise((res) => {
    const im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = () => res(im); im.onerror = () => res(null); im.src = REF('az6.jpg');
  });
  const TX = 1461, TY = 616;                 // deck crop px 271..1732 x 578..1194
  const cv = document.createElement('canvas'); cv.width = 2048; cv.height = Math.round(2048 * TY / TX);
  {
    const c = cv.getContext('2d');
    c.fillStyle = '#7f8293'; c.fillRect(0, 0, cv.width, cv.height);
    if (img) {
      c.imageSmoothingQuality = 'high';
      c.drawImage(img, 271, 578, TX, TY, 0, 0, cv.width, cv.height);
      // the photo's white background shows in the rounded corners: paint the deck rim colour over it
      const k = cv.width / PW;
      c.strokeStyle = '#7f8293'; c.lineWidth = 2.2 * k;
      const r = PR * k, w = cv.width, h = cv.height, i = 0.6 * k;
      c.beginPath(); c.roundRect(i, i, w - 2 * i, h - 2 * i, r); c.stroke();
      c.lineWidth = 6 * k; c.beginPath(); c.roundRect(-2.4 * k, -2.4 * k, w + 4.8 * k, h + 4.8 * k, r + 2.4 * k); c.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.flipY = false; tex.anisotropy = 8;
  // keycap copy: steeper tone curve (the studio photo lifts the black caps; keeps the legends bright)
  const cv2 = document.createElement('canvas'); cv2.width = cv.width; cv2.height = cv.height;
  {
    const c = cv2.getContext('2d'); c.drawImage(cv, 0, 0);
    const id = c.getImageData(0, 0, cv2.width, cv2.height), d = id.data, lut = new Uint8ClampedArray(256);
    for (let i = 0; i < 256; i++) lut[i] = 255 * Math.pow(i / 255, 1.5);
    for (let i = 0; i < d.length; i += 4) { d[i] = lut[d[i]]; d[i + 1] = lut[d[i + 1]]; d[i + 2] = lut[d[i + 2]]; }
    c.putImageData(id, 0, 0);
  }
  const capTex = new THREE.CanvasTexture(cv2);
  capTex.colorSpace = THREE.SRGBColorSpace; capTex.flipY = false; capTex.anisotropy = 8;
  const uvOf = (x, z) => [(x + PW / 2) / PW, (z - PZ0) / PD];

  // ------------------------------------------------------------------ materials
  const M = {
    deck: new THREE.MeshStandardMaterial({ map: tex, color: new THREE.Color(0.62, 0.62, 0.6), roughness: 0.5, metalness: 0.3 }),
    shell: new THREE.MeshStandardMaterial({ color: 0x5f6371, roughness: 0.42, metalness: 0.45 }),
    under: new THREE.MeshStandardMaterial({ color: 0x555965, roughness: 0.55, metalness: 0.3 }),
    capTop: new THREE.MeshStandardMaterial({ map: capTex, color: new THREE.Color(0.9, 0.9, 0.9), roughness: 0.7, metalness: 0.0 }),
    capSide: new THREE.MeshStandardMaterial({ color: 0x131315, roughness: 0.62, metalness: 0.0 }),
    feet: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95 }),
    slot: new THREE.MeshStandardMaterial({ color: 0x060606, roughness: 0.9 }),
    knob: new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.45 }),
    usb: new THREE.MeshStandardMaterial({ color: 0xb8b8bc, roughness: 0.3, metalness: 1.0 }),
  };
  for (const m of [M.shell, M.under, M.deck]) m.shadowSide = THREE.DoubleSide;

  // ------------------------------------------------------------------ helpers
  // rounded polygon (any convex/concave corners) as a Shape; pts in (x, y) shape space, CCW or CW
  function roundPoly(pts, r) {
    const s = new THREE.Shape(); const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p = pts[i], a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
      const da = Math.hypot(a[0] - p[0], a[1] - p[1]), db = Math.hypot(b[0] - p[0], b[1] - p[1]);
      const rr = Math.min(r, da / 2, db / 2);
      const p1 = [p[0] + (a[0] - p[0]) / da * rr, p[1] + (a[1] - p[1]) / da * rr];
      const p2 = [p[0] + (b[0] - p[0]) / db * rr, p[1] + (b[1] - p[1]) / db * rr];
      if (i === 0) s.moveTo(p1[0], p1[1]); else s.lineTo(p1[0], p1[1]);
      s.quadraticCurveTo(p[0], p[1], p2[0], p2[1]);
    }
    s.closePath(); return s;
  }
  const rrect = (x0, x1, y0, y1, r) => roundPoly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], r);
  // extrude a plan shape (shape x = world x, shape y = -world z) upward from y0 by h
  function plan(shape, y0, h, bevel = 0, seg = 3, curve = 8) {
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(0.01, h - 2 * bevel), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel,
      bevelOffset: -bevel, bevelSegments: seg, curveSegments: curve,
    });
    geo.rotateX(-Math.PI / 2); geo.translate(0, y0 + bevel, 0);
    return geo;
  }
  const mesh = (geo, mat, name) => { const m = new THREE.Mesh(geo, mat); m.name = name; m.castShadow = true; m.receiveShadow = true; return m; };

  // ------------------------------------------------------------------ tilted deck frame
  // deck-local: top surface y = 0, z from PZ0 (rear) to PZ1 (front). Rotated +ANG about x (rear goes up).
  const deck = new THREE.Group(); deck.name = 'deck';
  const P = H_FRONT + PZ1 * Math.sin(ANG);
  deck.position.set(0, P, 0); deck.rotation.x = ANG;
  g.add(deck);
  const deckTopY = (zw) => P - zw * Math.tan(ANG);          // world height of the deck surface (approx.)

  // deck slab: rounded rect, rounded top edge
  {
    const sh = rrect(-PW / 2, PW / 2, -PZ1, -PZ0, PR);
    const geo = plan(sh, -T, T, 0.9, 3, 12);
    // UVs: top-facing faces sample the photo
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) { const [u, v] = uvOf(pos.getX(i), pos.getZ(i)); uv.setXY(i, u, v); }
    // group 0 = caps (top/bottom), group 1 = sides
    const m = mesh(geo, [M.deck, M.shell], 'deckSlab');
    deck.add(m);
  }

  // keycaps: one merged geometry for the tops (photo) and one for the sides
  {
    const tops = [], sides = [];
    const pushGeo = (geo) => {
      const pos = geo.attributes.position, nor = geo.attributes.normal;
      for (const gr of geo.groups) {
        const dst = gr.materialIndex === 0 ? tops : sides;
        for (let i = gr.start; i < gr.start + gr.count; i++) dst.push(pos.getX(i), pos.getY(i), pos.getZ(i), nor.getX(i), nor.getY(i), nor.getZ(i));
      }
    };
    const R = 2.1, BEV = 0.55;
    for (const [a, b, c, d] of keyRects()) {
      const x0 = mx(a), x1 = mx(b), z0 = mz(c), z1 = mz(d);
      pushGeo(plan(rrect(x0, x1, -z1, -z0, R), -0.6, CAP_H + 0.6, BEV, 2, 4));
    }
    // ISO enter (L shape): top part px 1571..1702 x 797..881, lower part px 1594..1702 down to 975
    {
      const xa = mx(1571), xb = mx(1594), xc = mx(1702), za = mz(797), zb = mz(881), zc = mz(975);
      const sh = roundPoly([[xa, -za], [xa, -zb], [xb, -zb], [xb, -zc], [xc, -zc], [xc, -za]].reverse(), R);
      pushGeo(plan(sh, -0.6, CAP_H + 0.6, BEV, 2, 4));
    }
    const mk = (arr, mat, name, uvs) => {
      const geo = new THREE.BufferGeometry(); const n = arr.length / 6;
      const p = new Float32Array(n * 3), q = new Float32Array(n * 3), t = new Float32Array(n * 2);
      for (let i = 0; i < n; i++) {
        p.set(arr.slice(i * 6, i * 6 + 3), i * 3); q.set(arr.slice(i * 6 + 3, i * 6 + 6), i * 3);
        const [u, v] = uvOf(arr[i * 6], arr[i * 6 + 2]); t[i * 2] = u; t[i * 2 + 1] = v;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(p, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(q, 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(t, 2));
      return mesh(geo, mat, name);
    };
    deck.add(mk(tops, M.capTop, 'keycapTops'));
    deck.add(mk(sides, M.capSide, 'keycapSides'));
  }

  // ------------------------------------------------------------------ lower body (recessed wedge under the deck)
  {
    const sh = rrect(-PW / 2 + 2.2, PW / 2 - 2.2, -(PZ1 - 3), -(PZ0 + 1), PR - 2);
    const geo = plan(sh, FOOT_H, 20, 0, 1, 8);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) > FOOT_H + 1) pos.setY(i, deckTopY(pos.getZ(i)) - T - 0.2);
    }
    geo.computeVertexNormals();
    g.add(mesh(geo, M.under, 'body'));
  }

  // ------------------------------------------------------------------ rear bar (battery / switch spine)
  // side profile (world z, y); extruded along x, ends rounded by the bevel
  {
    const prof = [[-55, FOOT_H], [-62.6, FOOT_H], [-63.8, 3.0], [-64.6, 8.0], [-65.0, 12.4], [-64.4, 14.0], [-63.0, 14.5],
      [-61.4, 14.3], [-60.6, 13.4], [-60.4, 11.0], [-55, 9.0]];
    const s = new THREE.Shape(); prof.forEach(([z, y], i) => (i ? s.lineTo(-z, y) : s.moveTo(-z, y))); s.closePath();
    const BV = 1.4;
    const geo = new THREE.ExtrudeGeometry(s, { depth: BAR_L - 2 * BV, bevelEnabled: true, bevelThickness: BV, bevelSize: 0.6, bevelOffset: -0.6, bevelSegments: 4, curveSegments: 4 });
    geo.translate(0, 0, -(BAR_L / 2 - BV)); geo.rotateY(Math.PI / 2);
    // rotateY(+90): shape x -> world -z ... we stored shape x = -z, so flip back
    geo.scale(1, 1, 1);
    const m = mesh(geo, M.shell, 'rearBar');
    g.add(m);
  }
  // rear-face height helper (z of the rear face at height y)
  const rearZ = (y) => (y < 3 ? -62.6 - (y - FOOT_H) * 0.5 : y < 8 ? -63.8 - (y - 3) * 0.16 : -64.6 - (y - 8) * 0.09);

  // ------------------------------------------------------------------ switches on the rear face (right end)
  // BT / Cable / 2.4G slider at x = +101, Mac / Win slider at x = +83.5 (top view az6 + rear photo az7)
  const switches = [
    { x: 101.0, w: 9.0, knob: 0.0, label: 'BT / Cable / 2.4G (Off below)' },
    { x: 83.5, w: 6.6, knob: -1.6, label: 'Mac / Win' },
  ];
  {
    const y = 6.6;
    for (const s of switches) {
      const z = rearZ(y);
      // recessed oval slot, axis along x, flattened against the (slightly leaning) rear face
      const slot = new THREE.Mesh(new THREE.CapsuleGeometry(2.2, s.w - 4.4, 4, 14), M.slot);
      slot.rotation.set(-0.12, 0, Math.PI / 2, 'XYZ'); slot.scale.set(1, 1, 0.35);
      slot.position.set(s.x, y, z + 0.25);
      g.add(slot);
      const knob = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.65, 2.0, 18), M.knob);
      knob.rotation.x = Math.PI / 2; knob.position.set(s.x + s.knob, y, z - 0.35); knob.castShadow = true;
      g.add(knob);
    }
    // printed labels: transparent decal on the rear face
    const lc = document.createElement('canvas'); lc.width = 1024; lc.height = 128;
    const c = lc.getContext('2d');
    c.fillStyle = '#e4e6ec'; c.textBaseline = 'middle'; c.font = '23px Arial'; c.textAlign = 'center';
    // canvas spans x = +118 (left, seen from behind) .. +70, y = 12.6 (top) .. 0.6
    const X = (xmm) => (118 - xmm) / 48 * 1024, Y = (ymm) => (12.6 - ymm) / 12 * 128;
    c.fillText('BT   Cable   2.4G', X(101), Y(10.0)); c.fillText('Off', X(101), Y(3.2));
    c.fillText('Mac', X(87.2), Y(10.0)); c.fillText('Win', X(79.6), Y(10.0));
    const lt = new THREE.CanvasTexture(lc); lt.colorSpace = THREE.SRGBColorSpace; lt.anisotropy = 4;
    const lm = new THREE.MeshStandardMaterial({ map: lt, transparent: true, depthWrite: false, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -4 });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(48, 12), lm);
    plane.rotation.set(0.12, Math.PI, 0, 'YXZ');
    plane.position.set(94, 6.6, rearZ(6.6) - 0.08);
    g.add(plane);
  }

  // ------------------------------------------------------------------ USB-C socket (rear face, left end — ESTIMATED)
  const usb = { x: -100, y: 7.0 };
  {
    const z = rearZ(usb.y);
    const hole = new THREE.Mesh(new THREE.CapsuleGeometry(1.3, 6.2, 4, 10), M.slot);
    hole.rotation.z = Math.PI / 2; hole.scale.set(1, 1, 0.3); hole.position.set(usb.x, usb.y, z + 0.1);
    g.add(hole);
    const tongue = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.7, 0.4), M.usb);
    tongue.position.set(usb.x, usb.y, z - 0.05); g.add(tongue);
  }

  // ------------------------------------------------------------------ rubber feet
  const feet = [
    { x: -108, z: -59.5, r: 4.5 }, { x: 108, z: -59.5, r: 4.5 },
    { x: -126, z: 55, r: 4.0 }, { x: 126, z: 55, r: 4.0 },
  ];
  {
    const fg = new THREE.CylinderGeometry(1, 1, FOOT_H + 0.4, 20);
    for (const f of feet) {
      const m = new THREE.Mesh(fg, M.feet); m.scale.set(f.r, 1, f.r); m.position.set(f.x, (FOOT_H + 0.4) / 2, f.z);
      m.receiveShadow = true; g.add(m);
    }
  }

  const info = {
    name: 'Keychron B1 Pro (UK ISO, Space Grey)',
    w: W, d: D, hFront: H_FRONT, hBack: H_REAR, typingAngleDeg: 3.2,
    deckTopFrontY: H_FRONT, deckTopRearY: +(P + 61 * Math.sin(ANG)).toFixed(2),
    feet,
    cablePort: { pos: [usb.x, usb.y, +rearZ(usb.y).toFixed(2)], dir: [0, 0, -1], kind: 'usb_c', estimated: true },
    switches: switches.map((s) => ({ x: s.x, label: s.label })),
  };
  return { group: g, info };
}
