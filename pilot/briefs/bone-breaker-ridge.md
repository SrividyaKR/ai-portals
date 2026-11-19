# Brief: bone-breaker-ridge ("The Bone Breaker")

## 1. The world in one line
The Ordesa canyon in the Spanish Pyrenees on a late-autumn afternoon. You fly behind a lammergeier (bearded vulture) as it tips off the rim, lands on a grassy ledge strewn with bones, takes a long leg bone, rides the updraft up the sunlit wall, and drops the bone onto a pale limestone slab. Then it stoops after the bone. The bone bursts into white dust and marrow-gold glints, and that rising dust carries you to the ring on the col at the canyon head.

- **Twist**: the behaviour is real, since lammergeiers live on marrow and break bones by dropping them on rock. The strange part is the moment of impact: the bone bursts into marrow-gold light, and its dust is a thermal you ride.
- **Keep (the owner accepted this)**:
  - The story order: knoll of bones, carry, climb, release, fall, burst, lift.
  - The bird's colours (slate wings, rust belly `#c4682e`, cream head `#efd9b8`).
  - The bone-fall trail (lines 96-99, 153), the burst's structure (dust plus tumbling shards plus a short flash, lines 116-123, 156-165), and the falling-bone poi (line 131).
  - The other far vultures, the sheep, the mist sprites, and the portal colour family `#ffe2b0`.
- **Fix (from the sheet)**:
  - **0.5 s**: mean 0.12, dark under the PORTALS title. Check whether that is the engine intro. The world itself must be bright from frame 0.
  - **1.5 s**: `makeBird` is a stick cartoon: rod wings, an orange ball for a belly, and a fast flap (`t*5.4`, while lammergeiers almost never flap). It sits so close that a wing leaves the frame.
  - **3 s**: the knoll is a lone green-brown spire capped with white "spoons" (flat MeshBasic bones).
  - **6 s and 9 s**: two-thirds of the frame is empty blue sky, the bone is a tiny white blob, and the bird is a dark silhouette.
  - **12 s and 15 s**: the slab reads as a dark crater. The burst is grey with brown discs (big additive sprites over a dark ground).
  - **18 s**: an empty meadow hill with the ring floating in the sky. This is an empty glide after the story has ended.
  - **All frames**: everything is MeshBasic and unlit, the slopes are smooth green humps rather than Pyrenean cliffs, and the pines are stacked cones.
- **Code**:
  - Rebuild on the kit: `T.*` terrain and rocks, `flora`, `F.makeFlock`/`makeHerd`, `fx.makeParticles`, and lit materials.
  - Build the path by distance from control points (`makePath`, as in alpenglow-horn), with `DUR = 18` and `T = u*18`.
  - Use named sections, `ctx.yield()` between heavy builds, dispose everything, and drop the `T > 0.5` hack.

## 2. Focal subject
Candidates:
- (a) The lammergeier, the current subject.
- (b) A griffon vulture kettle.
- (c) Alpine choughs.
- (d) Izards (Pyrenean chamois).
- (e) A golden eagle.

**Pick: (a).** It is the only animal whose own behaviour is the story (ossuary, drop, stoop, eat), it is native to Ordesa, and it is the owner's idea. (b) gives a second, distant flock, (c) gives near life, and (d) gives life on the scree.

Build the bird yourself, about 260 lines, copying the feather-card technique of the golden eagle in `alpenglow-horn.js` lines 1019-1218 (lofted body, rows of feather cards, fingered primaries, uClose fan, the `eagleLight` sky-fill shader). What makes it a lammergeier:
- **Shape**: long, narrow, pointed wings (span 2.8 m, drawn at 1.3×) with only 5 short fingers. The long **wedge-shaped (diamond) tail** is its signature.
- **Head and belly**: a cream-to-rust head and belly (`#e8b070` to `#c4682e`). The rust comes from the birds dusting themselves in iron-red mud, which is a real habit.
- **Face**: a black mask and bristly **beard** under the bill, and a tiny red eye ring.
- **Back**: slate upperparts (`#3a3d45`) with pale feather-shaft streaks.

