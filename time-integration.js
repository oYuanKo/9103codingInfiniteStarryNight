// Use deltaTime from draw() as the Time clock, in milliseconds.
let timeWorldId = null;
let timePreviousFlow = null;
let timeSkipNextFrame = false;
let timeCalmPreview = new TimeMechanic();
const timeOffAppearance = { starBrightness: 0.2, strokeGap: 36, visibleStars: 12, extraMarkOpacity: 0 };
let timeDisplay = { ...timeOffAppearance };
let timeDisplayTransition = null;

// AI acknowledgement (Yuan): Yuan's Time-button integration was generated and revised with OpenAI ChatGPT and its coding tools. It starts fresh cycles and transitions the layer appearance; 
// AI acknowledgement (Yuan): it does not claim authorship of the original time curve.
function setTimeEffectEnabled(enabled) {
    if (timeMechanic.enabled === enabled) return;
    timeDisplayTransition = { from: { ...timeDisplay }, elapsed: 0 };
    timeMechanic.enabled = enabled;
    timeWorldId = null;
    if (enabled) timeMechanic.reset();
}

// AI acknowledgement (Yuan): This appearance-transition integration was added with OpenAI ChatGPT and its coding tools for Yuan's Start/Stop Time controls, respecting pause, loading and visibility gates.
function updateTimeDisplay(elapsedMilliseconds, state) {
    const target = timeMechanic.enabled ? {
        starBrightness: timeMechanic.starBrightness,
        strokeGap: timeMechanic.strokeGap,
        visibleStars: timeMechanic.visibleStars,
        extraMarkOpacity: 1
    } : timeOffAppearance;
    if (!timeDisplayTransition) { timeDisplay = { ...target }; return; }
    // Blend appearance only; the existing 34-second curve remains unchanged.
    if (!state.flow.paused && state.flow.enabled && !state.portal && !state.loading &&
        !document.hidden && !timeSkipNextFrame && Number.isFinite(elapsedMilliseconds)) {
        timeDisplayTransition.elapsed += Math.max(0, elapsedMilliseconds);
    }
    const progress = Math.min(1, timeDisplayTransition.elapsed / 600);
    const weight = (1 - Math.cos(progress * Math.PI)) / 2;
    for (const key of Object.keys(timeOffAppearance)) {
        timeDisplay[key] = lerp(timeDisplayTransition.from[key], target[key], weight);
    }
    if (progress === 1) timeDisplayTransition = null;
}

// Skip the first frame back so time spent in the background is excluded.
document.addEventListener('visibilitychange', function () {
    timeSkipNextFrame = true;
});

// ChatGPT/Codex helped Yang Wu connect Time to the renderer and pause controls.
function updateTimeMechanic(elapsedMilliseconds, state) {
    if (!state.ready) return;
    if (!timeMechanic.enabled) {
        if (timePreviousFlow !== null) {
            brushFlowSettings.speed = timePreviousFlow.speed;
            brushFlowSettings.timeBlend = timePreviousFlow.timeBlend;
            brushFlowSettings.restartOffset = timePreviousFlow.restartOffset;
            timePreviousFlow = null;
        }
        timeWorldId = null;
        updateTimeDisplay(elapsedMilliseconds, state);
        timeSkipNextFrame = false;
        return;
    }

    if (timePreviousFlow === null) {
        timePreviousFlow = {
            speed: brushFlowSettings.speed,
            timeBlend: brushFlowSettings.timeBlend || 0,
            restartOffset: brushFlowSettings.restartOffset || 0
        };
    }

    if (timeWorldId !== state.universe.id) {
        // Start from Calm when Time is enabled or the world changes.
        timeWorldId = state.universe.id;
        timeMechanic.reset();
    } else {
        advanceTimeIfPlaying(elapsedMilliseconds, state);
    }
    updateTimeDisplay(elapsedMilliseconds, state);
    timeSkipNextFrame = false;

    // Pass speed, blending and restart movement to the existing brush renderer.
    // The [ and ] keys still control flow strength.
    brushFlowSettings.speed = timeMechanic.paintSpeed;
    brushFlowSettings.timeBlend = timeMechanic.paintBlend;
    brushFlowSettings.restartOffset = timeMechanic.paintRestartOffset;
}

function advanceTimeIfPlaying(elapsedMilliseconds, state) {
    // Advance the clock only when the current world is ready and playing.
    if (state.flow.paused) return; // Painting is paused.
    if (!state.flow.enabled) return; // Brush flow is disabled.
    if (state.portal) return; // The viewer is moving between worlds.
    if (state.loading) return; // The next world is still being generated.
    if (document.hidden) return; // The tab is in the background.
    if (timeSkipNextFrame) return; // The tab has just become visible.
    timeMechanic.update(elapsedMilliseconds);
}

// The shader now transports and exposes Time paint together with the base paint.
// AI acknowledgement (Yuan): Yuan's portal-layer integration was generated and revised with OpenAI ChatGPT and its coding tools. It selects each world's Time appearance before shader blending.
function getTimePaintLayers(parentWorld, portal) {
    if (!portal) {
        const parent = drawTimePaintLayer(0, parentWorld, timeDisplay);
        return { parent, child: parent };
    }
    const leavingChild = nestedV2.transition.direction === 'out';
    const destinationTime = timeMechanic.enabled
        ? { ...timeCalmPreview, extraMarkOpacity: 1 } : timeOffAppearance;
    const parentTime = leavingChild ? destinationTime : timeDisplay;
    const childTime = leavingChild ? timeDisplay : destinationTime;
    // Preserve the existing extra-mark exit/entry windows during navigation.
    // Original small stars follow the shader's structure transition, once only.
    return {
        parent: drawTimePaintLayer(0, parentWorld, parentTime,
            Math.max(0, 1 - portal.progress / 0.42)),
        child: drawTimePaintLayer(1, portal.child, childTime,
            Math.max(0, (portal.progress - 0.72) / 0.28))
    };
}

function getTimeFlow(world, x, y) {
    // Reuse the group's flow map, as the hover light does.
    // Each pixel stores horizontal and vertical direction and local flow strength.
    let map = world.flowMap;
    let column = Math.floor(x / width * map.width);
    let row = Math.floor(y / height * map.height);
    // Clamp the coordinates to the flow map.
    if (column < 0) column = 0;
    if (column >= map.width) column = map.width - 1;
    if (row < 0) row = 0;
    if (row >= map.height) row = map.height - 1;

    // Each pixel has four channels. The first two store the flow direction.
    let pixelNumber = row * map.width + column;
    let firstChannel = pixelNumber * 4;
    let directionX = map.pixels[firstChannel] / 127.5 - 1;
    let directionY = map.pixels[firstChannel + 1] / 127.5 - 1;
    const length = Math.hypot(directionX, directionY);
    if (length > 0.1) {
        directionX /= length;
        directionY /= length;
    } else {
        directionX = 0;
        directionY = 0;
    }
    return {
        x: directionX, y: directionY,
        strength: map.pixels[firstChannel + 2] / 255,
        angle: Math.atan2(directionY, directionX)
    };
}


function resetTimeEffectV2() {
    timeMechanic.enabled = false;
    timeMechanic.reset();
    timeWorldId = null;
    timePreviousFlow = null;
    timeSkipNextFrame = true;
    timeDisplay = { ...timeOffAppearance };
    timeDisplayTransition = null;
}
