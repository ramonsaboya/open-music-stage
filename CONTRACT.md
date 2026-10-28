# Module contract (read before editing anything in js/)

Project root: `C:\Users\Ramon\dj-setup-viewer`. Static server: `python -m http.server 8765 --bind 127.0.0.1`
run from the project root (usually already running — check with `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8765/harness.html`).

## Conventions
- Three.js **0.169.0** ES modules via the import map in `harness.html` / `index.html` (`import * as THREE from 'three'`,
  addons from `three/addons/...`). Modules may also just use the `THREE` passed to `build`.
- Units **millimetres**. **+y up**, **+z towards the DJ** (front), **-z towards the audience** (rear), **+x to the DJ's right**.
- Every model module exports `async function build(THREE, opts) -> { group, info }` and optionally `tick(seconds, group)`
  for animation. No global side effects, no DOM UI, no lights (lighting comes from `js/env.js`).
- Materials: `MeshStandardMaterial` / `MeshPhysicalMaterial`; the scene has an environment map (RoomEnvironment PMREM)
  so metalness/roughness read properly. Printed graphics and labels: CanvasTexture drawn in code (or crops of the
  reference photos in `refs/` loaded with TextureLoader from a relative path, if that is the best route to fidelity).
  Set `colorSpace = THREE.SRGBColorSpace` on colour textures. `castShadow`/`receiveShadow` on solid meshes.
- Budget: < 600k triangles per model, use InstancedMesh or merged geometry for repeated parts.
- Do not edit `js/env.js`, `harness.html`, `tools/`, or another stream's files. Put scratch renders in `shots/<stream>/`.

## Files and owners
| File | Stream | Origin of the returned group |
|---|---|---|
| `js/flx10.js` | FLX10 model | centre of footprint, y=0 at the underside of the rubber feet, front face at +z |
| `js/thor.js` | THOR DJS002 stand | centre of the tabletop footprint on the floor, y=0 = floor |
| `js/connectors.js` | plugs and cables | each plug: origin at the mating face centre, cable exits along +z of the plug |
| `index.html`, `js/scene*.js`, `js/led.js`, `js/mounts.js`, `js/shelf.js` | integrator (main session) | world |

## `info` each model must return
- `flx10.js`: `{ w, d, h, deckY /* top surface height */, feet:[{x,z,r}], ports:[{ id, kind, label, pos:[x,y,z], dir:[0,0,-1] }] }`
  `pos` = centre of the socket opening on the rear face, group-local. `kind` one of
  `xlr_male_out` (panel XLR male, takes a female cable plug), `xlr_trs_combo_in`, `trs_jack` (6.35 mm),
  `rca`, `usb_c`, `dc_in`, `dmx_xlr`, `switch`, `kensington`. Include every socket the real rear panel has.
- `thor.js`: `{ topY /* tabletop upper surface */, w, d, rimH, rimW, frontInnerZ, rearInnerZ, rearOuterZ,
  apron:{ h, rearFaceZ, bottomY }, cutout:{ x, z, w, d } /* cable slot centre + size in the top */ }`
- `connectors.js`: `makePlug(kind, opts) -> Object3D`, `makeCable(points, { radius, color }) -> Mesh`, and
  `plugKindFor(portKind)`. Plug geometry for: XLR female cable plug, 6.35 mm TRS plug, RCA plug (red/white),
  USB-C plug, DC barrel / power plug, DMX XLR. Each with `info.length` (how far the rigid part extends) and `info.radius`.

## Fidelity loop (both model streams)
Render the model at the camera angle of a reference photo with `tools/shot.sh`, look at both images side by side,
write the differences, fix the biggest ones, repeat. Log each pass in `notes/<stream>.md`: pass number, score 0–100
across geometry/proportions, layout, materials/colour, labels/print, lighting response, and what changed.
Stop only when an honest score is >= 90 or after the improvements become marginal (state which).
