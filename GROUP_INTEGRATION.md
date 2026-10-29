# Group integration (API v1)

The active app is the Nested Universe painting. No Audio/Time module is required
for startup. The archived prototype in legacy/ is not loaded.

## Ownership and load order

Teammates should add their own files, e.g. audio_module.js and time_module.js.
Coordinate index.html script additions; load optional modules after group_bridge.js
and before sketch.js (or after sketch.js while the page is still loading).
Keep scripts classic scripts unless the team explicitly adopts a module loader.
Do not redefine p5 setup/draw/keyPressed/mouseWheel or write global width/height.
Use addEventListener for audio gesture fallback and remove it in cleanup.
Audio permissions, user gesture, microphone access and playback remain Audio's
responsibility. Nothing in core starts audio or invents time-reactive behaviour.

Coordinate changes to app_controller.js, input_controller.js, ui_overlay.js,
group_bridge.js and index.html. Avoid changes to artwork.js, brush_renderer_v2.js,
brush_flow_shader.js, brush_detail_v2.js, star_hover_light_v2.js, zoom_camera.js
and nested_universe_v2.js without the mechanic owner's review.

## Read state

Use StarryNight.getState(). Before setup it returns { ready: false }.
Otherwise it returns frozen, detached data:
- universe: session-local ID, seed, and parent-link depth of the committed navigation world. Depth is zero at the root and helps optional modules stay synchronized when the world is rebuilt or navigation is reset.
- camera: currently rendered parent/normal camera (x, y, zoom).
- portal: null or ID, original entry direction, parent/child seeds, star ID,
  actual/target progress and the separate child camera.
- canvas: logical width/height (800/600), not CSS display dimensions.
- loading: whether a requested navigation is waiting for generation.
- flow: enabled, paused, speed, strength and cursorEnabled.
- visual: `particles` is the current world's animated brush-mark count plus
  currently drawn star-hover light strokes; `cursorIntensity` is normalized
  cursor disturbance used by the flow shader; `hoverSpread` is the normalized
  visible star-halo spread, and `pointerSpeed` is smoothed screen-pointer speed
  normalized to 900 logical pixels/second. These detached values are available
  to optional modules such as audio and do not expose renderer resources.

During outward transitions the parent is rendered before navigation commits;
universe still names the originating committed world. Seeds are not identities.
IDs last for this page session and are not save-file IDs. Frozen state is an API
contract against accidental writes, not a security sandbox for arbitrary JS.

## Subscribe and clean up

Each subscription returns an idempotent unsubscribe function. No p5 globals are
replaced. Frame callbacks receive raw p5 deltaTime in milliseconds and a snapshot;
Space leaves the draw loop running, so time modules must inspect state.flow.paused
and decide their own policy. Callbacks should be short and synchronous where
possible. Thrown errors/rejected promises disable that subscription and produce
one warning, rather than interrupting core rendering.

```js
// Example optional-module lifecycle shape (audio_module.js implements its own mapping).
function attachAudioModule(bridge) {
  const off = bridge.onFrame((dt, state) => {
    // Read state here. Browser autoplay restrictions may require a user gesture.
  });
  return () => { off(); /* stop/disconnect your own audio resources here */ };
}
const detachAudio = attachAudioModule(StarryNight);
// Call detachAudio() before replacing/unloading this module.
```

```js
// time_module.js: subscribe without defining another draw().
function attachTimeModule(bridge) {
  const off = bridge.onUniverseChanged(({ previous, current }) => {
    // Observe a committed change; previous is null on first publication.
  });
  const offPortal = bridge.onPortal(event => {
    // event.phase: 'begin', 'progress', 'end'
    // end outcome: 'completed', 'cancelled', or 'reset'
    // progress is read-only; reverse scrolling can decrease it.
  });
  return () => { off(); offPortal(); };
}
```

Events publish after the current frame is drawn. The first universe publication
provides current state; later ones follow committed world/seed changes. Portal
begin/end are queued at lifecycle boundaries; progress publishes once per frame
while active. A pending load cancelled before begin is not a portal event.
Direction denotes how entry started, not the latest wheel direction. Reversing
partway stays in the same transition ID. Subscribers added mid-transition can
read getState() or await the next progress; earlier begin events are not replayed.

## Approved controls

