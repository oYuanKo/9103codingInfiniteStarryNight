# Step 11 finalisation evidence — 2026-10-17

## Scope and preserved work

Branch brushv2yuan, starting HEAD 465b308 (Adding galaxy). No commit, push, merge or PR. Local Step 11.5 edits were preserved before production cleanup; see experiments/cosmic_threshold/manifest.json and README.md. All ten archived copies were byte-verified before removal and their normalised SHA-256 hashes are checked by the production portal test.

Only the experimental blocks in brush_flow_shader.js, two experiment calls in nested_universe_v2.js and two local script tags in index.html were removed. Original vertex/fragment shaders remain identical to the accepted Mode A source. Camera equations, paint generation, brush detail, hover, input controllers and Group Bridge were not changed. refactor.browser.cjs only lost its obsolete experiment-disable assignment; existing assertions and its original-only JSON fixture were preserved.

## Visual evidence

Edge 155.0.4283.45, p5 1.11.11. BEFORE cleanup, Mode A captured seeds 12/89/205, moon and major-1, progress 0/.2/.35/.45/.5/.6/.7/.85/1. Animation time was paused and detail atlases settled. Original saved baseline remains tests/step11-final-modeA-baseline.log (ignored).

After cleanup: 54/54 same-context, same-assets reference-versus-production comparisons have ZERO pixel difference; 54/54 saved camera and LOD-weight states match. 45/54 cross-process saved pixel hashes match exactly. Nine seed-12 moon frames differ by tiny rasterisation variations: 25–199 of 1,440,000 RGB channels per PNG, maximum channel difference 7, maximum mean absolute difference 0.000170 on a 0–255 scale. Re-running the OLD archived shader itself also changed its saved first-frame hash (107 channels, max 2). Cross-process hash differences are recorded rather than silently discarded; the same-context pixel gate remains exact with no tolerance. This preserves accepted A, not proof of universal GPU determinism or perfect subjective naturalness.

Ignored screenshots: tests/step11-final-before-{0,20,35,45,50,60,70,85,100}.png and corresponding after files. Visually inspected comparison: tests/step11-final-comparison.png (left before, right after; rows 20%, 50%, 85%). Numerical PNG differences: tests/step11-final-image-differences.log. Full validation: tests/step11-final-validation.log and step11-final-report.log.

## Browser regression results

All passed: navigation, portal, spatial, detail, hierarchy, hover, hover_detail, app --soak, refactor. No browser JS/WebGL errors reported. The new production_portal suite also passed actual wheel pause/reversal at 40/50/60%. Existing spatial checks cover other entrances, monotonic camera scales, paused/reversed frames and actual-wheel Parent → Child → Parent recordings. Navigation covers nested and outer levels, texture identity, eviction/regeneration, seed resets and keyboard controls.

Group Bridge callbacks, frozen snapshots, unsubscribe, responsive pointer mapping at four viewport sizes and hover behaviours passed. The 30-second app soak sampled identical resources at start/end: 1 graph node, 1 hover world, 0 detail atlases, 2 GPU textures, 4 canvas elements. Its 1774 measured frame intervals had median 17.8 ms and p95 17.9 ms; this is a short post-cleanup stability check, not a long-term leak proof.

Ignored real-wheel recording: tests/step6d3-wheel-roundtrip.webm. Per-suite output: tests/step11-final-<suite>.log. Refactor retained six exact live old/new pixel checks and fixture provenance checks; its portable historical hashes still report expected cross-run differences informationally.

## Resources and performance

Matched full 54-frame sequences, before → after:

| Resource | Before Mode A | Clean production |
| --- | ---: | ---: |
| Created p5 shader objects | 3 | 1 |
| Experimental shader objects | 2 | 0 |
| Linked production GPU programs after rendering | 1 | 1 |
| Linked experimental GPU programs | 0 | 0 |
| Loaded experimental scripts | 2 | 0 |
| Cosmic map | allocated, empty | absent |
| Prototype cache object | present | absent |
| GPU textures after sequence | 11 | 11 |
| Canvas elements after sequence (includes detail canvases) | 13 | 13 |

One existing fullscreen WEBGL rendering buffer remains. No experiment geometry is generated or retained in production. In disabled old Mode A the experimental map was already empty and extra shader objects were lazy/unlinked, so this is not evidence of freeing two compiled GPU programs or a measured large VRAM allocation. Heap/VRAM bytes and isolated first-entry latency were not measured.

The initial cross-process frame timing was contaminated by overlapping regression jobs and is not used for performance claims. A separate isolated same-resource reference/production/production/reference benchmark was then run with settled LOD and pixel readback:

| Depth | Old A median (two batches), ms | Production median (two batches), ms |
| --- | --- | --- |
| 0% | 1.9 / 2.0 | 1.9 / 1.9 |
| 50% | 2.2 / 2.0 | 2.1 / 2.0 |

Batch p95 ranges were 2.5–4.0 ms reference and 2.5–4.2 ms production. No meaningful speedup demonstrated. Initialization probes include flow-map rebuilding, not just shader compilation: old 142.6 ms, final isolated new 155.6 ms, single runs only. No startup-speed improvement claimed. See tests/step11-final-isolated-timing.log and step11-final-timing.log.

Navigation stress released all 10 uploaded textures on reset (10 → 0), retained pinned ancestors and active textures during cancellation, and regenerated evicted worlds identically. This plus the short soak supports unchanged resource lifecycle, not unlimited-duration memory guarantees.

## Integration and limitations

Production is ready for existing Audio/Time integration contracts, without adding either feature. B/C historical suites are preserved but intentionally excluded from production; they require reconstruction of the old experimental setup. No alternate entry point or production review switches remain. Screenshots/videos/logs are ignored; archived sources, manifest, tests and documentation are intended to be version-controlled by the user. Final visual acceptance remains the user's local scrolling review.
