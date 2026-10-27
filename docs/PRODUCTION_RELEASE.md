# Production release verification

Starting branch: brushv2yuan, HEAD 465b308f8ab7a431d9bfa64885fccc9c35fdb8f9. Remote main: 75d718d7c353127141163880e2a7c764f6545f28; common ancestor e8b6d5927c7b25cd6ad789d3f5aaea460e6550f5. Main had three README-only commits not in the feature branch. The local Step 11 cleanup and archives were uncommitted and have been preserved in this release.

Protected teammate baseline: origin/v3 at ce308f97626e9c912ac8a77855c6bf324c09eaf3. No Time-based files or commits were merged, reset, rebased or deleted. Their later integration remains a separate review.

Mode A is unchanged from the accepted local finalisation. The two rejected experiment modules, embedded shader variants, notes and suites are preserved in ../experiments/cosmic_threshold/. Production no longer loads those modules, allocates their shader objects/caches or calls their draw/disposal hooks. Rendering, camera, navigation, hover and Group Bridge implementations were not redesigned.

Release tests rerun successfully on 2026-10-17: navigation, portal, spatial, detail, hierarchy, hover, hover_detail, app, refactor, production_portal. The final test enforces 54 zero-tolerance old/new comparisons on identical browser resources across seeds 12/89/205, moon/major-1 and nine portal depths, plus wheel stop/reversal at .4/.5/.6. Cross-process GPU hash variation is diagnosed separately; it does not relax the live pixel assertions. See ../tests/PRODUCTION_PORTAL.md and ../tests/STEP11_FINALISATION.md for methods and historical measurements. Generated release-*.log, PNG and WebM evidence remains ignored.

README was constructed from origin/main:README.md, not the development README. Removing the inserted Chinese module section and reversing the single ff-only tutorial improvement reproduces the original main text exactly. Team names/responsibilities, project overview, tutorial, Notes and AI statement are preserved. The prior development README is retained in DEVELOPMENT_HISTORY.md with relative links adjusted for its new location.

The inserted section is the complete text under README.md → 小组模块与文件调用说明, immediately before GitHub 使用指南. API names and callback signatures were verified against group_bridge.js; the example receives milliseconds after the draw frame. Audio remains pending and Time files are explicitly described as belonging to v3, not production.

Integration uses a normal merge from the tested feature commit into a temporary branch based on main, then a merge-commit PR. Only README requires deliberate integration; main has no other divergent file changes. The merge result must equal the tested feature tree before publishing, and a clean worktree smoke test is required before and after the PR merge. Final PR status and SHA are reported in the release conversation rather than predicted here.

Remaining limits: no new Audio/Time behaviour is implemented; accepted Mode A retains its existing visual approximations; browser tests cannot certify subjective naturalness or unlimited-duration memory stability. Historical cosmic suites are source references, not standalone production demos.
