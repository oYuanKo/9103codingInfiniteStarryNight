// AI acknowledgement (Yuan): Keyboard controls and reversible wheel navigation was generated and revised for Yuan with OpenAI ChatGPT and its coding tools.
function handlePaintingKeyV2(event) {
  if (event?.target?.closest('input, textarea, select, [contenteditable="true"]')) return;
  if (key === 'h' || key === 'H') { paintingPresentationV2.toggle(); return; }
  // Leave Space/Enter to native button activation; neither pauses globally.

  if (key === "f" || key === "F") {
    if (!event?.repeat) brushFlowSettings.paused = !brushFlowSettings.paused;
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
    if (!event?.repeat) restartPaintingV2();
  }

}

//AI acknowledgment: ChatGPT was used by Yuan to fix a bug: adjust guidance visibility bug due to different resolution
function handlePaintingWheelV2(event) {
  const canvas = document.querySelector('#artwork canvas');
  // Only the painted canvas owns wheel input; guide/page scrolling stays native.
  if (!canvas || event?.target !== canvas) return;
  const rect = canvas.getBoundingClientRect();
  const { clientX, clientY } = event;
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY) ||
      rect.width <= 0 || rect.height <= 0 ||
      clientX < rect.left || clientX >= rect.right ||
      clientY < rect.top || clientY >= rect.bottom) return;
  const x = (clientX - rect.left) * width / rect.width;
  const y = (clientY - rect.top) * height / rect.height;
  if (!v2Camera) return false;

  // Reverse or continue an active transition
  if (handleStarEntryWheelV2(event.delta)) {
    return false;
  }

  // Zooming in beyond the normal limit on a star
  if (
    event.delta < 0 &&
    tryEnterStarV2(x, y, event.delta)
  ) {
    return false;
  }

  if (event.delta > 0 && tryExitWorldV2(event.delta)) return false;

  // Otherwise keep normal cursor-centred zoom
  v2Camera.zoomAt(event.delta, x, y);

  return false;
}
