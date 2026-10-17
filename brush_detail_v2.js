// Exact seeded brush geometry, indexed once while the original painting is built.
const BRUSH_RECORD_STRIDE = 13;
// Three paint variants in one 2x2 atlas: exact replay, meso, meso + micro.
// Five 2048x1536 RGBA atlases: at most 60 MiB per CPU/GPU copy, eight samplers total.
const brushDetailSettings = { enabled: true, microEnabled: true, budgetMs: 2, maxTextures: 5, width: 1024, height: 768 };
const brushDetailV2 = { patches: [], slots: new Map(), job: null, clock: 0,
    stats: { builds: 0, cancelled: 0, maxBatchMs: 0 } };

function newBrushDetailSourceV2(seed = universeSeed) { return { seed, records: [], grid: new Map() }; }

// Stateless hash: neither asynchronous replay nor its order touches p5's RNG/noise seed.
function microHashV2(seed, id, strand, level) {
    let n = Math.imul(seed ^ Math.imul(id + 1, 374761393), 668265263);
    n ^= Math.imul(strand + 31 * level, 1274126177);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
function paintMicroBrushesV2(job, id, level) {
    const a = job.source.records, i = id * BRUSH_RECORD_STRIDE;
    const x = a[i], y = a[i+1], angle = a[i+2], len = a[i+3], w = a[i+4];
    if (w < 1 || len < 2) return;
    const c = job.g.drawingContext, ux = Math.cos(angle), uy = Math.sin(angle);
    const bend = Math.sin(x*.017+y*.021)*len*.18;
    const map = job.flowMap;
    const fi = 4*(Math.max(0,Math.min(map.height-1,Math.floor(y/height*map.height)))*map.width+
        Math.max(0,Math.min(map.width-1,Math.floor(x/width*map.width))));
    const flowNormal = -uy*(map.pixels[fi]/127.5-1)+ux*(map.pixels[fi+1]/127.5-1);
    const count = Math.min(level === 1 ? 16 : 28, Math.max(4,Math.ceil(len*w/(level === 1 ? 9 : 4))));
    // Follow the original cubic's centreline; stay inside its paint body.
    const pos = (t, offset) => {
        const along = len*(-.5 + .9*t + .3*t*t - .2*t*t*t);
        const normal = 3*t*(1-t)*bend+offset;
        return [x+ux*along-uy*normal,y+uy*along+ux*normal];
    };
    c.lineCap = 'round';
    for (let k=0;k<count;k++) {
        const h = n => microHashV2(job.source.seed,id,k*7+n,level);
        const t = .06+.88*h(0), span = Math.min(.36, (level===1 ? 5 : 1.8)/len)*(.4+.6*h(1));
        const t0 = Math.max(.04,t-span/2), t1 = Math.min(.96,t+span/2);
        const offset = (h(2)-.5)*w*.72;
        const p0=pos(t0,offset), p3=pos(t1,offset);
        const curve=(h(3)-.5+flowNormal*.35)*Math.min(w*.12,level===1 ? .55 : .2);
        const p1=pos(t0+(t1-t0)/3,offset+curve),p2=pos(t0+2*(t1-t0)/3,offset+curve);
        const shade = h(4)>.48 ? 1.09 : .80;
        const rgb = [a[i+5],a[i+6],a[i+7]].map(v=>Math.min(255,Math.round(v*shade+(shade>1?4:0))));
        c.strokeStyle=`rgba(${rgb.join(',')},${a[i+8]/255*(.35+.45*h(5))})`;
        c.lineWidth = Math.min(w*.075,level===1 ? .48 : .16)*(.45+.55*h(6));
        c.beginPath();c.moveTo(...p0);c.bezierCurveTo(...p1,...p2,...p3);c.stroke();
    }
}
function replayDetailAtlasBatchV2(job, deadline) {
    const g=job.g,c=g.drawingContext,{width:w,height:h}=brushDetailSettings;
    const panel=job.panel;
    g.push();g.resetMatrix();g.translate(panel===1?w:0,panel===2?h:0);
    c.beginPath();c.rect(0,0,w,h);c.clip();
    g.scale(job.scale);g.translate(-job.x,-job.y);
    while(job.cursor<job.ids.length && performance.now()<deadline) {
        const id=job.ids[job.cursor++];
        replayBrushRecordV2(g,job.source.records,id);
        if(panel>0)paintMicroBrushesV2(job,id,1);
        if(panel===2)paintMicroBrushesV2(job,id,2);
    }
    g.pop();
    if(job.cursor===job.ids.length && panel<2) {
        job.panel++;job.cursor=0;
        // Fine-level weight is zero below 6x; do not build invisible geometry.
        if(job.panel===2 && job.scale<6) {
            c.drawImage(g.canvas,w,0,w,h,0,h,w,h);
            job.cursor=job.ids.length;
        }
    }
}
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
    const scale = Math.max(1.5, 3 * Math.pow(2, Math.floor(Math.log2(z / 2.5))));
    const w = brushDetailSettings.width/scale, h = brushDetailSettings.height/scale;
    const step = 64/scale;
    return { source: world.detailSource, flowMap: world.flowMap, view, scale,
        x: Math.max(view.x+view.w-w,Math.min(view.x,Math.floor((view.x + view.w/2-w/2)/step)*step)),
        y: Math.max(view.y+view.h-h,Math.min(view.y,Math.floor((view.y + view.h/2-h/2)/step)*step)), w, h };
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
    if (job && !requests.some(r => r.source === job.source &&
        patchCoversV2(job,r.view) && job.scale >= r.scale && job.scale <= r.scale*2)) {
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
                const g = createGraphics(brushDetailSettings.width*2, brushDetailSettings.height*2);
                g.pixelDensity(1); g.background(12,28,60);
                job = { ...request, g, ids: brushIdsInRectV2(request.source,request), cursor: 0, panel: 0,
                    ready: false, used: ++brushDetailV2.clock };
                brushDetailV2.patches.push(job); brushDetailV2.job = job;
                brushDetailV2.stats.builds++;
            }
        }
    }
    if (job) {
        const deadline = started + brushDetailSettings.budgetMs;
        // Allocation/index lookup are indivisible; defer paint if they used the budget.
        replayDetailAtlasBatchV2(job,deadline);
        if (job.panel===2 && job.cursor === job.ids.length) {
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
