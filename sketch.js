const BRUSH_V2_PREVIEW = true;
const SPACE_BG = [3, 6, 20];
// STAR transition
let enteringStar = null;
let starEnterStart = 0;

// FADE transition
let fadeStart = 0;

// Animation durations (milliseconds)
const STAR_ENTER_DURATION = 2400;
const FADE_DURATION = 1400;

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
let v2Camera = null;

function setup() {
  const canvas = createCanvas(800, 600);

  if (BRUSH_V2_PREVIEW) {
    canvas.mouseOver(() => {
      brushCursor.inside = true;
    });

    canvas.mouseOut(() => {
      brushCursor.inside = false;
    });
  }
  pixelDensity(1);
  textFont("Arial");

  inputMechanic = new InputMechanic();

  if (BRUSH_V2_PREVIEW) {
    initBrushV2(universeSeed);
    initBrushFlowShader();

    v2Camera = new ZoomCameraV2();
  } else {
    generateUniverse(universeSeed);
    initDebugGUI();
  }
}

function draw() {

  if (BRUSH_V2_PREVIEW) {
    background(12, 28, 60);
    if (!nestedV2.transition) {
      maybePreloadChildV2();
    }

    updateChildPreloadV2();

    if (nestedV2.transition) {
      // Update entry (or reversal) first
      updateStarEntryV2(deltaTime);
    }

    if (nestedV2.transition) {
      const portalCamera = getStarEntryCameraV2();

      const painting = drawBrushFlowShader(
        false,
        portalCamera
      );

      if (painting) {
        drawStarEntryV2(painting, portalCamera);
      }
    } else {
      v2Camera.update(deltaTime);

      const painting = drawBrushFlowShader(
        false,
        v2Camera
      );

      if (painting) {
        v2Camera.draw(painting);
      }
    }

    return;
  }

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

  // Draw deep-space stars
  displaySpaceStarField(1);

  // Check mouse proximity to stars
  inputMechanic.handlePointer(
    mouseX,
    mouseY,
    spaceStars
  );

  push();
  noFill();

  // Hover highlight
  const hovered = inputMechanic.hoveredStar;

  if (hovered) {
    stroke(255, 225, 150);
    strokeWeight(1.5);

    circle(
      hovered.x,
      hovered.y,
      hovered.radius * 6
    );

    noStroke();
    fill(255);
    textSize(13);
    textAlign(LEFT, CENTER);
    text("Click to enter", hovered.x + 18, hovered.y);
  }

  // Selected star highlight
  const selected = inputMechanic.selectedStar;

  if (selected) {
    noFill();
    stroke(255, 200, 100);
    strokeWeight(2);

    circle(
      selected.x,
      selected.y,
      selected.radius * 8
    );
  }

  pop();

  drawSceneLabel("SPACE - Select a Star");

  // Check if the user clicked a star
  const request = inputMechanic.consumeEnterRequest();

  if (request) {
    beginStarTransition(request);
  }
}




function drawStar() {
  if (!enteringStar) {
    changeState(STATES.SPACE);
    return;
  }

  // Animation progress: 0 -> 1
  const elapsed = millis() - starEnterStart;

  const progress = constrain(
    elapsed / STAR_ENTER_DURATION,
    0,
    1
  );

  // Smooth start and finish
  const eased =
    progress * progress * (3 - 2 * progress);

  background(...SPACE_BG);

  // Zoom until the star covers the whole canvas
  const targetZoom =
    (Math.hypot(width, height) /
      (enteringStar.radius * 2)) * 1.15;

  // Exponential zoom feels more natural
  const zoom = pow(targetZoom, eased);

  // Move the selected star smoothly to screen centre
  const cameraX =
    enteringStar.x -
    (enteringStar.x - width / 2) *
    (1 - eased) / zoom;

  const cameraY =
    enteringStar.y -
    (enteringStar.y - height / 2) *
    (1 - eased) / zoom;

  push();

  translate(width / 2, height / 2);
  scale(zoom);
  translate(-cameraX, -cameraY);

  // Render the same space field as before
  displaySpaceStarField(1);

  pop();

  // As the star fills the screen, add warm light
  if (progress > 0.75) {
    const lightProgress = constrain(
      (progress - 0.75) / 0.25,
      0,
      1
    );

    noStroke();
    fill(255, 235, 185, lightProgress * 255);
    rect(0, 0, width, height);
  }

  // Finish STAR transition
  if (progress >= 1) {
    beginFadeTransition();
  }
}



