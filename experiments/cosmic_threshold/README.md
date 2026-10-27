# Historical cosmic threshold experiments

Mode A (the existing Step 6D.3 portal) is the accepted production transition. B (galaxy/proto-universe) and C (source-brush fragments) were rejected after visual comparison because their intermediate scenes reduced continuity with the painting.

These are historical source references, not maintained standalone demos. There is no alternate HTML entry point. The active application never loads this directory.

## Preserved local work

The files were copied and byte-verified before cleanup on branch brushv2yuan at commit 465b308. This includes uncommitted Step 11.5 changes in the shader, cosmic module, continuity test and notes, plus the new brush-cosmos module, test and notes. manifest.json records original locations and SHA-256 hashes (normalised line endings).

source/brush_flow_shader.js is a snapshot of the shared shader for recovery of its embedded experimental variants and independent accepted-A regression comparison. It is not a second production renderer. Original index.html experiment script references were cosmic_threshold_v2.js and brush_cosmos_prototype_v2.js, before brush_flow_shader.js.

notes/ preserves implementation and A/B/C review instructions as historical records; their console switches do not exist in production. tests/ preserves the five experiment suites unchanged. They assume the original root-level modules and HTML and must not be included in the production test runner. Studying/running them requires reconstructing that historical setup separately, not re-enabling them in production.

Production checks are listed in GROUP_INTEGRATION.md and tests/PRODUCTION_PORTAL.md at the repository root.
