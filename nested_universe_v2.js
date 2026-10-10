// Nodes own resources; edges own navigation. Seeds are not world identities.
const nestedV2 = {
    current: null, nodes: new Set(), transition: null, pending: null,
    preload: null, clock: 0, cacheLimit: 8
};

function captureWorldV2(seed = universeSeed) {
    return { seed, ...brushV2, flowMap: brushFlowMap, flowTime: brushFlowTime };
}

function activateWorldV2(world) {
    universeSeed = world.seed;
    for (const key of ['base', 'motion', 'marks', 'stars', 'village', 'cypress', 'time']) {
        brushV2[key] = world[key];
    }
    brushFlowMap = world.flowMap;
    brushFlowTime = world.flowTime || 0;
}

function childSeedV2(parentSeed, starId) {
    let hash = (parentSeed ^ 2166136261) >>> 0;
    for (let i = 0; i < starId.length; i++) {
        hash = Math.imul(hash ^ starId.charCodeAt(i), 16777619) >>> 0;
    }
    return 100000 + (hash % 900000);
}

function newWorldNodeV2(seed, world = null) {
    const node = { seed, world, parent: null, children: new Map(), used: ++nestedV2.clock };
    nestedV2.nodes.add(node);
    return node;
}

function currentWorldNodeV2() {
    if (!nestedV2.current) nestedV2.current = newWorldNodeV2(universeSeed, captureWorldV2());
    return nestedV2.current;
}

function cameraSnapshotV2() {
    const { zoom, x, y, targetZoom, targetX, targetY } = v2Camera;
    return { zoom, x, y, targetZoom, targetX, targetY };
}

function stillCameraV2(zoom = 1, x = 0, y = 0) {
    return { zoom, x, y, targetZoom: zoom, targetX: x, targetY: y };
}

function childEdgeV2(star) {
    const parent = currentWorldNodeV2();
    if (!parent.children.has(star.id)) {
        const child = newWorldNodeV2(childSeedV2(parent.seed, star.id));
        const edge = { parent, child, starId: star.id, camera: null };
        parent.children.set(star.id, edge);
        child.parent = edge;
    }
    return parent.children.get(star.id);
}

function outerEdgeV2() {
    const child = currentWorldNodeV2();
    if (!child.parent) {
        const parent = newWorldNodeV2(childSeedV2(child.seed, 'outer'));
        // Explicit link overrides the usual seed-derived child of this star.
        const edge = { parent, child, starId: 'moon', camera: null };
        parent.children.set(edge.starId, edge);
        child.parent = edge;
    }
    return child.parent;
}

function disposeWorldV2(world) {
    if (!world) return;
    for (const key of ['base', 'motion', 'flowMap']) {
        const resource = world[key];
        if (!resource) continue;
        // p5's shared WebGL renderer keeps strong texture-cache references.
        const renderer = brushFlowBuffer?._renderer;
        const texture = renderer?.textures?.get(resource);
        if (texture) {
            renderer.GL.deleteTexture(texture.glTex);
            renderer.textures.delete(resource);
        }
        resource.remove?.();
        world[key] = null;
    }
}

function trimWorldCacheV2() {
    const protectedNodes = new Set();
    for (let node = nestedV2.current; node; node = node.parent?.parent) protectedNodes.add(node);
    for (const nav of [nestedV2.transition, nestedV2.pending]) {
        if (nav) { protectedNodes.add(nav.edge.parent); protectedNodes.add(nav.edge.child); }
    }
    const cached = [...nestedV2.nodes].filter(node => node.world);
    cached.sort((a, b) => a.used - b.used);
    // Reserve one reusable neighbour even when deep ancestry exceeds the budget.
    // Otherwise a completed speculative child would be evicted/rebuilt every frame.
    const limit = Math.max(nestedV2.cacheLimit, protectedNodes.size + 1);
    let count = cached.length;
    for (const node of cached) {
        if (count <= limit) break;
        if (protectedNodes.has(node)) continue;
        node.flowTime = node.world.flowTime;
        node.time = node.world.time;
        disposeWorldV2(node.world);
        node.world = null; // Keep seed, links and cameras for incremental regeneration.
        count--;
    }
}

function clearChildPreloadV2() {
    const job = nestedV2.preload;
    if (!job) return;
    job.steps.return?.();
    disposeWorldV2(job.world);
    nestedV2.preload = null;
}

