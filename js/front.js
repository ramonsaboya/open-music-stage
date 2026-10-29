// Front (DJ-side) printed keyboard tray: slim arms whose tongues are clamped under the controller's front feet, each
// arm a thin gusset that rises just in front of the controller's front face to carry a thin sloped plate. The plate has
// a low front lip so the keyboard can't slide off; the keyboard's back sits a hair in front of the controller, its rear
// top edge level with the deck.
import * as THREE from 'three';

export const TONGUE_T = 3;   // tongue thickness under the controller's front feet (the rear plate grows by the same)
const PLATE_T = 3, LIP_H = 5, LIP_T = 3, ARM_T = 8, CLEAR = 1, KB_GAP = 1.5;

/**
 * ctx: { topY, rimH, frontZ (controller front face = table front edge, world), deckWorldY, x (tray centre),
 *        angle (deg, tray falls towards the DJ), keyboard ({group, info} or null), material }
 */
export function buildFrontMount(ctx) {
  const g = new THREE.Group(); g.name = 'frontMount';
  const kb = ctx.keyboard?.info || { w: 296, d: 130, hBack: 14.5 };
  const a = THREE.MathUtils.degToRad(ctx.angle), ca = Math.cos(a), sa = Math.sin(a);
  const z0 = ctx.frontZ, b0 = ctx.topY + ctx.rimH;
  const zR = z0 + CLEAR;                                   // tray's rear edge, just clear of the controller
  const D = KB_GAP + kb.d + LIP_T;                         // tray length along the slope
  // tray top at its rear edge, so the keyboard's rear top lands level with the deck
  const yTop = ctx.deckWorldY - kb.hBack * ca + KB_GAP * sa;
  const along = (s, up = 0) => new THREE.Vector2(zR + s * ca - up * sa, yTop - s * sa + up * ca);   // (z, y) on the slope

  // side profile (z, y) of the plate (top face = keyboard seat) + front lip, extruded across the keyboard's width
  const W = kb.w + 4;
  const plate = [along(0, -PLATE_T), along(D, -PLATE_T), along(D, LIP_H), along(D - LIP_T, LIP_H), along(D - LIP_T, 0), along(0, 0)];
  addExtrusion(g, plate, W, 0, ctx.material);

  // arms: tongue under the controller's front feet, then a thin gusset rising just in front of its face to the plate
  const arm = [new THREE.Vector2(z0 - 55, b0), new THREE.Vector2(zR, b0 - 4), new THREE.Vector2(zR + 10, b0 - 4),
    along(D * 0.62, -PLATE_T), along(0, -PLATE_T), new THREE.Vector2(zR, b0 + TONGUE_T), new THREE.Vector2(z0 - 55, b0 + TONGUE_T)];
  for (const ax of [-W / 2 + 22, 0, W / 2 - 22]) addExtrusion(g, arm, ARM_T, ax, ctx.material);

  if (ctx.keyboard) {
    const k = ctx.keyboard.group, s = KB_GAP + kb.d / 2;
    k.rotation.set(a, 0, 0);
    const c = along(s, 0); k.position.set(0, c.y, c.x);
    g.add(k);
  }
  g.position.x = ctx.x;
  return g;
}

// Extrude a (z, y) profile along x, centred on x = cx, width w.
function addExtrusion(g, pts, w, cx, mat) {
  const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: w, bevelEnabled: false });
  // shape x -> world z, shape y -> world y, extrusion -> world x (a rotation, so faces keep their winding)
  geo.applyMatrix4(new THREE.Matrix4().set(0, 0, -1, cx + w / 2, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; g.add(m);
}
