# Brief: ice-bubble-lake ("Under the Ice")

## 1. The world in one line
Abraham Lake, Alberta, on a bright January noon. You swim 3 to 6 m under clear black ice, through a grove of frozen methane-bubble columns that hang from the ice like upside-down trees. A koi still stained with the Fez dyes leads the way, and wherever it touches, a wave of its colours runs through the columns. It ends in the pool of daylight under an ice-fishing hole.

- **Twist**: the bubble stacks hang below the ice as a forest, not inside it, and a dye-stained koi from the last world paints them.
- **Keep (the owner accepted this world)**: the koi leading at about 9 m (`koiPos`, lines 107-110) with its dye ribbon (lines 112-116, 136-143), the colour wave running ahead through the columns (lines 145-151, the owner's idea), the stacked-disc columns (lines 74-90), the marine snow wrapped round the camera (lines 119-123, 152-156), the S path, and the 6-colour PAL.
- **Fix (from the sheet)**:
  - **0.5 s**: mean 0.09. The near columns are grey ghosts on a dark frame. Check whether the engine's title fade causes this; nothing in the world may start dark.
  - **Ceiling (all frames)**: the cracks are long straight zigzags that read as constellation diagrams, and they fill the top third. The additive green `glowT` patches (lines 57-60) are broad blown-out halos.
  - **Columns**: each disc is a flat, opaque pastel macaron (MeshBasic sphere). Lit, they look like candy stacks, and they are too regular (one per 2 m, same taper). At 1.5 s and 12 s a column stands 1-3 m from the lens and fills a third of the frame.
  - **Bed**: flat navy MeshBasic blobs (boulders, line 69) with no shading. The bottom 40% is dead dark plus blobs.
  - **Koi**: 12 spheres plus triangle fins. It reads as a toy at 6 s and 12 s.
  - **18 s**: the portal veil fills the frame as a white disc (above0.85 = 0.10).

## 2. Focal subject
Candidates: (a) the dye-stained koi, the current subject; (b) a bull trout, native to the lake; (c) a mountain whitefish school; (d) a beaver swimming under the ice from its lodge; (e) the methane seeps themselves.

**Pick: (a), the koi.** It carries the story from Fez and drives the colour wave, so the event has a cause. Make it a real fish:
- Body: `fishGeometry` with `FISH_PRESETS.koi` (`src/kit/fauna/fish.js` line 14) at lod `high`, about 1.1 m long. Bend it in a vertex shader with a travelling wave (amplitude rising to the tail, 1.2-1.6 Hz cruise). Colour it kohaku white and orange, with an indigo saddle and a pink cheek from the vats.
- Long trailing fins: pectorals that scull in the glides, plus a soft flowing tail (3 to 4 strips that lag).
- Behaviour is a burst and glide, never a slide. 3-4 hard tail beats (3 Hz) give a forward surge, then a 1-1.5 s glide with the fins spread. It banks into turns, rolling 25°.
- Three acts (see beats): it **noses a column**, **mouths the silt** on the bed, and **rolls belly-up under the ice**.
- Ribbon: emit from the tail, not `kpos[2]`. Use soft billowing puffs that expand and slow down (ink in water), not points in a line. Opacity ≤0.6; the hue follows the PAL index of the column it last touched.

(c) gives a second life in the distance: one school of 60-90 silver whitefish via `makeFishSchool` (mackerel shape, olive top, silver belly), 20-35 m off the line.

## 3. Beat list (18.5 s; `T = u*DUR`; nothing scheduled before T = 1)
- **0-2 s HOOK: the dye arrives.** At frame 0 the koi is 5 m ahead and already in a burst. It shoots out of a billowing cloud of Fez dye (ochre, rose, indigo): 30-40 soft puffs, 2-6 m across, that unroll and spread. Sun windows overhead light the cloud from above. At T 1.1 the cloud's edge touches the first two columns, and they flush with colour from the top down.
  - Top: a bright, plated ice ceiling with a sun window.
  - Middle: the koi and the dye cloud.
  - Bottom: the grove receding, with the lit bed below.
  - Mean ≥0.13 from frame 0.
- **2-7 s The grove.** The koi weaves an S between columns. At T 4.6 it noses a column: the lower 4-5 discs shiver, and a free string of fresh bubbles breaks loose from the column's tip and rises to pool under the ice as a quivering mercury puddle. That touch launches the **colour wave**, which runs ahead (rework the current `front`, lines 145-146). poi right (4-6 s) at the touched column.
  - Top: the ceiling, with column roots.
  - Middle: the columns lighting in sequence ahead.
  - Bottom: the column tips and the bed.
- **7-12 s The drowned forest.** Abraham Lake is a flooded valley. The bed rises to -8 m, and drowned spruce stumps and a few fallen trunks stand in grey-ochre silt with river cobbles. **Methane seeps** (the real source): 8-12 vents on the bed, each puffing a thin string of bubbles straight up into a column above it. The koi dives (T 8) and mouths the silt at a stump (T 9.5); an ochre silt puff blooms and settles. poi down-left (8.5-10.5 s) at the stump and its seep. At T 10.5 the whitefish school turns in unison 25 m right, a silver flash.
  - Top: column tips.
  - Middle: the stumps, the seep strings and the koi.
  - Bottom: the silt, the cobbles and the dappled caustics.
- **12-16.5 s The window.** A large snow-free patch of black ice: sunlight comes down in soft slanting shafts, seen from the side, with dancing caustics on the bed. The colour wave catches the grove ahead, and 40-60 columns glow like stained glass at once (the climax). The koi rises in a spiral to the ice (T 13), rolls belly-up and skims the underside, its ribbon smearing along the ice. poi up (13-15 s) at the koi against the plates.
  - Top: the koi on the ice and its colour smear.
  - Middle: the lit grove.
  - Bottom: the bed in caustics.
- **16.5-18.5 s Out.** A pale column of daylight stands in the water ahead, falling from a round ice-fishing hole; the portal ring hangs in it. The koi bursts into the light first (T 17) and is gone. The camera arrives at T 18.5, with no glide after the koi leaves.

## 4. Detail layers, near to far (target ~1,100-1,400 lines)
1. **Lake bed, the lower frame** (~240 lines). It replaces the flat plane at -17.
   - A height field from -12 m (channel) to -7.5 m (banks), with a gentle old riverbed meander under the path.
   - Self-lit shader: ochre-grey silt with mottling, pale and green-algae cobbles (instanced, 250-400, 0.1-0.5 m), and **caustics** on up-facing surfaces, strongest under the sun windows. The window patch moves with the windows' masks.
   - Red is absorbed with depth.
   - Copy `BED_FRAG` relief, mottling and caustic from `kelp-cathedral.js` 376-530, and its backdrop dome (689-696, darker below eye level), so the water body has a vertical gradient instead of `scene.background`.
   - Fine scales fade with distance: no static.
2. **Drowned forest** (~130 lines). 25-40 spruce stumps (0.6-1.8 m tall, 0.3-0.7 m across, splayed roots, broken tops, grey bark furred with green algae) and 6-9 fallen trunks (6-14 m), lying at any angle. All are ≥9 m from the line; the stumps cluster in the 7-12 s stretch.
3. **Methane seeps** (~70 lines). 8-12 vents under columns, each a ring of pocked silt. Bubble strings use the `PLUME_VERT/FRAG` technique from `kelp-cathedral.js` 538-580: soft bubbles with a ring and a sun glint, minimum 1.6 px, bursting at the ice. Use the same shader for the touched-column release at 4.6 s and the mercury puddle under the ice.
4. **Bubble columns, rebuilt** (~260 lines). 220-300 columns.
   - **Length varies a lot**: 3-25 discs, 0.25-0.6 m apart, with gaps (missing discs) and a slight lean or S-wander down the stack (±0.4 m). Some are doubled (two stacks fused), and 15% are short stubs.
   - Disc radius tapers irregularly (0.3-1.4 m). Each is a flattened dome with a flat underside.
   - Custom instanced shader:
     - A silver-white body that is translucent at the centre (alpha ~0.55) and bright at the rim (fresnel ×1.6), with a thin dark rim line, as in the real photos.
     - A soft top highlight from the ice light.
     - A faint ice-blue tint from behind.
   - **Colour wave**: the dye *tints* the discs (mix toward the PAL hue by 0.55, not 0.8) and adds a gentle inner glow ≤1.1; a 0.4 s crest runs down each column from the top. Never solid pastel.
   - **Clearance**: none within 7 m of the line, and the camera never passes under a tip closer than 2 m vertically. Lay the grove out with Poisson spacing (min 2.2 m), denser away from the line, so no grid shows.
5. **Ice ceiling** (~150 lines). Replace the canvas texture with a shader, after `lanterns-under-ice.js` 136-188 (ICE_FRAG):
   - Voronoi plates with warped coordinates, plus fine crazing inside the plates.
   - Pressure cracks as thin wandering lines (width ≤0.02), never straight zigzags.
   - Snow cover as large soft noise masks that make it milky and dim. Black-ice **windows** are dark blue-green and bright where the sun comes through (≤0.9 display).
   - Air-bubble specks in the ice that fade with distance. The column roots spread as frosted rosettes where they meet the ice.
   - Make it daylight, not the moon's: base `#7fb6c8`, windows `#bfe6e0`, cracks `#e8f6f4`.
6. **Light in the water** (~90 lines). `fx.makeGodRays` slanted at 20-30° from vertical under the windows, opacity ≤0.18, seen from the side; the camera never looks up a shaft. The daylight column under the fishing hole at the end. Replace the green additive patches entirely.
7. **Koi and ribbon** (~180 lines), as in section 2.
8. **Whitefish school** (~50 lines). `makeFishSchool`, 60-90 fish, a route that turns once at T 10.5.
9. **Water particles** (~60 lines). Keep the marine snow, but render it with `fx.makeParticles` at size 0.04-0.08, ≤250 near, warm-grey, drifting down slowly. Add a sparse layer of tiny rising bubbles (40) and suspended silt motes lit in the shafts.
10. **Far layers** (~40 lines). Columns and stumps continue to 120 m and fade into fog. Add a dim shoreline slope rising to the ice at 60-90 m on one side (the lake narrows), so the side is never an empty void.

## 5. Camera path and pois
- **Path**: about 165 m, built by distance, at ~9 m/s. Make it an S of 2.5 swings, amplitude 5-7 m, through a lane kept clear of columns.
- **Height**: -2.6 m at the start (ice at 0, `nearThrough: 0.5`), sinking to -5.5 m over the drowned forest (7-12 s), rising to -3.5 m for the window and -4 m at the portal.
- **Koi**: 6-9 m ahead, in the middle third of the frame. Its lateral and vertical weave is ±1.5 m. In its acts it may leave the line by 3 m.
- **pois** (fade ≥0.4, weight ≤0.6):
  - The touched column, right, 4-6 s.
  - The stump and seep, down-left, 8.5-10.5 s.
  - The koi under the ice, up 25-30°, 13-15 s.
  - No poi in the last 2 s.
- **Corridor**: columns ≥7 m from the line, stumps and trunks ≥9 m, the bed ≥3 m below the lens, the ice ≥2.4 m above. This relaxes the 15 m rule because the grove is the place itself; flag it to the lead if a judge objects. Nothing ever passes through the lens.

## 6. Light and palette
- **Bloom**: strength 0.3, threshold 0.95, radius 0.5 (from 0.15/0.9).
- **Exposure** 1.05; vignette 0.18; drop the `#eaf6ff` tint toward neutral.
- **Water**: upper `#3c86a8`, eye level `#2a6a8c`, lower `#1a4a66` (fog colour = the eye-level value, FogExp2 0.017).
- **Ice**: base `#7fb6c8`, windows `#bfe6e0`. **Bed**: silt `#8a7a58`, algae `#5f7a48`, cobbles `#9a9890`.
- **Dye**: PAL kept, but tints only. Koi orange `#ff7a3a` on `#f6efe4`.
- **Brightness**: every frame mean ≥0.11. The bed is caustic-lit and never below ~0.07 display. Glow sources (crest, shafts, daylight column) stay under 0.95 except the tiny glints; there is no broad bright field. Caustics and snow move slowly, and nothing flickers faster than 2 Hz.
- **Colour space**: all shader colours go through pow(col, 2.2).

## 7. Portal
The daylight under a round ice-fishing auger hole: a pale shaft falls into the water, and the ring hangs in it at swim height. A small orange tip-up flag line hangs down the shaft as a hint of people above. The ring is not overhead; it faces the camera.

`{ shape:'circle', style:'ring', radius:4.5, color:'#bfe6e0', veil:'#7fb6c8', glow:0.75, halo:true, revealDistance:700 }`, centred at the camera's height at the path end.
- The radius is 4.5, not 9, because the water is only ~8 m deep; it must fit between ice and bed.
- It is under a fifth of the frame until T 17.5. The veil is the water-blue, not white (this fixes the 18 s glare).

## 8. Risks (what a judge will fail first)
1. **Candy columns again**: opaque pastel discs, a regular spacing, or a column filling the frame near the lens. Check the 3, 9 and 15 s frames for translucency, rim lines and the 7 m clearance.
2. **Murky or blown light**: a dark bed or lower frame, the 0.5 s frame, or shafts and the daylight column turning into a bright field. Check that every mean is ≥0.11 and above0.85 is <0.03 before T 17.5.
3. **The koi still a toy or sliding**: no visible burst and glide, no body bend, no acts at 4.6/9.5/13 s, or the ribbon reading as a dotted line. Also check the ceiling has no straight zigzag cracks left.
