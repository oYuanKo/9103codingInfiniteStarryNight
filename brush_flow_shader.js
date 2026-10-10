const brushFlowSettings = {
    strength: 5,
    speed: 1.2,
    paused: false,
    enabled: true,

    // Cursor interaction
    cursorEnabled: true,
    cursorRadius: 78,
    cursorStrength: 5.5
};

let brushFlowBuffer = null;
let brushFlowProgram = null;
let brushFlowMap = null;
let brushFlowTime = 0;

const brushCursor = {
    inside: false,
    wasInside: false,
    x: -1000,
    y: -1000,
    vx: 0,
    vy: 0,
    speed: 0,
    active: 0
};

function updateBrushCursor() {
    const inside =
        brushCursor.inside &&
        mouseX >= 0 && mouseX <= width &&
        mouseY >= 0 && mouseY <= height;

    if (inside) {
        if (!brushCursor.wasInside) {
            brushCursor.x = mouseX;
            brushCursor.y = mouseY;
            brushCursor.vx = 0;
            brushCursor.vy = 0;
            brushCursor.speed = 0;
        }

        const oldX = brushCursor.x;
        const oldY = brushCursor.y;

        // Smooth cursor following
        brushCursor.x = lerp(brushCursor.x, mouseX, 0.28);
        brushCursor.y = lerp(brushCursor.y, mouseY, 0.28);

        const dx = brushCursor.x - oldX;
        const dy = brushCursor.y - oldY;

        brushCursor.vx = lerp(brushCursor.vx, dx, 0.25);
        brushCursor.vy = lerp(brushCursor.vy, dy, 0.25);

        brushCursor.speed = lerp(
            brushCursor.speed,
            constrain(Math.hypot(dx, dy) / 8, 0, 1),
            0.18
        );
    } else {
        brushCursor.vx = lerp(brushCursor.vx, 0, 0.14);
        brushCursor.vy = lerp(brushCursor.vy, 0, 0.14);
        brushCursor.speed = lerp(brushCursor.speed, 0, 0.14);
    }

    brushCursor.active = lerp(
        brushCursor.active,
        inside ? 1 : 0,
        0.12
    );

    brushCursor.wasInside = inside;
}


// Vertex shader: full-screen texture coordinates
const BRUSH_FLOW_VERT = `
precision mediump float;

attribute vec3 aPosition;
attribute vec2 aTexCoord;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

varying vec2 vTexCoord;

void main() {
  vTexCoord = aTexCoord;

  gl_Position =
    uProjectionMatrix *
    uModelViewMatrix *
    vec4(aPosition, 1.0);
}
`;

// Fragment shader: animated texture deformation
const BRUSH_FLOW_FRAG = `
precision mediump float;

varying vec2 vTexCoord;

uniform sampler2D u_paint;
uniform sampler2D u_flowMap;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_strength;
uniform float u_speed;

uniform vec2 u_cursor;
uniform float u_cursorRadius;
uniform float u_cursorStrength;
uniform float u_cursorActive;
uniform vec2 u_cursorVelocity;
uniform float u_cursorSpeed;


void main() {
  vec2 uv = vTexCoord;

  // Read the existing Perlin + Vortex direction
  vec2 encoded = texture2D(u_flowMap, uv).rg;
  vec2 direction = encoded * 2.0 - 1.0;

  float magnitude = length(direction);

  if (magnitude > 0.1) {
    direction /= magnitude;
  } else {
    direction = vec2(0.0);
  }

  // A travelling phase along the local direction
  vec2 pixelPosition = uv * u_resolution;

  float phase =
    dot(pixelPosition / 48.0, direction) * 2.0
    - u_time * u_speed;

  // Smooth displacement without separate long strokes
  float localStrength = texture2D(u_flowMap, uv).b;

  // Existing global flow
  float displacement =
    sin(phase) * u_strength * localStrength;

  // Distance from the cursor in canvas pixels
  vec2 cursorDelta = pixelPosition - u_cursor;
  float distanceSquared = dot(cursorDelta, cursorDelta);

  // Soft local falloff
  float cursorInfluence = exp(
    -0.5 * distanceSquared /
    (u_cursorRadius * u_cursorRadius)
  );

  // Use cursor movement direction instead of sinusoidal waves
  vec2 cursorVelocity = u_cursorVelocity;
  float velocityLength = length(cursorVelocity);

  vec2 cursorDir;
  if (velocityLength > 0.0001) {
    cursorDir = cursorVelocity / velocityLength;
  } else {
    cursorDir = direction;
  }

  // Radial vector from cursor to current pixel
  vec2 radial = vec2(0.0);
  if (distanceSquared > 0.0001) {
    radial = cursorDelta / sqrt(distanceSquared);
  }

  // Slight swirl around the cursor, but no ripple
  vec2 swirl = vec2(-radial.y, radial.x);

  // Stronger when moving, still slightly alive when stationary
  float cursorAmount =
    u_cursorStrength *
    cursorInfluence *
    u_cursorActive *
    localStrength *
    (0.25 + 0.75 * u_cursorSpeed);

  // Blend local flow, cursor direction and a tiny swirl
  vec2 combinedDir =
    direction * 0.72 +
    cursorDir * 0.22 +
    swirl * 0.10;

  float combinedLen = length(combinedDir);
  if (combinedLen > 0.0001) {
    combinedDir /= combinedLen;
  } else {
    combinedDir = direction;
  }

  vec2 cursorOffset = combinedDir * cursorAmount;



  // Combine global flow and local cursor influence
  vec2 displacedUV = uv -
    (direction * displacement + cursorOffset)
    / u_resolution;

  displacedUV = clamp(
    displacedUV,
    vec2(0.001),
    vec2(0.999)
  );

  // Sample the original painted texture
  gl_FragColor = texture2D(u_paint, displacedUV);
}
`;

