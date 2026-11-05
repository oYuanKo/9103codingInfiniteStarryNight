// The unit for deltaTime is milliseconds; it is provided per frame by the existing draw() function, so there is no need to set up a separate timer.
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

// When returning to the page, do not include the time spent in the background in the total duration.
document.addEventListener('visibilitychange', function () {
    timeSkipNextFrame = true;
});

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
        // Upon initial entry, successfully switching worlds, or changing seeds via Q/W/E: always start from "Calm."
        timeWorldId = state.universe.id;
        timeMechanic.reset();
    } else {
        advanceTimeIfPlaying(elapsedMilliseconds, state);
    }
    updateTimeDisplay(elapsedMilliseconds, state);
    timeSkipNextFrame = false;

    // Time: Takes speed, blending amount, and initial displacement as inputs; direction, color, and brush strokes remain derived from the original artwork.
    // Strength: Continues to be controlled by the original [/] key.
    brushFlowSettings.speed = timeMechanic.paintSpeed;
    brushFlowSettings.timeBlend = timeMechanic.paintBlend;
    brushFlowSettings.restartOffset = timeMechanic.paintRestartOffset;
}

function advanceTimeIfPlaying(elapsedMilliseconds, state) {
    // Each line checks for a specific pause condition; the timer only starts once all conditions are met.
    if (state.flow.paused) return; // Space was pressed.
    if (!state.flow.enabled) return; // Flow was disabled by pressing F.
    if (state.portal) return; // Moving between two worlds.
    if (state.loading) return; // Waiting for world generation.
    if (document.hidden) return; // The page has entered the background.
    if (timeSkipNextFrame) return; // Just returned from the background.
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
    // Engineering integration: Reuse the flowMap from the team member’s implementation; the method for retrieving the flow direction is the same as that used for the existing hover-effect logic. 
    // Reads the horizontal and vertical direction components, as well as the flow intensity, stored within the pixel data.
    let map = world.flowMap;
    let column = Math.floor(x / width * map.width);
    let row = Math.floor(y / height * map.height);
    // The coordinates must fall within the flow diagram; reading outside the diagram is not permitted.
    if (column < 0) column = 0;
    if (column >= map.width) column = map.width - 1;
    if (row < 0) row = 0;
    if (row >= map.height) row = map.height - 1;

    // Each pixel occupies 4 values. The first two values ​​are used to store the horizontal and vertical components.
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
