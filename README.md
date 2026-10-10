# 9103codingInfiniteStarryNight
Creative coding major project (Final)

## Step 6C: bidirectional nested universes

Scroll into a major star or the moon at maximum zoom to enter its universe.
Scroll out at minimum zoom to return through the same star. With no parent yet,
an outer universe is painted incrementally, with its moon explicitly linked to
the old universe. Scroll back into that moon to revisit the old universe.
All existing Q/W/E seed, F shader, Space pause, C cursor, R camera and strength
controls remain available. R cancels navigation before resetting the camera.

### Navigation and ownership

- Persistent world nodes have stable identity independent of seed collisions.
  Each parent/star edge stores its child and parent camera. Creating an outer
  parent adds an edge to the existing node, rather than replacing its history.
- Navigation goes through idle, pending generation and portal states. A portal
  always uses the same coordinate: 0 is parent, 1 is child. Wheel distance sets
  the target; frame-independent smoothing follows it. Waiting alone cannot
  advance that target. Both loading requests and active portals can be reversed.
- The existing painting and flow-map generators run serially with the existing
  approximate 4 ms batch budget. Pending wheel distance is retained while they
  run. A generation job owns isolated partial resources and always restores the
  displayed world after each batch; no synchronous navigation rebuild is used.
- Nodes own completed textures. Cancelled portals retain reusable worlds. The
  LRU cache targets eight resident worlds, but pins the current ancestor chain
  and both navigation endpoints, plus room for one reusable neighbour when deep
  ancestry exceeds the target. Eviction removes graphics and entries in the
  shared p5 WebGL texture cache; seed, links, cameras and animation time remain
  for deterministic incremental reconstruction. Seed reset disposes the graph
  and any partial job. The texture-cache cleanup uses the p5 1.11.11 renderer
  internals used by this page and should be checked when upgrading p5.

### Validation

Serve this directory with any static HTTP server for manual use. The automated
browser test starts its own localhost server. With Node.js, Playwright and
Microsoft Edge installed, run:

```sh
node --check nested_universe_v2.js
node --check sketch.js
node tests/navigation.browser.cjs
```

Set `BROWSER_CHANNEL=chrome` to use installed Chrome. The page loads p5 1.11.11
from its existing CDN, so internet access is needed. The test uses real browser
wheel/key events for navigation and controlled frame stepping for cache stress.
It covers Child/Parent/Child, two inner and outer levels, reversal and stationary
progress, loading cancellation, Q/W/E and other controls, texture disposal,
ancestor retention and pixel-identical regeneration. It saves an ignored
`tests/step6c.png` screenshot and fails on browser JavaScript/WebGL errors.

### Deliberate limits

The portal is still the Step 6B crossfade, with a static child layer during the
blend; continuous star-interior geometry is deferred to Step 6D. The 4 ms budget
is cooperative, not a hard frame-time ceiling: existing generator steps are
unchanged. First visits or evicted worlds may wait at a zoom boundary while
generation completes. Retaining the full ancestor chain can exceed the cache
target on deep journeys, and lightweight visited-world metadata persists until
a seed reset. This is not a hard memory cap or an unlimited-depth soak test.

## Step 6D: painted spatial portals and lightweight detail

This supersedes the Step 6C crossfade described above. The existing graph, seeds,
cache policy, generator budgets and wheel progress are retained. Painting
settings, palette and the original artwork generators are unchanged.

- Both worlds are sampled in one screen-resolution shader pass, reusing the
  existing WebGL buffer and cached paintings/flow maps. No renderer or full-size
  offscreen texture is allocated per portal.
- The parent star and halo grow with the existing logarithmic camera. A soft
  aperture expands from inside the star, with stable world-space pigment noise
  and ragged edges. Pixels outside it remain entirely parent. The child grows
  around the same screen anchor. A bounded lens at small scales avoids repeated
  or mirrored image edges and becomes the ordinary child camera at the endpoint.
  This is a reversible 2D spatial portal, not 3D geometry.
- Both worlds keep their own animated flow time. Cursor radius is measured in
  screen pixels; displacement uses each mapping's local scale. Cursor state is
  preserved across the boundary. Outward transitions start from the actual child
  camera, including a camera still easing toward minimum zoom.