function drawFade() {
  const elapsed = millis() - fadeStart;

  const progress = constrain(
    elapsed / FADE_DURATION,
    0,
    1
  );

  const eased =
    progress * progress * (3 - 2 * progress);

  // Draw the newly generated universe underneath
  background(...worldPalette.sky);

  const dt = min(deltaTime / 16.67, 2);

  updateBrushStrokes(dt, debugParams.brushSpeed);

  displayBrushStrokes();
  displayStarHalos();
  displayStarField();

  // Fade the warm light away
  noStroke();

  fill(
    255,
    235,
    185,
    (1 - eased) * 255
  );

  rect(0, 0, width, height);

  // Reveal the new Starry Night
  if (progress >= 1) {
    changeState(STATES.NIGHT);
  }
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
  if (BRUSH_V2_PREVIEW) {
    const testSeeds = {
      q: 12,
      w: 89,
      e: 205
    };

    if (key === "f" || key === "F") {
      brushFlowSettings.enabled =
        !brushFlowSettings.enabled;
    }

    if (key === " ") {
      brushFlowSettings.paused =
        !brushFlowSettings.paused;
    }

    if (key === "[") {
      brushFlowSettings.strength = Math.max(
        0,
        brushFlowSettings.strength - 2
      );
    }

    if (key === "]") {
      brushFlowSettings.strength = Math.min(
        30,
        brushFlowSettings.strength + 2
      );
    }

    console.log("Flow settings:", brushFlowSettings);

    const seed = testSeeds[key.toLowerCase()];

    if (seed !== undefined) {
      resetNestedV2();

      universeSeed = seed;
      initBrushV2(seed);
      rebuildBrushFlowMap();
      brushFlowTime = 0;

      v2Camera.reset();
    }

    if (key === "c" || key === "C") {
      brushFlowSettings.cursorEnabled =
        !brushFlowSettings.cursorEnabled;

      console.log(
        "Cursor disturbance:",
        brushFlowSettings.cursorEnabled
          ? "ON"
          : "OFF"
      );
    }
    if (key === "r" || key === "R") {
      resetNestedCameraV2();
    }

    return;
  }

  if (key === "1") changeState(STATES.NIGHT);
  if (key === "2") changeState(STATES.SPACE);
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

  inputMechanic.reset();
  enteringStar = null;

  changeState(STATES.NIGHT);
}


function mouseWheel(event) {

  if (BRUSH_V2_PREVIEW) {
    if (
      !v2Camera ||
      mouseX < 0 || mouseX > width ||
      mouseY < 0 || mouseY > height
    ) {
      return false;
    }

    // Reverse or continue an active transition
    if (handleStarEntryWheelV2(event.delta)) {
      return false;
    }

    // Zooming in beyond the normal limit on a star
    if (
      event.delta < 0 &&
      tryEnterStarV2(mouseX, mouseY, event.delta)
    ) {
      return false;
    }

    if (event.delta > 0 && tryExitWorldV2(event.delta)) return false;

    // Otherwise keep normal cursor-centred zoom
    v2Camera.zoomAt(event.delta, mouseX, mouseY);

    return false;
  }

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

function mousePressed(event) {
  if (currentState !== STATES.SPACE) return;

  // Ignore clicks on debug GUI
  if (
    event.target &&
    event.target.closest &&
    event.target.closest("#debug-gui")
  ) {
    return;
  }

  // Check canvas boundaries
  if (
    mouseX < 0 || mouseX > width ||
    mouseY < 0 || mouseY > height
  ) {
    return;
  }

  inputMechanic.handlePointer(
    mouseX,
    mouseY,
    spaceStars
  );

  inputMechanic.requestEnter();
}


function beginStarTransition(star) {
  if (currentState !== STATES.SPACE || !star) {
    return;
  }

  // Save selected star information
  enteringStar = { ...star };

  // Record animation start time
  starEnterStart = millis();

  // Enter STAR state
  changeState(STATES.STAR);

  console.log("Entering star:", enteringStar);
}



function beginFadeTransition() {
  // Prevent an invalid transition
  if (currentState !== STATES.STAR) return;

  // Generate a new universe exactly once
  startNewUniverse();

  // Clear the previous star target
  enteringStar = null;

  // Start the light-to-night transition
  fadeStart = millis();

  changeState(STATES.FADE);

  console.log("Fading into new universe:", universeSeed);
}
