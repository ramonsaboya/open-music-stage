# Research brief: 3D-printed tablet mounts behind a DJ controller

I need research, not a design. Find the best way to 3D-print a set of tablet mounts so they are as strong and durable as
possible for the situation below: material, print orientation and layer-line direction, how to split and join the
parts, slicer settings and design rules. I'll design the parts afterwards from your findings.

## The setup (all dimensions in mm)

- **Table:** THOR DJS002 DJ stand.
  - Top: 995 wide × 450 deep.
  - Steel frame tubes run along the front and rear edges, each 30 deep, standing 4 above the top panel. The panel
    between them is about 390 deep.
  - A cable cutout through the panel sits centred on the rear edge, right in front of the rear tube: about 200–250 wide
    × 100 deep (to be measured).
- **Controller:** Pioneer DDJ-FLX10, 713 wide × 387 deep × about 73 high (top deck about 50 above its base). It
  weighs about 6 kg (to be verified).
  - It sits centred left to right, flush with the table's front edge, so its front feet rest on the front steel tube.
  - Its rear feet stand on the panel, 4 lower than the front ones. A 4 thick plate under the rear feet makes it level.
  - Feet: assumed 6 rubber feet about 22 across, at roughly x = −300, 0, +300 and about 44 in from the front and rear
    faces (to be measured on the real unit).
  - With the rear feet 44 in from its rear face, the centre rear foot lands over the cable cutout and the outer two
    stand on the panel.
- **Space behind the controller:** 63 from its rear face to the table's rear edge. The first 33 of that is open cable
  slot; the last 30 is the rear steel tube (4 proud of the panel).
- **Rear sockets:** the socket centres are 15–27 above the controller's base, so 19–31 above the panel once the 4
  plate is under it. Straight black cables are plugged into almost every socket. Each plug sticks 31–60 straight out
  of the rear face (the XLR and 6.35 jack plugs reach to within a few mm of the table edge), then the cable bends down
  over the tube and goes into the cutout.
  - Socket x positions (0 = centre, + = right as seen by the DJ):

    | Socket | x positions |
    |---|---|
    | XLR (master out) | 231, 205 |
    | RCA | 175, 161, 56, 42, 24, 9, −10, −23, −42, −56 |
    | 6.35 jack (booth) | 140, 119 |
    | DMX XLR | −98 |
    | USB-C | −128, −148 |
    | Wireless mic receiver (XLR, at −238) | an L-shaped dongle lying flat towards the centre, covering −250 to −170 |
    | DC power | −310 |

  - Free gaps between the plugs are roughly: −90 to −70, 65 to 110, 245 to 300, and beyond ±320. Anything rising
    behind the controller has to fit through gaps like these.
- **Tablets:** two, held in landscape behind the controller and leaning back about 20° from vertical. The bottom edge
  of each is about 60 above the table and 8 behind the controller's rear face.

  | Tablet | Size | Weight | Position (x) | Top edge above table |
  |---|---|---|---|---|
  | iPad Air 11" | 247.6 × 178.5 × 6.1 | about 460 g | −124 to +124 | about 228 |
  | iPad mini | 195.4 × 134.8 × 6.3 | about 295 g | +134 to +329 | about 187 |

  - Ports, buttons and the camera must stay clear.
- **Use:** the DJ taps and swipes both screens during sets (rekordbox), so the tops of the tablets get repeated pushes
  backwards. There will also be knocks and cable tugs, and the stand gets transported to gigs.
  - Bass vibration.
  - Heat: stage lights, and a hot car in summer, maybe 50–60 °C.
  - The mounts must survive being left loaded for months without sagging or cracking.

## The mount concept so far (my plan, keep within it)

- **Several pieces, not one.** At least one mount per tablet, and none of them runs the full width.
- **Flat base plate:** each mount starts with a thin flat plate (about 4 thick, so it is also the levelling shim) that
  slides under the controller's rear feet. The controller's own weight clamps it, so there are no screws into the
  table or the controller.
