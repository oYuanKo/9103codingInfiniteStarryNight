// p5 owns these global callbacks; optional team modules subscribe via the bridge.
function setup() { setupPaintingAppV2(); }
function draw() { drawPaintingAppV2(); }
function keyPressed(event) { return handlePaintingKeyV2(event); }
function mouseWheel(event) { return handlePaintingWheelV2(event); }
