# Test inventory and current scope

This is a test-maintenance note, not a course rubric or a claim that all browser suites passed. No course assessment/rubric file was found in the project root. The project README remains a draft.

## Running tests

Node suites need only Node.js:

```powershell
Get-ChildItem tests -Filter *.node.cjs | ForEach-Object { node $_.FullName; if ($LASTEXITCODE -ne 0) { throw "Failed: $($_.Name)" } }
```

Standalone browser suites require the `playwright` package, an installed Edge browser (or `BROWSER_CHANNEL=chrome`), and network access to the p5 CDN. No dependency was installed during this review. Run each selected suite with `node tests/<name>.browser.cjs`. These tests create their own headless browser; they do not resize the user's open window.

Generated screenshots/videos/reports go to a unique per-run directory below the OS temporary directory (`starry-night-tests`), printed at startup. `TEST_OUTPUT_DIR` optionally chooses the parent directory. Existing screenshots, recordings, logs, fixtures and archived source are preserved. Explicit baseline-generation flags still have their historical meaning; do not run them as routine regression tests.

## Retained coverage

| File | Coverage / decision |
|---|---|
| `portal-intent.node.cjs` | Keep: deferred entry intent, cancellation, reverse/retarget and exactly-once dispatch. |
| `restart.node.cjs` | Keep: R full reset, explicit seeds, removed Q/W/E shortcuts, paused audio reset and timer cleanup. |
| `shared-pause.node.cjs` | Keep: F and uppercase/repeat/editable routing; Space inert; music/cue remaining timers and paused world changes. |
| `time-controls.node.cjs` | Keep: Time starts off, fresh cycles, original peak, appearance transitions, rapid toggles and F pause. |
| `world-layout.node.cjs` | Keep: 2000 seeds, layout identity, deterministic positions, bounds/spacing, stable moon/IDs and local RNG isolation. |
| `app.browser.cjs` | Keep/update: bridge snapshots/events and callback isolation, responsive pointer mapping, hover, guide toggling without canvas movement. Optional `--soak` checks resource stability. |
| `navigation.browser.cjs` | Keep/update: real wheel navigation, graph/cache identity, levels/reversal/eviction; use explicit seed reset, F paused, and R always seed 12. CSS-scaled pointer coordinates. |
| `hover.browser.cjs` | Keep/update: gradual light, core stability, fade/proximity, C/F, recording and portal hover. Scaled pointer coordinates and non-overshooting 3x approach. |
| `hover_detail.browser.cjs` | Keep/update: fine hover geometry/LOD, inherited reveal, per-world caching and bounded resources; scale pointer coordinates. |
| `spatial.browser.cjs` | Keep/update: fixed portal anchor, monotonic depth, stopped/reversed pixels and real-wheel recordings; scale pointer coordinates and prevent pre-entry overshoot. |
| `portal.browser.cjs` | Keep: exact current parent/child endpoints, reversible interpolation, cursor locality and outward camera. Not replaced by navigation's graph tests. |
| `detail.browser.cjs` | Keep: base geometry replay, sharpness against direct geometry, atlas resource lifecycle, cold/warm cost. |
| `hierarchy.browser.cjs` | Keep: hierarchical micro detail, seeded regeneration, stale jobs and atlas arrival. Overlaps some detail stress checks but also has distinct coverage; no safe complete replacement identified. |
| `presentation_performance.browser.cjs` | Keep as optional diagnostic: same-page styled/unstyled timing. Reports measurements, not a portable speed threshold; distinct from app soak/resource checks. |
| `production_portal.browser.cjs` | Update: default verifies current same-frame stability, seeds, no experimental resources and wheel reversal. `--historical-reference` retains old Mode A exact shader/pixel equality; current shader differs, so that opt-in historical check is expected to reject the current version. `--measure-only` compares old/current cost, not visual equivalence. Preserve old diagnostic/capture modes and manifests. |
| `refactor.browser.cjs` | Keep/update: same-environment archived draw vs current lifecycle with Time off; current mode uses explicit seeds and restores frozen rendering after reset. `--original` retains archived Q/W/E. Historical JSON source provenance remains checked; visual equivalence still needs browser execution. |
| `test-output.cjs` | New shared artifact-directory helper; prevents new runs overwriting historical visual evidence. |

No test was deleted: each has distinct coverage or unresolved historical value, and there is no demonstrated complete replacement. This does not make archived expectations current product requirements.

## Verification in this review

- All five `*.node.cjs` suites passed.
- All test CJS files passed `node --check`; `git diff --check` passed.
- Archived refactor fixture source hashes and the Cosmic Threshold manifest were verified without changing either.
- Static comparison confirms the current fragment shader differs from archived Mode A; no baseline was regenerated to conceal that difference.
- Standalone Playwright browser suites were **not run**: the local package is unavailable, and this session uses the approved computer-use browser interface. Syntax checking is not equivalent to executing those suites. Their new assertions and historical comparisons require a later full run with the stated prerequisites.
- Current-window browser smoke passed: initial Time off; Start Time advances the clock; F freezes clock/music; keyboard Space activates Stop Time without resuming global pause; F then resumes normal flow/music. At the paused checkpoint the cycle stayed at 6.8654 seconds and music at 15.34 seconds; after Stop Time both remained frozen until F resumed. Evidence: task `evidence/test-audit-browser-smoke.json`. This does not replace GPU, multi-viewport, cache-stress or historical pixel suites.

## Review boundaries

Only README interaction instructions and tests changed. Production rendering, input, Time and audio code are unchanged. No AudioV2 work, Git synchronization, commit or push was performed. Remote main was inspected read-only and differs from the local main reference (ancestry was not fetched or verified); this task stays on the existing finalising branch.

