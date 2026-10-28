// Audience-facing lighting: honeycomb LED strip along the rear edge and the hanging illuminated logo box.
// Both share one rainbow wave, driven by world-space x so the colour runs continuously from strip to logo.
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

export const fxUniforms = {
  uTime: { value: 0 },
  uSpeed: { value: 0.25 },     // wave cycles per second
  uWave: { value: 900.0 },     // mm per full hue cycle
  uBright: { value: 4.0 },     // emissive gain (bloom picks up values > 1)
  uOn: { value: 1.0 },
};

const RAINBOW_GLSL = /* glsl */`
  uniform float uTime, uSpeed, uWave, uBright, uOn;
  vec3 hsv2rgb(vec3 c){ vec3 p = abs(fract(c.xxx + vec3(0.,2./3.,1./3.))*6.-3.); return c.z*mix(vec3(1.), clamp(p-1.,0.,1.), c.y); }
  vec3 rainbow(float x){ return hsv2rgb(vec3(fract(x/uWave - uTime*uSpeed), 0.95, 1.0)); }
`;

// Honeycomb diffuser: each hex cell is one LED pocket, hot in the middle and falling off towards a dark cell wall.
// Flat-topped hexes laid out in the face's own plane (cell = flat-to-flat height). Columns alternate: the main columns
// (one is centred on x = 0) show two full cells straddling the centre line with partial cells above and below.
function honeycombMaterial(cell) {
  return new THREE.ShaderMaterial({
    uniforms: { ...fxUniforms, uCell: { value: cell } },
    vertexShader: /* glsl */`
      varying vec3 vW; varying vec2 vL;
      void main(){ vL = position.xy; vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`
      varying vec3 vW; varying vec2 vL; uniform float uCell;
      ${RAINBOW_GLSL}
      float hexDist(vec2 p){ p = abs(p); return max(dot(p, normalize(vec2(1.,1.7320508))), p.x); }
      void main(){
        // swap axes so the pointy-topped lattice below comes out flat-topped; shift half a cell so two centre on y = 0
        vec2 p = vec2(vL.y/uCell + .5, vL.x/uCell);
        vec2 s = vec2(1.,1.7320508), h = s*.5;
        vec2 a = mod(p, s)-h, b = mod(p-h, s)-h;
        vec2 gv = dot(a,a) < dot(b,b) ? a : b;
        float d = hexDist(gv);                       // 0 centre .. 0.5 wall
        float wall = smoothstep(.42, .46, d);
        float core = exp(-d*d*16.);
        vec3 c = rainbow(vW.x + gv.y*uCell);         // one colour per cell, from its centre's world x (face is turned by PI)
        vec3 lit = c*(0.25 + 0.75*core)*uBright*uOn*0.55;
        vec3 col = mix(lit, vec3(0.012), wall);
        gl_FragColor = vec4(col + vec3(0.01), 1.);
      }`,
  });
}

function logoMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { ...fxUniforms },
    vertexShader: /* glsl */`
      varying vec3 vW; varying vec3 vN;
      void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`
      varying vec3 vW; varying vec3 vN;
      ${RAINBOW_GLSL}
      void main(){
        // White acrylic face lit from behind by RGB LEDs: mostly the LED colour with a white-hot core.
        vec3 c = rainbow(vW.x + (vW.y - 700.)*0.35);
        vec3 col = mix(c, vec3(1.), 0.06) * uBright * uOn * 0.42;
        float side = 1. - abs(vN.z);                 // extrusion walls a little dimmer
        gl_FragColor = vec4(col*(1. - side*0.45) + vec3(0.02), 1.);
      }`,
  });
}

/**
 * LED strip on the audience-facing (rear, -z) apron of the table.
 * width/height in mm; the strip's face points along -z. Returns a group whose origin is the strip's centre on its back.
 */