function prepareWorldV2(node) {
    if (node.world || nestedV2.preload?.node === node) return;
    clearChildPreloadV2();
    nestedV2.preload = { node, phase: 'painting', steps: buildBrushV2Steps(node.seed, true),
        world: { seed: node.seed, base: null, motion: null, marks: [], stars: [],
            village: null, cypress: null, time: 0, flowMap: null, flowTime: 0 } };
}

function startChildPreloadV2(star) {
    if (star) prepareWorldV2(childEdgeV2(star).child);
}

function maybePreloadChildV2() {
    currentWorldNodeV2();
    if (nestedV2.transition || nestedV2.pending || !brushCursor.inside) return;
    if (v2Camera.targetZoom >= 1.6) {
        const star = findZoomStarV2(mouseX, mouseY);
        if (star) startChildPreloadV2(star);
    } else if (v2Camera.targetZoom <= 1.15 && nestedV2.current.parent) {
        prepareWorldV2(nestedV2.current.parent.parent);
    }
}

// Only one generator runs at a time: the existing seeded random stream stays intact.
function updateChildPreloadV2() {
    const job = nestedV2.preload;
    if (job) {
        const active = captureWorldV2();
        const deadline = performance.now() + 4;
        try {
            // Even a partial/failed allocation must not borrow active resources.
            activateWorldV2(job.world);
            noiseSeed(job.node.seed);
            do {
                const result = job.steps.next();
                job.world = captureWorldV2(job.node.seed);
                if (result.done) {
                    if (job.phase === 'painting') {
                        job.phase = 'flowMap';
                        job.steps = rebuildBrushFlowMapSteps();
                    } else {
                        job.node.world = job.world;
                        job.world.flowTime = job.node.flowTime || 0;
                        job.world.time = job.node.time || 0;
                        job.node.used = ++nestedV2.clock;
                        nestedV2.preload = null;
                        break;
                    }
                }
            } while (performance.now() < deadline);
        } catch (error) {
            job.world = captureWorldV2(job.node.seed);
            clearChildPreloadV2();
            nestedV2.pending = null;
            console.error('Universe generation failed', error);
        } finally {
            activateWorldV2(active);
            noiseSeed(active.seed);
        }
    }
    const pending = nestedV2.pending;
    if (pending && pending.edge.parent.world && pending.edge.child.world) {
        beginPortalV2(pending);
    }
    trimWorldCacheV2();
}

function findZoomStarV2(sx, sy) {
    const point = v2Camera.screenToWorld(sx, sy);
    let closest = null, distance = Infinity;
    for (const star of brushV2.stars) {
        if (star.type !== 'major' && star.type !== 'moon') continue;
        const d = Math.hypot(point.x - star.x, point.y - star.y);
        if (d <= star.enterRadius && d < distance) { closest = star; distance = d; }
    }
    return closest;
}

function requestPortalV2(edge, direction, delta) {
    const node = currentWorldNodeV2();
    node.world = captureWorldV2();
    const nav = { edge, direction, originCamera: cameraSnapshotV2(), distance: 0 };
    if (direction === 'in') edge.camera = cameraSnapshotV2();
    nestedV2.pending = nav;
    prepareWorldV2(direction === 'in' ? edge.child : edge.parent);
    handleStarEntryWheelV2(delta);
    if (nestedV2.pending && edge.parent.world && edge.child.world) beginPortalV2(nav);
}

function tryEnterStarV2(sx, sy, delta = -100) {
    if (v2Camera.targetZoom < v2Camera.maxZoom - 0.001 || v2Camera.zoom < v2Camera.maxZoom - 0.01) return false;
    const star = findZoomStarV2(sx, sy);
    if (!star) return false;
    requestPortalV2(childEdgeV2(star), 'in', delta);
    return true;
}

function tryExitWorldV2(delta) {
    if (v2Camera.targetZoom > v2Camera.minZoom + 0.001 || v2Camera.zoom > v2Camera.minZoom + 0.01) return false;
    requestPortalV2(outerEdgeV2(), 'out', delta);
    return true;
}

function portalGeometryV2(edge) {
    const star = edge.parent.world.stars.find(star => star.id === edge.starId);
    if (!edge.camera) {
        const z = v2Camera.maxZoom;
        edge.camera = stillCameraV2(z,
            constrain(width / 2 - star.x * z, width * (1 - z), 0),
            constrain(height / 2 - star.y * z, height * (1 - z), 0));
    }
    const camera = edge.camera;
    const sx = camera.x + star.x * camera.zoom, sy = camera.y + star.y * camera.zoom;
    const cover = Math.max(Math.hypot(sx, sy), Math.hypot(width - sx, sy),
        Math.hypot(sx, height - sy), Math.hypot(width - sx, height - sy));
    const finalZoom = Math.max(camera.zoom * 1.1, cover * 1.1 / star.radius);
    return { star, camera, finalZoom, range: Math.log(finalZoom / camera.zoom) };
}

