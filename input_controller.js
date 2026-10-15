// Active input routing; event priority is unchanged.
function handlePaintingKeyV2(event) {
  if (event?.target?.closest('input, textarea, select, [contenteditable="true"]')) return;
  if (key === 'h' || key === 'H') { paintingPresentationV2.toggle(); return; }
  if (key === ' ' && event?.target?.closest('button')) return;
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

}

function handlePaintingWheelV2(event) {
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
