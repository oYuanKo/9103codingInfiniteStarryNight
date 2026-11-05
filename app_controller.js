// Single application lifecycle; world/rendering algorithms stay in their modules.
let universeSeed = 12;
let v2Camera = null;
function setupPaintingAppV2() {
    const canvas = createCanvas(800, 600);
    canvas.mouseOver(() => { brushCursor.inside = true; });
    canvas.mouseOut(() => { brushCursor.inside = false; });
    pixelDensity(1);
    textFont('Arial');
    initBrushV2(universeSeed, false, false);
    initBrushFlowShader();
    v2Camera = new ZoomCameraV2();
    paintingPresentationV2.init(canvas);
}
function drawPaintingAppV2() {
    background(12, 28, 60);
    if (!nestedV2.transition) maybePreloadChildV2();
    updateChildPreloadV2();
    if (nestedV2.transition) updateStarEntryV2(deltaTime);
    // Time reads the committed world after navigation, before drawing this frame.
    if (typeof updateTimeMechanic === 'function') updateTimeMechanic(deltaTime, StarryNight.getState());
    if (nestedV2.transition) {
        drawStarEntryV2();
    } else {
        v2Camera.update(deltaTime);
        const painting = drawBrushFlowShader(false, v2Camera);
        if (painting) image(painting, 0, 0, width, height);
    }
    drawStarHoverLightV2(deltaTime);
    publishGroupFrameV2(deltaTime);
}

// Explicit seed argument supports repeatable tests without public seed hotkeys.
function restartPaintingV2(seed = 12) {
    if (!Number.isSafeInteger(seed) || seed < 0) throw new TypeError('Expected a non-negative integer seed');
    resetNestedV2();
    universeSeed = seed;
    initBrushV2(seed, false, false);
    rebuildBrushFlowMap();
    brushFlowTime = 0;
    v2Camera.reset();
    starHoverLightV2.worlds.clear();
    Object.assign(brushCursor, {wasInside: false, x: -1000, y: -1000, vx: 0, vy: 0, speed: 0, active: 0});
    Object.assign(brushFlowSettings, {speed: 1.2, strength: 5, enabled: true, paused: false,
        cursorEnabled: true, timeBlend: 0, restartOffset: 0});
    resetTimeEffectV2();
    currentWorldNodeV2();
    paintingPresentationV2.syncTimeButton();
    publishGroupResetV2();
}
