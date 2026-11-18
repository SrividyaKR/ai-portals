# Brief v2: infinity-mirror-room (The Infinity Room): the subject rethink

## 1. The world in one line
**A swallow trapped in an infinity mirror room keeps meeting itself: in the water, in the wall, in the ceiling, and we fly at its shoulder the whole way.**
Twist (unchanged): the only living thing is one bird; the mirrors multiply it. New: the mirror copies are framed *where a 9:16 frame can hold them*.
Keep the PLACE exactly as round 6 has it (see section 6). Rebuild only the bird's route, the camera, the looks and the event timings.

## 2. Why six rounds failed, and the structural fix
Root cause, measured from the file: the bird and the camera fly separate routes, so the bird is 4-15 m away and drifts in and out of frame; and the "flock" lives in the SIDE mirrors (copies at x' = -2W - x, 6-14 m sideways), which a tall frame cannot hold: its horizontal half-FOV is only ~21.5 deg (fov 70 vertical, 9:16). But the frame's vertical half-FOV is 35 deg: **the water and ceiling copies stack vertically, exactly the shape of a phone.** And a side copy is only in frame when the bird is within ~1 m of that wall.

Options:
- **(a) Chase camera.** The bird's position is defined from the camera's: bird(T) = cam(T) + offset(T), 4-5.5 m ahead. It never leaves frame and stays 25-35% of frame width. Risk: it looks pasted on (a sprite sliding with us). Cure: the offset breathes (distance, side, height), real flap bursts, bank from its own acceleration, and moments where it pulls ahead or drops back.
- **(b) A flock from the first second** (the mirrors already multiplied it). Risk: many birds read smaller than one, it turns into a generic flock and loses the one-bird idea, and the side copies still fall outside the frame.
- **(c) Mirror-pair framing.** Every beat is the bird and ONE of its copies converging (bird and water copy, bird and wall copy, bird and ceiling copy), aimed so the pair is in frame together. Risk: alone it does not fix distance (the bird can still go small).

**Pick: (a) + (c).** The chase holds the size; the mirror pairs give each beat its "wow" in a shape the 9:16 frame holds. It keeps the owner's one-bird idea and builds on the round-5 frame judges liked best (close, crisp, mid-swoop). It is also simpler: one route instead of two that have to be kept in step.

## 3. Beat list (DUR 19.2 s, V = 6, z = 30 - 6T; u = T / 19.2; wings on t, everything else on T)
Bird size: BIRD_S 1.5 (about 1.15 m span). At 4.5 m that is ~30% of frame width. Never further than 6 m before T 16.

| T (u) | Beat | Top of frame | Middle | Bottom |
|---|---|---|---|---|
| 0-2 (0-0.10) **Hook: the kiss** | Eye 1.0 m. The bird is in frame from frame 1, 4.5 m ahead on the path line, 0.35 m over the water, its water copy directly under it, belly to belly. At T 1.3 it dips: its beak meets its reflection's beak, a ring flashes out, the two birds part. | orbs in depth, blue-green | bird + its reflection (the pair is ~1/4 of the frame height) | water full of reflected orbs, the first ring spreading |
| 2-4.5 (0.10-0.23) **The ring trail** | Two more touches at T 2.6 and 3.7, each 4.5 m ahead, so we fly over a chain of rings growing under us. Flap burst, glide, burst. | orbs | the bird skimming | 3 overlapping rings with orb light shivering in them (bottom 40%) |
| 4.6-7.2 (0.24-0.375) **It meets itself in the wall** | The bird banks hard left to x -3.9 near the left mirror (x -5); its wall copy (x -6.1) flies at it from inside the glass. They close wingtip to wingtip and at T 6.2 it flips away at the last moment. Camera x drifts to -1.0, gaze yaws 35-40 deg left (aimed at the mirror point between them). | orbs, and the mirror seams running up the frame | bird and copy converging, both in frame (yaw 30 and 45 deg; frame spans ~17-60) | water and slabs, with the copies of the rings in the mirror floor |
| 7.4-11.8 (0.385-0.615) **It meets itself in the ceiling** | Steep climb through a gap in the orbs to y 7; its ceiling copy (y 2H - y = 13) dives down at it. They nearly touch; it rolls over at T 10.6 and turns back down. Camera rises 1.0 to 3.2; gaze pitches up 40-50 deg (aimed between bird and ceiling). Colour weather turns blue-green to pink-ochre here. | the ceiling copy diving, orbs in the ceiling mirror | the bird climbing, orbs all round | orbs and threads lower in the frame (no dark floor: the pitch never reaches 60 deg) |
| 12-15.8 (0.625-0.825) **The brush** | It dives back to 2 m and weaves a loose cluster; at T 13.2 its wingtip clips one large orb (r 0.4, 1.0 m off its route, 2.8 m off the camera). The orb swings, flares to 2.5x and a sphere of light runs through the room and every copy (reuse the perch-flare and 9 m/s wave code). | the swinging, flaring orb and the light wave | the bird beside it | the wave pooled on the water |
| 16-19.2 (0.835-1.0) **Exit** | Level at y 3, the bird pulls ahead (offset 5 to 12 m) and shoots through the ring at T 18.6; the warm wave comes back up the hall (keep). End. | orbs | the bird, then the ring | ring's reflection in the water |

Nothing scheduled before T 1.0. The engine's poi guard is ~0 for u < 0.04 (T < 0.8): the hook must frame itself with the plain forward gaze (bird on the path line, ~8 deg below centre).

## 4. Camera path and looks
- Path from camX/camY only (constant speed). camX: a soft S, |x| <= 1.2, drifting to -1.0 for T 4.6-7.2, back to 0 by T 15.5 (ring centre). camY: 1.0 until T 7.0, smoothstep to 3.2 by T 10.5, down to PR (3) by T 16. nearThrough 0.4, fov 70, lookAhead 8, sway 0.4, bank 0.05.
- Bird: `birdAt(T) = camAt(T) + off(T)`, off a Hermite of keys [T, dx, y (absolute), dz]. dz -4.5 at the hook, -4 to -5.5 in the middle, opening to -12 at the exit; dy and dx write the dips, the wall run (x -3.9), the climb (y 7) and the brush. The bird's world speed is 6 m/s plus off'(T): never let it go backwards relative to the hall (keep dz' > -6). Heading and bank stay as now (T +- 0.06, acceleration lean).
- pois (arc: true on the two big looks):
  1. u 0-0.23, the pair: at (bird.x, 0.3 * bird.y, bird.z) so bird and reflection are centred; weight 0.85, fade 0.25.
  2. u 0.24-0.375, the wall: at (-5, bird.y, bird.z), yaw 35-40 deg; weight 0.95, fade 0.3, arc.
  3. u 0.385-0.615, the ceiling: at (bird.x, (bird.y + H) / 2 + 1, bird.z), pitch 40-50 deg; weight 1, fade 0.3, arc.
  4. u 0.625-0.825, the brush: the midpoint of bird and brush orb; weight 0.9.
  5. u 0.835-0.97, the bird; weight 0.5 (the ring is on the same line).
- Corridor (the lead's ruling, unchanged): 2.6 m clear tube round the camera, 3.5 m for orbs below 3 m; the bird's route clear by 1.1 m; **plus a clear sight line camera to bird for every T** (generalise the current T 12-15.3 perch sight-line test in `clearOf` to T 0-19 in steps of 0.25). Climb gap: no orb within 1.5 m of the line bird to ceiling copy for T 8-11.

## 5. Light
Unchanged numbers: bloom 0.3 / 0.5 / 0.95, exposure 1.35, vignette 0.3, grain 0; mean brightness above 0.08 (round 6 passes). Bird matcap: keep the bright coloured rim; at 1.15 m span it now reads at phone size.

## 6. Keep unchanged vs rebuild (src/worlds/infinity-mirror-room.js)
KEEP (do not touch the code, only the inputs named): matcaps (123-141); level tints / atLevel (143-154); the bird's geometry, colours and wing rig (159-203, only BIRD_S 2.4 -> 1.5); orb placement rules and clusters (209-267; only the inputs camX/camY/birdSamples and the sight-line test change); orb cores, halos, threads, hoop (269-310); walkway slabs and pooled light (316-368; they follow the new camX automatically); seams (373-386); the lattice of cells (393-433); the water shader and its three planes (441-482); mist (491-519); motes (524-526); the colour weather, breathing, the 1.0 s wave, the 9 m/s flare wave and the 22 m/s return wave (590-613; retime only); pools, mist colour, slab colour (616-634); post, portal settings (659-660).
REBUILD: DUR, camX, camY (35-49); the bird route BK/birdAt (56-96) becomes cam + offset; flapAmount bursts (98-104); PERCH becomes BRUSH (one orb, swing and flare, no landing, no folded wings needed); RINGS (485-486) at the three dips, computed from the new birdAt; the pois (640-658).

## 7. Portal
Keep: the hoop of 64 orbs standing in the water, radius 3 centred at y 3 (the hall is 10 m tall, so the radius-9 default cannot fit: existing ruling), `{shape:'circle', style:'ring', radius:3, color:'#f0b6c8', veil:'#f0b6c8', glow:0.55, halo:false, revealDistance:700}`. Under 10% of frame width before T 15.

## 8. PROTECT (a builder must check each of these on every render before showing anything)
1. The bird is in frame and >= 20% of frame width at T 0.5, 1.5, 3, 6, 9, 13.2, 16 (render exactly these times; the shot tool prints u).
2. The ring trail: rings clearly visible at T 1.6, 3.0 and 4.2 (round 6 lost them). Do not lower ring strength or the water's 0.22 * h term to fix anything else.
3. The pair beats: at T 1.3 bird and reflection both in frame; at T 6.0 bird and wall copy both in frame; at T 10.2 bird and ceiling copy both in frame.
4. The place: luminous mirror floor in the bottom 40% (except the ceiling beat), orbs in depth, colour weather, no blown area larger than an orb, mean brightness > 0.08.
5. No orb or thread between camera and bird; nothing within 2.6 m of the camera; the bird never clips an orb except the brush orb.

## 9. Risks
1. **The pasted bird**: locked to the camera it reads as a sticker. The offset must move (dips, sideways runs, pulling ahead) and the wings must burst and glide. A judge watching frames 0.5-3 s fails it first if it sits still in frame.
2. **Fast turns**: the 38 deg wall yaw and 45 deg ceiling pitch need their fade (0.3) and arc: true, or the gaze snaps. Check frames 4.6-5.2 and 7.4-8.0 for blur-like jumps.
3. **One fix erasing another** (the round-6 failure): change only the REBUILD list; run all of PROTECT after every change, not only the beat you touched.