// Create an offscreen GPU renderer
function initBrushFlowShader() {
    if (brushFlowBuffer) {
        brushFlowBuffer.remove();
    }

    brushFlowBuffer = createGraphics(
        width,
        height,
        WEBGL
    );

    brushFlowBuffer.pixelDensity(1);
    brushFlowBuffer.noStroke();

    brushFlowProgram = brushFlowBuffer.createShader(
        BRUSH_FLOW_VERT,
        BRUSH_FLOW_FRAG
    );

    brushFlowTime = 0;

    rebuildBrushFlowMap();
}

// Create a small texture encoding our EXISTING
// Perlin + Vortex directions
function rebuildBrushFlowMap() {
    const gridSize = 6;
    const cols = Math.ceil(width / gridSize);
    const rows = Math.ceil(height / gridSize);

    brushFlowMap = createImage(cols, rows);
    brushFlowMap.loadPixels();

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const px = (x + 0.5) / cols * width;
            const py = (y + 0.5) / rows * height;

            const angle = brushV2Angle(px, py, 0);

            const vx = Math.cos(angle);
            const vy = Math.sin(angle);

            const index = 4 * (y * cols + x);

            // Encode direction from [-1,1] to [0,255]
            brushFlowMap.pixels[index] =
                Math.round((vx * 0.5 + 0.5) * 255);

            brushFlowMap.pixels[index + 1] =
                Math.round((vy * 0.5 + 0.5) * 255);


            // Flow weight: protect star cores and halos
            let flowWeight = 1.0;

            for (const star of brushV2.stars) {
                const d = Math.hypot(px - star.x, py - star.y);

                const inner = star.radius * 1.5;
                const outer = star.radius * (
                    star.type === "moon" ? 4.4 : 3.5
                );

                let t = constrain(
                    (d - inner) / (outer - inner), 0, 1
                );

                t = t * t * (3 - 2 * t);

                // 15% at centre, 100% outside halo
                const localWeight = 0.15 + 0.85 * t;

                flowWeight = Math.min(flowWeight, localWeight);
            }

            // Reduce movement in the mountain regions
            flowWeight = Math.min(
                flowWeight,
                getMountainFlowWeight(px, py)
            );

            flowWeight = Math.min(
                flowWeight,
                getVillageFlowWeight(px, py)
            );

            flowWeight = Math.min(
                flowWeight,
                getCypressFlowWeight(px, py)
            );

            brushFlowMap.pixels[index + 2] =
                Math.round(flowWeight * 255);

            brushFlowMap.pixels[index + 3] = 255;
        }
    }

    brushFlowMap.updatePixels();
}

// Render the animated painting
function drawBrushFlowShader(present = true, camera = null) {
    if (!brushV2.base || !brushFlowProgram) return;

    // Compare with the original painting
    if (!brushFlowSettings.enabled) {
        if (present) {
            image(brushV2.base, 0, 0);
        }

        return brushV2.base;
    }

    if (!brushFlowSettings.paused) {
        brushFlowTime += Math.min(deltaTime, 33) * 0.001;
        updateBrushCursor();
    }

    brushFlowBuffer.shader(brushFlowProgram);

    brushFlowProgram.setUniform(
        "u_paint",
        brushV2.base
    );

    brushFlowProgram.setUniform(
        "u_flowMap",
        brushFlowMap
    );

    brushFlowProgram.setUniform(
        "u_resolution",
        [width, height]
    );

    brushFlowProgram.setUniform(
        "u_time",
        brushFlowTime
    );

    brushFlowProgram.setUniform(
        "u_strength",
        brushFlowSettings.strength
    );

    brushFlowProgram.setUniform(
        "u_speed",
        brushFlowSettings.speed
    );


    const cameraZoom = camera ? camera.zoom : 1;

    const worldCursor = camera
        ? camera.screenToWorld(brushCursor.x, brushCursor.y)
        : { x: brushCursor.x, y: brushCursor.y };

    brushFlowProgram.setUniform(
        "u_cursor",
        [worldCursor.x, worldCursor.y]
    );

    brushFlowProgram.setUniform(
        "u_cursorRadius",
        brushFlowSettings.cursorRadius / cameraZoom
    );

    brushFlowProgram.setUniform(
        "u_cursorStrength",
        brushFlowSettings.cursorStrength / cameraZoom
    );


    brushFlowProgram.setUniform(
        "u_cursorActive",
        brushFlowSettings.cursorEnabled
            ? brushCursor.active
            : 0
    );

    brushFlowProgram.setUniform(
        "u_cursorVelocity",
        [
            brushCursor.vx / cameraZoom,
            brushCursor.vy / cameraZoom
        ]
    );

    brushFlowProgram.setUniform(
        "u_cursorSpeed",
        brushCursor.speed
    );

    brushFlowBuffer.clear();
    brushFlowBuffer.plane(width, height);

    // Display GPU output on the normal 2D canvas
    if (present) {
        image(brushFlowBuffer, 0, 0);
    }

    return brushFlowBuffer;
}
