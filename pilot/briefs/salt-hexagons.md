# Brief: salt-hexagons ("The Salt Hexagons")

## 1. The world in one line
Salar de Uyuni, Bolivia, in the blue hour before dawn at about -10 °C. You skate at knee height behind a giant cloaked skater across the salt crust and its thin mirror pools. You pass the cactus island and the Colchani salt mounds, and the skater jumps a pressure ridge, which sends the flamingos up. The skater ends by leaping into a half-risen sun that is the portal.

- **Twist**: the skater is 3 to 4 m tall, the only giant on a flat with no scale, so it becomes the ruler for the whole place. Its leap is the event that sets the salar moving.
- **Keep (the owner accepted this world; deepen it, do not change it)**: the cloaked skater with the ochre scarf and hat band, its mirrored ghost (`ghost`, line 235), the trail and the spray (lines 196-253), the eased position and heading (`smx`/`smh`), the jump (line 233, the owner's favourite), the ground shader's nested jittered-Voronoi cells with wavy edges (lines 66-91), the Fresnel mirror with reflected stars, cirrus and mountains (lines 94-108), the glitter column to the sun (lines 111-114), the blueHour sky, the flamingos lifting off, and the portal colour `#f0b090`.
- **Fix (from the sheet)**:
  - **0.5 s**: mean 0.04. The frame is near black and the skater is a dim shape.
  - **15 s**: the 90 m climb tilts the view into the zenith, which is black over the top third (topDark 0.96). **Drop the climb.** The camera stays low the whole way, as the owner asked.
  - **18 s**: a top-down view of a regular-looking grid of pale lines.
  - **All frames**: the ridges read as near-white uniform-width lines on flat blue, which looks too regular, like a map. The skater is built from bare MeshBasic cylinders. The scarf is a flat yellow board, oversized at 3 s. The near flamingos at 9-12 s are crude and too close.
- **Caption**: the registry line in `index.js` (line 21) still promises "rise until its cracked hexagons are towns". Suggest "Skate a Bolivian salt flat before dawn behind a giant cloaked skater, whose leap sends the flamingos up." The owner decides this; the builder does not change it silently.

## 2. Focal subject
Candidates:
- (a) The giant cloaked skater, the current subject.
- (b) James's flamingos.
- (c) Andean flamingos.
- (d) Vicuñas.
- (e) The salt crust itself, with its growing polygons.

**Pick: (a), as the owner chose.** Give it real skating behaviour, not a slide along a curve:
- Alternating push strokes, about 0.75 s each: the weight goes over the gliding leg, the pushing leg extends out to the side and back, then recovers.
- Arms counter-swing, and the cloak hem swings a beat late.
- The scarf streams back, its end fluttering.
- A crossover carve on the S-bends.
- **Breath puffs** in the cold, one every 1.5 s, in front of the hood.

(b) and (c) are the supporting life, as the lift-off event. (d) gives quiet life at the edge.

## 3. Beat list (18 s; `T = u*18`; nothing scheduled before T = 1)
Each beat lists what fills the top, middle and bottom of the frame.
- **0-2 s HOOK, the carve.** From the first frame the skater is mid-stroke, already in a hard left carve, and leans 20° into it. A fan of spray crystals is lit pink-ochre by the dawn band. At ~1.2 s the skater rises out of the carve, the scarf whips across the frame and the camera swings with it. The camera is at 0.9 m on a wide water-film patch, so the skater and its full ghost stand on stars.
  - Top: blue sky with stars and a pink cirrus wisp.
  - Middle: the skater's torso against the rose horizon band, with the small sun-portal low ahead.
  - Bottom: the mirror of the dawn band, the reflected stars, the ghost skater and the spray fan.
  - Brightness: the frame is bright from frame 0 (mean ≥0.12). If the engine's title fade is what makes 0.5 s dark, check `_antechamber`/the intro timing. Make sure nothing in the world starts at black.
- **2-7 s The mirror, and Incahuasi.** The film thins to cracked crust, and the cells pass under the blades with crystal texture and ridge sparkle. poi right (3-6 s) at **Isla Incahuasi**: a low rocky hump about 900 m off on the right, crowned with 80-120 giant columnar cacti in silhouette, doubled in the mirror.
  - Top: sky, with the Milky Way's tail fading.
  - Middle: the island and its cacti, reflected.
  - Bottom: crust cells and the trail grooves.
- **7-11 s The salt mounds.** The line runs past the **Colchani harvest**: 3 to 5 rows of conical salt piles, 18-45 m off the left, each doubled in a puddle. poi left (7.5-10 s) along the rows. Beyond them, 150-250 m out on the shore strip, **6-9 vicuñas** trot in file at the foot of **Tunupa**, the volcano with ochre, rust and violet bands.
  - Top: sky going pink-violet.
  - Middle: the mounds, the vicuñas and Tunupa.
  - Bottom: the crust and the skater's legs and blades.
- **11-14 s THE JUMP.** A raised pressure ridge, 0.4 m high and irregular, crosses the line. The skater crouches (T 10.6), takes off at T 11.0 and lands at T 11.9. The leap is the current one, made bigger: height 1.6 × scale, a full 360° turn, the cloak flaring and the scarf unfurling. Landing throws a heavy spray burst and splashes the film.
  - The splash sets off **James's flamingos** (group 1, 120-180 birds, 30-90 m on the right). They run, wings beating, across the film, then lift. The patter of feet leaves short splash marks on the water, the real take-off.
  - poi up-right (11.8-14 s) follows the flock as it banks across the dawn band.
  - Top: the flock, with black flight feathers against pink.
  - Middle: the skater landing.
  - Bottom: splash rings and the reflected flock.
- **14-18 s Dawn, and into the sun.** The **Andean flamingos** (group 2, 300-400, larger and paler) stand as a pink band 350-600 m out and stay grounded; at most a few lift. The dawn colour creeps along the horizon from the sun's bearing outward: the band's width and saturation rise over T. The skater carves straight at the sun-portal, glitter column underfoot. At T 16.6 it makes a final leap and its silhouette crosses the disc. The camera lifts from 1 m to the ring's centre height over the last 1.4 s and enters the ring at 18 s. There is no glide after that.
  - Top: sky, with the shifting pink Belt of Venus.
  - Middle: the sun-ring with the skater crossing it.
  - Bottom: the glitter column on the mirror.

## 4. Detail layers, near to far (target ~1,100-1,400 lines)
1. **Crust under the blades, 0-20 m: the lower frame** (~220 lines, extends the shader at lines 57-126).
   - Ridges in dim blue-grey `#7c879c` (lit side) to `#5a647a` (shade), never white. Each ridge is raised: give it a fake normal from `e`, so it is lit pink on the side facing the sun and blue on the other.
   - Ridge width varies 0.5×-2× along its length. Some ridges are doubled (two parallel lips with a groove between); about 15% are broken.
   - Cell interiors carry fine dendritic crystal texture: 2 octaves of tiny jittered cells at 4 and 0.4 cm, faded by pixel footprint. Add shallow pits and a faint frost sheen.
   - Cell size scale 1 is 1.5-3 m, with jitter 0.85 (not 0.62) so no cell looks hexagonal.
   - **Never let a scale crawl**: keep the fwidth fades.
2. **Water film** (~90 lines). Low-frequency noise blobs, 20-200 m across, cover about 35% of the flat, with soft wet margins, and they contain the hook start. The film shows the full mirror (stars, cirrus, mountains, flamingos).
   - Behind the skater, ripples spread as a V wake: two expanding sine rings per stroke, damped, that break the reflected stars into short streaks.
   - The ghost skater's opacity follows wetness under its feet: 0.85 on film, 0.25 on dry crust (a wet sheen).
3. **Ridge sparkle** (~60 lines). `fx.makeParticles` with tiny glints sitting on ridge positions near the camera (2-25 m): 600-900 of them, size 0.015-0.03, twinkle ≤1.2 Hz. Respawn them as the camera moves, sampling the same hash as the shader. Keep the shader's `gk` glints in the mid-field only.
4. **Skater rebuild** (~260 lines).
   - Cloak: a lathe of 28 segments with 6 vertex-displaced folds, a hem flutter driven by speed and turn, and a slit at the back.
   - Hood, a shadowed face hollow, mittens, boots and steel blades.
   - Shading: an unlit custom shader with sky fill from above, a dawn rim from `uSun`, and a dark core, all through pow(col, 2.2).
   - Scarf: two tails with a taper (0.22 → 0.08 m), 16 segments each, and a 6-tassel fringe. It reaches about 1.2 m, not 3 m.
   - Breath puffs: 6-10 soft quads, opacity ≤0.25.
   - The push-stroke pose replaces the `sin(t*1.5)` leg wave.
   - Trail: two blade grooves 0.18 m apart, each dark with a pale lip, fading out over 80 m.
5. **Salt mounds** (~110 lines). 70-110 cones, 0.7-1.3 m tall with a base of 1.4-2.2 m. Lumpy, noise-displaced lathes with crystal-sparkle shading and a slight slump. They stand in 3-5 uneven rows; a few are half dug, with spade facets. All are ≥18 m from the line, and each is reflected (mirror instance, y-scale -1, opacity by film).
6. **Flamingos** (~120 lines).
   - Group 1, James's (deeper pink, smaller): `F.makeWaders` standing 30-90 m right. It switches to `F.makeFlock` with `cross` from the jump (copy the current lines 150-158). Add per-bird running splashes: `fx.makeParticles` bursts on the film, 4-6 per bird along its take-off run.
   - Group 2, Andean (pale pink, size 1.3×): makeWaders at 350-600 m.
   - Group 3: a distant skein of 20-30 already in flight on the horizon at T 0-6, for life in the hook.
   - Nothing within 25 m of the line.
7. **Vicuñas** (~70 lines). `F.makeHerd` with a vicuña preset object (cinnamon coat, white belly), copied from `cut-mountain.js` 829 and 1552-1620 (herd groups and placement). Use `mode:'migrate'` and a trot, 150-250 m left, on a buff shore strip with a few tufts of ichu grass.
8. **Isla Incahuasi** (~130 lines). A hump of rough coral-rock, 600 × 300 m and 30-40 m high, about 900 m right, made from noise-displaced terrain.
   - Cacti: 80-120 columnar *Echinopsis atacamensis*, 4-10 m tall, 0-3 upturned arms. Silhouette-level LOD.
   - Copy the fluted-trunk and arm builder from `saguaro-serigraph.js` 704-760 (`sagBuf`, `armSet`) at lod 1.
   - It is reflected in the mirror: add it to the shader's horizon profile as with `ridgeH`.
9. **Far skyline** (~120 lines).
   - Keep the 3 km ridge ring (lines 129-136).
   - Turn its 0.35 rad peak into **Tunupa** (left): a broad cone with a collapsed summit and horizontal ochre, rust and violet bands. Add a second, nearer ring at 1.5-2 km with lower, softer hills, and haze between the rings.
   - Model the peaks after `across-the-sea-of-ice.js` 317-345 (`peakInto`: rings and seg, noise, per-peak heights). Here they are silhouettes: vertex colours up a haze gradient.
   - Add a thin `fx.makeGroundFog` band 0-6 m high at 400-1500 m so the horizon is soft, never a hard world edge.
10. **Sky** (~40 lines). Lift the zenith to `#16275e`. Keep the Milky Way at 0.25 and fade it out by T 10. Add pink-lit cirrus at 0.15. Grow a Belt of Venus and a dawn band whose colour widens in azimuth over T.

## 5. Camera path and pois
- **Path**: a distance-built S-curve, about 230 m at ~12.8 m/s: left carve (hook), right, then a long straight to the sun.
- **Height**: eye 0.9 m (0.75-1.15, with a gentle stroke bob ≤0.04). It rises 1 → 9 m only over T 16.6-18. `nearThrough: 0.4`.
- **Skater**: 6.5-8 m ahead, filling the middle 40% of the frame. Keep its offset `2.6*sin(T*0.9)` so it swings across the frame.
- **pois** (each with fade ≥0.3 and weight ≤0.7, so the skater never leaves the frame):
  - Incahuasi, right, 3-6 s.
  - The mounds and vicuñas, left, 7.5-10 s.
  - The flock, up-right, 11.8-14 s.
  - Tunupa, left, a short glance at 14.5-15.5 s.
- **Pitch**: the horizon sits at 45-55% of frame height; it never tilts up into the zenith.
- **Corridor**: only the skater, its spray, the trail and the crust come within 15 m. The mounds are ≥18 m away, the flamingos ≥25 m, the pressure ridge only crosses the line at 0.4 m, and nothing stands taller than 0.5 m near the line.

## 6. Light and palette
- **Bloom**: strength 0.3, threshold 0.95, radius 0.5 (raised from 0.2/0.9).
- **Palette**:
  - Sky: zenith `#16275e`, mid `#3a5596`, horizon rose `#d89a88`, dawn band `#f0b090`.
  - Crust: blue-grey `#5a647a`-`#7c879c`.
  - Mirror bed: `#1e2a40`, so it never goes dead dark.
  - Skater: cloak `#1d2543`/`#2e3a6e`; scarf and band ochre `#d4963f`.
  - Flamingos: James's `#e07a92`, Andean `#f0b4bc`.
  - Tunupa: `#8a5a48` / `#6a4a78`. Vicuñas: `#b07a4a`.
- **Glints**: the ridge sparkle and stars twinkle ≤1.2 Hz, are tiny and never speckle the whole frame. No broad halos.
- **The sun** is the small portal ring only: no disc, shaft or flare into the eye. The glitter column stays ≤0.95 strength.
- **Brightness**: frame means ≥0.10 throughout. The lower half is lit by the mirror's horizon colour, never a flat glowing runway.
- **Colour space**: all shader colours go through pow(col, 2.2).

## 7. Portal
The first sun of the day, half-risen out of the salar. The ring sits on the horizon and the mirror supplies its lower twin, so ring and reflection read as a sun breaking the line.
`{ shape:'circle', style:'ring', radius:9, color:'#f0b090', veil:'#f0b090', glow:0.75, halo:true, revealDistance:700 }`, centre at y = 9, at the end of the path.
- 230 m off at the start, it is a small ring on the horizon, about 4° across, from frame 0. It is the hook's colour anchor.
- It must stay under a fifth of the frame until T 17.
- The final leap's silhouette crosses it at T 16.6-17.2.

## 8. Risks (what a judge will fail first)
1. **The ground looks like a grid or a map again**: uniform near-white lines, cells that look hexagonal, or crawling and moiré at grazing angles from 0.9 m. Check frames 3, 9 and 15 s for ridge colour (never above ~0.62 display), width variation and aliasing.
2. **Dark frames**: the 0.5 s frame (any intro fade), the zenith in the top third, and pois tilting up. Check the brightness log: every frame mean ≥0.08 and topDark < 0.6.
3. **The skater stays primitive or misbehaves**: cylinders still visible, the scarf oversized, the ghost at full opacity on dry crust, the pose snapping at the jump or at the final lift. Also check that the camera rise in T 16.6-18 does not lose the skater or blow the ring up early (frames at 16, 17 and 17.5 s).
