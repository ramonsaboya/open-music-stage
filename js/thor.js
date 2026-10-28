// THOR DJS002 DJ deck stand (without the optional laptop shelf / bracket).
// Units mm, +y up, +z towards the DJ (front), origin = centre of the tabletop footprint on the floor.
// Construction (from retailer photos thor_01..12):
//  - Tabletop: a rectangular steel frame. Front and rear members are 30 x 58 mm rectangular tubes running the full
//    width, closed by black plastic end caps that show on the side faces. The side members are folded channels whose
//    top flange carries two zinc dome-head screws; between the flange and the black panel runs a narrow bright
//    (galvanised) strip. The black panel sits ~4 mm below the tube tops. Two bracket slots in the rear tube face.
//  - Each side frame is a "Z": a flat bracket bar under the side channel (clamped by two thumb knobs from below),
//    a slanted telescoping upright (narrow upper tube sliding in a wider lower tube that carries the J-hook slot and a
//    thumb knob), and a floor runner that projects forward to a front floor cross bar with levelling feet.
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export async function build(THREE, opts = {}) {
  // debug hook: harness.html?m=thor.js%3Fh%3D675%26 lets the harness render other heights (module URL query)
  let qH; try { qH = +new URL(import.meta.url).searchParams.get('h') || undefined; } catch (e) { qH = undefined; }
  const H = Math.min(925, Math.max(675, opts.height ?? qH ?? 800)); // tabletop (panel) upper surface
  const W = 995, D = 450;                     // owner-measured top footprint
  const HW = W / 2, HD = D / 2;
  const FRAME_H = 52;                          // frame/edge band height (side photos thor_07/08: ~50 mm + 6 mm plate; see notes)
  const PLATE = 6;                             // clamp plate under the side channel
  const RIM = 4;                               // front/rear tube tops stand 4 mm above the panel
  const TUBE_D = 30;                           // front/rear tube depth (z)
  const yTop = H + RIM, yBot = yTop - FRAME_H; // frame top / bottom
  const CAP = 6;                               // plastic end-cap thickness
  const XTUBE = HW - CAP;                      // tube ends / side-channel outer face
  const FLANGE = 36, STRIP = 10;                // side-channel top flange width, bright strip width
  const PANEL_X = XTUBE - FLANGE - STRIP;      // half width of the black panel
  const PANEL_T = 15;
  const CUT = { w: 250, d: 100 };
  const rearInnerZ = -HD + TUBE_D, frontInnerZ = HD - TUBE_D;
  CUT.x = 0; CUT.z = rearInnerZ + CUT.d / 2;

  // --- side frame geometry ---
  const XC = HW - 35;                          // upright centre line (outer face ~10 mm inside the top edge)
  const TILT = Math.atan(120 / (675 + RIM - FRAME_H - 6)); // ~11 deg lean (thor_07/08 at minimum height)
  const tn = Math.tan(TILT);
  const ZT = 35;                               // upright centre under the table at the top
  const yUpTop = yBot - PLATE;                 // upper tube welded to the clamp plate under the frame
  const ZB = ZT - tn * yUpTop;                 // upright centre at floor level (moves back as the stand rises)
  const LOW = { w: 50, d: 70, top: 675 + RIM - FRAME_H - PLATE - 2 }; // lower (outer) tube: at 675 mm it reaches the plate
  const UP = { w: 43, d: 63 };                 // upper (inner) tube
  const K0 = 223, STEP = 31.25, NSTEP = 9;     // knob height (above floor) at 675 mm, notch pitch (9 positions)
  const yKnob = K0 + (H - 675);
  const iStep = Math.round((H - 675) / STEP);
  const locked = Math.abs((H - 675) - iStep * STEP) < 1.5;
  const RUN = { w: 40, h: 50, y0: 25 };        // floor runner 40 x 50, 25 mm off the floor
  const zFront = ZB + 394;                     // front face of the floor cross bar
  const XBAR = { d: 40 };

  // ---------------- materials ----------------
  const tex = makeTextures(THREE);
  const M = {
    powder: new THREE.MeshPhysicalMaterial({ color: 0x312e30, metalness: 0.12, roughness: 0.45, clearcoat: 0.3, clearcoatRoughness: 0.35 }),
    panel: new THREE.MeshPhysicalMaterial({ color: 0x1e1e22, metalness: 0.0, roughness: 0.55, specularIntensity: 0.9, clearcoat: 0.25, clearcoatRoughness: 0.45,
      bumpMap: tex.peel, bumpScale: 0.4 }),
    inner: new THREE.MeshStandardMaterial({ color: 0x000000, metalness: 0.0, roughness: 1.0, envMapIntensity: 0 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x111112, metalness: 0.0, roughness: 0.62 }),
    plastic: new THREE.MeshStandardMaterial({ color: 0x0d0d0e, metalness: 0.0, roughness: 0.45 }),
    zinc: new THREE.MeshStandardMaterial({ color: 0xd4d8de, metalness: 1.0, roughness: 0.28 }),
    knurl: new THREE.MeshStandardMaterial({ color: 0xffffff, map: tex.knurl, metalness: 0.9, roughness: 0.26 }),
    strip: new THREE.MeshStandardMaterial({ color: 0xe2e3e8, metalness: 1.0, roughness: 0.12 }),
    hole: new THREE.MeshBasicMaterial({ color: 0x030303 }),
  };

  // geometry buckets per material, merged at the end
  const B = {};
  const add = (key, geo) => { (B[key] ||= []).push(geo.index ? geo.toNonIndexed() : geo); return geo; };
  const box = (key, w, h, d, x, y, z, r = 0) => {
    const g = r > 0 ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d);
    g.translate(x, y, z); return add(key, g);
  };
  const cyl = (key, rt, rb, h, x, y, z, seg = 24) => {
    const g = new THREE.CylinderGeometry(rt, rb, h, seg); g.translate(x, y, z); return add(key, g);
  };
  const shear = new THREE.Matrix4().set(1, 0, 0, 0, 0, 1, 0, 0, 0, tn, 1, 0, 0, 0, 0, 1);
  const leg = (g) => { g.applyMatrix4(shear); g.translate(0, 0, ZB); return g; }; // z relative to upright axis -> world

  // ---------------- tabletop ----------------
  // front / rear rectangular tubes
  for (const s of [-1, 1]) {
    box('powder', XTUBE * 2, FRAME_H, TUBE_D, 0, yBot + FRAME_H / 2, s * (HD - TUBE_D / 2), 2.5);
    for (const sx of [-1, 1]) {
      // chamfered plastic end cap, a little larger than the tube and standing proud of the side face (thor_07, thor_11)
      const cs = roundRectShape(THREE, -(TUBE_D + 2) / 2, -(FRAME_H + 2) / 2, TUBE_D + 2, FRAME_H + 2, 2.5, false);
      const cg = new THREE.ExtrudeGeometry(cs, { depth: CAP - 3, bevelEnabled: true, bevelThickness: 1.5, bevelSize: 1.5, bevelSegments: 1, curveSegments: 3 });
      cg.translate(0, 0, 1.5); cg.rotateY(Math.PI / 2); // x in [0, CAP]
      if (sx < 0) cg.rotateY(Math.PI);
      cg.translate(sx * XTUBE, yBot + FRAME_H / 2, s * (HD - TUBE_D / 2)); add('plastic', cg);
    }
  }
  // side channels: outer web, top flange, inner lip, bright strip under the panel gap
  for (const sx of [-1, 1]) {
    const zl = frontInnerZ - rearInnerZ + 2;
    // folded channel with a rolled (bullnose) outer top edge, thor_11
    const RB = 5;
    box('powder', 2, FRAME_H - 2 - RB, zl, sx * (XTUBE - 1), yBot + (FRAME_H - 2 - RB) / 2, 0);
    box('powder', FLANGE - RB, 2, zl, sx * (XTUBE - RB - (FLANGE - RB) / 2), H + 1, 0, 0.8);
    { const g = new THREE.CylinderGeometry(RB, RB, zl, 28, 1, true); g.rotateX(Math.PI / 2); g.translate(sx * (XTUBE - RB), H + 2 - RB, 0); add('powder', g); }
    box('powder', 2, 14, zl, sx * (XTUBE - FLANGE + 1), H - 5, 0);
    box('strip', STRIP + 2, 1, zl - 30, sx * (PANEL_X + STRIP / 2), H - 1.2, 0);
    // the strip stops short of the tubes: small dark openings into the frame at each end (thor_10/11)
    for (const sz of [-1, 1]) box('hole', STRIP, 0.5, 13, sx * (PANEL_X + STRIP / 2), H - 1.6, sz * (frontInnerZ - 6.5));
    box('powder', 22, 2, zl, sx * (XTUBE - 12), yBot + 1, 0); // bottom return of the channel
    // zinc dome-head screws on the flange
    for (const sz of [-1, 1]) {
      const g = new THREE.SphereGeometry(7, 22, 8, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(1, 0.32, 1);
      g.translate(sx * (XTUBE - 17), H + 2, sz * 128); add('zinc', g);
    }
  }
  // black panel with the cable cutout (real hole)
  {
    const sh = new THREE.Shape();
    sh.moveTo(-PANEL_X, -frontInnerZ); sh.lineTo(PANEL_X, -frontInnerZ); sh.lineTo(PANEL_X, -rearInnerZ); sh.lineTo(-PANEL_X, -rearInnerZ); sh.closePath();
    // shape y = -world z (after rotateX(-90deg))
    sh.holes.push(roundRectPath(THREE, CUT.x - CUT.w / 2, -(CUT.z + CUT.d / 2), CUT.w, CUT.d, 6, { rearSquare: true, rearAtMaxY: true }));
    const g = new THREE.ExtrudeGeometry(sh, { depth: PANEL_T, bevelEnabled: false });
    g.rotateX(-Math.PI / 2); g.translate(0, H - PANEL_T, 0);
    add('panel', g);
    // grommet: black plastic trim flange on top + liner down the hole walls
    const outer = roundRectShape(THREE, -CUT.w / 2 - 7, -(CUT.z + CUT.d / 2 + 7), CUT.w + 14, CUT.d + 7, 9, true);
    outer.holes.push(roundRectPath(THREE, -CUT.w / 2, -(CUT.z + CUT.d / 2), CUT.w, CUT.d, 6, { rearSquare: true, rearAtMaxY: true }));
    const tg = new THREE.ExtrudeGeometry(outer, { depth: 1.6, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.6, bevelSegments: 2 });
    tg.rotateX(-Math.PI / 2); tg.translate(0, H + 0.6, 0); add('plastic', tg);
    const liner = roundRectShape(THREE, -CUT.w / 2, -(CUT.z + CUT.d / 2), CUT.w, CUT.d, 6, true);
    liner.holes.push(roundRectPath(THREE, -CUT.w / 2 + 2, -(CUT.z + CUT.d / 2) + 2, CUT.w - 4, CUT.d - 2, 4, { rearSquare: true, rearAtMaxY: true }));
    const lg = new THREE.ExtrudeGeometry(liner, { depth: PANEL_T + 4, bevelEnabled: false });
    lg.rotateX(-Math.PI / 2); lg.translate(0, H - PANEL_T - 4, 0); add('plastic', lg);
  }
  // bracket slots in the rear tube face (for the optional laptop bracket clamp)
  for (const sx of [-1, 1]) {
    const sg = new THREE.ShapeGeometry(roundRectShape(THREE, -30, -4.5, 60, 9, 4.5));
    sg.translate(sx * 62, yBot + FRAME_H / 2 - 2, 0); sg.rotateY(Math.PI); sg.translate(0, 0, -HD - 0.15);
    add('hole', sg);
  }

  // ---------------- side frames ----------------
  for (const s of [-1, 1]) {
    const xc = s * XC;
    // bracket bar under the side channel (table clamps onto it)
    box('powder', 50, PLATE, 300, s * (XTUBE - 2 - 24), yBot - PLATE / 2, 0, 1.2); // clamp plate under the frame
    for (const kz of [-125, 125]) {
      const kx = s * (XTUBE - 2 - 24);
      cyl('zinc', 12.5, 12.5, 1.6, kx, yBot - PLATE - 0.8, kz, 32);
      knob(new THREE.Matrix4().makeTranslation(kx, yBot - PLATE - 2, kz).multiply(new THREE.Matrix4().makeRotationX(Math.PI)));
    }
    // upper (inner) tube: exposed part + darker hidden part inside the lower tube
    const upBot = yKnob - 50;
    const upTopRel = yBot - PLATE + 0.5;
    if (upTopRel - LOW.top > 3) add('powder', leg(new RoundedBoxGeometry(UP.w, upTopRel - LOW.top + 4, UP.d, 2, 2.5).translate(xc, (upTopRel + LOW.top - 4) / 2, 0)));
    const hidTop = Math.min(LOW.top - 4, upTopRel);
    add('inner', leg(new THREE.BoxGeometry(UP.w, hidTop - upBot, UP.d).translate(xc, (hidTop + upBot) / 2, 0)));
    // two rivet/bolt holes near the top of the outer tube, both side faces
    for (const fx of [-1, 1]) for (const hz of [-15, 15]) {
      const hg = new THREE.CircleGeometry(3, 14); hg.rotateY(fx * Math.PI / 2);
      hg.translate(xc + fx * (LOW.w / 2 + 0.15), LOW.top - 22, hz); add('hole', leg(hg));
    }
    // small bolt hole near the top of the upper tube (outer face)
    {
      const hg = new THREE.CircleGeometry(4, 16); hg.rotateY(s * Math.PI / 2);
      hg.translate(xc + s * (UP.w / 2 + 0.2), yUpTop - 45, 0); add('hole', leg(hg));
    }
    // lower (outer) tube: C-profile + slotted outer plate
    {
      const a = LOW.w / 2, b = LOW.d / 2, r = 3, w = 2;
      const c = new THREE.Shape();
      const X = (v) => s * v;
      c.moveTo(X(a), b - r);
      c.quadraticCurveTo(X(a), b, X(a - r), b);
      c.lineTo(X(-a + r), b); c.quadraticCurveTo(X(-a), b, X(-a), b - r);
      c.lineTo(X(-a), -b + r); c.quadraticCurveTo(X(-a), -b, X(-a + r), -b);
      c.lineTo(X(a - r), -b); c.quadraticCurveTo(X(a), -b, X(a), -b + r);
      c.lineTo(X(a - w), -b + r); c.lineTo(X(a - w), -b + w); c.lineTo(X(-a + w), -b + w);
      c.lineTo(X(-a + w), b - w); c.lineTo(X(a - w), b - w); c.lineTo(X(a - w), b - r); c.closePath();
      const g = new THREE.ExtrudeGeometry(c, { depth: LOW.top - 4, bevelEnabled: false, curveSegments: 4 });
      g.rotateX(-Math.PI / 2); g.translate(xc, 4, 0); add('powder', leg(g));
      // slotted plate
      const p = new THREE.Shape();
      const pw = b - r;
      p.moveTo(-pw, 4); p.lineTo(pw, 4); p.lineTo(pw, LOW.top); p.lineTo(-pw, LOW.top); p.closePath();
      const yi = (i) => K0 + STEP * i;
      const pts = [];
      const U = (u) => s * u;
      const vb = yi(0) - 7, vt = yi(NSTEP - 1) + 22;
      pts.push([U(5), vb], [U(5), vt], [U(-5), vt]);
      for (let i = NSTEP - 1; i >= 0; i--) {
        const v = yi(i);
        // notch = capsule sloping down and forward from the channel to the locking pocket at (u=-15, v) (thor_12)
        pts.push([U(-5), v + 12.67], [U(-17.77), v + 4.16]);
        for (let k = 1; k < 10; k++) { const t = (123.7 + 18 * k) * Math.PI / 180; pts.push([U(-15 + 5 * Math.cos(t)), v + 5 * Math.sin(t)]); }
        pts.push([U(-12.23), v - 4.16], [U(-5), v + 0.66]);
      }
      pts.push([U(-5), vb]);
      const hp = new THREE.Path(); hp.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) hp.lineTo(pts[i][0], pts[i][1]); hp.closePath();
      p.holes.push(hp);
      // black backing inside the outer tube so the slot reads as an opening
      add('inner', leg(new THREE.BoxGeometry(1, vt - vb + 10, 2 * pw - 4).translate(xc + s * (a - w - 2.2), (vt + vb) / 2, 0)));
      const pg = new THREE.ExtrudeGeometry(p, { depth: w, bevelEnabled: false });
      pg.rotateY(s * Math.PI / 2);
      pg.translate(xc + s * (a - w), 0, 0);
      add('powder', leg(pg));
      // top collar (plastic bush) and bottom cap
      const col = roundRectShape(THREE, -a - 0.6, -b - 0.6, LOW.w + 1.2, LOW.d + 1.2, 3.3, false);
      col.holes.push(roundRectPath(THREE, -UP.w / 2 - 0.5, -UP.d / 2 - 0.5, UP.w + 1, UP.d + 1, 2.5, {}));
      const cg = new THREE.ExtrudeGeometry(col, { depth: 2.5, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.3, bevelSegments: 2, curveSegments: 4 });
      cg.rotateX(-Math.PI / 2); cg.translate(xc, LOW.top - 2, 0); add('plastic', leg(cg));
      add('plastic', leg(new RoundedBoxGeometry(LOW.w + 1, 5, LOW.d + 1, 2, 1.5).translate(xc, 2.5, 0)));
    }
    // thumb knob through the J-slot into the upper tube
    {
      const u = locked ? 15 : 0; // notches point to the front (+z)
      const kx = xc + s * (LOW.w / 2);
      add('zinc', leg(new THREE.CylinderGeometry(4, 4, 8, 12).rotateZ(Math.PI / 2).translate(xc + s * (UP.w / 2 + 3), yKnob, u)));
      const m = new THREE.Matrix4().makeTranslation(kx, yKnob, ZB + tn * yKnob + u)
        .multiply(new THREE.Matrix4().makeRotationX(TILT))
        .multiply(new THREE.Matrix4().makeRotationZ(-s * Math.PI / 2));
      cylM('zinc', 10, 1.5, new THREE.Matrix4().copy(m).multiply(new THREE.Matrix4().makeTranslation(0, 0.75, 0)));
      knob(new THREE.Matrix4().copy(m).multiply(new THREE.Matrix4().makeTranslation(0, 1.5, 0)));
    }
    // weld bead where the upper tube meets the bracket bar
    weldLoop(UP.w + 2, UP.d + 2, (x, z) => [xc + x, yBot - PLATE - 1.2, ZB + tn * (yBot - PLATE - 1.2) + z]);

    // floor runner (projects forward to the cross bar)
    const zr0 = ZB + tn * RUN.y0, zr1 = zFront - XBAR.d;
    box('powder', RUN.w, RUN.h, zr1 - zr0, xc, RUN.y0 + RUN.h / 2, (zr0 + zr1) / 2, 2.5);
    // shallow rolled channel along the runner top (thor_02)
    for (const side of [-1, 1]) {
      const gg = new THREE.BoxGeometry(4.2, 0.8, zr1 - zr0 - 60); gg.rotateZ(side * 0.35);
      gg.translate(xc - s * 4 + side * 2, RUN.y0 + RUN.h - 0.25, (zr0 + 60 + zr1) / 2); add('powder', gg);
    }
    // weld bead around runner / upright joint (on the upright front face)
    weldLoop(RUN.w + 2, RUN.h + 2, (x, y) => [xc + x, RUN.y0 + RUN.h / 2 + y, ZB + LOW.d / 2 + tn * (RUN.y0 + RUN.h / 2 + y) + 1], true);

    // levelling foot + thumb knob near the front of the runner
    const fz = zr1 - 32;
    cyl('rubber', 13, 16, 9, xc, 4.5, fz, 28);
    cyl('zinc', 4, 4, RUN.y0 + RUN.h + 20 - 9, xc, 9 + (RUN.y0 + RUN.h + 20 - 9) / 2, fz, 12);
    cyl('zinc', 7.5, 7.5, 5, xc, RUN.y0 - 2.5, fz, 6);
    {
      const g = new THREE.CylinderGeometry(13, 13, 7, 48, 1, true); g.translate(xc, RUN.y0 + RUN.h + 3.5, fz); add('knurl', g);
      cyl('zinc', 12.9, 12.9, 7.05, xc, RUN.y0 + RUN.h + 3.5, fz, 48); // plain turned faces of the knurled nut
    }
    knob(new THREE.Matrix4().makeTranslation(xc, RUN.y0 + RUN.h + 7 + 6, fz).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)));
  }
  // front floor cross bar with end caps
  {
    const xl = XC + RUN.w / 2;
    box('powder', xl * 2, RUN.h, XBAR.d, 0, RUN.y0 + RUN.h / 2, zFront - XBAR.d / 2, 2.5);
    for (const sx of [-1, 1]) box('plastic', 4, RUN.h + 1, XBAR.d + 1, sx * (xl + 2), RUN.y0 + RUN.h / 2, zFront - XBAR.d / 2, 1.2);
  }

  // ---------------- printed THOR logo on the front tube ----------------
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(88, 22), new THREE.MeshStandardMaterial({
    map: tex.logo, transparent: true, roughness: 0.5, metalness: 0.0, polygonOffset: true, polygonOffsetFactor: -2 }));
  logo.position.set(0, yBot + FRAME_H / 2 - 2, HD + 0.05);

  // ---------------- assemble ----------------
  const group = new THREE.Group(); group.name = 'thor_djs002';
  for (const [key, list] of Object.entries(B)) {
    const geo = mergeGeometries(list, false);
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, M[key]);
    mesh.name = 'thor_' + key; mesh.castShadow = key !== 'hole'; mesh.receiveShadow = true;
    group.add(mesh);
  }
  group.add(logo);

  const info = {
    topY: H, w: W, d: D, rimH: RIM, rimW: TUBE_D,
    frontInnerZ, rearInnerZ, rearOuterZ: -HD,
    apron: { h: FRAME_H, rearFaceZ: -HD, bottomY: yBot },
    cutout: { x: CUT.x, z: CUT.z, w: CUT.w, d: CUT.d },
    height: H, heightRange: [675, 925],
    floorFrame: { zFront, zRear: ZB - LOW.d / 2, xOuter: XC + LOW.w / 2 },
  };
  return { group, info };

  // ---------------- helpers (hoisted) ----------------
  var knobGeo;
  function cylM(key, r, h, m) { const g = new THREE.CylinderGeometry(r, r, h, 24); g.applyMatrix4(m); add(key, g); }
  // thumb knob: hub along +y from the origin, wide lobed head on top. long axis along x.
  function knob(m) {
    if (!knobGeo) {
      const hub = new THREE.CylinderGeometry(7, 8.5, 8.5, 24); hub.translate(0, 4.25, 0);
      // head = upper half of a superquadric (rounded-rectangle plan, soft edges), flat towards the hub and arched
      // along its long axis like the real lens-shaped thumb knobs (thor_02/03/06/12)
      const A = 28, Bq = 12.5, Hh = 17, NU = 64, NV = 14, e1 = 0.5, e2 = 0.42;
      const sp = (w, e) => Math.sign(w) * Math.pow(Math.abs(w), e);
      const verts = [], idx = [];
      for (let j = 0; j <= NV; j++) {
        const v = (j / NV) * Math.PI / 2;
        for (let i = 0; i <= NU; i++) {
          const u = (i / NU) * Math.PI * 2;
          const r = sp(Math.cos(v), e1);
          let x = A * r * sp(Math.cos(u), e2), z = Bq * r * sp(Math.sin(u), e2) * (0.9 + 0.12 * Math.abs(Math.cos(u)));
          const prof = 0.5 + 0.5 * Math.sqrt(Math.max(0, 1 - Math.pow(x / (A + 3), 2)));
          const y = Hh * sp(Math.sin(v), e1) * prof;
          verts.push(x, y, z);
        }
      }
      for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) {
        const a0 = j * (NU + 1) + i, b0 = a0 + NU + 1;
        idx.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1);
      }
      // flat underside (fan)
      const c0 = verts.length / 3; verts.push(0, 0, 0);
      for (let i = 0; i < NU; i++) idx.push(c0, i, i + 1);
      const head = new THREE.BufferGeometry();
      head.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); head.setIndex(idx);
      head.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((verts.length / 3) * 2).fill(0), 2));
      head.computeVertexNormals(); head.translate(0, 7.5, 0);
      knobGeo = mergeGeometries([hub.toNonIndexed(), head.toNonIndexed()]);
    }
    add('rubber', knobGeo.clone().applyMatrix4(m));
  }
  function weldLoop(w, h, map, vertical = false) {
    const per = 2 * (w + h), n = Math.round(per / 1.7);
    for (let i = 0; i < n; i++) {
      let d = (i / n) * per, a, b;
      if (d < w) { a = -w / 2 + d; b = -h / 2; } else if (d < w + h) { a = w / 2; b = -h / 2 + (d - w); }
      else if (d < 2 * w + h) { a = w / 2 - (d - w - h); b = h / 2; } else { a = -w / 2; b = h / 2 - (d - 2 * w - h); }
      const g = new THREE.IcosahedronGeometry(2.1 + 0.25 * Math.sin(i * 2.7) + 0.15 * Math.sin(i * 0.9), 1);
      if (vertical) g.scale(1, 1, 0.6); else g.scale(1, 0.6, 1);
      const p = map(a, b); g.translate(p[0], p[1], p[2]); add('powder', g);
    }
  }
}

