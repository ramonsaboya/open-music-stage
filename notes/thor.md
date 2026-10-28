# THOR DJS002 stand — fidelity log (`js/thor.js`)

## Reading of the reference photos
- **Orientation.** thor_07 / thor_08 / thor_10: the laptop shelf faces the DJ, the cable slot and the shelf post are at the
  rear, the THOR print is on the front (DJ-side) face of the top. The floor frame projects *forward* (towards the DJ)
  and the front floor cross bar sits ~60-100 mm in front of the top. thor_10 is shot from the front-RIGHT (the right
  end of the near cross bar is lower in the frame = nearer), thor_01 from the front-left at a raised height.
- **Z side frame (thor_07/08).** Clamp plate (~300 mm long, ~6 mm) under each side of the top, two thumb knobs hanging
  under it at z ≈ ±125. One slanted rectangular upright, ~70 mm deep (z), leaning ~11° (top forward). At the minimum
  height (knob at the bottom of the J-slot in thor_07) the outer tube reaches right up to the plate, so no inner tube
  is visible; thor_01 (raised) shows the narrower inner tube between the plate and the outer tube, outer tube has two
  bolt holes near its top. J-slot column on the outer (±x) face with 8 notches above the knob, notches point forward.
  Floor runner (≈40 × 50 mm) welded to the front face of the upright ~20-25 mm off the floor; upright itself stands
  on the floor. Front cross bar with end caps; levelling foot + upward thumb knob + knurled zinc nut just behind it.
  No rear floor cross member (thor_07/08/10).
- **Top (thor_07 band crop, thor_10, thor_11, thor_09).** Front/rear members are ~30 mm deep rectangular tubes with
  black plastic end caps that show on the side faces; side members are folded channels whose top flange carries a
  zinc dome-head screw at z ≈ ±128; a bright galvanised strip shows in the gap between flange and panel; black satin
  panel ~4 mm below the tube tops; two horizontal bracket slots in the rear tube face (thor_09).
- **Edge band height.** Owner said ~80 mm. Side photos (thor_07 crop: band 50 px vs 458 px depth → 49 mm; thor_09:
  ~56 mm incl. perspective) support **~50-56 mm** for the frame band, plus a ~6 mm clamp plate under the sides; the
  80 mm figure only works if the knobs/plate are included. Model uses 52 mm band (+4 mm rim above the panel), 6 mm plate.
- **Upright x position.** thor_09 (perspective-corrected) and thor_10 put the outer face of the upright within ~10 mm
  of the table end, so the centre line is at x = ±462.5.

## Passes
| pass | geom/proportions (35) | construction details (30) | materials/colour (20) | lighting response (15) | total | notes |
|---|---|---|---|---|---|---|
| 01 | 24 | 17 | 12 | 9 | 62 | first build: framed top, Z frames, J-slot plate, knobs, feet, cutout |
| 02-05 | 27 | 21 | 13 | 10 | 71 | knob reshaped (wider, tapered, domed), clamp plate moved under frame, welds smoothed, knurl darker, panel less glossy |
| 06-08 | 31 | 24 | 14 | 10 | 79 | outer tube now reaches the plate at 675 mm (photo-correct telescoping), 9 positions @31.25 mm, round J-hooks pointing forward, 2 holes at outer-tube top, band 58→52 mm, screws at z ±128, runner top channel |
| 09-14 | 32 | 25 | 15 | 11 | 83 | chamfered end caps 6 mm proud of the side faces (thor_07/11), strip 10 mm & brighter, strip-end gaps, rear bracket slots resized/re-placed from thor_09 (60 mm @ x ±62), panel sheen tuned against thor_09 (semi-gloss, bright at grazing), cutout grommet checked |
| 15-20 | 33 | 27 | 17 | 12 | 89 | J-slot notches redrawn as down-sloping capsules (thor_12) with a black backing so the slot reads as an opening; knob head rebuilt as a superquadric "lens" (flat to the hub, arched outer face); black albedo raised to physically plausible 0x363335 (warm charcoal like the photos); knurled nut as metallic colour texture; V-groove on runner top |
| 21-25 | 33 | 28 | 17 | 12 | 90 | removed hidden bracket bar (underside now plate + channel return like thor_03), 25 mm zinc washers, thin-stroke THOR wordmark with barred O redrawn to match thor_10 |

Side-view check at 675 mm (thor_07): band 52 mm ✓, upright lean ✓, notch column 0.37-0.66 of height ✓, base projects ~70 mm
ahead of the top front vs ~65-100 mm in the photos (photo measurements disagree by ±15 mm between thor_07 and thor_08).
thor_01 (a 500 px render-like image) shows the frames assembled the other way round (floor frame to the rear); thor_07,
thor_08 and thor_10 all show it forward (anti-tip for a DJ leaning on the front edge), so the model follows those.
Triangles: ~65.7k at 800 mm (10 merged meshes + logo plane).
| 26-31 | 33 | 28 | 17 | 12 | 90 | strip made mirror-like (bright only where it catches a light, as in thor_10 vs thor_11), slightly darker panel/powder, rolled (bullnose) outer top edge on the side channels matched to thor_11 from the same viewpoint |

## Final (pass 31): 90/100 — stopping, further gains are marginal with this lighting
- geometry/proportions 33/35, construction details 28/30, materials/colour 17/20, lighting response 12/15.
- Remaining differences: the lighting is the shared RoomEnvironment rather than the white photo studio, so the satin
  black reads a touch flatter and the strip/panel sheen is less bright than in thor_09/11; the hidden underside of the
  panel is a plain slab (not visible in any photo); knob heads are a generic lens shape (real ones have a slightly
  wedge/"D" plan); weld beads are stylised; photo measurements of the base projection / upright x-position disagree by
  ±15 mm between views; the real cable slot is ~200 mm wide — the model uses the owner's 250 × 100 cut-out.
- Best renders: shots/thor/final_34.png, final_side_675.png, final_rear.png, final_slot.png, final_corner.png.
- Debug: `harness.html?m=thor.js%3Fh%3D675%26` renders another height through the module URL (opts.height wins).