- LOD is a minimal procedural pigment layer aligned to the existing flow, seeded
  without touching p5's generation RNG. Two detail scales fade in with zoom,
  beginning around 1.6x and 5x. At 1x the layer contributes exactly zero. It
  subtly modulates existing colours without palette changes or brush rebuilding.
  It does not reconstruct higher-resolution houses, trees or stroke geometry;
  the original cache can still look soft at extreme magnification.
  `brushLODSettings` in `brush_flow_shader.js` enables a local on/off comparison.
- F still freezes/disables flow, Space pauses it, and C controls cursor effects.
  Seed and camera shortcuts retain their previous behavior. F off still uses
  the compositor so spatial portals remain available.

Additional checks, with the same Playwright/Edge prerequisites as above:

```sh
node --check brush_flow_shader.js
node tests/navigation.browser.cjs
node tests/portal.browser.cjs
```

The portal suite verifies pixel-identical normal/portal endpoints, identical
images when retracing a depth with animation paused, unchanged parent pixels
outside the aperture, LOD absence at 1x and presence at 10x, cursor locality,
constant texture/buffer counts during repeated rendering, and the outward
camera boundary. It saves ignored `tests/step6d-*.png` screenshots and reports
headless frame intervals. These short local samples are not a performance
guarantee for other GPUs or a long-duration memory soak test. The original
800x600 output resolution and cooperative generation-budget limits remain.

## Step 6D.1: exact brush replay and painterly ownership

This supersedes the Step 6D procedural-grain LOD, circular aperture, and bounded
child lens described above. It preserves the Step 6C graph, wheel target,
preload jobs, caches, seeds and controls.

### Actual geometry at zoom

- `paintV2Stroke()` records every static brush stroke: position, angle, length,
  width, RGB, opacity, bounds and original drawing order. This covers sky,
  stars/halos, mountains, village and cypress. Records do not call random/noise
  or modify the painted output. Completed records use Float64Array; a 64-unit
  spatial grid finds visible strokes. Seed 12 has 22,858 strokes (2.27 MiB of
  numeric records plus its spatial index).
- `brush_detail_v2.js` replays the original Bezier body and highlight into local
  1536x1152 2D textures at 3x, 6x, 12x and successive doubled scales. Selection
  preserves global paint order, conservative bounds include round caps, and
  overscan covers flow/cursor displacement. It is not an enlarged bitmap,
  sharpening filter, nearest-neighbour sampling or added grain.
- One job advances per frame under a cooperative 2 ms paint budget. Existing
  detail remains visible while replacement textures are built. Only completed
  textures are published, with a 140 ms asset-refinement blend; this blend never
  changes navigation progress. No brushes are rebuilt on settled warm frames.
- A global cap of five detail textures INCLUDES the in-progress job, previous
  refinement textures and inactive cached views: 33.75 MiB RGBA texture payload
  maximum, plus approximately the same amount of 2D backing storage and browser
  overhead. World disposal/seed reset also deletes their detail GPU entries.
  This is an additional detail-cache bound, not a cap on all ancestor worlds.
  Recording adds CPU memory per resident world; ancestor retention is unchanged.

### Painterly world transformation

Early zoom (first 38% of the transition) contains only parent brushwork. Later,
overlapping elongated footprints follow the local flow and transfer patches of
paint to the child. There is no radius, circle boundary or independent child
frame. Flow directions also blend through the middle. The child starts as a
crop rather than a miniature painting and continuously resolves to its ordinary
camera. Both paths are functions of the same scroll-controlled depth, so reverse
scroll retraces them. The old shader-grain layer has been removed.

Global flow is capped in screen pixels at deep zoom (6 px at default strength,
or the explicitly selected strength if greater). Cursor displacement remains
screen-scaled. This keeps the existing flow at ordinary scale without multiplying
a 5 px wobble into a 60 px distortion at 12x.

### Verification and limits

```sh
node tests/navigation.browser.cjs
node tests/portal.browser.cjs
node tests/detail.browser.cjs
```