function roundRectPath(THREE, x, y, w, h, r, o = {}) {
  const p = new THREE.Path(); drawRR(p, x, y, w, h, r, o); return p;
}
function roundRectShape(THREE, x, y, w, h, r, rearSquare = false) {
  const p = new THREE.Shape(); drawRR(p, x, y, w, h, r, { rearSquare, rearAtMaxY: true }); return p;
}
// rounded rectangle; with rearSquare the two corners at max y (= world rear after rotateX(-90)) stay square
function drawRR(p, x, y, w, h, r, o) {
  const sq = o.rearSquare;
  p.moveTo(x + r, y);
  p.lineTo(x + w - r, y); p.quadraticCurveTo(x + w, y, x + w, y + r);
  if (sq) { p.lineTo(x + w, y + h); p.lineTo(x, y + h); }
  else { p.lineTo(x + w, y + h - r); p.quadraticCurveTo(x + w, y + h, x + w - r, y + h); p.lineTo(x + r, y + h); p.quadraticCurveTo(x, y + h, x, y + h - r); }
  p.lineTo(x, y + r); p.quadraticCurveTo(x, y, x + r, y);
}

function makeTextures(THREE) {
  // fine orange-peel noise for the panel
  const n = 256, c = document.createElement('canvas'); c.width = c.height = n;
  const ctx = c.getContext('2d'); const img = ctx.createImageData(n, n);
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n * n; i++) { const v = 118 + rnd() * 20; img.data.set([v, v, v, 255], i * 4); }
  ctx.putImageData(img, 0, 0);
  ctx.filter = 'blur(1px)'; ctx.drawImage(c, 0, 0);
  const peel = new THREE.CanvasTexture(c); peel.wrapS = peel.wrapT = THREE.RepeatWrapping; peel.repeat.set(1 / 60, 1 / 60);
  // knurl cross-hatch
  const k = document.createElement('canvas'); k.width = 256; k.height = 16; const kc = k.getContext('2d');
  kc.fillStyle = '#d2d5da'; kc.fillRect(0, 0, 256, 16); kc.strokeStyle = '#74777c'; kc.lineWidth = 1.2;
  for (let i = -16; i < 272; i += 4) { kc.beginPath(); kc.moveTo(i, 0); kc.lineTo(i + 16, 16); kc.stroke(); kc.beginPath(); kc.moveTo(i + 16, 0); kc.lineTo(i, 16); kc.stroke(); }
  const knurl = new THREE.CanvasTexture(k); knurl.wrapS = knurl.wrapT = THREE.RepeatWrapping; knurl.colorSpace = THREE.SRGBColorSpace;
  // THOR logo
  const l = document.createElement('canvas'); l.width = 512; l.height = 128; const lc = l.getContext('2d');
  // thin-stroke THOR wordmark with the barred O (thor_10)
  lc.strokeStyle = '#dcdcdc'; lc.lineWidth = 10; lc.lineCap = 'butt'; lc.lineJoin = 'miter';
  const L = (pts) => { lc.beginPath(); lc.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) lc.lineTo(pts[i], pts[i + 1]); lc.stroke(); };
  L([22, 18, 102, 18]); L([62, 18, 62, 114]);                       // T
  L([132, 14, 132, 114]); L([204, 14, 204, 114]); L([132, 63, 204, 63]); // H
  lc.beginPath(); lc.ellipse(290, 64, 46, 48, 0, 0, Math.PI * 2); lc.stroke(); L([228, 64, 352, 64]); // barred O
  lc.beginPath(); lc.moveTo(384, 114); lc.lineTo(384, 18); lc.lineTo(424, 18); lc.arc(424, 42, 24, -Math.PI / 2, Math.PI / 2); lc.lineTo(384, 66); lc.stroke();
  L([414, 66, 458, 114]);                                            // R
  const logo = new THREE.CanvasTexture(l); logo.colorSpace = THREE.SRGBColorSpace; logo.anisotropy = 4;
  return { peel, knurl, logo };
}