function beginPortalV2(nav) {
    const geometry = portalGeometryV2(nav.edge);
    const start = nav.direction === 'in' ? 0 : 1;
    nestedV2.transition = { ...nav, ...geometry, progress: start,
        targetProgress: constrain(start + nav.distance / geometry.range, 0, 1),
        parent: nav.edge.parent.world, child: nav.edge.child.world };
    nestedV2.pending = null;
    activateWorldV2(nav.edge.parent.world);
    brushCursor.active = 0;
    brushCursor.wasInside = false;
}

function handleStarEntryWheelV2(delta) {
    const tr = nestedV2.transition;
    const pending = nestedV2.pending;
    if (!tr && !pending) return false;
    const movement = -delta * v2Camera.sensitivity;
    if (tr) tr.targetProgress = constrain(tr.targetProgress + movement / tr.range, 0, 1);
    else {
        pending.distance += movement;
        // Reversing through the starting boundary cancels a request even while loading.
        if ((pending.direction === 'in' && pending.distance <= 0) ||
            (pending.direction === 'out' && pending.distance >= 0)) nestedV2.pending = null;
    }
    return true;
}

function finishPortalV2(toChild) {
    const tr = nestedV2.transition;
    tr.edge.parent.world = captureWorldV2(tr.edge.parent.seed);
    const node = toChild ? tr.edge.child : tr.edge.parent;
    const cancelled = toChild === (tr.direction === 'out');
    activateWorldV2(node.world);
    noiseSeed(node.seed);
    Object.assign(v2Camera, cancelled ? tr.originCamera : toChild ? stillCameraV2() : tr.camera);
    nestedV2.current = node;
    node.used = ++nestedV2.clock;
    nestedV2.transition = null;
    brushCursor.active = 0;
    brushCursor.wasInside = false;
    trimWorldCacheV2();
}

function updateStarEntryV2(dt) {
    const tr = nestedV2.transition;
    if (!tr) return;
    const smoothing = 1 - Math.exp(-Math.min(dt || 16.67, 50) / v2Camera.smoothTime);
    tr.progress = lerp(tr.progress, tr.targetProgress, smoothing);
    if (tr.targetProgress === 0 && tr.progress < 0.002) finishPortalV2(false);
    else if (tr.targetProgress === 1 && tr.progress > 0.998) finishPortalV2(true);
}

function smoothPortalV2(t) {
    t = constrain(t, 0, 1);
    return t * t * (3 - 2 * t);
}

function getStarEntryCameraV2() {
    const tr = nestedV2.transition;
    if (!tr) return v2Camera;
    const zoom = tr.camera.zoom * Math.pow(tr.finalZoom / tr.camera.zoom, tr.progress);
    return {
        zoom,
        x: tr.camera.x + tr.star.x * (tr.camera.zoom - zoom),
        y: tr.camera.y + tr.star.y * (tr.camera.zoom - zoom),
        screenToWorld(sx, sy) { return { x: (sx - this.x) / this.zoom, y: (sy - this.y) / this.zoom }; }
    };
}

function drawStarEntryV2(parentTexture, portalCamera) {
    const tr = nestedV2.transition;
    if (!tr) return;
    push();
    translate(portalCamera.x, portalCamera.y);
    scale(portalCamera.zoom);
    image(parentTexture, 0, 0, width, height);
    pop();
    const reveal = smoothPortalV2((tr.progress - 0.62) / 0.34);
    if (reveal > 0) {
        push();
        tint(255, reveal * 255);
        image(tr.child.base, 0, 0, width, height);
        noTint();
        pop();
    }
}

function resetNestedV2() {
    currentWorldNodeV2();
    clearChildPreloadV2();
    for (const node of nestedV2.nodes) disposeWorldV2(node.world);
    nestedV2.nodes.clear();
    nestedV2.current = nestedV2.transition = nestedV2.pending = null;
    // initBrushV2 must not remove an already disposed active canvas a second time.
    brushV2.base = brushV2.motion = brushFlowMap = null;
    brushCursor.active = 0;
    brushCursor.wasInside = false;
}

function resetNestedCameraV2() {
    if (nestedV2.transition) finishPortalV2(nestedV2.transition.direction === 'out');
    nestedV2.pending = null;
    v2Camera.reset();
}
