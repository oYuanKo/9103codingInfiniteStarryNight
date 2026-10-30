// Single application lifecycle; world/rendering algorithms stay in their modules.
let universeSeed = 12;
let v2Camera = null;
function setupPaintingAppV2() {
    const canvas = createCanvas(800, 600);
    canvas.mouseOver(() => { brushCursor.inside = true; });
    canvas.mouseOut(() => { brushCursor.inside = false; });
    pixelDensity(1);
    textFont('Arial');
    initBrushV2(universeSeed);
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
    if (typeof drawTimeAtmosphere === 'function') drawTimeAtmosphere();
    drawStarHoverLightV2(deltaTime);
    publishGroupFrameV2(deltaTime);
}
