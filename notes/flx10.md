# DDJ-FLX10 model — fidelity log

Module: `js/flx10.js` (`build(THREE) -> {group, info}`), origin at the footprint centre, y=0 under the feet.
Renders: `shots/flx10/`.

## Method
- Layout source: Pioneer's top view `refs/flx10/pioneer/p_31.png` (left deck + mixer).
  Chassis edges measured in that image: x 2 .. 1581 (deck|mixer seam 824, mixer|right-deck seam 1581), y 73 .. 1385.
  Mapping: `X = -356.5 + (px-2) * 713/2401`, `Z = -193.5 + (py-73) * 387/1312` (right deck = left deck + 1579 px; both decks share one layout).
- The photo becomes the top-plate albedo at load time (canvas): the mixer's diagonal gloss reflection is removed
  (min-filter + blur background estimate, subtracted), the right deck is the left deck re-used with mirrored edge strips,
  the left-deck-only rear marks (power / MIC) are patched out, the right deck's DECK SELECT is re-labelled 2/4.
- Every 3D control is placed at its printed counterpart's pixel position; buttons, pads, CUE/PLAY, FX part select use a
  "decal" material whose UVs are projected from the instance's plate position (onBeforeCompile), so their tops show the
  photo (labels, LED colours) and glow through the emissive map. Knobs, faders, jogs, switches are real geometry.
- Rear ports: x positions from the gold RCA collars visible behind the top edge of p_31 and the rear strip p_33
  (two independent scales agree to < 0.5 mm), height from p_33, master XLR / Kensington / power / DC from a
  perspective fit on ts_render4/5.
- Chassis: lofted rings (bands, two V-grooves, top bevel, chamfered lower corners), rear wall replaced by a panel with
  real holes for every socket; sockets are recessed tubes / inserts / collars.

## Passes

### Pass 1 — first full build (130k tris)
Render: pass01_top.png, pass01_34.png.
Broken: loft faces inverted (chassis invisible), shadows only from walls (open box).
Score: geometry 55, layout 85, materials 60, labels 75, lighting 55 -> **66**

### Pass 2 — winding / shadow fix, ref-matched cameras
Cameras fitted to ts_render1 (`cam=0,950,600 fov 25`), ts_render, ts_render2 (front low), ts_render4 (rear 3/4).
Fixed: loft winding, top plate / bottom cast shadows (shadowSide Double), XLR flanges were solid (now ring with hole),
pad walls dimmer than pad tops.
Differences found: front wordmarks ~60% too small, band grooves at wrong heights (ref: 14.5 / 40.5 mm), jog grip
bumps invisible, DMX socket unreadable, Pioneer DJ rear logo had a grey box.
Score: geometry 76, layout 92, materials 74, labels 80, lighting 74 -> **79**

### Pass 3 — profile + logos + knobs
Front logos to 15 mm (serato) / 14.5 mm (rekordbox), grooves moved, knob profile flared base + 16 deeper flutes,
mixer panel darker/satin, jog bumps lighter.
Top-view overlay against p_31 (cmp_top_blend.png): no visible ghosting -> layout registration within ~1 mm.
Rear ortho vs p_33 (cmp_rear.png): every socket lines up horizontally.
Score: geometry 80, layout 94, materials 76, labels 84, lighting 76 -> **82**

### Pass 4 — rear details
DMX: female insert with 3 holes + steel ring (no square flange, printed mesh plate shows), combo insert visible,
instancing key bug fixed (instances with the same name but different geometry were merged).
Score: geometry 82, layout 94, materials 77, labels 85, lighting 76 -> **83**

### Pass 5 — heights, logos from Pioneer's own front shot
Knobs 22.5 mm (mixer) / 19 mm (small) so the overall height lands at 72.6 mm (spec 73.4 incl. protrusions);
jog raised to ~18.4 mm (p_33 rear strip: jog top ~0.85x knob top). Front logos re-measured on p_28 (Pioneer photo,
more trustworthy than the TurboSquid model): serato 59 mm wide centred x=-239, rekordbox 101 mm centred x=+233,
phones 6.35 mm at x=-92, 3.5 mm at x=-75. Plate env reflection reduced (0.75), platter less metallic.
Score: geometry 84, layout 94, materials 79, labels 86, lighting 78 -> **84**

### Pass 6 — print sharpness, rear MIC combo
Unsharp mask on the (1.5x upscaled) plate texture; MIC 1 combo gets its round flange with diagonal screws (p_33).
Checked against ts_render5 / ts_render6 / ts_render7 cameras: no structural differences left at those distances.
Score: geometry 84, layout 95, materials 80, labels 88, lighting 79 -> **85**

### Pass 7 — jog wheel shape
p_29/p_31 show the jog's rubber ring as a gentle cone carrying 24 pillowed grip pads (13 mm radial extent in the top
view), not a tall wall with pockets (that is the TurboSquid model's interpretation). Ring re-profiled (short steep wall to
8 mm, cone to 15.4 mm), 24 pads 19 x 10.5 mm tilted to the cone. Pads lowered to 3 mm. Jog display less mirror-like
(it was washed out by the ceiling reflection in straight top-down views).
Score: geometry 86, layout 95, materials 81, labels 88, lighting 80 -> **86**

### Pass 8 — final materials / knobs / faders (153k tris)
Pioneer p_26/p_28 show a glossy black mixer panel and glossy platter (the TurboSquid renders are too grey): mixer
roughness ~0.22, platter clearcoat; deck plates darkened slightly. Knobs get the flared 18 mm skirt seen in p_26/p_33.
Channel fader caps flipped so the high edge with the white stripe faces the DJ (p_36). Unsharp mask moved to the native
photo (≈ 70 ms instead of 200 ms; total load-time image processing ≈ 200 ms). Rear order checked against the
official layout (VirtualDJ / Pioneer manual numbering 56-68: MASTER1 XLR, MASTER2 RCA, BOOTH TRS, CH4, CH2, CH1, CH3,
DMX, USB, MIC2, MIC1, POWER, DC IN) — matches.
Score: geometry 87, layout 95, materials 85, labels 89, lighting 83 -> **88**

## Stop
Stopping at 88: the remaining gaps are marginal per pass (each of the last three passes gave ~1 point) and mostly
need information the refs do not contain (side-panel detail, underside, exact feet, real knob cross-section).
Remaining differences: photo-baked lighting on the plate (from p_31's studio lighting) does not react to the scene light;
button/pad sides take the edge colour of the photo; knob flutes are approximated; side handle notch (TS only) omitted;
feet positions guessed; jog LED ring is a fixed white/silver; the right deck re-uses left-deck print (only DECK SELECT
"2/4" and the display deck number are changed); Kensington slot position from the TurboSquid model.
Best shots: final_ts1_topfront.png, final_34.png, final_rear34.png, final_top_ortho.png, final_front_low.png.
