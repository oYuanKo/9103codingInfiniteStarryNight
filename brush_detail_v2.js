// Exact seeded brush geometry, indexed once while the original painting is built.
const BRUSH_RECORD_STRIDE = 13;
const brushDetailSettings = { enabled: true, budgetMs: 2, maxTextures: 5, width: 1536, height: 1152 };
const brushDetailV2 = { patches: [], slots: new Map(), job: null, clock: 0,
    stats: { builds: 0, cancelled: 0, maxBatchMs: 0 } };

function newBrushDetailSourceV2() { return { records: [], grid: new Map() }; }
function recordBrushStrokeV2(source, x, y, angle, len, weight, colour, alpha) {
    const id = source.records.length / BRUSH_RECORD_STRIDE;
    // Conservative hull includes both Beziers, their curvature, highlight and round caps.
    const r = len * 0.85 + weight * 1.5 + 2;
    source.records.push(x, y, angle, len, weight, colour[0], colour[1], colour[2], alpha,
        x - r, y - r, x + r, y + r);
    for (let gy = Math.floor((y - r) / 64); gy <= Math.floor((y + r) / 64); gy++) {
        for (let gx = Math.floor((x - r) / 64); gx <= Math.floor((x + r) / 64); gx++) {
            const key = `${gx}:${gy}`;
            if (!source.grid.has(key)) source.grid.set(key, []);
            source.grid.get(key).push(id);
        }
    }
}
function brushIdsInRectV2(source, rect) {
    const ids = new Set(), a = source.records;
    for (let y = Math.floor(rect.y / 64); y <= Math.floor((rect.y + rect.h) / 64); y++) {
        for (let x = Math.floor(rect.x / 64); x <= Math.floor((rect.x + rect.w) / 64); x++) {
            for (const id of source.grid.get(`${x}:${y}`) || []) {
                const i = id * BRUSH_RECORD_STRIDE;
                if (a[i+11] >= rect.x && a[i+9] <= rect.x+rect.w &&
                    a[i+12] >= rect.y && a[i+10] <= rect.y+rect.h) ids.add(id);
            }
        }
    }
    return [...ids].sort((a, b) => a - b); // Never reorder overlapping translucent paint.
}
function replayBrushRecordV2(g, records, id) {
    const i = id * BRUSH_RECORD_STRIDE;
    paintV2Stroke(g, records[i], records[i+1], records[i+2], records[i+3], records[i+4],
        [records[i+5], records[i+6], records[i+7]], records[i+8]);
}
function detailViewV2(world, camera) {
    if (!brushDetailSettings.enabled || !world.detailSource || camera.zoom < 1.8) return null;
    const z = camera.zoom, pad = 16 / z;
    const view = { x: -camera.x/z-pad, y: -camera.y/z-pad,
        w: width/z+2*pad, h: height/z+2*pad };
    // 3x, 6x, 12x... Exact requested scales are rasterised at native screen density.
    const scale = Math.max(3, 3 * Math.pow(2, Math.floor(Math.log2(z / 2))));
    const w = brushDetailSettings.width/scale, h = brushDetailSettings.height/scale;
    const step = 64/scale;
    return { source: world.detailSource, view, scale,
        x: Math.floor((view.x + view.w/2-w/2)/step)*step,
        y: Math.floor((view.y + view.h/2-h/2)/step)*step, w, h };
}
function patchCoversV2(patch, view) {
    return patch.x <= view.x && patch.y <= view.y &&
        patch.x+patch.w >= view.x+view.w && patch.y+patch.h >= view.y+view.h;
}
function disposeBrushPatchV2(patch) {
    if (!patch) return;
    const renderer = brushFlowBuffer?._renderer;
    const texture = renderer?.textures?.get(patch.g);
    if (texture) { renderer.GL.deleteTexture(texture.glTex); renderer.textures.delete(patch.g); }
    patch.g.remove();
    brushDetailV2.patches = brushDetailV2.patches.filter(p => p !== patch);
    for (const slot of brushDetailV2.slots.values()) {
        if (slot.active === patch) slot.active = null;
        if (slot.previous === patch) slot.previous = null;
    }
}
function disposeBrushDetailsV2(source) {
    if (!source) return;
    if (brushDetailV2.job?.source === source) brushDetailV2.job = null;
    for (const patch of [...brushDetailV2.patches]) if (patch.source === source) disposeBrushPatchV2(patch);
    brushDetailV2.slots.delete(source);
}
function updateBrushDetailsV2(requests) {
    const started = performance.now();
    requests = requests.filter(Boolean);
    const sources = new Set(requests.map(r => r.source));
    const now = performance.now();
    for (const [source, slot] of brushDetailV2.slots) {
        if (now - slot.started > 140) slot.previous = null;
        if (!sources.has(source)) { slot.previous = null; }
    }
    let job = brushDetailV2.job;
    if (job && !sources.has(job.source)) {
        disposeBrushPatchV2(job); brushDetailV2.job = null; job = null;
        brushDetailV2.stats.cancelled++;
    }
    // Select completed patches first. Never expose a partially painted texture.
    for (const request of requests) {
        const candidates = brushDetailV2.patches.filter(p => p.ready && p.source === request.source && patchCoversV2(p, request.view));
        candidates.sort((a,b) => b.scale-a.scale);
        const best = candidates[0];
        let slot = brushDetailV2.slots.get(request.source);
        if (!slot) { slot = { active: null, previous: null, started: 0 }; brushDetailV2.slots.set(request.source, slot); }
        if (best && best !== slot.active) {
            slot.previous = slot.active;
            slot.active = best;
            slot.started = now;
        }
        if (slot.active) slot.active.used = ++brushDetailV2.clock;
    }
    if (!job) {
        const request = requests.find(r => !brushDetailV2.patches.some(p => p.ready && p.source === r.source && p.scale >= r.scale && patchCoversV2(p,r.view)));
        if (request) {
            const pinned = new Set();
            for (const source of sources) {
                const slot = brushDetailV2.slots.get(source);
                if (slot?.active) pinned.add(slot.active);
                if (slot?.previous) pinned.add(slot.previous);
            }
            while (brushDetailV2.patches.length >= brushDetailSettings.maxTextures) {
                const oldest = brushDetailV2.patches.filter(p => !pinned.has(p)).sort((a,b)=>a.used-b.used)[0];
                if (!oldest) break;
                disposeBrushPatchV2(oldest);
            }
            if (brushDetailV2.patches.length < brushDetailSettings.maxTextures) {
                const g = createGraphics(brushDetailSettings.width, brushDetailSettings.height);
                g.pixelDensity(1); g.background(12,28,60);
                g.scale(request.scale); g.translate(-request.x,-request.y);
                job = { ...request, g, ids: brushIdsInRectV2(request.source,request), cursor: 0,
                    ready: false, used: ++brushDetailV2.clock };
                brushDetailV2.patches.push(job); brushDetailV2.job = job;
                brushDetailV2.stats.builds++;
            }
        }
    }
    if (job) {
        const deadline = started + brushDetailSettings.budgetMs;
        // Allocation/index lookup are indivisible; defer paint if they used the budget.
        while (job.cursor < job.ids.length && performance.now() < deadline) {
            replayBrushRecordV2(job.g,job.source.records,job.ids[job.cursor++]);
        }
        if (job.cursor === job.ids.length) {
            job.ready = true; job.ids = null; brushDetailV2.job = null;
        }
    }
    brushDetailV2.stats.maxBatchMs = Math.max(brushDetailV2.stats.maxBatchMs,performance.now()-started);
}
function brushDetailUniformsV2(world, camera) {
    const slot = brushDetailSettings.enabled ? brushDetailV2.slots.get(world.detailSource) : null;
    const a = slot?.previous, b = slot?.active;
    const rect = p => p ? [p.x,p.y,p.w,p.h] : [0,0,width,height];
    const zoomWeight = constrain((camera.zoom-1.4)/0.8,0,1);
    return { a: a?.g || world.base, b: b?.g || world.base, rectA: rect(a), rectB: rect(b),
        weights: [a ? 1 : 0, b ? 1 : 0, slot ? constrain((performance.now()-slot.started)/140,0,1) : 0, zoomWeight] };
}
