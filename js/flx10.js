// Pioneer DJ DDJ-FLX10 — hand-built model.
// Units mm, +y up, +z towards the DJ (front), +x to the DJ's right.
// Group origin: centre of the footprint, y = 0 at the underside of the rubber feet.
//
// Layout source: Pioneer's official top view (refs/flx10/pioneer/p_31.png, left deck + mixer).
// That image is used (cleaned up at load time) as the albedo of the top plate; every 3D control
// is placed on top of its printed counterpart using the pixel -> mm mapping below. Both decks share
// one layout, so the right deck re-uses the left deck pixels shifted by RD px.

const W = 713, D = 387;             // measured footprint
const HW = W / 2, HD = D / 2;
const FEET_H = 4;                   // rubber feet
const DECK_Y = 50;                  // top surface of the deck plate
// p_31 pixel -> mm. Chassis outer edges in p_31: x 2 .. (2+2401 incl. mirrored right deck), y 73 .. 1385
const SX = W / 2401, SZ = D / 1312;
const RD = 1579;                    // right deck = left deck px + RD
const X = (px) => -HW + (px - 2) * SX;
const Z = (py) => -HD + (py - 73) * SZ;

const REF = (p) => new URL('../refs/flx10/' + p, import.meta.url).href;

export async function build(THREE, opts = {}) {
  const g = new THREE.Group();
  g.name = 'DDJ-FLX10';

  // ---------------------------------------------------------------- image helpers
  const loadImg = (url) => new Promise((res) => {
    const im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = () => res(im); im.onerror = () => res(null); im.src = url;
  });
  const [p31, p35, p07] = await Promise.all([
    loadImg(REF('pioneer/p_31.png')), loadImg(REF('pioneer/p_35.png')), loadImg(REF('pioneer/p_07.jpg')),
  ]);
  const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const texOf = (c, srgb = true) => {
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8; t.needsUpdate = true; return t;
  };

  // ---------------------------------------------------------------- top plate texture
  const K = 1.5;                                   // canvas px per p_31 px
  const TW = Math.round(2401 * K), TH = Math.round(1312 * K);
  const top = mkCanvas(TW, TH);
  {
    const c = top.getContext('2d');
    c.fillStyle = '#3c3c3c'; c.fillRect(0, 0, TW, TH);
    if (p31) {
      // 1. flatten the glossy-reflection gradient on the mixer panel (px 824..1581)
      const mx0 = 826, mx1 = 1581, my0 = 73, my1 = 1385;
      const mw = mx1 - mx0, mh = my1 - my0;
      const src = mkCanvas(1600, 1440); const sc = src.getContext('2d'); sc.drawImage(p31, 0, 0);
      const id = sc.getImageData(mx0, my0, mw, mh); const d = id.data;
      const n = mw * mh, lum = new Float32Array(n), tmp = new Float32Array(n);
      for (let i = 0; i < n; i++) lum[i] = Math.min(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]);
      const minPass = (a, b, r, horiz) => {
        for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
          let m = 255;
          for (let k = -r; k <= r; k++) {
            const xx = horiz ? x + k : x, yy = horiz ? y : y + k;
            if (xx < 0 || yy < 0 || xx >= mw || yy >= mh) continue;
            const v = a[yy * mw + xx]; if (v < m) m = v;
          }
          b[y * mw + x] = m;
        }
      };
      const boxPass = (a, b, r, horiz) => {
        for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
          let s = 0, c2 = 0;
          for (let k = -r; k <= r; k++) {
            const xx = horiz ? x + k : x, yy = horiz ? y : y + k;
            if (xx < 0 || yy < 0 || xx >= mw || yy >= mh) continue;
            s += a[yy * mw + xx]; c2++;
          }
          b[y * mw + x] = s / c2;
        }
      };
      minPass(lum, tmp, 6, true); minPass(tmp, lum, 6, false);
      boxPass(lum, tmp, 5, true); boxPass(tmp, lum, 5, false);
      const target = 6;
      for (let i = 0; i < n; i++) {
        const off = Math.max(0, lum[i] - target);
        d[i * 4] = Math.max(0, d[i * 4] - off); d[i * 4 + 1] = Math.max(0, d[i * 4 + 1] - off); d[i * 4 + 2] = Math.max(0, d[i * 4 + 2] - off);
      }
      sc.putImageData(id, mx0, my0);
      // mild unsharp mask on the native-resolution photo (it gets upscaled 1.5x below): keeps the small print crisp
      {
        const sw = 1600, sh = 1440, all = sc.getImageData(0, 0, sw, sh), dd = all.data, s0 = new Uint8ClampedArray(dd), row = sw * 4;
        for (let y = 1; y < sh - 1; y++) for (let x = 1; x < sw - 1; x++) {
          const i = y * row + x * 4;
          for (let k = 0; k < 3; k++) {
            const j = i + k;
            const bl = (s0[j] * 4 + s0[j - 4] + s0[j + 4] + s0[j - row] + s0[j + row] + s0[j - row - 4] + s0[j - row + 4] + s0[j + row - 4] + s0[j + row + 4]) / 12;
            dd[j] = s0[j] + 0.55 * (s0[j] - bl);
          }
        }
        sc.putImageData(all, 0, 0);
      }
      c.imageSmoothingQuality = 'high';
      // 2. left deck + mixer straight from the photo
      c.drawImage(src, 2, 73, 1579, 1312, 0, 0, 1579 * K, 1312 * K);
      // 3. right deck = left deck content shifted by RD, edges mirrored so the seam/outer rim sit right
      c.drawImage(src, 10, 73, 806, 1312, (RD + 8) * K, 0, 806 * K, 1312 * K);
      c.save(); c.translate((RD + 8) * K, 0); c.scale(-1, 1);          // seam strip (mirror of 816..824)
      c.drawImage(src, 816, 73, 8, 1312, 0, 0, 8 * K, 1312 * K); c.restore();
      c.save(); c.translate(TW, 0); c.scale(-1, 1);                    // outer rim (mirror of 2..10)
      c.drawImage(src, 2, 73, 8, 1312, 0, 0, 8 * K, 1312 * K); c.restore();
      // erase the power / MIC marks copied onto the right deck rear edge (they belong to the left deck)
      const patch = (px, py, w, h, fromPx) => c.drawImage(src, fromPx, py, w, h, (px - 2) * K, (py - 73) * K, w * K, h * K);
      patch(RD + 255, 86, 35, 30, 330); patch(RD + 400, 86, 40, 30, 330);
      // right deck: DECK SELECT reads 2/4
      { const cx = (RD + 62 - 2) * K, cy = (435 - 73) * K;
        c.fillStyle = '#141414'; c.beginPath(); c.arc(cx, cy, 15.5 * K, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#e8e8e8'; c.font = `bold ${15 * K}px Arial`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('2/4', cx, cy + 0.5 * K); }
    }
  }
  const topTex = texOf(top); topTex.flipY = false; topTex.generateMipmaps = true;
  topTex.minFilter = THREE.LinearMipmapLinearFilter;

  // roughness map: matte textured deck plates, satin mixer panel
  const rough = mkCanvas(713, 387);
  {
    const c = rough.getContext('2d');
    c.fillStyle = 'rgb(200,200,200)'; c.fillRect(0, 0, 713, 387);
    c.fillStyle = 'rgb(56,56,56)'; c.fillRect(X(826) + HW, 0, X(1581) - X(826), 387);      // glossy black mixer panel
  }
  const roughTex = texOf(rough, false); roughTex.flipY = false;

  // ---------------------------------------------------------------- materials
  const M = {
    chassis: new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.5, metalness: 0.15 }),
    bottom: new THREE.MeshStandardMaterial({ color: 0x101011, roughness: 0.8 }),
    plate: new THREE.MeshStandardMaterial({ map: topTex, color: 0xd4d4d4, roughnessMap: roughTex, roughness: 1, metalness: 0.0, envMapIntensity: 0.75 }),
    knob: new THREE.MeshStandardMaterial({ color: 0x0f0f10, roughness: 0.42, metalness: 0.1 }),
    knobTop: new THREE.MeshStandardMaterial({ color: 0x141415, roughness: 0.3, metalness: 0.2 }),
    white: new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.35, emissive: 0xffffff, emissiveIntensity: 0.12 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x1b1b1c, roughness: 0.62, metalness: 0.05 }),
    rubberDark: new THREE.MeshStandardMaterial({ color: 0x1f1f21, roughness: 0.52 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xe0e0e4, roughness: 0.16, metalness: 1.0 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xd9ad55, roughness: 0.28, metalness: 1.0 }),
    hole: new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.9 }),
    feet: new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.95 }),
    fader: new THREE.MeshStandardMaterial({ color: 0x121213, roughness: 0.38, metalness: 0.15 }),
    slot: new THREE.MeshStandardMaterial({ color: 0x030303, roughness: 0.9 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xb8b8bc, roughness: 0.3, metalness: 1.0 }),
    red: new THREE.MeshStandardMaterial({ color: 0xc8231e, roughness: 0.5 }),
    ivory: new THREE.MeshStandardMaterial({ color: 0xe8e6df, roughness: 0.5 }),
    blackPlastic: new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.55 }),
    mesh: new THREE.MeshStandardMaterial({ color: 0x3a3a3c, roughness: 0.6, metalness: 0.5 }),
    steelDark: new THREE.MeshStandardMaterial({ color: 0x77777b, roughness: 0.35, metalness: 1.0 }),
    insert: new THREE.MeshStandardMaterial({ color: 0x252527, roughness: 0.6 }),
  };
  M.plate.shadowSide = THREE.DoubleSide; M.chassis.shadowSide = THREE.DoubleSide; M.bottom.shadowSide = THREE.DoubleSide;
  // decal materials: the top face of buttons / pads samples the top-plate photo at its own footprint
  const decal = (emissiveIntensity, roughness = 0.45) => {
    const m = new THREE.MeshStandardMaterial({ map: topTex, emissiveMap: topTex, emissive: 0xffffff, emissiveIntensity, roughness, metalness: 0.0 });
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
        {
          vec4 dp = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            dp = instanceMatrix * dp;
          #endif
          vec2 duv = vec2((dp.x + ${HW.toFixed(2)}) / ${W.toFixed(1)}, (dp.z + ${HD.toFixed(2)}) / ${D.toFixed(1)});
          #ifdef USE_MAP
            vMapUv = duv;
          #endif
          #ifdef USE_EMISSIVEMAP
            vEmissiveMapUv = duv;
          #endif
        }`);
    };
    m.customProgramCacheKey = () => 'flx10decal';
    return m;
  };
  M.decalLED = decal(0.85, 0.42);      // backlit buttons / pads
  M.decalSide = decal(0.3, 0.5); M.decalSide.color.setScalar(0.45);   // translucent pad walls
  M.decalDim = decal(0.18, 0.5);       // non-lit rubber buttons
  M.decalGlow = decal(1.6, 0.6);       // meters, small LEDs, FX display

  // ---------------------------------------------------------------- instancing helper
  const batches = new Map(); let lastBatch = null;
  const dummy = new THREE.Object3D();
  function put(key, geo, mat, x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0, opt = {}) {
    key = key + '|' + geo.uuid + '|' + (Array.isArray(mat) ? mat.map((m) => m.uuid).join(',') : mat.uuid);
    let b = batches.get(key);
    if (!b) { b = { geo, mat, mats: [], opt, name: key.split('|')[0] }; batches.set(key, b); }
    lastBatch = b;
    dummy.position.set(x, y, z); dummy.rotation.set(rx, ry, rz, 'YXZ'); dummy.scale.set(sx, sy, sz); dummy.updateMatrix();
    b.mats.push(dummy.matrix.clone());
  }
  function flush() {
    for (const [key, b] of batches) {
      const im = new THREE.InstancedMesh(b.geo, b.mat, b.mats.length);
      b.mats.forEach((m, i) => im.setMatrixAt(i, m));
      im.instanceMatrix.needsUpdate = true; im.name = b.name;
      im.castShadow = b.opt.cast !== false; im.receiveShadow = true;
      im.computeBoundingSphere();
      g.add(im);
    }
  }
  const geoCache = new Map();
  const cached = (key, fn) => { if (!geoCache.has(key)) geoCache.set(key, fn()); return geoCache.get(key); };

  // ---------------------------------------------------------------- geometry helpers
  function rrectShape(w, h, r, cx = 0, cy = 0) {
    const s = new THREE.Shape(); const x0 = cx - w / 2, y0 = cy - h / 2; r = Math.min(r, w / 2, h / 2);
    s.moveTo(x0 + r, y0); s.lineTo(x0 + w - r, y0); s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
    s.lineTo(x0 + w, y0 + h - r); s.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h);
    s.lineTo(x0 + r, y0 + h); s.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r);
    s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0); return s;
  }
  function rrectPath(w, h, r, cx = 0, cy = 0) {
    const s = new THREE.Path(); const x0 = cx - w / 2, y0 = cy - h / 2; r = Math.min(r, w / 2, h / 2);
    s.moveTo(x0 + r, y0); s.lineTo(x0 + w - r, y0); s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
    s.lineTo(x0 + w, y0 + h - r); s.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h);
    s.lineTo(x0 + r, y0 + h); s.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r);
    s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0); return s;
  }
  // rounded "rubber key": extruded rounded rect, base at y=0, top at y=h, origin centre
  function keyGeo(w, d, h, r, bevel) {
    return cached(`key${w.toFixed(1)}_${d.toFixed(1)}_${h}_${r}_${bevel}`, () => {
      const bv = Math.min(bevel, h * 0.45, w / 4, d / 4);
      const geo = new THREE.ExtrudeGeometry(rrectShape(w - 2 * bv, d - 2 * bv, Math.max(0.3, r - bv)), {
        depth: Math.max(0.05, h - 2 * bv), bevelEnabled: true, bevelThickness: bv, bevelSize: bv, bevelOffset: 0, bevelSegments: 3, curveSegments: 6,
      });
      geo.rotateX(-Math.PI / 2);
      geo.computeBoundingBox(); const bb = geo.boundingBox; geo.translate(0, -bb.min.y, 0);
      return geo;
    });
  }
  // lathe with optional flutes. prof: [[r,y],...] from axis-bottom to axis-top
  function latheGeo(key, prof, segs, flutes = 0, depth = 0, yMin = -1e9, yMax = 1e9) {
    return cached(key, () => {
      const geo = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), segs);
      if (flutes) {
        const p = geo.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
          const r = Math.hypot(x, z); if (r < 1e-4 || y < yMin || y > yMax) continue;
          const th = Math.atan2(x, z);
          const f = Math.pow(0.5 + 0.5 * Math.cos(th * flutes), 3);
          const k = 1 - depth * f / r;
          p.setX(i, x * k); p.setZ(i, z * k);
        }
        geo.computeVertexNormals();
      }
      return geo;
    });
  }
  const boxGeo = (w, h, d) => cached(`box${w}_${h}_${d}`, () => { const b = new THREE.BoxGeometry(w, h, d); b.translate(0, h / 2, 0); return b; });
  const cylGeo = (r, h, s = 32, r2 = null) => cached(`cyl${r}_${h}_${s}_${r2}`, () => { const c = new THREE.CylinderGeometry(r2 ?? r, r, h, s); c.translate(0, h / 2, 0); return c; });

  // ---------------------------------------------------------------- chassis (lofted, with bands, grooves and chamfered lower corners)
  // rings: [y, inset, cornerSize, chamferBlend]
  const rings = [
    [FEET_H, 2.2, 15, 1], [FEET_H + 1.2, 0.6, 15, 1], [FEET_H + 2.2, 0, 14.5, 1], [13.9, 0, 5, 1],
    [14.5, 0.8, 4.5, 0.6], [15.1, 0.0, 4, 0.3], [39.9, 0, 4, 0], [40.5, 0.8, 4, 0], [41.1, 0, 4, 0],
    [48.6, 0, 4, 0], [49.5, 0.45, 4, 0], [50.0, 1.2, 4, 0],
  ];
  const CK = 7;   // points per corner
  function ringPts(inset, c, blend) {
    const hw = HW - inset, hd = HD - inset; const pts = [];
    const corners = [[1, 1, [hw - c, hd], [hw, hd - c]], [1, -1, [hw, -(hd - c)], [hw - c, -hd]],
      [-1, -1, [-(hw - c), -hd], [-hw, -(hd - c)]], [-1, 1, [-hw, hd - c], [-(hw - c), hd]]];
    for (const [sx, sz, S, E] of corners) {
      const O = [sx * (hw - c), sz * (hd - c)];
      for (let j = 0; j < CK; j++) {
        const t = j / (CK - 1), th = t * Math.PI / 2;
        const ax = O[0] + (S[0] - O[0]) * Math.cos(th) + (E[0] - O[0]) * Math.sin(th);
        const az = O[1] + (S[1] - O[1]) * Math.cos(th) + (E[1] - O[1]) * Math.sin(th);
        const lx = S[0] + (E[0] - S[0]) * t, lz = S[1] + (E[1] - S[1]) * t;
        pts.push([ax + (lx - ax) * blend, az + (lz - az) * blend]);
      }
    }
    return pts;   // order: front-right, rear-right, rear-left, front-left
  }
  {
    const P = rings.map(([y, ins, c, bl]) => ringPts(ins, c, bl).map(([x, z]) => [x, y, z]));
    const N = P[0].length, pos = [], idx = [];
    P.forEach((r) => r.forEach((p) => pos.push(...p)));
    // rear straight edge = segment from index (2*CK-1) to (2*CK) ; skipped (rear panel covers it)
    for (let i = 0; i < P.length - 1; i++) for (let j = 0; j < N; j++) {
      const j2 = (j + 1) % N;
      if (j === 2 * CK - 1) continue;
      const a = i * N + j, b = i * N + j2, c2 = (i + 1) * N + j2, d2 = (i + 1) * N + j;
      // traversal order is clockwise seen from above (front edge runs -x -> ... ) -> pick winding for outward normals
      idx.push(a, b, c2, a, c2, d2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx);
    geo.computeVertexNormals();
    const body = new THREE.Mesh(geo, M.chassis); body.castShadow = body.receiveShadow = true; body.name = 'chassis';
    g.add(body);
    // bottom
    const bp = P[0];
    const bs = new THREE.Shape(bp.map(([x, , z]) => new THREE.Vector2(x, -z)));
    const bg = new THREE.ShapeGeometry(bs); bg.rotateX(Math.PI / 2); bg.translate(0, FEET_H, 0);
    const bm = new THREE.Mesh(bg, M.bottom); bm.castShadow = true; g.add(bm);
    // rubber feet
    g.userData.feet = [];
  }
  const feet = [[-300, -150], [300, -150], [-300, 150], [300, 150], [0, -150], [0, 150]].map(([x, z]) => ({ x, z, r: 11 }));
  for (const f of feet) put('feet', cylGeo(f.r, FEET_H, 24, f.r - 1), M.feet, f.x, 0, f.z);

  // ---------------------------------------------------------------- top plate
  {
    const s = rrectShape(W - 2.0, D - 2.0, 3.2);
    const geo = new THREE.ShapeGeometry(s, 8);
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position, uv = [];
    for (let i = 0; i < p.count; i++) uv.push((p.getX(i) + HW) / W, (p.getZ(i) + HD) / D);
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.translate(0, DECK_Y, 0);
    const plate = new THREE.Mesh(geo, M.plate); plate.receiveShadow = true; plate.castShadow = true; plate.name = 'topPlate'; g.add(plate);
  }

  // ---------------------------------------------------------------- deck controls (both decks)
  const BTN_H = 3.2;
  function rectBtn(px, py, wpx, hpx, mat = M.decalLED, h = BTN_H) {
    const w = wpx * SX, d = hpx * SZ;
    put(`btn_${mat.uuid}_${w.toFixed(1)}_${d.toFixed(1)}_${h}`, keyGeo(w, d, h, 1.0, 0.6), mat, X(px), DECK_Y, Z(py));
  }
  function roundBtn(px, py, rpx, mat = M.decalLED, h = 3, bezelPx = 0) {
    const r = rpx * SX;
    const prof = [[0, h + 0.2], [r * 0.7, h + 0.1], [r - 0.5, h], [r, h - 0.6], [r, 0]];
    if (bezelPx) { const rb = bezelPx * SX; prof.push([rb - 0.6, 0.0], [rb - 0.6, 1.4], [rb - 0.2, 1.6], [rb, 1.2], [rb, 0]); }
    const geo = latheGeo(`rb${r.toFixed(2)}_${h}_${bezelPx}`, prof.reverse(), 40);
    put(`rbtn_${mat.uuid}_${r.toFixed(2)}_${h}_${bezelPx}`, geo, mat, X(px), DECK_Y, Z(py));
  }
  // knobs ------------------------------------------------------------
  const KNOBS = {
    eq: { r: 7.0, h: 22.5, top: 5.6 },
    color: { r: 7.6, h: 22.5, top: 6.2 },
    small: { r: 6.3, h: 19, top: 5.0 },
    jog: { r: 6.0, h: 16, top: 4.8 },
  };
  function knob(px, py, type = 'eq', angDeg = 0) {
    const k = KNOBS[type];
    const r = k.r, h = k.h, rt = k.top;
    const sk = type === 'jog' ? 1.2 : 2.0;     // flared skirt at the base (p_26, p_33)
    const prof = [[0, 0], [r + sk, 0], [r + sk, 0.7], [r + sk * 0.75, 1.9], [r + sk * 0.25, 3.2], [r + 0.02, 4.4], [r - 0.15, h * 0.5], [rt + 0.35, h - 1.0], [rt + 0.1, h - 0.35], [rt - 0.4, h], [0, h - 0.12]];
    const geo = latheGeo(`knob_${type}`, prof, 64, 16, 0.5, 3.6, h - 1.1);
    const x = X(px), z = Z(py), a = -angDeg * Math.PI / 180;
    put(`knob_${type}`, geo, M.knob, x, DECK_Y, z, a);
    // white indicator line: on the top face (centre -> edge) and down the side
    const tl = rt - 0.7;
    put('ind_top', boxGeo(0.9, 0.25, 1), M.white, x + Math.sin(a + Math.PI) * 0 , DECK_Y + h - 0.12, z, a, 1, 1, tl, 0, 0);
    // shift so the bar runs from centre towards -z (12 o'clock); done via offset along the knob axis
    const y0 = h * 0.5, y1 = h - 1.0, r0 = r - 0.15, r1 = rt + 0.35;
    const sideLen = Math.hypot(y1 - y0, r0 - r1), tilt = Math.atan2(r0 - r1, y1 - y0);
    const bt = lastBatch;
    put('ind_side', boxGeo(0.9, 1, 0.3), M.white, x, DECK_Y, z, a);
    const bs = lastBatch;
    const fix = (b, lx, ly, lz, sx2, sy2, sz2, rx) => {
      const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, a, 0, 'YXZ'));
      const off = new THREE.Vector3(lx, ly, lz).applyAxisAngle(new THREE.Vector3(0, 1, 0), a);
      m.compose(new THREE.Vector3(x + off.x, DECK_Y + ly, z + off.z), q, new THREE.Vector3(sx2, sy2, sz2));
      b.mats[b.mats.length - 1] = m;
    };
    fix(bt, 0, h - 0.12, -tl / 2 - 0.35, 1, 1, tl, 0);
    fix(bs, 0, y0, -(r0 + 0.05), 1, sideLen, 1, tilt);
  }
  function encoder(px, py) {  // LOAD / browse encoder
    const r = 9.6, h = 15;
    const prof = [[0, 0], [r + 3.6, 0], [r + 3.6, 0.8], [r + 1.0, 1.2], [r + 0.6, 1.2], [r, 1.6], [r, h - 1.2], [r - 0.9, h], [0, h + 0.4]];
    const geo = latheGeo('encoder', prof, 64, 30, 0.45, 1.8, h - 1.4);
    put('encoder', geo, M.knob, X(px), DECK_Y, Z(py));
  }

  function deck(off, deckNo) {
    const P = (px) => px + off;
    // ACTIVE PART buttons
    rectBtn(P(63), 150, 64, 23); rectBtn(P(149), 150, 64, 23); rectBtn(P(234), 150, 64, 23);
    // loop: IN / OUT / 4 BEAT round buttons with bezel
    for (const x of [63, 148, 233]) roundBtn(P(x), 241, 24, M.decalLED, 3.4, 31);
    // CALL / MIX POINT round buttons
    roundBtn(P(497), 151, 13, M.decalDim, 3); roundBtn(P(567), 151, 13, M.decalDim, 3);
    roundBtn(P(497), 241, 14, M.decalLED, 3); roundBtn(P(567), 241, 14, M.decalLED, 3);
    roundBtn(P(638), 241, 17, M.decalLED, 3);
    // browse encoder, BACK / VIEW, QUANTIZE / SLIP, SLIP REVERSE
    encoder(P(745), 151);
    rectBtn(P(713), 241, 46, 25, M.decalDim); rectBtn(P(777), 241, 46, 25, M.decalDim);
    rectBtn(P(713), 332, 46, 24); rectBtn(P(777), 332, 46, 24);
    rectBtn(P(73), 332, 84, 24);
    // DECK SELECT, JOG FEEL
    roundBtn(P(62), 435, 20, M.decalLED, 3, 25);
    knob(P(768), 435, 'jog', 0);
    // SHIFT, BEAT JUMP
    rectBtn(P(73), 912, 42, 19, M.decalDim);
    rectBtn(P(79), 1001, 34, 30, M.decalDim); rectBtn(P(134), 1001, 34, 30, M.decalDim);
    // pad mode row + PAGE
    for (const x of [240, 322, 404, 486]) rectBtn(P(x), 1085, 60, 21);
    rectBtn(P(553), 1085, 33, 21); rectBtn(P(603), 1085, 33, 21);
    // BEAT SYNC, TEMPO RESET, KEY SYNC
    rectBtn(P(678), 1025, 45, 31); roundBtn(P(678), 1131, 18, M.decalLED, 3, 22); rectBtn(P(678), 1238, 45, 31);
    // CUE / PLAY big buttons (LED ring + brushed centre)
    for (const y of [1123, 1277]) {
      const r = 59 * SX;
      const prof = [[0, 5.2], [r * 0.6, 5.0], [r - 3.8, 4.6], [r - 3.2, 4.2], [r - 3.0, 3.2], [r - 0.4, 3.2], [r, 2.6], [r, 0]];
      put('bigbtn', latheGeo('bigbtn', prof.reverse(), 64), M.decalLED, X(P(106)), DECK_Y, Z(y));
    }
    // 8 performance pads (2 x 4)
    for (const y of [1183, 1290]) for (const x of [256, 363, 470, 578]) {
      put('pad', keyGeo(88 * SX, 88 * SZ, 3.0, 1.6, 0.6), [M.decalLED, M.decalSide], X(P(x)), DECK_Y, Z(y));
    }
    // tempo fader
    tempoFader(P(754), 1130);
    // jog wheel
    jog(X(P(418)), Z(660), deckNo);
  }

  // faders --------------------------------------------------------------
  function slot(x, z, len, wid, alongX = false) {
    put('slot', boxGeo(1, 0.3, 1), M.slot, x, DECK_Y - 0.1, z, 0, alongX ? len : wid, 1, alongX ? wid : len);
  }
  const chCapGeo = cached('chcap', () => {
    // DJM style channel fader cap: profile in (z,y), extruded along x
    const s = new THREE.Shape();
    s.moveTo(-5.0, 0); s.lineTo(5.0, 0); s.lineTo(5.0, 6.5); s.lineTo(3.4, 11.2); s.lineTo(2.2, 11.6); s.lineTo(-1.2, 11.2);
    s.lineTo(-4.2, 9.0); s.lineTo(-5.0, 7.0); s.lineTo(-5.0, 0);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 19, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.4, bevelSegments: 2 });
    geo.translate(0, 0, -9.5); geo.rotateY(-Math.PI / 2);   // high edge towards the DJ (front), like the DJM caps in p_36
    return geo;
  });
  function chFader(px, pyCap) {
    const x = X(px), z = Z(pyCap);
    slot(x, Z(1012), Z(1100) - Z(925), 1.8);
    put('chcap', chCapGeo, M.fader, x, DECK_Y + 0.4, z);
    put('chcapLine', boxGeo(18.6, 0.3, 1.6), M.white, x, DECK_Y + 0.4 + 11.85, z + 2.3, 0, 1, 1, 1, 0.25);
  }
  function tempoFader(px, pyCap) {
    const x = X(px), z = Z(pyCap);
    slot(x, Z(1130), Z(1325) - Z(935), 2.0);
    const s = new THREE.Shape();
    s.moveTo(-6.5, 0); s.lineTo(6.5, 0); s.lineTo(6.5, 8.5); s.lineTo(4.5, 11.5); s.lineTo(-4.5, 11.5); s.lineTo(-6.5, 8.5); s.lineTo(-6.5, 0);
    const geo = cached('tempocap', () => {
      const g2 = new THREE.ExtrudeGeometry(s, { depth: 16, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.5, bevelSegments: 2 });
      g2.translate(0, 0, -8); return g2;
    });
    put('tempocap', geo, M.fader, x, DECK_Y + 0.4, z);
    put('tempoLine', boxGeo(14, 0.3, 1.4), M.white, x, DECK_Y + 0.4 + 12.0, z);
  }
  function crossfader(px, py) {
    const x = X(px), z = Z(py);
    slot(x, z, (1295 - 1110) * SX, 1.8, true);
    const s = new THREE.Shape();
    s.moveTo(-2.6, 0); s.lineTo(2.6, 0); s.lineTo(2.6, 10); s.lineTo(1.6, 13); s.lineTo(-1.6, 13); s.lineTo(-2.6, 10); s.lineTo(-2.6, 0);
    const geo = cached('xcap', () => { const g2 = new THREE.ExtrudeGeometry(s, { depth: 19, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.4, bevelSegments: 2 }); g2.translate(0, 0, -9.5); return g2; });
    put('xcap', geo, M.fader, x, DECK_Y + 0.4, z);
    put('xcapLine', boxGeo(1.0, 0.3, 18), M.white, x, DECK_Y + 0.4 + 13.3, z);
  }
  function slideSwitch(px, py, wpx, hpx, leverDx = 0, vertical = false) {
    const x = X(px), z = Z(py);
    put('swhousing', keyGeo(wpx * SX, hpx * SZ, 1.4, 1.2, 0.5), M.decalDim, x, DECK_Y, z);
    const lw = vertical ? 4 : 3.2, ld = vertical ? 6.5 : 5.5;
    put('swlever', keyGeo(lw, ld, 4.2, 0.8, 0.5), M.blackPlastic, x + leverDx, DECK_Y + 0.6, z);
    put('swleverLine', boxGeo(0.9, 0.2, ld - 1.6), M.white, x + leverDx, DECK_Y + 4.8, z);
  }

  // jog wheel ------------------------------------------------------------
  const jogTex = { platter: null, disp: [] };
  {
    const c = mkCanvas(1024, 1024), x = c.getContext('2d');
    x.fillStyle = '#121214'; x.fillRect(0, 0, 1024, 1024);
    for (let r = 512; r > 0; r -= 2.0) {
      const v = 16 + ((r * 7.3) % 7) + (Math.sin(r * 0.37) > 0.7 ? 9 : 0);
      x.strokeStyle = `rgb(${v},${v},${v + 1})`; x.lineWidth = 1.2; x.beginPath(); x.arc(512, 512, r, 0, Math.PI * 2); x.stroke();
    }
    jogTex.platter = texOf(c);
    for (const n of [1, 2]) {
      const dc = mkCanvas(1024, 1024), dx = dc.getContext('2d');
      dx.fillStyle = '#000'; dx.fillRect(0, 0, 1024, 1024);
      if (p35) {
        dx.save(); dx.beginPath(); dx.arc(512, 512, 512, 0, Math.PI * 2); dx.clip();
        dx.drawImage(p35, 800 - 500, 480 - 500, 1000, 1000, 0, 0, 1024, 1024);
        dx.restore();
        if (n === 2) { // deck number in the top-right of the display
          dx.fillStyle = '#000'; dx.fillRect(740, 160, 60, 70);
          dx.fillStyle = '#fff'; dx.font = 'bold 64px Arial'; dx.textAlign = 'center'; dx.fillText('2', 768, 220);
        }
      }
      jogTex.disp.push(texOf(dc));
    }
  }
  const jogMats = {
    platter: new THREE.MeshPhysicalMaterial({ map: jogTex.platter, bumpMap: jogTex.platter, bumpScale: 0.5, color: 0xffffff, roughness: 0.45, metalness: 0.0, clearcoat: 0.6, clearcoatRoughness: 0.18, envMapIntensity: 0.55 }),
    disp: jogTex.disp.map((t) => new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 1.15, roughness: 0.22, metalness: 0, envMapIntensity: 0.25 })),
    led: new THREE.MeshStandardMaterial({ color: 0xdfe6ff, emissive: 0xd8e4ff, emissiveIntensity: 0.55, roughness: 0.2, metalness: 0.6 }),
  };
  function jog(x, z, deckNo) {
    const JS = 1.15;   // vertical scale: platter top ~18.4 mm above the deck
    const jg = new THREE.Group(); jg.position.set(x, DECK_Y, z); jg.scale.y = JS; jg.name = 'jog' + deckNo; g.add(jg);
    const R = 100.7;
    // outer dark well rim on the plate + rubber ring with sloped outer wall
    const ring = new THREE.Mesh(latheGeo('jogring', [
      [R - 0.2, 0], [R, 0.5], [R - 0.2, 2.5], [R - 0.8, 5.5], [R - 1.6, 8.0], [R - 3.0, 10.0], [R - 6.0, 12.6], [R - 9.5, 14.6], [R - 12.0, 15.4], [87.6, 15.5], [86.6, 15.0], [86.6, 13.0],
    ], 160), M.rubber);
    ring.castShadow = ring.receiveShadow = true; jg.add(ring);
    // 24 pillowed grip pads on the sloped (cone) top of the ring
    const bumpGeo = cached('jogbump', () => keyGeo(19.0, 10.5, 2.0, 3.6, 1.0));
    const slope = Math.atan2(15.4 - 8.0, 12.0 - 1.6);
    for (let i = 0; i < 24; i++) {
      const a = (i + 0.5) / 24 * Math.PI * 2;
      const rr = R - 6.4 - 0.9 * Math.sin(slope), yy = (12.75 - 0.9 * Math.cos(slope)) * JS;
      put('jogbump', bumpGeo, M.rubberDark, x + Math.sin(a) * rr, DECK_Y + yy, z + Math.cos(a) * rr, a, 1, JS, 1, slope);
    }
    // chrome edge ring + platter
    const edge = new THREE.Mesh(latheGeo('jogedge', [[86.9, 13.4], [86.9, 15.2], [86.2, 15.9], [84.8, 16.0], [84.8, 15.0]], 128), M.chrome);
    jg.add(edge);
    const lip = new THREE.Mesh(latheGeo('jogled', [[86.7, 15.0], [86.7, 15.55], [86.4, 15.6]], 128), jogMats.led);
    jg.add(lip);
    const plat = new THREE.Mesh(new THREE.CircleGeometry(84.9, 128), jogMats.platter);
    plat.rotation.x = -Math.PI / 2; plat.position.y = 15.85; plat.receiveShadow = true; jg.add(plat);
    // centre display: glossy bezel + screen
    const bez = new THREE.Mesh(latheGeo('jogbez', [[0, 16.2], [39.5, 16.2], [40.2, 16.6], [39.6, 17.0], [37.4, 16.9], [37.0, 16.5]], 96), M.knobTop);
    jg.add(bez);
    const scr = new THREE.Mesh(new THREE.CircleGeometry(37.0, 96), jogMats.disp[deckNo - 1]);
    scr.rotation.x = -Math.PI / 2; scr.position.y = 16.55; jg.add(scr);
  }

  // ---------------------------------------------------------------- build decks
  deck(0, 1); deck(RD, 2);

  // ---------------------------------------------------------------- mixer
  const COLS = [1021, 1142, 1263, 1384];
  knob(1512, 147, 'eq'); knob(1512, 236, 'eq');                     // MASTER / BOOTH level
  for (const cx of COLS) {
    slideSwitch(cx, 183, 62, 24, -3.0);                              // PHONO/LINE input select
    for (const cy of [254, 353, 453, 556]) knob(cx, cy, 'eq');       // TRIM HI MID LOW
    knob(cx, 690, 'color');                                          // COLOR
    rectBtn(cx, 820, 62, 24);                                        // CUE
    chFader(cx, 1012);                                               // channel fader
    slideSwitch(cx, 1182, 74, 44, 0, true);                          // crossfader assign
  }
  // mic section
  knob(893, 236, 'small'); knob(893, 310, 'small'); knob(893, 385, 'small'); knob(893, 460, 'small');
  slideSwitch(902, 560, 72, 30, 0, true);
  // sound colour fx buttons
  for (const y of [636, 691, 747]) { rectBtn(867, y, 36, 22); rectBtn(920, y, 36, 22); }
  // sampler / headphones
  rectBtn(893, 820, 62, 24); knob(893, 915, 'small'); knob(893, 1068, 'small'); knob(893, 1175, 'small');
  // master cue, FX part select, beat FX
  rectBtn(1512, 565, 62, 24);
  {
    const rr = 57 * SX;
    const prof = [[0, 3.6], [6, 3.6], [6.6, 3.2], [7.2, 1.0], [rr - 3.5, 2.6], [rr - 0.6, 2.6], [rr, 2.0], [rr, 0]];
    put('fxpart', latheGeo('fxpart', prof.reverse(), 64), M.decalLED, X(1512), DECK_Y, Z(688));
  }
  rectBtn(1487, 912, 31, 19, M.decalDim); rectBtn(1537, 912, 31, 19, M.decalDim);
  knob(1512, 995, 'eq', 55); knob(1512, 1100, 'small', -15); knob(1512, 1205, 'small', 0);
  roundBtn(1512, 1312, 30, M.decalLED, 4.2, 38);
  crossfader(1202, 1307);
  // lit indicators / meters / FX display as glowing decals just above the plate
  const glow = (px, py, wpx, hpx) => put('glow', cached('glowplane', () => { const p = new THREE.PlaneGeometry(1, 1); p.rotateX(-Math.PI / 2); return p; }),
    M.decalGlow, X(px), DECK_Y + 0.06, Z(py), 0, wpx * SX, 1, hpx * SZ, 0, 0, { cast: false });
  for (const cx of COLS) { glow(cx - 49, 412, 9, 232); glow(cx - 28, 873, 16, 8); }
  glow(1484, 412, 11, 232); glow(1540, 412, 11, 232); glow(1512, 845, 114, 60); glow(893, 519, 18, 6);

  // ---------------------------------------------------------------- front face: wordmarks + headphone jacks
  {
    const fc = mkCanvas(4096, 256), x = fc.getContext('2d');   // covers x -356.5..356.5, y 4..50 (46 mm)
    const mmx = (mm) => (mm + HW) / W * 4096, mmy = (y) => (50 - y) / 46 * 256;
    const logo = (sx, sy, sw, sh, cx, cy, hmm) => {     // dark-on-white crop of p_07 -> white mask
      if (!p07) return;
      const tc = mkCanvas(sw, sh), t = tc.getContext('2d'); t.drawImage(p07, sx, sy, sw, sh, 0, 0, sw, sh);
      const id = t.getImageData(0, 0, sw, sh);
      for (let i = 0; i < id.data.length; i += 4) {
        const l = (id.data[i] + id.data[i + 1] + id.data[i + 2]) / 3; const a = 255 - l;
        id.data[i] = id.data[i + 1] = id.data[i + 2] = 236; id.data[i + 3] = a;
      }
      t.putImageData(id, 0, 0);
      const hpx = hmm / 46 * 256, wpx = hpx * sw / sh * (4096 / W) / (256 / 46);
      x.drawImage(tc, mmx(cx) - wpx / 2, mmy(cy) - hpx / 2, wpx, hpx);
    };
    logo(385, 1080, 625, 150, -239, 27.5, 14.3);        // serato   (sizes / positions from Pioneer's own front shot p_28)
    logo(118, 228, 1372, 200, 233, 27.5, 14.7);          // rekordbox (icon + word)
    x.fillStyle = 'rgba(220,220,220,0.85)'; x.font = '600 12px Arial'; x.textAlign = 'left';
    x.fillText('PHONES', mmx(-66), mmy(30.6));
    const t = texOf(fc);
    const fm = new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.5, depthWrite: false });
    const fp = new THREE.Mesh(new THREE.PlaneGeometry(W, 46), fm); fp.position.set(0, 27, HD + 0.08); g.add(fp);
    // jacks: 6.3 mm (gold) and 3.5 mm
    put('fjack63', cylGeo(5.2, 1.8, 32), M.gold, -92, 32, HD - 0.2, 0, 1, 1, 1, Math.PI / 2);
    put('fjackhole', cylGeo(3.3, 0.3, 24), M.hole, -92, 32, HD + 1.65, 0, 1, 1, 1, Math.PI / 2);
    put('fjack35', cylGeo(3.4, 0.8, 24), M.blackPlastic, -75, 32, HD - 0.1, 0, 1, 1, 1, Math.PI / 2);
    put('fjackhole', cylGeo(1.9, 0.3, 24), M.hole, -75, 32, HD + 0.72, 0, 1, 1, 1, Math.PI / 2);
  }

  // ---------------------------------------------------------------- rear panel
  const RZ = -HD;              // rear face plane
  const ports = [];
  const PORTS = [
    // id, kind, label, x, y, hole
    ['master1_r', 'xlr_male_out', 'MASTER 1 R (XLR, balanced)', 230.6, 21, 'xlr'],
    ['master1_l', 'xlr_male_out', 'MASTER 1 L (XLR, balanced)', 204.8, 21, 'xlr'],
    ['master2_r', 'rca', 'MASTER 2 R (RCA)', 175.2, 19.3, 'rca_r'],
    ['master2_l', 'rca', 'MASTER 2 L (RCA)', 161.0, 19.3, 'rca_l'],
    ['booth_r', 'trs_jack', 'BOOTH R (6.35 mm TRS, balanced)', 139.5, 19.3, 'trs'],
    ['booth_l', 'trs_jack', 'BOOTH L (6.35 mm TRS, balanced)', 119.4, 19.3, 'trs'],
    ['ch4_line_phono', 'switch', 'CH4 LINE/PHONO selector', 71.7, 19.3, 'slide'],
    ['ch4_r', 'rca', 'CH4 LINE/PHONO R (RCA)', 56.3, 19.3, 'rca_r'],
    ['ch4_l', 'rca', 'CH4 LINE/PHONO L (RCA)', 42.4, 19.3, 'rca_l'],
    ['ch2_r', 'rca', 'CH2 LINE R (RCA)', 23.7, 19.3, 'rca_r'],
    ['ch2_l', 'rca', 'CH2 LINE L (RCA)', 9.4, 19.3, 'rca_l'],
    ['ch1_r', 'rca', 'CH1 LINE R (RCA)', -9.6, 19.3, 'rca_r'],
    ['ch1_l', 'rca', 'CH1 LINE L (RCA)', -23.3, 19.3, 'rca_l'],
    ['ch3_r', 'rca', 'CH3 LINE/PHONO R (RCA)', -42.3, 19.3, 'rca_r'],
    ['ch3_l', 'rca', 'CH3 LINE/PHONO L (RCA)', -56.2, 19.3, 'rca_l'],
    ['ch3_line_phono', 'switch', 'CH3 LINE/PHONO selector', -72.7, 19.3, 'slide'],
    ['dmx_out', 'dmx_xlr', 'DMX OUT (XLR 3-pin, female)', -97.6, 24, 'xlrf'],
    ['usb_b', 'usb_c', 'USB B (Type-C, to PC/Mac)', -128.0, 15, 'usbc'],
    ['usb_a', 'usb_c', 'USB A (Type-C, to PC/Mac)', -148.1, 15, 'usbc'],
    ['mic2', 'trs_jack', 'MIC 2 (6.35 mm TRS, balanced)', -204.2, 19.3, 'trs'],
    ['mic1', 'xlr_trs_combo_in', 'MIC 1 (XLR / 6.35 mm combo, balanced)', -238.3, 27, 'combo'],
    ['power', 'switch', 'POWER switch', -276.6, 21, 'power'],
    ['dc_in', 'dc_in', 'DC IN 12 V', -310.0, 21, 'dc'],
    ['kensington', 'kensington', 'Kensington security slot', 264.3, 22, 'kens'],
  ];
  {
    // rear plate (shape with holes, seen from behind: shape x = -world x)
    const yb = FEET_H, yt = DECK_Y;
    const rp = rings;
    const halfAt = (ring) => HW - ring[1] - ring[2];
    const outline = [];
    rp.forEach((r) => outline.push([-halfAt(r), r[0]]));
    [...rp].reverse().forEach((r) => outline.push([halfAt(r), r[0]]));
    const shape = new THREE.Shape(outline.map(([sx, y]) => new THREE.Vector2(sx, y)));
    const HOLE = { xlr: 11.6, rca_r: 4.6, rca_l: 4.6, trs: 6.2, xlrf: 11.6, combo: 12.2, dc: 5.2 };
    for (const [, , , x, y, h] of PORTS) {
      const sx = -x;
      if (HOLE[h]) { const p = new THREE.Path(); p.absarc(sx, y, HOLE[h], 0, Math.PI * 2, true); shape.holes.push(p); }
      else if (h === 'usbc') shape.holes.push(rrectPath(9.4, 3.6, 1.7, sx, y));
      else if (h === 'slide') shape.holes.push(rrectPath(8.5, 4.0, 0.6, sx, y));
      else if (h === 'power') shape.holes.push(rrectPath(13, 13, 1.5, sx, y));
      else if (h === 'kens') shape.holes.push(rrectPath(3.2, 7.4, 0.8, sx, y));
    }
    const geo = new THREE.ShapeGeometry(shape, 24);
    const p = geo.attributes.position, uv = [];
    const ux0 = -HW, uy0 = yb, uh = yt - yb;
    for (let i = 0; i < p.count; i++) uv.push((p.getX(i) - ux0) / W, (p.getY(i) - uy0) / uh);
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.rotateY(Math.PI); geo.translate(0, 0, RZ);
    // rear graphics
    const PX = 6, cw = Math.round(W * PX), ch = Math.round(uh * PX);
    const rc = mkCanvas(cw, ch), c = rc.getContext('2d');
    const cx = (x) => (-x + HW) * PX, cy = (y) => (yt - y) * PX;
    c.fillStyle = '#1b1b1d'; c.fillRect(0, 0, cw, ch);
    // band grooves continuing the front profile
    c.fillStyle = '#0c0c0d'; for (const gy of [14.5, 40.5]) c.fillRect(0, cy(gy) - 2, cw, 4);
    c.fillStyle = '#2a2a2c'; for (const gy of [14.5, 40.5]) c.fillRect(0, cy(gy) + 2, cw, 1.5);
    const box = (x0, x1, title, sub, opt = {}) => {
      const yTop = 42.2, yBot = 7.6, L = Math.min(cx(x0), cx(x1)), R = Math.max(cx(x0), cx(x1));
      c.strokeStyle = '#bdbdbd'; c.lineWidth = 2.2; c.strokeRect(L, cy(yTop), R - L, cy(yBot) - cy(yTop));
      if (title) {
        c.fillStyle = '#c4c4c4'; c.fillRect(L, cy(yTop), R - L, 4.4 * PX);
        c.fillStyle = '#111'; c.font = `bold ${3.0 * PX}px Arial`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(title, (L + R) / 2, cy(yTop) + 2.25 * PX);
      }
      c.fillStyle = '#d0d0d0'; c.font = `${1.9 * PX}px Arial`; c.textAlign = 'center'; c.textBaseline = 'middle';
      if (sub) c.fillText(sub, (L + R) / 2, cy(36.0));
    };
    const txt = (s, x, y, size = 1.9, bold = false, col = '#d6d6d6') => {
      c.fillStyle = col; c.font = `${bold ? 'bold ' : ''}${size * PX}px Arial`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(s, cx(x), cy(y));
    };
    box(245, 184, 'MASTER', ''); box(184, 150.4, '', ''); txt('MASTER', 197.7, 40.0, 2.6, true, '#111');
    c.fillStyle = '#c4c4c4'; c.fillRect(cx(245), cy(42.2), cx(150.4) - cx(245), 4.4 * PX);
    txt('MASTER', 197.7, 40.0, 3.0, true, '#111');
    txt('1', 187.5, 36.5, 2.0, true, '#111'); c.fillStyle = '#ddd'; c.fillRect(cx(186) - 1, cy(37.8), 1.9 * PX, 2.6 * PX); txt('1', 187.0, 36.5, 2.0, true, '#111');
    txt('2', 153.8, 36.5, 2.0, true, '#111'); c.fillStyle = '#ddd'; c.fillRect(cx(152.6) - 1, cy(37.8), 1.9 * PX, 2.6 * PX); txt('2', 153.6, 36.5, 2.0, true, '#111');
    txt('R', 236, 34.5); txt('L', 199, 34.5); txt('R', 175.2, 27.5); txt('L', 161, 27.5);
    txt('1 GND  2 HOT  3 COLD', 217.7, 9.6, 1.5);
    box(149.8, 108.8, 'BOOTH', 'BALANCED'); txt('R', 139.5, 32.0); txt('L', 119.4, 32.0);
    txt('SIGNAL', 98, 34.0, 2.2, true); txt('GND', 98, 31.2, 2.2, true);
    box(80.9, 32.8, 'CH4', 'LINE / PHONO'); box(32.8, -0.4, 'CH2', 'LINE'); box(-0.4, -33.0, 'CH1', 'LINE'); box(-33.0, -81.6, 'CH3', 'LINE / PHONO');
    for (const [r, l] of [[56.3, 42.4], [23.7, 9.4], [-9.6, -23.3], [-42.3, -56.2]]) { txt('R', r, 27.6); txt('L', l, 27.6); }
    txt('LINE  PHONO', 71.7, 25.4, 1.5); txt('LINE  PHONO', -72.7, 25.4, 1.5);
    box(-83.0, -113.7, '', ''); c.fillStyle = '#c4c4c4'; c.fillRect(cx(-104), cy(42.2), cx(-113.7) - cx(-104), 4.4 * PX); txt('DMX', -108.8, 40.0, 2.8, true, '#111');
    // DMX metal mesh plate
    c.fillStyle = '#3b3b3e'; c.fillRect(cx(-83.6), cy(41.6), cx(-113.1) - cx(-83.6), cy(8.2) - cy(41.6));
    c.fillStyle = '#2a2a2c'; for (let yy = cy(41.6); yy < cy(8.2); yy += 6) for (let xx = cx(-83.6); xx < cx(-113.1); xx += 6) c.fillRect(xx + ((yy / 6) % 2) * 3, yy, 2.4, 2.4);
    box(-118.2, -157.3, 'USB', ''); c.strokeStyle = '#bdbdbd'; c.beginPath(); c.moveTo(cx(-138), cy(37.8)); c.lineTo(cx(-138), cy(7.6)); c.stroke();
    txt('B', -128, 31.5, 3.6, true); txt('A', -148.1, 31.5, 3.6, true);
    box(-194.1, -254.7, 'MIC', ''); txt('MIC 2', -204.2, 35.0, 1.8); txt('BALANCED', -204.2, 32.0, 1.8);
    txt('MIC 1    BALANCED', -238.3, 10.6, 1.7);
    txt('⏻', -276.6, 33.5, 4.0, true); txt('DC IN', -310, 35.5, 2.0, true); txt('◇-○-◇  12V', -310, 32.6, 1.7);
    txt('🔒', 264.3, 33.5, 3.0);
    // Pioneer DJ / serato logos at the +x end (crop the white Pioneer DJ wordmark from the top view)
    if (p31) {
      const tc = mkCanvas(180, 44), t = tc.getContext('2d'); t.drawImage(p31, 1112, 96, 180, 44, 0, 0, 180, 44);
      const id = t.getImageData(0, 0, 180, 44);
      for (let i = 0; i < id.data.length; i += 4) { const l = Math.max(0, Math.min(id.data[i], id.data[i + 1], id.data[i + 2]) - 120) * 3; id.data[i] = id.data[i + 1] = id.data[i + 2] = 238; id.data[i + 3] = Math.min(255, l); }
      t.putImageData(id, 0, 0);
      c.drawImage(tc, cx(330), cy(35.5), (cx(277) - cx(330)), (cx(277) - cx(330)) * 44 / 180);
    }
    if (p07) {
      const tc = mkCanvas(625, 150), t = tc.getContext('2d'); t.drawImage(p07, 385, 1080, 625, 150, 0, 0, 625, 150);
      const id = t.getImageData(0, 0, 625, 150);
      for (let i = 0; i < id.data.length; i += 4) { const l = (id.data[i] + id.data[i + 1] + id.data[i + 2]) / 3; id.data[i] = id.data[i + 1] = id.data[i + 2] = 236; id.data[i + 3] = 255 - l; }
      t.putImageData(id, 0, 0);
      const w2 = (cx(282) - cx(318)); c.drawImage(tc, cx(318), cy(24.5), w2, w2 * 150 / 625);
    }
    const rt = texOf(rc);
    const rm = new THREE.MeshStandardMaterial({ map: rt, roughness: 0.55, metalness: 0.1 });
    const rear = new THREE.Mesh(geo, rm); rear.receiveShadow = true; rear.name = 'rearPanel'; g.add(rear);
    // inner back wall behind the sockets (so the recesses read dark)
    const back = new THREE.Mesh(new THREE.PlaneGeometry(W - 30, 40), M.hole); back.position.set(0, 26, RZ + 16); back.rotation.y = Math.PI; g.add(back);

    // socket hardware
    const RX = Math.PI / 2;     // cylinder axis y -> z (towards the rear when the cylinder is built along +y and then pointed -z)
    const tube = (key, r, len, mat, x, y, z0, segs = 32) => put(key, cached(`tube${r}_${len}_${segs}`, () => {
      const c2 = new THREE.CylinderGeometry(r, r, len, segs, 1, true); c2.translate(0, len / 2, 0); return c2;
    }), mat, x, y, z0, 0, 1, 1, 1, RX);          // extends from z0 towards +z (into the unit)
    const disc = (key, r, mat, x, y, z, segs = 32) => put(key, cached(`disc${r}_${segs}`, () => { const c2 = new THREE.CircleGeometry(r, segs); return c2; }), mat, x, y, z, Math.PI);
    const cyl = (key, r, len, mat, x, y, z0, segs = 32) => put(key, cylGeo(r, len, segs), mat, x, y, z0, 0, 1, 1, 1, -RX); // extends from z0 towards -z (out of the unit)
    for (const [id, kind, label, x, y, h] of PORTS) {
      ports.push({ id, kind, label, pos: [x, y, RZ], dir: [0, 0, -1] });
      if (h === 'xlr' || h === 'xlrf' || h === 'combo') {
        const r = h === 'combo' ? 12.2 : 11.6;
        tube('sockTube', r, 14, M.hole, x, y, RZ);
        if (h === 'combo') {
          put('comboFlange', cached('comboFlange', () => {
            const sh = new THREE.Shape(); sh.absarc(0, 0, r + 2.4, 0, Math.PI * 2, false); const hp = new THREE.Path(); hp.absarc(0, 0, r, 0, Math.PI * 2, true); sh.holes.push(hp);
            const e = new THREE.ExtrudeGeometry(sh, { depth: 1.2, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.5, bevelSegments: 2, curveSegments: 40 }); e.rotateY(Math.PI); return e;
          }), M.blackPlastic, x, y, RZ);
        } else if (h === 'xlrf') {
          put('xlrRing' + r, cached('ring' + r, () => {
            const sh = new THREE.Shape(); sh.absarc(0, 0, r + 2.2, 0, Math.PI * 2, false); const hp = new THREE.Path(); hp.absarc(0, 0, r, 0, Math.PI * 2, true); sh.holes.push(hp);
            const e = new THREE.ExtrudeGeometry(sh, { depth: 1.0, bevelEnabled: true, bevelThickness: 0.4, bevelSize: 0.4, bevelSegments: 2, curveSegments: 32 }); e.rotateY(Math.PI); return e;
          }), M.steelDark, x, y, RZ);
        } else {
          put('xlrFlange' + r, cached('flange' + r, () => {
            const sh = rrectShape(26, 31, 2.5); const hp = new THREE.Path(); hp.absarc(0, 0, r, 0, Math.PI * 2, true); sh.holes.push(hp);
            const e = new THREE.ExtrudeGeometry(sh, { depth: 0.9, bevelEnabled: false, curveSegments: 24 }); e.rotateY(Math.PI); return e;   // extends towards -z
          }), M.blackPlastic, x, y, RZ);
        }
        tube('sockLip', r, 2.0, M.steelDark, x, y, RZ - 0.9);   // flange plate (flat against panel)
        if (h === 'xlr') {
          disc('xlrBack', r - 0.2, M.blackPlastic, x, y, RZ + 12);
          for (const [dx, dy] of [[-4.2, 2.4], [4.2, 2.4], [0, -4.6]]) put('xlrPin', cylGeo(0.8, 9, 10), M.gold, x + dx, y + dy, RZ + 12, 0, 1, 1, 1, -RX);
          put('xlrKey', boxGeo(2.4, 1.6, 10), M.blackPlastic, x, y + r - 1.6, RZ + 6);
        } else {
          // female insert (DMX / combo XLR part): black insulator with 3 holes, latch tab on top
          disc('xlrfFace', r - 0.4, M.insert, x, y, RZ + 2.2);
          for (const [dx, dy] of [[-4.2, 2.4], [4.2, 2.4], [0, -4.6]]) disc('xlrfHole', 1.2, M.hole, x + dx, y + dy, RZ + 2.1, 12);
          put('latch', boxGeo(5, 3, 1.4), M.steel, x, y + r + 1.0, RZ - 1.4);
          if (h === 'combo') { disc('comboTrs', 3.4, M.hole, x, y, RZ + 2.0, 24); put('comboRing', cylGeo(4.6, 0.8, 24), M.insert, x, y, RZ + 2.1, 0, 1, 1, 1, -RX); }
        }
        const sc = (dx, dy) => put('screw', cylGeo(1.4, 0.8, 12), M.steel, x + dx, y + dy, RZ, 0, 1, 1, 1, -RX);
        if (h === 'combo') { sc(10.5, 10.8); sc(-10.5, -10.8); } else { sc(-9.5, 12.5); sc(9.5, -12.5); }
      } else if (h.startsWith('rca')) {
        put('rcaNut', cylGeo(5.6, 1.6, 6), M.blackPlastic, x, y, RZ, Math.PI / 6, 1, 1, 1, -RX);
        put('rcaRing' + h, cylGeo(5.0, 2.4, 32), h === 'rca_r' ? M.red : M.ivory, x, y, RZ - 1.4, 0, 1, 1, 1, -RX);
        put('rcaCollar', cylGeo(4.1, 8.5, 32), M.gold, x, y, RZ - 1.6, 0, 1, 1, 1, -RX);
        disc('rcaInsul', 3.2, M.blackPlastic, x, y, RZ - 10.12);
        put('rcaPin', cylGeo(0.75, 1.0, 10), M.gold, x, y, RZ - 10.2, 0, 1, 1, 1, -RX);
        tube('rcaTube', 4.6, 4, M.hole, x, y, RZ);
      } else if (h === 'trs') {
        tube('sockTube', 6.2, 10, M.hole, x, y, RZ);
        put('trsNut', cylGeo(7.2, 1.3, 32, 7.0), M.gold, x, y, RZ, 0, 1, 1, 1, -RX);
        put('trsNutIn', cylGeo(4.6, 1.4, 24), M.hole, x, y, RZ - 0.05, 0, 1, 1, 1, -RX);
        disc('trsBack', 6, M.blackPlastic, x, y, RZ + 9);
      } else if (h === 'usbc') {
        put('usbBezel', keyGeo(11.4, 5.4, 0.6, 2.2, 0.2), M.blackPlastic, x, y, RZ, 0, 1, 1, 1, -Math.PI / 2);
        put('usbShell', keyGeo(9.0, 3.3, 0.3, 1.6, 0.1), M.steel, x, y, RZ - 0.6, 0, 1, 1, 1, -Math.PI / 2);
        put('usbIn', keyGeo(8.0, 2.5, 0.1, 1.2, 0.04), M.hole, x, y, RZ - 0.9, 0, 1, 1, 1, -Math.PI / 2);
        put('usbTongue', boxGeo(6.0, 0.7, 0.1), M.blackPlastic, x, y - 0.35, RZ - 1.02);
      } else if (h === 'slide') {
        put('slideIn', boxGeo(8.5, 4, 3), M.hole, x, y - 2, RZ + 1.5);
        put('slideLever', boxGeo(2.6, 3, 4), M.blackPlastic, x - 2.2, y - 1.5, RZ + 0.5);
      } else if (h === 'power') {
        put('pwrIn', boxGeo(13, 13, 6), M.hole, x, y - 6.5, RZ + 3);
        put('pwrBtn', keyGeo(11, 11, 3.5, 1.2, 0.6), M.blackPlastic, x, y, RZ + 0.8, 0, 1, 1, 1, -Math.PI / 2);
      } else if (h === 'dc') {
        tube('sockTube', 5.2, 8, M.hole, x, y, RZ);
        put('dcRing', cylGeo(6.6, 1.2, 32), M.blackPlastic, x, y, RZ, 0, 1, 1, 1, -RX);
        put('dcPin', cylGeo(1.0, 6, 12), M.gold, x, y, RZ + 7, 0, 1, 1, 1, -RX);
        disc('dcBack', 5, M.blackPlastic, x, y, RZ + 7.5);
      } else if (h === 'kens') {
        put('kensIn', boxGeo(3.2, 7.4, 5), M.hole, x, y - 3.7, RZ + 2.5);
      }
    }
    // signal GND terminal (screw knob), cord hook
    put('gndKnob', cylGeo(4.6, 6, 24), M.steel, 89.6, 19.3, RZ, 0, 1, 1, 1, -RX);
    put('gndShaft', cylGeo(1.8, 2, 12), M.steel, 89.6, 19.3, RZ - 6, 0, 1, 1, 1, -RX);
    const hook = new THREE.Mesh(cached('hook', () => {
      const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(10, 0); s.lineTo(10, 3); s.lineTo(3, 3); s.lineTo(3, 14); s.lineTo(0, 14); s.lineTo(0, 0);
      const e = new THREE.ExtrudeGeometry(s, { depth: 17, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.5, bevelSegments: 2 });
      e.translate(0, 0, -8.5); e.rotateY(Math.PI / 2); return e;
    }), M.blackPlastic);
    hook.rotation.y = Math.PI / 2; hook.position.set(-340, 32, RZ); hook.rotation.set(0, -Math.PI / 2, Math.PI / 2);
    hook.position.set(-340, 46, RZ + 0.5); hook.castShadow = true; g.add(hook);
  }

  flush();

  // ---------------------------------------------------------------- info
  const bb = new THREE.Box3().setFromObject(g);
  const info = {
    w: W, d: D, h: +bb.max.y.toFixed(1), deckY: DECK_Y,
    overall: { w: +(bb.max.x - bb.min.x).toFixed(1), d: +(bb.max.z - bb.min.z).toFixed(1), h: +bb.max.y.toFixed(1) },
    feet: feet.map((f) => ({ x: f.x, z: f.z, r: f.r })),
    ports,
    frontPorts: [
      { id: 'phones_6_3', kind: 'trs_jack', label: 'PHONES 6.35 mm (front)', pos: [-92, 32, HD], dir: [0, 0, 1] },
      { id: 'phones_3_5', kind: 'trs_jack', label: 'PHONES 3.5 mm mini (front)', pos: [-75, 32, HD], dir: [0, 0, 1] },
    ],
  };
  return { group: g, info };
}
