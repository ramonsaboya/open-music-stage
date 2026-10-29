// Front (DJ-side) printed mount: a thin tongue clamped under the controller's front feet, a sloped platform sticking out
// past the table's front edge that carries the keyboard with its top level with the controller's deck, and a front wall
// that covers the controller's front headphone jacks, with the headphone cable leaving through the mount's front.
import * as THREE from 'three';

export const TONGUE_T = 3;   // tongue thickness under the controller's front feet (the rear plate grows by the same)

/**
 * ctx: { topY, rimH, frontZ (controller front face = table front edge, world), deckWorldY, flxBaseY (controller base),
 *        x (mount centre), angle (deg, platform falls towards the DJ), keyboard ({group, info} or null), jackX, material }
 */
export function buildFrontMount(ctx) {
  const g = new THREE.Group(); g.name = 'frontMount';
  const kb = ctx.keyboard?.info || { w: 296, d: 130, hBack: 14.5 };
  const a = THREE.MathUtils.degToRad(ctx.angle);
  const gapRear = 8, margin = 12, W = kb.w + 2 * margin, Dp = gapRear + kb.d + margin;
  const z0 = ctx.frontZ, b0 = ctx.topY + ctx.rimH;
  // platform top at the controller face, set so the keyboard's rear top edge sits level with the controller's deck
  const yR = ctx.deckWorldY - kb.hBack * Math.cos(a);
  const yF = yR - Dp * Math.tan(a), bottom = ctx.topY - 32;
  // side profile in (z, y), extruded along x. The tongue joins the body at the controller's front face.
  const tongueBack = z0 - 60;
  const prof = [[tongueBack, b0], [z0, b0], [z0, bottom], [z0 + Dp, bottom], [z0 + Dp, yF], [z0, yR], [z0, b0 + TONGUE_T], [tongueBack, b0 + TONGUE_T]];
  const shape = new THREE.Shape(prof.map(([z, y]) => new THREE.Vector2(z, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: W, bevelEnabled: false });
  // shape x -> world z, shape y -> world y, extrusion -> world x
  geo.applyMatrix4(new THREE.Matrix4().set(0, 0, -1, W / 2, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1));   // a rotation, so faces keep their winding
  geo.computeVertexNormals();
  const body = new THREE.Mesh(geo, ctx.material); body.castShadow = body.receiveShadow = true; g.add(body);

  // keyboard on the slope, rear edge gapRear in front of the controller
  if (ctx.keyboard) {
    const k = ctx.keyboard.group, s = gapRear + kb.d / 2;
    k.rotation.set(a, 0, 0);
    k.position.set(0, yR - s * Math.sin(a), z0 + s * Math.cos(a));
    g.add(k);
  }

  // headphone cable: the plug sits in the controller's 6.35 jack inside the wall; the cable leaves through a grommet
  // low on the mount's front face and hangs down towards the DJ
  const jx = (ctx.jackX ?? 0) - ctx.x;
  const cMat = new THREE.MeshStandardMaterial({ color: 0x121214, roughness: 0.55 });
  const exitY = bottom + 14, exitZ = z0 + Dp;
  const grom = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 4, 24), cMat);
  grom.rotation.x = Math.PI / 2; grom.position.set(jx, exitY, exitZ + 1.5); g.add(grom);
  const pts = [[jx, exitY, exitZ], [jx, exitY, exitZ + 18], [jx + 4, exitY - 30, exitZ + 34], [jx + 10, exitY - 140, exitZ + 40], [jx + 14, exitY - 320, exitZ + 30]]
    .map((p) => new THREE.Vector3(...p));
  const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 80, 2.6, 12, false), cMat);
  cable.castShadow = true; g.add(cable);

  g.position.x = ctx.x;
  g.userData = { W, Dp, yR, yF, bottom };
  return g;
}
