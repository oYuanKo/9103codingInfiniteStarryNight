
const brushFlowSettings = {
    strength: 5,       // Displacement in pixels
    speed: 1.2,        // Animation speed
    paused: false,
    enabled: true
};

let brushFlowBuffer = null;
let brushFlowProgram = null;
let brushFlowMap = null;
let brushFlowTime = 0;

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

  float displacement =
  sin(phase) * u_strength * localStrength;

  vec2 displacedUV =
    uv - direction * displacement / u_resolution;

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

    brushFlowBuffer.clear();
    brushFlowBuffer.plane(width, height);

    // Display GPU output on the normal 2D canvas
    image(brushFlowBuffer, 0, 0);
}
