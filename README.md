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
