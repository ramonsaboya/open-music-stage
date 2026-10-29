# Keychron B1 Pro keyboard model — fidelity log

Module: `js/keyboard.js` (`build(THREE) -> {group, info}`). Origin: centre of the bottom face (y = 0 = underside of the
rubber feet), +z = typing edge (towards the user), +x = user's right. Renders: `shots/keyboard/`.

## Product
Amazon UK B0F63C8CJZ = **Keychron B1 Pro Ultra-Slim Wireless Keyboard, UK ISO layout, Space Grey** (77 keys, 75 %,
scissor switches, ZMK, 2.4 GHz / Bluetooth 5.2 / USB-C wired, 425 g, ABS body and keycaps, non-backlit).

## Dimensions and sources
| Quantity | Value | Source |
|---|---|---|
| Length (x) | 296 mm | Amazon image `refs/keyboard/az6.jpg` ("11.65 inches (296 mm)"), Amazon spec table, Keychron product page (`keychron_b1pro.json`) |
| Depth (z) | 130 mm | az6.jpg ("5.11 inches (130 mm)"), spec table, Keychron page |
| Height front | 5.2 mm | az6.jpg, spec table ("Height (front) 5.2 mm") |
| Height rear | 14.5 mm | az6.jpg, spec table ("Height (rear) 14.5 mm") |
| Typing angle | 3.2 deg | Amazon A+ image `ap8.jpg`, spec table ("Typing Angle 3.2") |
| Deck (key plate) outline | 296 x 126 mm, corner radius 12 mm | measured in az6.jpg (deck px 271..1732 x 578..1194, 4.935 px/mm) |
| Rear bar | 250 mm long (x +-125), sticks out 3.5-4 mm behind the deck, top 14.5 mm | az6.jpg (bar px 385..1618 x 561..578), side views in az6 / `kc_B1-Pro-Ultra-lightweight-Design.jpg` |
| Key pitch | 19.05 mm (94 px), cap 17.2 mm (85 px); F row 96.5 px pitch | connected-component measurement of every key in az6.jpg |
| Switches | BT/Cable/2.4G slider at x=+101, Mac/Win slider at x=+83.5, rear face of the bar, right end | az6.jpg (bumps on the bar), az7.jpg, user manual p.3-4 (`manual.pdf`, "system toggle on the top right corner") |
| Keycap height above deck | 1.9 mm | ESTIMATE from the side views |
| Deck slab thickness 3.4 mm, feet (4 x 0.6 mm, positions) | | ESTIMATE from side views (az6 bottom, lightweight-design image) |
| USB-C port | rear face of the bar, x = -100, y = 7 | **ESTIMATE** — no photo, drawing or text in the listing, Keychron page or manual shows it |

Deck plane: front top edge at y = 5.2, rear top edge y = 12.24 (3.2 deg); keys rise 1.9 mm above it; bar top 14.5.

## Method
- az6.jpg (Keychron's orthographic top view) is cropped to the deck and used as the albedo of the deck and of the
  keycap tops (legends, dish shading, the three status LED marks above F10..F12); caps get a steeper tone curve
  (pow 1.5) so the black ABS stays black under the scene light.
- 77 keycaps (incl. ISO L-enter and split up/down arrows) from the measured rectangles: extruded rounded rects
  (r 2.1, 0.55 bevel), merged into two meshes (tops with photo UVs projected from deck x/z, sides plain).
- Deck slab (bevelled rounded rect) in a group tilted 3.2 deg; recessed lower body sheared to follow the deck;
  rear bar = extruded side profile with rounded ends; slider slots + knobs + printed labels on the rear face.
- ~25k triangles, 8 draw calls for the keys/deck.

## Passes
### Pass 1 — first full build
Renders p1_top.png, p1_34.png; cmp1_top.png (vs az6).
Layout registration with az6: every key lines up (no visible offset). Differences: keycaps and deck too light / too
lavender, key edges catching too much reflection, gaps look bright.
Score: geometry 82, layout 95, materials 65, labels 88, lighting 72 -> **80**

### Pass 2 — colour
Deck albedo x0.62, shell #5f6371, cap sides #131315 rougher, cap tops tone-curved. cmp2b_az1.png / cmp3_az1.png (vs
Amazon main image az1): key black, deck space-grey and legends now match.
Score: geometry 83, layout 95, materials 84, labels 90, lighting 80 -> **86**

### Pass 3 — side + rear
cmp3_side.png (vs az6 side view): wedge, bar lip above the deck, feet match. cmp4_rear.png (vs az7): first version had
a visible label rectangle, tiny slots and a near-black lower body. Fixed: transparent label decal following the
leaning rear face, 9 / 6.6 mm oval slots with 3.2 mm knobs, lower body #555965.
Score: geometry 88, layout 95, materials 87, labels 90, lighting 82 -> **89**

### Pass 4 — check views
p5_top.png, p5_front_right.png, p5_corner.png (vs `kc_B1-Pro-Ultra-lightweight-Design.jpg` corner close-up).
No structural differences left at viewing distance.
Score: geometry 89, layout 96, materials 88, labels 91, lighting 84 -> **90** (stopped; further gains marginal)

## Remaining differences
- USB-C position is a guess (rear bar, left end).
- Keycap sides are straight extrusions; the real caps have a slightly thinner, crisper skirt; dish is only in the texture.
- Rear-face lighting looks darker than Keychron's back-lit product photo (scene lighting, not material).
- Legends are photo resolution (~4.9 px/mm), soft at very close range.
