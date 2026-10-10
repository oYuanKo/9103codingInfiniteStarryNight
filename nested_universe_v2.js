
const nestedV2 = {
    transition: null,
    parentStack: []
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
function tryEnterStarV2(sx, sy) {
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
    const child = generateChildWorldV2(seed);

    nestedV2.transition = {
        parent,
        child,
        star,
        progress: 0,
        direction: 1,

        camera: {
            zoom: v2Camera.zoom,
            x: v2Camera.x,
            y: v2Camera.y
        }
    };

    console.log("Entering:", star.id, "Child seed:", seed);

    return true;
}

// Wheel can reverse an unfinished entry
function handleStarEntryWheelV2(delta) {
    if (!nestedV2.transition) return false;

    if (delta < 0) {
        nestedV2.transition.direction = 1;
    } else if (delta > 0) {
        nestedV2.transition.direction = -1;
    }

    return true;
}

// Update transition progress
function updateStarEntryV2(dt) {
    const tr = nestedV2.transition;
    if (!tr) return;

    tr.progress = constrain(
        tr.progress +
        tr.direction * Math.min(dt || 16.67, 50) / 1450,
        0,
        1
    );

    if (tr.progress <= 0 && tr.direction < 0) {
        disposeWorldV2(tr.child);
        nestedV2.transition = null;
        return;
    }

    if (tr.progress >= 1) {
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

        console.log("Entered Child Universe:", universeSeed);
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

    const t = smoothPortalV2(tr.progress);

    const startZoom = tr.camera.zoom;

    const finalZoom = Math.max(
        startZoom,
        Math.max(width, height) /
        (tr.star.radius * 2) * 2.0
    );

    const zoom = startZoom *
        Math.pow(finalZoom / startZoom, t);

    const startFocusX =
        tr.camera.x + tr.star.x * startZoom;

    const startFocusY =
        tr.camera.y + tr.star.y * startZoom;

    const focusX = lerp(startFocusX, width / 2, t);
    const focusY = lerp(startFocusY, height / 2, t);

    return {
        zoom,
        x: focusX - tr.star.x * zoom,
        y: focusY - tr.star.y * zoom,

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
    if (nestedV2.transition) {
        disposeWorldV2(nestedV2.transition.child);
        nestedV2.transition = null;
    }

    for (const entry of nestedV2.parentStack) {
        disposeWorldV2(entry.world);
    }

    nestedV2.parentStack = [];
}
