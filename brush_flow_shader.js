const brushFlowSettings = {
    strength: 5,
    speed: 1.2,
    paused: false,
    enabled: true,

    // Cursor interaction
    cursorEnabled: true,
    cursorRadius: 95,
    cursorStrength: 3.5
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
    active: 0,
    motion: 0
};

function updateBrushCursor() {
    const inside =
        brushCursor.inside &&
        mouseX >= 0 && mouseX <= width &&
        mouseY >= 0 && mouseY <= height;

    if (inside) {
        // Avoid a jump when the cursor enters the canvas
        if (!brushCursor.wasInside) {
            brushCursor.x = mouseX;
            brushCursor.y = mouseY;
            brushCursor.motion = 0;
        }

        const oldX = brushCursor.x;
        const oldY = brushCursor.y;

        // Smooth cursor following
        brushCursor.x = lerp(
            brushCursor.x, mouseX, 0.25
        );
        brushCursor.y = lerp(
            brushCursor.y, mouseY, 0.25
        );

        // Movement increases the disturbance slightly
        const movement = Math.hypot(
            brushCursor.x - oldX,
            brushCursor.y - oldY
        );

        brushCursor.motion = lerp(
            brushCursor.motion,
            constrain(movement / 9, 0, 1),
            0.18
        );
    } else {
        brushCursor.motion = lerp(
            brushCursor.motion, 0, 0.15
        );
    }

    // Fade the disturbance in and out
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
uniform float u_cursorMotion;


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

  float distanceSquared =
    dot(cursorDelta, cursorDelta);

  // Soft local falloff, not a circular ripple
  float cursorInfluence = exp(
    -0.5 * distanceSquared /
    (u_cursorRadius * u_cursorRadius)
  );

  // Animate along the existing flow direction
  float cursorPhase =
    dot(pixelPosition / 42.0, direction) * 1.2
    - u_time * u_speed * 1.7;

  float cursorWave = sin(cursorPhase);

  // Stronger while moving, subtle while stationary
  float motionStrength =
    0.4 + 0.6 * u_cursorMotion;

  float cursorAmount =
    cursorWave *
    u_cursorStrength *
    motionStrength *
    cursorInfluence *
    u_cursorActive *
    localStrength;

  // Slight sideways bending
  vec2 sideways = vec2(
    -direction.y,
    direction.x
  );

  vec2 cursorOffset =
    (direction * 0.85 + sideways * 0.15)
    * cursorAmount;

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
function drawBrushFlowShader() {
    if (!brushV2.base || !brushFlowProgram) return;

    // Compare with the original painting
    if (!brushFlowSettings.enabled) {
        image(brushV2.base, 0, 0);
        return;
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


    brushFlowProgram.setUniform(
        "u_cursor",
        [brushCursor.x, brushCursor.y]
    );

    brushFlowProgram.setUniform(
        "u_cursorRadius",
        brushFlowSettings.cursorRadius
    );

    brushFlowProgram.setUniform(
        "u_cursorStrength",
        brushFlowSettings.cursorStrength
    );

    brushFlowProgram.setUniform(
        "u_cursorActive",
        brushFlowSettings.cursorEnabled
            ? brushCursor.active
            : 0
    );

    brushFlowProgram.setUniform(
        "u_cursorMotion",
        brushCursor.motion
    );


    brushFlowBuffer.clear();
    brushFlowBuffer.plane(width, height);

    // Display GPU output on the normal 2D canvas
    image(brushFlowBuffer, 0, 0);
}