Behaviour:
- **Soaring**: wings flat with drooped hands. It steers by **twisting its tail** (the rudder roll, the key tell), and its head turns to look.
- **Flapping**: deep and slow (about 0.6 Hz), only on take-off and on the climb while laden.
- **Carrying**: the bone hangs lengthwise under the body in its talons.
- **Releasing**: the talons open, it rolls away from the bone and half-folds into a stoop.
- **Landing**: a flare, with wings raised, legs thrown forward and the tail fanned, then two hops and pecking head-bobs.

## 3. Beat list (18 s; `T = u*18`; nothing scheduled before T = 1)
Speed is about 30 m/s and the path about 540 m long. Each beat lists what fills the top, middle and bottom of the frame.

- **0-2 s HOOK, over the edge.**
  - At frame 0 the camera is 6 m above the north rim's turf. The bird is 14 m ahead and 3 m below eye level, contour-flying over the grass with its wings full and its rust breast lit.
  - At T 0.9 the cliff lip passes under you and the floor drops 400 m to the river.
  - At T 1.2 the bird tips over and banks left and down, and the camera follows in a swoop.
  - Top: the far wall's ochre and pink limestone bands, with Monte Perdido's snow.
  - Middle: the bird against the canyon's depth.
  - Bottom: rim turf, then the lip, then the beech floor 400 m down, in rust and gold, with river glints.
- **2-6 s The ossuary ledge.**
  - At T 2.4 the bird flares onto a grass ledge (a *faja*) on the north wall, scattered with bones. It hops twice and lifts a 1.2 m leg bone.
  - It drops off the ledge at T 3.6 with two deep flaps, and by T 5 it is soaring ahead of the camera again.
  - A pair of ravens on the ledge hop aside and flap off.
  - The camera passes the ledge at T 4.4, 22 m out.
  - Top: the wall above the ledge.
  - Middle: the ledge, the bird and the bones.
  - Bottom: the drop, with pines on the lower *fajas*.
- **6-10 s The climb on the wall.**
  - The bird rides the slope updraft up the sunlit north wall in a gentle S, with the bone dangling.
  - **Griffon kettle**: 10-14 griffons circle 140-200 m to the right over the south wall.
  - **Choughs**: about 20 choughs tumble past on the left, 25 m off.
  - Top: the far wall, the griffons and cumulus over Monte Perdido.
  - Middle: the bird and bone against the strata. **Never empty sky.**
  - Bottom: the canyon floor and a waterfall thread.
- **10-14 s Release and stoop.**
  - At T 9.8 the bird is at its top, 8 m above eye level. The talons open, the bone tumbles, and its dust trail forms.
  - The bird half-folds and stoops. The camera dives with it at about 27°.
  - The bone falls 83 m (4.1 s of free fall) onto the pale slab on a lower bench.
  - Top: the far wall.
  - Middle: the bird and the tumbling bone.
  - Bottom: the bench, the scree and the slab, growing larger.
- **13.9-18 s Burst, landing, lift.**
  - **Impact**: the bone shatters. Shards ring outward, white dust billows in a sunlit plume, and tiny gold glints rise.
  - **Landing**: the bird flares and lands beside the shards (T 15.0) and pecks.
  - **Izards**: 6-9 of them bound across the scree, 60-110 m to the right.
  - **The lift**: the camera rises with the dust plume and swings toward the canyon head, where the ring sits on the grass col. A horsetail fall (Cola de Caballo) drops below the col and Monte Perdido stands behind it.
  - The flight enters the ring at 18 s.
  - Top: Monte Perdido.
  - Middle: the ring and the dust.
  - Bottom: the slab, the bird and the col's turf.

