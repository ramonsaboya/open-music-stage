# FLX10 stage viewer

To-scale (1 unit = 1 mm) Three.js viewer of a Pioneer DDJ-FLX10 on a THOR DJS002 stand with an iPad Air and iPad mini,
an audience-facing honeycomb LED strip and a hanging illuminated logo box, in two rig versions: V1 (the design going ahead, shown by default) and V2 (backup concept).

## Run
From this folder, then open http://127.0.0.1:8765 (needs internet for Three.js and fonts from the CDN):

    python -m http.server 8765 --bind 0.0.0.0

From a phone on the same Wi-Fi: http://<this PC's LAN IP>:8765 (find it with `ipconfig`; it can
change). Windows treats this network as Public, so the firewall may block the phone until you allow Python on it
(Windows Security → Firewall → Allow an app → python.exe → Private/Public) or switch the network to Private.
On a phone the control card starts collapsed at the top (tap +); one finger orbits, two fingers zoom/pan.

Useful URL params: `?view=audience|dj|cables|logo|top|side|front|audLow|right45`, `&mode=a|b|overlay|splitv|splith`,
`&split=0.5`, `&light=studio|bright|club`, `&ui=0` (hide UI), `&t=2` (freeze animation time).

## Versions
- **V1**: a straight plug in every rear socket (MASTER 1 XLR L/R, MASTER 2 RCA L/R, CH1–CH4 RCA, BOOTH L/R, DMX,
  both USB-C, DC IN), all black. Each sticks straight out, bends down onto the rear frame tube and converges
  into the cable slot. MIC 1 carries an L-shaped wireless receiver dongle lying flat towards the centre, over MIC 2. Printed mounts: a 4 mm
  bridge plate under the controller's rear feet plus slim uprights snapped into the gaps between plugs, each with a
  seat, lip and backrest for the tablet. LED strip across the full table width on the rear edge band; the logo box
  hangs directly under it, back face in the table edge plane.
- **V2**: only BOOTH L/R (right-angle plugs: L turned flat towards the centre, R 45° down, so the two cables read
  apart), MIC 1 (the same dongle, inside the shelf), USB and DC IN. A printed shelf (full table width, or the controller's width
  plus 80 mm each side with the Setup toggle) continues its top surface back to the table's rear edge, hides all cables (use "V2 shelf
  opacity" to x-ray it) and carries the tablets. The LED strip sits near the top of the shelf's rear face; the logo
  box's top is flush with the table rim, back face against the edge band.
- Both: 35 mm tall honeycomb LED strip (flat-topped cells: two full per column, partial ones above and below),
  240 × 240 × 50 mm black box with the Open Music logo (fits a 220 mm square, 10 mm border), one rainbow wave
  running through both.

## Front keyboard mount (both versions)
A printed mount on the DJ side: a 3 mm tongue under the controller's front feet (the controller rises 3 mm and the V1
rear plate grows to 7 mm, so it stays level), a front wall covering the controller's front headphone jacks, and a
platform sticking out past the table edge, sloping 8° towards the DJ, carrying a Keychron B1 Pro (UK ISO, 296 × 130 mm,
5.2 / 14.5 mm high) with its rear top edge level with the controller's deck. The headphone cable leaves through a
grommet on the mount's front. Slope and position are sliders under Setup; the keyboard model is `js/keyboard.js`
(notes in `notes/keyboard.md`, USB-C port position estimated).

## Versions and compare
The panel's Version row switches between V1 · main and V2 · backup (key `V`). "Compare" opens the bottom bar:
Overlay (blend slider), Split ⇆ / Split ⇅ with a draggable divider (arrow keys when focused), a background colour per
version (also tints the floor), swap sides; key `C` cycles modes while it is open.

## Files
| File | What |
|---|---|
| `index.html`, `js/app.js` | viewer UI, scene assembly, per-version bloom composers and compositor |
| `js/flx10.js` | DDJ-FLX10 model (self-scored 88/100), real rear port layout in `info.ports` |
| `js/thor.js` | THOR DJS002 model (90/100), `opts.height` 675–925, 250 × 100 cable cutout |
| `js/connectors.js` | XLR / TRS / RCA / USB-C / DC plugs incl. right-angle variants (87/100), cable routing |
| `js/rig.js` | tablets, screens, V1 mounts, V2 shelf, mic dongle, cable routing on the table |
| `js/fx.js` | LED strip and logo box shaders |
| `js/front.js`, `js/keyboard.js` | front keyboard mount; Keychron B1 Pro model |
| `notes/mount-research-prompt.md` | brief for researching how to print the tablet mounts |
| `CONTRACT.md` | axes, units and module API |
| `notes/*.md` | per-model fidelity passes and what still differs from reality |
| `shots/` | renders; `tools/shot.sh` makes headless screenshots; `harness.html?m=<module>` views one model |
| `refs/` | reference photos used; `legacy/` the previous round's files |

## Findings that matter for the real build
- The THOR top's front/rear steel tubes are 30 mm deep and stand 4 mm above the panel; the panel between them is only
  390 mm deep against the FLX10's 387. The controller clears the tubes on its feet, so it sits flush with the outer front
  edge with its front feet on the tube; a 4 mm plate under the rear feet keeps it level (that is the V1 mount plate).
- That leaves 63 mm from the controller's rear face to the table edge, of which 33 mm is open cable slot.
  Straight XLR/jack plugs (55–60 mm) end within a few mm of the edge, so their cables bend down right at it.
- The photos put the table's edge band at ~52 mm; the 35 mm strip fits inside its height.
- The real THOR slot looks ~200 mm wide; the model uses the requested 250 × 100.
- DC IN plug assumed 5.5 / 2.5 mm barrel (12 V 3 A adaptor); the inner diameter is unconfirmed.

Live: https://ramonsaboya.github.io/open-music-stage/
