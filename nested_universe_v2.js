const nestedV2 = {
    transition: null,
    parentStack: [],
    preload: null
};

// Capture all data needed to revisit a painted universe
function captureWorldV2(seed = universeSeed) {
    return {
        seed,
        base: brushV2.base,
        motion: brushV2.motion,
        marks: brushV2.marks,
        stars: brushV2.stars,
        village: brushV2.village,
        cypress: brushV2.cypress,
        time: brushV2.time,
        flowMap: brushFlowMap
    };
}

function activateWorldV2(world) {
    universeSeed = world.seed;

    brushV2.base = world.base;
    brushV2.motion = world.motion;
    brushV2.marks = world.marks;
    brushV2.stars = world.stars;
    brushV2.village = world.village;
    brushV2.cypress = world.cypress;
    brushV2.time = world.time;

    brushFlowMap = world.flowMap;
}

// Deterministic child seed from parent + star ID
function childSeedV2(parentSeed, starId) {
    let hash = (parentSeed ^ 2166136261) >>> 0;

    for (let i = 0; i < starId.length; i++) {
        hash = Math.imul(
            hash ^ starId.charCodeAt(i),
            16777619
        ) >>> 0;
    }

    return 100000 + (hash % 900000);
}


function clearChildPreloadV2() {
    const job = nestedV2.preload;
    if (!job) return;

    if (job.world) {
        disposeWorldV2(job.world);
    }

    nestedV2.preload = null;
}

function startChildPreloadV2(star) {
    if (!star || nestedV2.transition) return;

    const key = `${universeSeed}:${star.id}`;

    if (nestedV2.preload?.key === key) {
        return;
    }

    clearChildPreloadV2();

    const seed = childSeedV2(universeSeed, star.id);

    nestedV2.preload = {
        key,
        seed,
        phase: "painting",
        steps: buildBrushV2Steps(seed, true),
        world: null,
        ready: false,
        startedAt: performance.now()
    };
}

// Start preparing a child before reaching maximum zoom
function maybePreloadChildV2() {
    if (nestedV2.transition) return;
    if (nestedV2.parentStack.length > 0) return;
    if (!brushCursor.inside) return;

    if (v2Camera.targetZoom < 1.6) return;

    const star = findZoomStarV2(mouseX, mouseY);

    if (star) {
        startChildPreloadV2(star);
    }
}

// Execute a limited amount of generation per frame
function updateChildPreloadV2() {
    const job = nestedV2.preload;

    if (!job || job.ready) return;

    const activeWorld = captureWorldV2();

    // Budget: approximately 4ms per frame
    const deadline = performance.now() + 4;

    try {
        if (job.world) {
            activateWorldV2(job.world);
        }

        do {
            const result = job.steps.next();

            job.world = captureWorldV2(job.seed);

            if (result.done) {
                if (job.phase === "painting") {
                    job.phase = "flowMap";
                    job.steps = rebuildBrushFlowMapSteps();
                } else {
                    job.ready = true;

                    console.log(
                        "Child preloaded:",
                        job.seed,
                        "Elapsed:",
                        (performance.now() - job.startedAt).toFixed(1),
                        "ms"
                    );

                    break;
                }
            }
        } while (performance.now() < deadline);
    } finally {
        // Restore the active universe after every batch
        activateWorldV2(activeWorld);
    }
}


// Generate another universe while keeping the parent
function generateChildWorldV2(seed) {
    const parent = captureWorldV2();

    initBrushV2(seed, true);
    rebuildBrushFlowMap();

    const child = captureWorldV2(seed);

    activateWorldV2(parent);

    return child;
}

function disposeWorldV2(world) {
    if (!world) return;
    if (world.base) world.base.remove();
    if (world.motion) world.motion.remove();
}

// Find an enterable star beneath the cursor
function findZoomStarV2(sx, sy) {
    const point = v2Camera.screenToWorld(sx, sy);

    let closest = null;
    let closestDistance = Infinity;

    for (const star of brushV2.stars) {
        if (star.type !== "major" && star.type !== "moon") {
            continue;
        }

        const d = Math.hypot(
            point.x - star.x,
            point.y - star.y
        );

        if (d <= star.enterRadius && d < closestDistance) {
            closest = star;
            closestDistance = d;
        }
    }

    return closest;
}