## 4. Detail layers, near to far (target about 1,300-1,450 lines)
1. **The canyon land** (~220 lines).
   - **Shape**: a U-shaped canyon along -Z, floor y = 0, rims at 380-420 m, about 700 m wide at the top and 250 m on the floor. The walls step in tiers, with 2-3 continuous grass benches (*fajas*) along each wall and vertical buttresses between gullies. Build it from `T.canyon`/`T.terrace`/`T.stepper` (`src/kit/terrain/heights.js`) with `T.makeStrata` and `T.makeTerrainMaterial`.
   - **Walls**: copy the wall mesh idea in `alpenglow-horn.js` 276-350 (jointed buttresses, gullies, ledges).
   - **Colours**: limestone bands `#e2c6a0`, `#c9a27a` and `#b07a5a`, blue-violet shade `#5d6a8a`, bench grass `#7f8f4a`, rim turf `#8a9a52`.
   - **The bottom 40% of the frame**: the rim turf at frame 0, then the floor, which is the beech canopy (layer 4) and the river (layer 5). Never smooth green.
2. **Rock** (~90 lines).
   - The **cliff lip**: a broken, overhanging edge.
   - The **ossuary ledge**: a scoop under a small overhang.
   - The **anvil slab**: about 14 × 9 m of pale `#d8cdb8`, tilted 12°, sunlit, with a scree apron.
   - Boulders on the benches.
   - Copy `addCrag`/`T.rockGeometry` and `T.makeRockMaterial` from `alpenglow-horn.js` 619-700.
3. **Bones** (~80 lines). Lit (Lambert or a sky-fill shader), never MeshBasic. Use 50-70 pieces:
   - Curved femurs with knuckled condyles.
   - Rib arcs and vertebrae.
   - 3-5 izard skulls with hooked horns.
   - Shading from ivory `#e8dcc0` to weathered `#b8a888`, with lichen flecks.
   - The slab already holds about 120 old splinters, which is true of real ossuaries.
   - The hero bone is 1.2 m long.
4. **Vegetation** (~150 lines).
   - **Floor**: 1,800-2,500 autumn beeches and firs (ochre `#c98a3a`, rust `#a5522a`, gold `#d9a440`, fir `#2f4a35`), from `flora` oak and maple geometry at low LOD with `windMaterial`.
   - **Benches and rim**: 300-500 mountain pines (`pineGeometry`).
   - **Placement**: copy the rule from `across-the-sea-of-ice.js` 658-690 (keep slope and snow bare, stay clear of the line).
   - **Rim turf**: tussocks within 30 m of the start, but no tree within 20 m of the line.
5. **Waters** (~70 lines).
   - The Arazas river on the floor, with sunlit sheen and white riffles: `Water.makeRiver` as in `across-the-sea-of-ice.js` 628-646.
   - 3 thread falls off the north rim, plus the Cola de Caballo below the col. Copy the falls from 637 onward: strands plus a spray plume.
6. **Mist and haze** (~70 lines).
   - Two drifting mist sheets on the floor, as in `alpenglow-horn.js` 392-420.
   - Keep 20-30 of the current mist sprites at opacity ≤0.15.
   - Add `fx.makeGroundFog` in the gullies.
7. **Far skyline** (~90 lines). Monte Perdido, Cilindro and the Tres Sorores rise as snow-topped, banded massifs behind the canyon head, with 2-3 hazy rings beyond them. Copy the far-ranges shader of `alpenglow-horn.js` 351-391 (or use `T.makeHorizonRidges`). No world edge anywhere.
8. **Life** (~380 lines, the lammergeier included).
   - **The lammergeier**: as in §2.
   - **Griffons**: `F.makeFlock` with species `eagles`, recoloured `#9a7a58` with a pale head and dark primaries, soaring in a kettle.
   - **Alpine choughs**: copy the `CH` preset and the `along:` escorts from `alpenglow-horn.js` 1290-1320.
   - **Ravens**: 2, at the ledge.
   - **Izards**: `F.makeHerd` with the antelope preset recoloured `#a8784a`, with a dark face stripe.
   - **Sheep**: keep them, tiny, on the floor meadows.