```js
StarryNight.setFlowSpeed(1.2);  // finite number, clamped to 0..3; default 1.2
StarryNight.setFlowStrength(5); // finite number, clamped to 0..30; default 5
```

NaN, Infinity and strings throw TypeError. Setters return the applied value.
No setters exist for seed, camera, caches or portal progress. Changes inside
callbacks affect the next frame. No module connected means unchanged defaults.
Speed is the existing shader phase multiplier, not a new audio clock: abrupt
changes may visibly alter phase. Agree on ownership of each parameter; if both
modules write it, last writer wins. Do not infer an automatic mixing policy.
Unsubscribing stops callbacks but does not reset shared parameters; coordinate
restoration rather than silently overwriting the other member's settings.

## Presentation and testing

The canvas stays 800x600. ui_overlay.js sizes the DOM canvas at 4:3 with integer
CSS dimensions; p5 performs its built-in pointer mapping. Never multiply mouseX
or mouseY by display scale again. H or the guide button toggles instructions.
Q/W/E, F, Space, C, R and bracket controls remain available without a debug HUD.

Run the seven existing browser suites plus tests/refactor.browser.cjs and
 tests/app.browser.cjs. Prerequisites: Node.js, the Playwright package available
to Node, installed Microsoft Edge (msedge channel), and access to the p5 CDN.
For example, install the test dependency with
`npm install --no-save --package-lock=false playwright`.

A fresh checkout includes tests/fixtures/refactor-pixels-baseline.json; simply run
`node tests/refactor.browser.cjs`. No ignored log, screenshot or manual baseline
reconstruction is needed. Include the JSON fixture in the reviewed commit.

The fixture records archived-source hashes (LF/CRLF independent), browser/p5
versions and reference image hashes. These image hashes are diagnostic, not a
cross-machine pass/fail gate: browser/GPU/rasterisation and asset-build timing
can differ. The hard assertion compares old and new draw functions pixel-for-pixel
in the SAME browser context, on the SAME world assets, for seeds 12/89/205 and
portal depths 20/60/80 percent. No pixel tolerance is used. This isolates lifecycle
refactoring, not independent changes to shared painting algorithms; keep the other
regression suites and manual visual review.

Only when intentionally updating the archived reference, regenerate with
`node tests/refactor.browser.cjs --original --baseline` and review the JSON diff.
The harness boots legacy/sketch.js with its archived supporting scripts, excludes
the refactored app/input controllers, verifies the runtime, and writes only after
checks pass. --baseline without --original is rejected. Normal tests never rewrite
the fixture, and archived-source changes fail provenance validation.

A test server must serve CSS as text/css and JS as JavaScript. Generated
PNG/WebM and temporary log files remain ignored by Git.

Manually check your module with pause/resume, seed resets, portal reversal,
multiple levels, resize, and no module attached. Unsubscribe/re-attach several
times; confirm there is still only one copy of each callback and no console
errors. Limit your own allocations and dispose audio nodes/timers/listeners.

## Branch workflow

Create a separate branch from the latest shared main baseline for each member
(e.g. audio/<name>, time/<name>). Keep module changes small, describe API needs,
and run regressions before review. Review core-file changes together; integrate
one member at a time and retest. Do not overwrite another member's uncommitted
files or merge the historical prototype back into the active application.
Preserve the existing v3 Time-based work; review and integrate it separately
after updating its branch with main through the agreed group workflow.

## Accepted production portal (Step 11 finalisation)

Mode A, the original Step 6D.3 portal, is now the only production renderer.
There are no Cosmic Threshold flags, experimental script dependencies or review
mode switches. The integration API and camera/navigation contracts are unchanged.
Historical B/C sources, tests and comparison notes are preserved under
[experiments/cosmic_threshold/](experiments/cosmic_threshold/README.md); those
archived suites are not production tests or standalone demos.

Run node tests/production_portal.browser.cjs for same-environment accepted-A
pixel equivalence and absence of experimental resources. Its version-controlled
reference works on a fresh clone without generated logs. See
[tests/PRODUCTION_PORTAL.md](tests/PRODUCTION_PORTAL.md) for before/after evidence.
Also run navigation, portal, spatial, detail, hierarchy, hover, hover_detail,
app and refactor browser suites. Generated PNG/WebM/log files remain ignored.
The original-only refactor fixture and its provenance are unchanged.