- **Uprights:** from the plate's rear edge, uprights rise straight up through the gaps between the plugs, about 14
  wide and 9 deep in the current concept. The plate overhangs the cable slot here, with nothing under it.
- **Cradle:** at the top of the uprights, a cradle (seat, front lip and backrest) holds the tablet's bottom edge at
  the 20° lean.
- **The weak point to worry about:** the long lever from the touch point at the top of the tablet, down to the
  upright, down to the plate under the foot. In particular the joint where the upright meets the plate, the plate
  bending over the open slot, and the plate sliding out from under the foot.
- **A second mount comes later:** a sloped platform clamped the same way between the table and the controller's
  front, sticking out towards the DJ, carrying a small keyboard level with the controller's top. Keep the findings
  general enough to cover that one too.

## What to research

1. **Loads.** Rough the forces and bending moments at the upright base, the upright-to-plate joint and the plate
   under the foot.
   - Inputs: a 5–20 N push at the tablet's top edge, the tablets' weight, and a dropped object or knock.
   - Also: the clamping force from the foot (about 1.5 kg per foot, if the weight is spread evenly) and whether
     friction alone keeps the plate in place. If it doesn't, what fixes it: TPU pads, a lip that hooks the rear
     tube, a pocket for the foot.
2. **Layer lines and print orientation.** FDM parts are weakest between layers (Z). For each part (plate, upright,
   cradle, and the L-shaped plate-plus-upright piece if it is one part), work out:
   - which orientation keeps the main bending stresses running along the extrusion lines rather than across the
     layers
   - whether printing on the side or edge beats printing flat
   - what to do about the L joint
3. **Split and join.** Is it better to print the plate and upright separately and join them, or as one piece in a
   good orientation? Compare the joining options:
   - bolts with heat-set inserts
   - dovetails or keyed slots
   - press-fit pins
   - embedded steel rods or threaded rod
   - glued joints
   - a metal (steel or aluminium) plate for the 4 mm tongue, with printed parts bolted to it

   Give the strength and stiffness trade-offs.
4. **Materials.** Compare PLA / PLA+, PETG, ABS / ASA, PC / PC blends, nylon and carbon-fibre-filled grades. Cover:
   - strength between layers
   - stiffness
   - creep under constant load
   - heat resistance (glass transition temperature against 50–60 °C in a car)
   - impact
   - how hard each is to print on a typical home printer

   Recommend one, with a fallback.
5. **Slicer settings for strength:**
   - wall / perimeter count and line width
   - layer height
   - infill type and %, or solid
   - top and bottom layers
   - nozzle temperature and cooling (for layer adhesion)
   - whether annealing or remelting with salt is worth it
   - where adding walls beats adding infill
6. **Design rules with numbers:**
   - minimum section sizes
   - fillet radii at the L joint
   - gussets and ribs that still fit the gaps between the plugs
   - hole and insert spacing from edges
   - tolerances for the tablet fit and the plate's thickness
   - how to stop it rattling and how to protect the tablet (TPU or felt liners)
   - how to keep the controller exactly level on a 4 mm plate that is compressed by its rubber feet
7. **Failure modes and testing.**
   - How these parts usually fail: cracking along layers at the upright base, creep sag, cracks from inserts, the
     plate pulling out.
   - Simple home tests to check a printed part before trusting it with a tablet: hanging weights, a deflection
     check, a heat soak.
   - Whether a quick FEA run (for example a free tool) is worth doing, and which one.

## What I want back

- A short ranked recommendation (material, how to split the parts, orientation of each part, joining method).
- A settings table.
- Design rules with numbers.
- An orientation sketch or description for each part, showing which way the layer lines run against the load.
- A list of measurements I should take on the real hardware before designing.
- Sources for the claims: test data, papers, or reputable maker or engineering write-ups. Say where something is
  rule of thumb and where it is measured data.

My printer and the materials I have: [FILL IN: printer model, nozzle, enclosure yes/no, filaments on hand].