9. **Particles** (~90 lines). Rebuild the burst with `fx.makeParticles`:
   - **Bone dust**: 600 points, pale `#f4ecdc`, normal blend, opacity ≤0.5, 0.15-0.4 m.
   - **Marrow glints**: 150 tiny glints (0.04-0.1 m), gold `#ffd890`, twinkle ≤2 Hz.
   - **Shards**: instanced and lit, they bounce once.
   - **Flash**: ≤12 m and 0.3 s.
   - **Thermal motes**: 300 sparse gold motes along the sunlit wall at T 5-10.
   - No large sprites.
10. **Sky** (~40 lines).
    - Late afternoon: zenith `#3d6fb8`, mid `#86aedc`, horizon pink-ochre `#f0c8a0`.
    - Cumulus over the peaks, lit `#fff0dc` and shaded `#9fb2cf`.
    - The sun is low from front-right but always out of frame.

## 5. Camera path and pois
- **Path**: distance-built control points with constant speed (about 540 m), heading -Z and slightly right, with S-curves.
- **Heights** (eye level):
  - Rim: 406 at T 0. The ground is 400, so take `nearThrough: 0.5`.
  - Ledge pass: 352 at T 4.4 (ledge at 340, 22 m to the left).
  - Climb to 420 at T 9.8, 30-40 m off the north wall.
  - Stoop to 365 at T 13.9, 20 m to the right of and above the slab (slab top at 345).
  - Lift to 395 at the col ring at T 18 (col ground 386).
- **Pitch**: base pitch -10°. Pitch never exceeds +8° (the cause of the empty sky at 6 and 9 s) and never goes below -45° in the stoop.
- **pois** (fade ≥0.3):
  - The ledge, left: T 2.2-4.0, weight 0.7.
  - The bird above-left on the climb: T 6.5-9.5, weight 0.5.
  - The falling bone (the current function): T 9.6-13.9, weight 0.9.
  - The burst, then the bird on the slab: T 13.9-15.6, weight 0.8.
  - Released to the ring by T 16.
- **Bird framing**: keep the whole bird inside the frame, 12-16 m ahead, in the middle 40%. Its span fills 30-40% of the frame width.
- **Corridor**: walls ≥25 m, the ledge 22 m, the slab ≥18 m, trees ≥20 m. The flock is ≥25 m out, except the choughs at 25 m.

## 6. Light and palette
- **Bloom**: strength 0.3, threshold 0.95, radius 0.5. Exposure 1.0.
- **Grade**: keep tint `#fff6ea`, but lighten shadowTint to `#2a3a60`.
- **Shading**: everything lit by a sky fill plus warm sun `#ffd8a8` from the right. Sunlit wall bands go pink-ochre, and the shade side goes blue-violet.
- **Brightness**: frame means of 0.3-0.5, never dark. The canyon floor stays visible through warm haze, never a black pit.
- **The slab**: the brightest ground in its frames, without blowing out.
- **Glints**: tiny glints only. No speckle and no broad halos.
- **Colour space**: shader colours go through pow(col, 2.2).

## 7. Portal
Use a ring of marrow-gold on the grassy col at the canyon head, with the horsetail fall below it and Monte Perdido behind. It is colour-matched to the burst glints, so the dust leads into it.

`{ shape:'circle', style:'ring', radius:9, color:'#f2d6a2', veil:'#f2d6a2', glow:0.75, halo:true, revealDistance:700 }`, centred at col ground + 9.

- From frame 0 it is a tiny ring sitting on the skyline notch.
- It stays under a fifth of the frame until T 16.5.
- It never hangs in open sky.

## 8. Risks (what a judge will fail first)
1. **The bird is still a cartoon or badly framed**: rod wings, a fast flap, a wing cut off by the frame edge, no wedge tail. Check the frames at 1.5, 3 and 9 s.
2. **Empty sky or dark ground**: pois that tilt up during the climb and release, or a slab or floor that reads as a dark crater. Check the frames at 6, 9, 12 and 15 s: the top third holds wall or peaks, and every frame mean is ≥0.25.
3. **The walls read as smooth humps**: the walls need vertical strata, benches and buttresses. Also check that the burst is not grey sprites, and that the ending is not a glide over an empty meadow. The 18 s frame must show the col, the fall, Monte Perdido and the ring.
