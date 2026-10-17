# Step 11.5: Brush-to-Cosmos continuity experiment

## Review decision

**Not accepted as an artistic solution. Keep A (the original Step 6D.3 portal).**
C has real source-curve lineage, but the inspected frames still look like small
pigment lines over the original portal, rather than the paint becoming a cosmos.
Do not promote it by adding more particles, galaxies or overlay layers. It is
retained only as a small, isolated comparison prototype for the user's review.

The checkout was clean on branch brushv2yuan at 465b308 when work began. No
commit, push, merge or PR was performed. Existing Step 11.4 code is preserved.

## Diagnosis before adding content

Current A/B were captured with paused flow, seed 12, the moon and identical depth.
The Step 11.4 material was disconnected in three concrete ways:

- Its galaxy lane and fork were authored child-UV sine curves, not descendants of
  a Parent brush. The smaller temporary paths came from Child sky records/star
  neighbourhoods and independently seeded river stations.
- Its shader replaced the pigment carrier with a separate navy/cloud field and
  changed global Parent retirement and Child contrast. The later continuity fix
  softened the ramps but did not establish a material correspondence.
- Temporary marks were separate Canvas geometry. Even after limiting travel,
  their fade and the reveal of high-contrast Child stars remained independent.

Diagnostic images: step115-diagnosis-A-50.png / step115-diagnosis-B-50.png.
The pre-edit cosmic_continuity and cosmic_formation suites passed; that did not
establish visual acceptance.

## A/B/C controls

Default is now A: cosmicThresholdSettingsV2.enabled is false.
Use the browser console (there are no new public UI controls or shortcuts):

    setCosmicReviewModeV2('A') // original portal; all cosmic treatments disabled
    setCosmicReviewModeV2('B') // current Step 11.4, both enrichment flags enabled
    setCosmicReviewModeV2('C') // minimal Parent-derived experiment

For C, press Q (seed 12) and enter the moon. Only the edge whose Parent seed is
12 and entry id is moon is eligible, in either direction. Other entries use A.
The existing enabled flag still overrides the experiment. Reload restores A.
B's shader sources, cached geometry, stage curves and earlier feature flags are
unchanged. The existing continuity test now explicitly enables B instead of
relying on the old default; its assertions and tolerances are unchanged.

## Actual geometry, not an independent galaxy

brush_cosmos_prototype_v2.js queries the existing Parent spatial index once for
a small region around the moon, chosen to remain visible near depth .55. Later
paint records are considered first; a small CPU base-paint sample rejects
obviously buried colours, and spacing avoids selecting twelve copies at one spot.
This centre-colour check is an approximation to visibility, not exact occlusion.

The tested entry selected Parent record ids:
13252, 13255, 13257, 13258, 13259, 13261, 13264, 13265, 13266, 13267, 13268, 13269.

Twelve records produce six fragments each (72 maximum). Each fragment is an exact
restriction of the source's main cubic with a small normal offset inside its paint
body. Length, width, offset and subtle shade variation use the existing meso hash
family with that Parent seed and record id. Their palette is the source palette.
The geometry test compares five points on every restricted cubic to the source;
maximum observed coordinate error was about 3.46e-13 world units.

Fragment centres ALWAYS project through the unchanged Parent Camera. There is no
flight to a separate layout. Over .35-.76, fragments locally shorten and narrow,
and turn at most .65 radians towards the actual Child flow sampled beneath their
screen position. Their opacity rises .20-.35 and retires .64-.88. All quantities
are deterministic functions of progress and existing world data, not elapsed time.

C uses the ORIGINAL portal shader throughout; it has no extra pigment replacement,
indigo field, star river, independent scene, texture, shader program or framebuffer.
Child structure therefore still comes from the original shader reconstruction.
The fragments do not become individual Child strokes. Source lineage is real;
full material-to-world morphing is not implemented.

## Ownership, cost and limitations

A WeakMap keyed by the existing transition owns at most 12 source records and 72
numeric cubic fragments per live key. Values contain copied numbers/arrays, not
worlds or textures. No strong list retains past transition keys. A discarded
transition can be garbage-collected; caches are not attached to world graph nodes.
The only CPU paint read is the small source-selection rectangle on cache creation.
No readback or source selection happens per frame. Each draw submits at most 72
short cubic paths, using the same output canvas. There are no new GPU textures.

The first version reused Path2D instances and failed some exact pixel rebuild
checks despite identical numeric geometry and settled LOD weights. Direct cubic
submission from the cached coordinates passed the subsequent exact comparisons.
This is evidence for avoiding that cached raster path here, not a complete
explanation of browser-internal rasterisation or the older Step 11.4 flaky test.

In the recorded prototype test, C median draw+readback was 3.3-4.3 ms, versus
3.1-4.1 ms for A and 3.3-4.2 ms for B; C P95 was 4.8-5.6 ms. Renderer texture count
stayed 7. These are local browser wall timings, not GPU timers or guaranteed FPS.
**Cold source selection/build cost about 54 ms** in the final measured run
(earlier runs 30-52 ms). That synchronous preparation is a remaining prototype
limitation; do not advertise this as production-ready or hitch-free.

The temporary curves do not receive the original shader's exact flow/cursor
pixel displacement. Their parent-space anchors match raw recorded geometry, not
every dynamically displaced screen pixel. Small alignment differences are possible.
The normal painting retains its flow, cursor, LOD and hover behaviour. Individual
fragments also shrink while breaking up: the world cameras still move inward,
but that does not guarantee a subjective impression of continuous scale.

## Validation and evidence

Use Node, Playwright and installed Edge, as for the existing browser suites:

    node tests/brush_cosmos.browser.cjs
    node tests/cosmic_formation.browser.cjs
    node tests/cosmic_continuity.browser.cjs
    node tests/navigation.browser.cjs
    node tests/refactor.browser.cjs
    node tests/hover_detail.browser.cjs
    node tests/hierarchy.browser.cjs
    node tests/app.browser.cjs

The prototype suite tests source lineage/colour, deterministic cache regeneration,
exact same-resource pause/reversal, A/C equality at .20 and the endpoint, bounded
texture count, isolation to the single selected entry, seed reset and actual-wheel
entry, partial reversal and full Parent/Child/Parent return. It records actual
wheel events, not a scripted progress sweep. Matched screenshots pause flow and
use settled existing LOD. Numerical equality does not establish artistic quality.

Images: step115-{A,B,C}-{20,35,45,50,60,70,85,100}.png.
Comparison: step115-ABC.png, columns A/B/C and labelled depth rows.
Video: step115-wheel-roundtrip.webm.
All media and *.log files remain ignored by Git.

Runtime changes: the new prototype module; one script include in index.html;
mode selection in brush_flow_shader.js; default/dispatch in cosmic_threshold_v2.js.
There are no changes to sketch.js, app_controller.js, group_bridge.js,
nested_universe_v2.js, zoom_camera.js, brush_detail_v2.js, brush_renderer_v2.js,
hover, seed generation, controls, or the underlying artwork.


Final result: all eight listed suites passed on the final implementation. The
refactor suite passed six exact same-environment original/refactored comparisons;
portable reference hash differences were informational only. Navigation included
Child/Parent/Child, multiple nested and outer levels, eviction/regeneration,
ancestor retention and cleanup; reset returned to one cached world, four canvases
and two renderer textures. No browser JavaScript/WebGL errors were reported.
The matched A/B/C images and six decoded frames of the actual-wheel recording
were visually inspected. The latter are in step115-wheel-contact.png. This
inspection supports the rejection decision above, not a claim of natural morphing.
