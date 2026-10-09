const SPACE_BG = [3, 6, 20];

// Zoom thresholds
const SPACE_REVEAL_START = 0.80;
const SPACE_REVEAL_END = 0.30;
const STATES = {
  NIGHT: "NIGHT",
  SPACE: "SPACE",
  STAR: "STAR",
  FADE: "FADE"
};

let currentState = STATES.NIGHT;
let universeSeed = 12;
let universeCount = 1;
let inputMechanic;

function setup() {
  createCanvas(800, 600);
  textFont("Arial");

  inputMechanic = new InputMechanic();

  generateUniverse(universeSeed);
  initDebugGUI();
}

function draw() {
  background(0);

  switch (currentState) {
    case STATES.NIGHT:
      drawNight();
      break;

    case STATES.SPACE:
      drawSpace();
      break;

    case STATES.STAR:
      drawStar();
      break;

    case STATES.FADE:
      drawFade();
      break;
  }

  drawDebugInfo();
}

// Placeholder scenes




function drawNight() {
  const dt = min(deltaTime / 16.67, 2);

  // Update zoom
  inputMechanic.update();

  // Calculate transition progress
  const transition = getSpaceTransitionProgress(
    inputMechanic.zoomLevel
  );

  // Blend background colours
  const nightColor = color(...worldPalette.sky);
  const spaceColor = color(...SPACE_BG);

  background(
    lerpColor(nightColor, spaceColor, transition)
  );

  // Keep Perlin strokes moving
  updateBrushStrokes(dt, debugParams.brushSpeed);

  // Draw NIGHT world with camera zoom
  if (transition < 1) {
    push();

    drawingContext.globalAlpha = 1 - transition;

    translate(width / 2, height / 2);
    scale(inputMechanic.zoomLevel);
    translate(-width / 2, -height / 2);

    displayBrushStrokes();
    displayStarHalos();
    displayStarField();

    pop();
  }

  // Fade in the SPACE starfield
  displaySpaceStarField(transition);

  // Debug display
  drawSceneLabel(
    transition < 1
      ? "NIGHT - Zooming Out"
      : "Entering SPACE"
  );

  // Switch state when zoom reaches minimum
  if (
    inputMechanic.zoomLevel <=
    inputMechanic.minZoom + 0.005 &&
    inputMechanic.targetZoom <=
    inputMechanic.minZoom + 0.001
  ) {
    changeState(STATES.SPACE);
  }
}


function drawSpace() {
  background(...SPACE_BG);

  // Full deep-space starfield
  displaySpaceStarField(1);

  drawSceneLabel("SPACE - Deep Space");
}


function drawStar() {
  background(10, 15, 35);

  noStroke();
  fill(255, 210, 100);
  circle(width / 2, height / 2, 200);

  drawSceneLabel("STAR - Approaching Star");
}

function drawFade() {
  background(245, 220, 155);
  drawSceneLabel("FADE - Entering New Universe");
}

// Helper functions

function drawSceneLabel(label) {
  fill(255);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(26);
  text(label, width / 2, 50);
}

function drawDebugInfo() {
  fill(255);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(15);

  text("State: " + currentState, 20, height - 90);
  text("Seed: " + universeSeed, 20, height - 65);
  text("Universe: " + universeCount, 20, height - 40);
}

// State machine

function changeState(nextState) {
  currentState = nextState;
}

function startNewUniverse() {
  universeCount++;

  universeSeed = floor(random(1, 1000000));

  generateUniverse(universeSeed);

  inputMechanic.reset();

  changeState(STATES.NIGHT);
}
// Temporary keyboard controls

function keyPressed() {
  if (key === "1") changeState(STATES.NIGHT);
  if (key === "2") changeState(STATES.SPACE);
  if (key === "3") changeState(STATES.STAR);
  if (key === "4") changeState(STATES.FADE);
  if (key === "q" || key === "Q") loadTestUniverse(12);
  if (key === "w" || key === "W") loadTestUniverse(89);
  if (key === "e" || key === "E") loadTestUniverse(205);

  if (key === "n" || key === "N") {
    startNewUniverse();
  }
}


function loadTestUniverse(seed) {
  universeSeed = seed;

  generateUniverse(universeSeed);
  changeState(STATES.NIGHT);
}


function mouseWheel(event) {
  // Ignore scroll on debug GUI
  if (
    event.target &&
    event.target.closest &&
    event.target.closest("#debug-gui")
  ) {
    return;
  }

  if (currentState === STATES.NIGHT) {
    inputMechanic.handleWheel(event.delta);
  }

  else if (currentState === STATES.SPACE) {
    // Scroll up to return to NIGHT
    if (event.delta < 0) {
      changeState(STATES.NIGHT);
      inputMechanic.handleWheel(event.delta);
    }
  }

  // Prevent normal page scrolling
  return false;
}



function getSpaceTransitionProgress(zoom) {
  let t = map(
    zoom,
    SPACE_REVEAL_START,
    SPACE_REVEAL_END,
    0,
    1
  );

  t = constrain(t, 0, 1);

  // Smoothstep: softer start and finish
  return t * t * (3 - 2 * t);
}
