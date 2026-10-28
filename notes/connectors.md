# connectors.js — plugs + cables

## Conventions
- Plug origin = centre of the mating face = the plane flush with the socket's front face on the panel.
  Parts that go *into* the socket (XLR insert / pins, jack shaft, RCA pin+sleeve, USB-C shell, DC barrel) are at z < 0
  (`userData.insert` = how deep). Plug body at z > 0.
- Straight plugs: cable exits along +z at `[0,0,userData.length]`.
- Right-angle (`*_ra`) plugs: cable exits along -y at `userData.exit = [0, -drop, exitZ]`; `userData.length` = depth behind
  the panel along +z (back of the housing), `userData.drop` = distance below the plug axis where the cable starts.
- Every plug also has `userData.exit` / `userData.exitDir` (plug-local) so `cableFromPlug(plug, {end, endDir})` can route
  from a placed plug in world space.

## Port -> plug (plugKindFor)
| port kind | plug | RA variant |
|---|---|---|
| xlr_male_out (MASTER 1) | xlr_female | xlr_female_ra |
| xlr_trs_combo_in (MIC 1) | xlr_male | xlr_male_ra (NC3MRX-style) |
| trs_jack (MIC 2, BOOTH) | trs_635 | trs_635_ra |
| rca (MASTER 2, CH inputs) | rca | rca_ra |
| usb_c | usb_c | usb_c_ra |
| dc_in | dc_barrel | dc_barrel_ra |
| dmx_xlr | dmx_xlr (3-pin male) | (none) |
| switch, kensington | null | |

## Research
- FLX10 rear panel (VirtualDJ manual layout page, Pioneer product page text in refs/flx10): MASTER OUT 1 XLR balanced,
  MASTER OUT 2 RCA, BOOTH OUT TRS balanced, MIC 1 XLR/TRS combo, MIC 2 TRS only, DMX OUT, USB-C, DC IN (supplied PSU).
- DMX OUT: "DMX OUT (3P XLR) x 1" per retailer spec sheet (soundpro.com). DMX outputs are female panel sockets -> cable
  carries a 3-pin **male** XLR. Modelled with a violet ID ring to distinguish from audio XLRs.
- Power: AC adaptor with DC 12 V output, 3 000 mA (retail spec sheets); OEM part Pioneer DJ DWR1621. Pioneer's 12 V DJ
  adaptors (e.g. DWR-1588) use a straight, centre-positive 5.5 mm OD coaxial barrel plug (djcity.com.au lists the 1588 as
  5.5 mm OD). No source gave the FLX10 inner diameter; modelled 5.5 x 2.5 mm, 9.5 mm barrel, straight moulded black
  overmould (the FLX10 has a cord hook next to DC IN, which suits a straight plug). `dc_barrel_ra` exists for space reasons.
- Dimensions used: NC3FXX-style shell Ø19.8, 72 mm overall (12 in socket + 60 rigid); NC3MXX-style Ø19.2-19.7;
  NP3X-style shell Ø14, shaft 31.2 mm (6.35 mm, tip/ring/sleeve); RCA metal barrel Ø10, pin Ø3.2; USB-C shell
  8.3 x 2.5 x 6.65 mm, overmould 12.4 x 6.6 x 20; DC barrel Ø5.5/2.5 x 9.5, overmould Ø10.4.
- References: refs/connectors/xlr.jpg, rca.jpg, usbc.jpg, barrel.jpg (Wikimedia Commons).

## Passes
| pass | score | notes |
|---|---|---|
| 01 | 72 | First build: all 12 kinds, custom lathe with crease normals, anisotropic nickel. Cables made odd S-kinks. |
| 02-03 | 78 | Close-ups vs refs: XLR shells/latch/inserts read right, RCA split sleeve + gold barrel good. Cable S-curve doubled back (Bezier handles overlapped) — bug found. |
| 04 | 84 | Bezier handles limited by the projected span (no back-tracking), min bend radius 5xD respected; removed odd grey grip pads on USB-C; smaller male XLR latch slot. Tris all < 12k. |
| 05 | 86 | RA close-ups (xlr_female_ra NC3FRX-like black elbow + nickel insert housing, NP3RX-like nickel elbow, RA RCA/USB-C/DC) read convincingly. |
| 06 | 87 | Non-anisotropic nickel on elbow domes (removed sparkle seam), end caps on cable tubes. Stopping: remaining gaps are marginal (no moulded print/logos, XLR latch/insert detail simplified, plain cable jacket without texture). |

Final: 87/100 (marginal returns). Tri counts 5.5k-11.7k per plug (shots/connectors/info.html dumps userData + tris headlessly).
Best shots: pass06_hero.png, pass03a.png (XLR close-up), pass05b.png (RA DC/USB-C/RCA), pass04a.png (side profile).
| 07 | 87 | Added xlr_male_ra (NC3MRX-style): length 26.6, drop 50, radius 3.25, exit [0,-50,16]; plugKindFor('xlr_trs_combo_in',{rightAngle:true}) -> xlr_male_ra. |