export function makeLedStrip({ width = 995, height = 35, depth = 14, border = 3, cell } = {}) {
  // face shows two full cells per main column plus a quarter of the next ones: face height = 2.5 cells
  const faceH = height - 2 * border;
  cell = cell ?? faceH / 2.5;
  const g = new THREE.Group(); g.name = 'ledStrip';
  const housing = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.55, metalness: 0.4 }));
  housing.position.z = -depth / 2; housing.castShadow = true; g.add(housing);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(width - 2 * border, faceH), honeycombMaterial(cell));
  face.rotation.y = Math.PI; face.position.z = -depth - 0.3; g.add(face);
  // thin frosted cover catching a little of the room light
  const cover = new THREE.Mesh(new THREE.PlaneGeometry(width - 4, height - 4),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.15, transmission: 0, transparent: true, opacity: 0.06 }));
  cover.rotation.y = Math.PI; cover.position.z = -depth - 0.8; g.add(cover);
  // spill light so the floor and the logo box pick up the colour
  const spill = new THREE.PointLight(0xffffff, 0, 900, 2); spill.position.set(0, -40, -depth - 120); g.add(spill);
  g.userData.spill = spill;
  return g;
}

/**
 * 240 x 240 x 50 mm black box with the white logo, lit by the same rainbow wave.
 * The logo is scaled to fit within maxLogo (default 220 mm, leaving a 10 mm border). Face points along -z.
 * Origin: centre of the box's top edge at its back face.
 */
export async function makeLogoBox({ size = 240, thick = 50, maxLogo = 220, svgUrl = 'assets/open_music.svg' } = {}) {
  const g = new THREE.Group(); g.name = 'logoBox';
  const boxMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0b, roughness: 0.6, metalness: 0.15 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(size, size, thick), boxMat);
  box.position.set(0, -size / 2, -thick / 2); box.castShadow = true; box.receiveShadow = true; g.add(box);
  // the black front panel is a separate acrylic sheet
  const front = new THREE.Mesh(new THREE.PlaneGeometry(size - 2, size - 2),
    new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.6 }));   // matte: a glossy face mirrored the spill lights as dots
  front.rotation.y = Math.PI; front.position.set(0, -size / 2, -thick - 0.2); g.add(front);

  try {
    const data = await new SVGLoader().loadAsync(svgUrl);
    const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p));
    const geo = new THREE.ExtrudeGeometry(shapes, { depth: 2, bevelEnabled: false, curveSegments: 24 });
    geo.computeBoundingBox();
    const bb = geo.boundingBox, w = bb.max.x - bb.min.x, h = bb.max.y - bb.min.y;
    const s = maxLogo / Math.max(w, h);
    geo.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, 0);
    const logo = new THREE.Mesh(geo, logoMaterial());
    // Turn to face the audience (-z), and flip y because SVG y runs downwards.
    logo.rotation.y = Math.PI;
    logo.scale.set(s, -s, 1);
    logo.position.set(0, -size / 2, -thick - 0.4);
    g.add(logo);
    g.userData.logoSize = [w * s, h * s];
  } catch (e) {
    console.warn('logo svg failed', e);
  }
  const glow = new THREE.PointLight(0xffffff, 0, 700, 2); glow.position.set(0, -size / 2, -thick - 150); g.add(glow);
  g.userData.glow = glow;
  return g;
}

const _c = new THREE.Color();
export function tickFx(t, strip, logo) {
  fxUniforms.uTime.value = t;
  // drive the spill lights with the colour at their x so the surroundings pick up the wave
  const hue = (x) => ((x / fxUniforms.uWave.value - t * fxUniforms.uSpeed.value) % 1 + 1) % 1;
  const on = fxUniforms.uOn.value * fxUniforms.uBright.value;
  if (strip?.userData.spill) { strip.userData.spill.color.copy(_c.setHSL(hue(0), 1, 0.5)); strip.userData.spill.intensity = 120 * on; }
  if (logo?.userData.glow) { logo.userData.glow.color.copy(_c.setHSL(hue(0), 1, 0.5)); logo.userData.glow.intensity = 60 * on; }
}