The detail suite compares the complete replay against the original base painting,
compares 3x/6x/12x crops against direct geometry rendering, and saves paired
`tests/step6d1-sharp-*.png` / `tests/step6d1-cache-*.png` images plus eight transition
frames. It checks stable-depth pixels, early parent-only rendering, reversal,
endpoint matching, bounded cache churn, seed-reset cleanup, warm GPU-readback
frame time and cold detail-request time. The portal suite disables detail to
isolate its endpoint/cursor tests; the detail suite tests the combined path.

Texture allocation, spatial lookup and initial GPU upload are indivisible and
may exceed the 2 ms cooperative budget. Rapid movement can briefly use the old
cache while sharper detail arrives. This replays the original geometry: very
large strokes remain large, though their edges and highlights are now resolved.
The transition is still a 2D paint-region blend, not a one-to-one morph of each
parent stroke into a child stroke. Short desktop tests are not a long-duration
memory soak or a guarantee for integrated/mobile GPUs.

## Step 6D.2 �� hierarchical paint detail and continuous depth (local)

This supersedes the Step 6D.1 texture dimensions, memory figures and late
ownership thresholds described above. World graph, cameras, controls, base
painting and incremental world generation are unchanged.

- Exact brush replay is retained. Each local cache is a 2048x1536 atlas with
  three 1024x768 panels: original geometry, meso brushlets, and meso + finer
  brushlets. The fourth panel is unused padding. The original paint order is
  replayed independently in each panel so hidden strokes cannot leak through.
- Micro-brushes are actual cubic Bezier strokes placed inside the original
  cubic's paint body. Seed + source stroke ID + layer + strand determine their
  placement, length, width, opacity and modest light/dark variation. Original
  direction/curvature dominate; the existing local Perlin flow adjusts the
  curvature. Neither randomSeed nor noiseSeed is touched during detail work.
- Two finite levels fade in at 2.4�C6x and 6�C16x. They are interpolated in the
  shader from cached geometry, without rerasterising on each wheel event.
  Fine geometry is omitted in low-resolution atlases where its depth weight
  is zero. A warm finer atlas can replace it with the existing 140 ms loading
  refinement. This asset fade is time based; navigation depth is not.
- Spatial indexing, a cooperative 2 ms work budget, one job, and the five-atlas
  global LRU cap remain. The cap includes unfinished and fading atlases:
  **60 MiB RGBA GPU payload plus approximately 60 MiB CPU canvas storage**,
  excluding browser overhead and existing world textures. Stale jobs are
  cancelled when their source/view/scale no longer serves the requested view.
  World disposal and seed reset remove both canvas and shared GL cache entries.
- Depth is no longer delayed until 38%. A broad star-centred, flow-aligned
  influence and existing brush footprints gently offset local depth. They do
  not cut an aperture. Child pigment sampled along its flow first recolours
  parent paint while retaining parent luminance; child structure resolves
  throughout the same smooth depth curve. Flow directions turn on the unit
  circle, avoiding the zero-vector discontinuity of opposite directions.
- **This is not matched parent/child stroke morphing.** Micro detail is real
  geometry; world colour transfer, flow turning and structure blending are
  shader approximations. Mid-transition double exposure remains possible.
  Two detail levels do not supply infinite complexity; large parent strokes
  retain their original silhouette and broad highlight. Existing child camera
  framing still resolves a crop to the full child composition.

Run `node tests/hierarchy.browser.cjs` in addition to the three browser suites
above (Playwright and Edge required). It writes paired micro/replay crops at
3x/6x/12x/24x and `tests/step6d2-transition-{20,40,60,80}.png`. It checks atlas
regeneration, settled reversal, early evolution, endpoints, stale jobs, cache
bounds, reset cleanup, GPU-readback timings and cold atlas arrival. The original
detail suite disables micro shading to continue checking exact base geometry.
Geometry generation must match exactly after regeneration. GPU-backed 2D atlas
and shader pixels may differ by a few raster/compositing rounding
values between rebuilds; the test bounds that tolerance explicitly. Browser timing is
machine dependent. Cold detail takes multiple frames; old paint remains visible
until completion. These checks do not establish subjective visual naturalness
or a long-duration memory-leak guarantee.
