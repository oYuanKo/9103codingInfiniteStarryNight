
const STATES = {
  NIGHT: "NIGHT",
  SPACE: "SPACE",
  STAR: "STAR",
  FADE: "FADE"
};

let currentState = STATES.NIGHT;
let universeSeed = 12;
let universeCount = 1;

function setup() {
  createCanvas(800, 600);
  textFont("Arial");

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
  background(...worldPalette.sky);

  const dt = min(deltaTime / 16.67, 2);

  // Update Perlin + Vortex movement
  updateBrushStrokes(dt, debugParams.brushSpeed);

  // Moving painterly brushstrokes
  displayBrushStrokes();

  // Circular brushstrokes around stars
  displayStarHalos();

  // Star glow and core
  displayStarField();

  // Debug label
  drawSceneLabel("NIGHT - Starry Night");
}


function drawSpace() {
  background(3, 6, 20);
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

  // Placeholder seed selection.
  // Later we will use this to generate stars and flow.
  universeSeed = floor(random(1, 1000000));

  generateUniverse(universeSeed);
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