// Trigger only after further zooming on a star
function tryEnterStarV2(sx, sy, delta = -100) {
    if (nestedV2.transition) return false;

    // Step 6B: first child depth only
    if (nestedV2.parentStack.length > 0) return false;

    if (
        v2Camera.targetZoom < v2Camera.maxZoom - 0.001 ||
        v2Camera.zoom < v2Camera.maxZoom - 0.25
    ) {
        return false;
    }

    const star = findZoomStarV2(sx, sy);
    if (!star) return false;

    const parent = captureWorldV2();
    const seed = childSeedV2(parent.seed, star.id);
    const key = `${parent.seed}:${star.id}`;

    const job = nestedV2.preload;

    if (!job || job.key !== key || !job.ready) {
        // Start or continue preparing the selected star
        startChildPreloadV2(star);

        // Consume this wheel event without blocking
        return true;
    }

    const child = job.world;

    // Transfer ownership to the transition
    nestedV2.preload = null;


    const startZoom = v2Camera.zoom;

    // Current on-screen position of the star
    const starScreenX =
        v2Camera.x + star.x * startZoom;

    const starScreenY =
        v2Camera.y + star.y * startZoom;

    // Determine how far we must zoom for the star
    // to cover the entire visible screen
    const coverRadius = Math.max(
        Math.hypot(starScreenX, starScreenY),
        Math.hypot(width - starScreenX, starScreenY),
        Math.hypot(starScreenX, height - starScreenY),
        Math.hypot(width - starScreenX, height - starScreenY)
    );

    const finalZoom = Math.max(
        startZoom * 1.1,
        coverRadius * 1.1 / star.radius
    );

    nestedV2.transition = {
        parent,
        child,
        star,

        progress: 0,
        targetProgress: 0,
        finalZoom,

        camera: {
            zoom: startZoom,
            x: v2Camera.x,
            y: v2Camera.y
        }
    };

    // Apply the initial wheel movement immediately
    handleStarEntryWheelV2(delta);


    console.log("Entering:", star.id, "Child seed:", seed);

    return true;
}

// Wheel can reverse an unfinished entry

function handleStarEntryWheelV2(delta) {
    const tr = nestedV2.transition;
    if (!tr) return false;

    // Map wheel movement to logarithmic zoom distance
    const zoomRange = Math.max(
        0.01,
        Math.log(tr.finalZoom / tr.camera.zoom)
    );

    const zoomDelta =
        -delta * v2Camera.sensitivity;

    tr.targetProgress = constrain(
        tr.targetProgress + zoomDelta / zoomRange,
        0,
        1
    );

    return true;
}


// Update transition progress

function updateStarEntryV2(dt) {
    const tr = nestedV2.transition;
    if (!tr) return;

    // Use the same smoothing feeling as the normal camera
    const safeDt = Math.min(dt || 16.67, 50);

    const smoothing =
        1 - Math.exp(-safeDt / v2Camera.smoothTime);

    tr.progress = lerp(
        tr.progress,
        tr.targetProgress,
        smoothing
    );

    // User zoomed all the way back out:
    // cancel the entry without switching universes
    if (
        tr.targetProgress <= 0 &&
        tr.progress < 0.002
    ) {
        v2Camera.zoom = tr.camera.zoom;
        v2Camera.targetZoom = tr.camera.zoom;

        v2Camera.x = tr.camera.x;
        v2Camera.y = tr.camera.y;

        v2Camera.targetX = tr.camera.x;
        v2Camera.targetY = tr.camera.y;

        disposeWorldV2(tr.child);
        nestedV2.transition = null;
        return;
    }

    // Only commit when the user has actually
    // zoomed all the way into the child universe
    if (
        tr.targetProgress >= 1 &&
        tr.progress > 0.998
    ) {
        nestedV2.parentStack.push({
            world: tr.parent,
            starId: tr.star.id,
            camera: tr.camera
        });

        activateWorldV2(tr.child);
        v2Camera.reset();

        brushCursor.active = 0;
        brushCursor.wasInside = false;

        brushFlowTime = 0;
        nestedV2.transition = null;

        console.log(
            "Entered Child Universe:",
            universeSeed
        );
    }
}


function smoothPortalV2(t) {
    t = constrain(t, 0, 1);
    return t * t * (3 - 2 * t);
}

// Virtual camera following the star during entry

function getStarEntryCameraV2() {
    const tr = nestedV2.transition;
    if (!tr) return v2Camera;

    const t = tr.progress;
    const startZoom = tr.camera.zoom;

    // Logarithmic zoom interpolation
    const zoom = startZoom * Math.pow(
        tr.finalZoom / startZoom,
        t
    );

    // Keep the star anchored to its original
    // screen position, instead of forcing it
    // to the centre of the canvas
    const anchorX =
        tr.camera.x + tr.star.x * startZoom;

    const anchorY =
        tr.camera.y + tr.star.y * startZoom;

    return {
        zoom,

        x: anchorX - tr.star.x * zoom,
        y: anchorY - tr.star.y * zoom,

        screenToWorld(sx, sy) {
            return {
                x: (sx - this.x) / this.zoom,
                y: (sy - this.y) / this.zoom
            };
        }
    };
}


// Composite the zooming parent and emerging child
function drawStarEntryV2(parentTexture, portalCamera) {
    const tr = nestedV2.transition;
    if (!tr) return;

    push();
    translate(portalCamera.x, portalCamera.y);
    scale(portalCamera.zoom);
    image(parentTexture, 0, 0, width, height);
    pop();

    // Gradually reveal the child as the star fills the view
    const reveal = smoothPortalV2(
        (tr.progress - 0.62) / 0.34
    );

    if (reveal > 0) {
        push();
        tint(255, reveal * 255);
        image(tr.child.base, 0, 0, width, height);
        noTint();
        pop();
    }
}

// Used when explicitly loading a different test seed
function resetNestedV2() {
    clearChildPreloadV2();
    if (nestedV2.transition) {
        disposeWorldV2(nestedV2.transition.child);
        nestedV2.transition = null;
    }

    for (const entry of nestedV2.parentStack) {
        disposeWorldV2(entry.world);
    }

    nestedV2.parentStack = [];
}
