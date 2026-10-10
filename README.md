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
