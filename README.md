# FLX10 stage viewer

To-scale (1 unit = 1 mm) Three.js viewer of a Pioneer DDJ-FLX10 on a THOR DJS002 stand with an iPad Air and iPad mini,
an audience-facing honeycomb LED strip and a hanging illuminated logo box, in two rig versions you can compare.

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
- **V1**: right-angle plugs in every used rear socket (MASTER 1 XLR L/R, MASTER 2 RCA L/R, BOOTH L/R, MIC 1, USB, DC IN).
  Cables inside the slot's width drop straight through it; the others are turned sideways, lie along the rear frame tube
  and turn down into the slot. Printed mounts: a 4 mm bridge plate under the controller's rear feet plus slim uprights
  that are snapped automatically into the gaps between plugs, each with a seat, lip and backrest for the tablet.
- **V2**: only BOOTH L/R, MIC 1, USB and DC IN. A printed shelf continues the controller's top surface back to the
  table's rear edge, hides all cables (use "V2 shelf opacity" to x-ray it) and carries the tablets.
- Both: 80 mm honeycomb LED strip across the full rear face, 240 × 240 × 50 mm black box below it with the
  Open Music logo (fits a 220 mm square, 10 mm border), one rainbow wave running through both.

## Compare
Bottom bar: V1, V2, Overlay (blend slider), Split ⇆ / Split ⇅ with a draggable divider (arrow keys when focused),
a background colour per version (also tints the floor), swap sides. Key `C` cycles modes.

## Files
| File | What |
|---|---|
| `index.html`, `js/app.js` | viewer UI, scene assembly, per-version bloom composers and compositor |
| `js/flx10.js` | DDJ-FLX10 model (self-scored 88/100), real rear port layout in `info.ports` |
| `js/thor.js` | THOR DJS002 model (90/100), `opts.height` 675–925, 250 × 100 cable cutout |
| `js/connectors.js` | XLR / TRS / RCA / USB-C / DC plugs incl. right-angle variants (87/100), cable routing |
| `js/rig.js` | tablets, screens, V1 mounts, V2 shelf, cable routing on the table |
| `js/fx.js` | LED strip and logo box shaders |
| `CONTRACT.md` | axes, units and module API |
| `notes/*.md` | per-model fidelity passes and what still differs from reality |
| `shots/` | renders; `tools/shot.sh` makes headless screenshots; `harness.html?m=<module>` views one model |
| `refs/` | reference photos used; `legacy/` the previous round's files |

## Findings that matter for the real build
- The THOR top's front/rear steel tubes are 30 mm deep and stand 4 mm above the panel; the panel between them is only
  390 mm deep against the FLX10's 387. The controller clears the tubes on its feet, so it sits flush with the outer front
  edge with its front feet on the tube; a 4 mm plate under the rear feet keeps it level (that is the V1 mount plate).
- That leaves 63 mm from the controller's rear face to the table edge, of which 33 mm is open cable slot.
  Straight XLR/jack plugs (55–60 mm) would overhang the table, so right-angle plugs (Neutrik NC3FRX / NC3MRX / NP3RX
  style) are assumed throughout.
- The photos put the table's edge band at ~52 mm, not 80; the LED strip is 80 mm tall and hangs ~28 mm below it.
- The real THOR slot looks ~200 mm wide; the model uses the requested 250 × 100.
- DC IN plug assumed 5.5 / 2.5 mm barrel (12 V 3 A adaptor); the inner diameter is unconfirmed.

Live: https://ramonsaboya.github.io/open-music-stage/
