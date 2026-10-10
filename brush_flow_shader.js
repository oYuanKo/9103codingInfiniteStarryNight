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

// Screen-space microtexture only; does not alter the seeded painting or palette.
const brushLODSettings = { enabled: true, strength: 0.035 };
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
precision highp float;

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
uniform vec3 u_camera;
uniform vec3 u_childCamera;
uniform sampler2D u_childPaint;
uniform sampler2D u_childFlow;
uniform float u_childTime;
uniform float u_seed;
uniform float u_childSeed;
uniform float u_flowEnabled;
uniform float u_lodStrength;
uniform float u_portalActive;
uniform vec4 u_portal; // Screen anchor xy, radius, opening amount.

float pigmentHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float pigmentNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(pigmentHash(i), pigmentHash(i + vec2(1, 0)), f.x),
             mix(pigmentHash(i + vec2(0, 1)), pigmentHash(i + vec2(1, 1)), f.x), f.y);
}
// A bounded lens keeps the small child inside its own painting, without
// repeating/mirroring edge content. It becomes the ordinary camera at zoom 1.
vec2 cameraPoint(vec2 screen, vec3 camera) {
  if (camera.z >= 1.0) return (screen - camera.xy) / camera.z;
  vec2 focus = clamp(u_portal.xy, vec2(1.0), u_resolution - 1.0);
  vec2 d = screen - focus;
  vec2 extent = mix(focus, u_resolution - focus, step(vec2(0.0), d));
  vec2 denominator = camera.z + (1.0 - camera.z) * abs(d) / extent;
  vec2 pan = (camera.xy - (1.0 - camera.z) * focus) / camera.z;
  return focus + d / denominator - pan;
}
vec2 cameraScale(vec2 screen, vec3 camera) {
  if (camera.z >= 1.0) return vec2(camera.z);
  vec2 focus = clamp(u_portal.xy, vec2(1.0), u_resolution - 1.0);
  vec2 d = screen - focus;
  vec2 extent = mix(focus, u_resolution - focus, step(vec2(0.0), d));
  vec2 denominator = camera.z + (1.0 - camera.z) * abs(d) / extent;
  return denominator * denominator / camera.z;
}

vec4 samplePainting(sampler2D paint, sampler2D flow, vec2 point,
                    vec3 camera, float time, float seed) {
  vec2 uv = clamp(point / u_resolution, vec2(0.0), vec2(1.0));
  vec2 screen = vTexCoord * u_resolution;
  vec2 localScale = cameraScale(screen, camera);

  // Read the existing Perlin + Vortex direction
  vec2 encoded = texture2D(flow, uv).rg;
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
    - time * u_speed;

  // Smooth displacement without separate long strokes
  float localStrength = texture2D(flow, uv).b;

  // Existing global flow
  float displacement =
    sin(phase) * u_strength * localStrength;

  // Distance from the cursor in canvas pixels
  vec2 cursorDelta = screen - u_cursor;
  float distanceSquared = dot(cursorDelta, cursorDelta);

  // Soft local falloff
  float cursorInfluence = exp(
    -0.5 * distanceSquared /
    (u_cursorRadius * u_cursorRadius)
  );

  // Use cursor movement direction instead of sinusoidal waves
  vec2 cursorVelocity = u_cursorVelocity / localScale;
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
    radial = normalize(cursorDelta / localScale);
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

  vec2 cursorOffset = combinedDir * cursorAmount / localScale;



  // Combine global flow and local cursor influence
  vec2 displacedUV = uv -
    (direction * displacement + cursorOffset) * u_flowEnabled
    / u_resolution;

  displacedUV = clamp(
    displacedUV,
    vec2(0.001),
    vec2(0.999)
  );

  // Sample the original painted texture
  vec4 colour = texture2D(paint, displacedUV);
  // Two world-anchored pigment scales fade in continuously with magnification.
  // Analytic pixel footprints suppress the finer octave until it is resolvable.
  float detail = smoothstep(1.6, 4.5, camera.z) * u_lodStrength;
  vec2 p = displacedUV * u_resolution;
  vec2 grain = vec2(dot(p, direction), dot(p, vec2(-direction.y, direction.x)));
  vec2 offset = vec2(mod(seed, 997.0), mod(seed, 577.0));
  float ridges = pigmentNoise(grain * vec2(0.65, 2.5) + offset) - 0.5;
  float fine = (pigmentNoise(grain * vec2(1.3, 5.0) + offset) - 0.5)
               * smoothstep(5.0, 10.0, camera.z);
  colour.rgb *= 1.0 + detail * (ridges + 0.5 * fine) * (0.3 + 0.7 * localStrength);
  return colour;
}

void main() {
  vec2 screen = vTexCoord * u_resolution;
  vec2 parentPoint = cameraPoint(screen, u_camera);
  if (u_portalActive < 0.5) {
    gl_FragColor = samplePainting(u_paint, u_flowMap, parentPoint, u_camera, u_time, u_seed);
    return;
  }
  // The boundary is fixed in parent-world coordinates, never animated by time.
  // Elongated, overlapping noise bands make a feathered painted aperture.
  vec2 q = (screen - u_portal.xy) / u_camera.z;
  float angle = atan(q.y, q.x);
  vec2 roughPoint = q * vec2(0.31, 0.65) + vec2(mod(u_seed, 997.0));
  float rough = (pigmentNoise(roughPoint) - 0.5) * 0.08
              + sin(angle * 17.0 + pigmentNoise(q * 0.12) * 4.0) * 0.025;
  float distance = length(screen - u_portal.xy) / max(u_portal.z, 0.001);
  float mask = (1.0 - smoothstep(0.80 + rough, 1.04 + rough, distance)) * u_portal.w;
  vec2 childPoint = cameraPoint(screen, u_childCamera);
  if (mask <= 0.0) {
    gl_FragColor = samplePainting(u_paint, u_flowMap, parentPoint, u_camera, u_time, u_seed);
  } else if (mask >= 1.0) {
    gl_FragColor = samplePainting(u_childPaint, u_childFlow, childPoint, u_childCamera, u_childTime, u_childSeed);
  } else {
    gl_FragColor = mix(
      samplePainting(u_paint, u_flowMap, parentPoint, u_camera, u_time, u_seed),
      samplePainting(u_childPaint, u_childFlow, childPoint, u_childCamera, u_childTime, u_childSeed), mask);
  }
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
function* rebuildBrushFlowMapSteps() {
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
        yield;
    }

    brushFlowMap.updatePixels();
}

function rebuildBrushFlowMap() {
    for (const _ of rebuildBrushFlowMapSteps()) {
        // Preserve synchronous compatibility
    }
}

// Render directly at screen resolution: flow and LOD stay sharp while zooming.
// The same buffer/program serves normal views and both sides of a portal.
function drawBrushFlowShader(present = true, camera = null, portal = null) {
    if (!brushV2.base || !brushFlowProgram) return;
    camera = camera || { x: 0, y: 0, zoom: 1 };
    if (brushFlowSettings.enabled && !brushFlowSettings.paused) {
        const dt = Math.min(deltaTime, 33) * 0.001;
        brushFlowTime += dt;
        if (portal) portal.child.flowTime = (portal.child.flowTime || 0) + dt;
        updateBrushCursor();
    }
    const child = portal ? portal.child : { base: brushV2.base, flowMap: brushFlowMap };
    const childCamera = portal ? portal.childCamera : camera;
    const uniforms = {
        u_paint: brushV2.base, u_flowMap: brushFlowMap,
        u_childPaint: child.base, u_childFlow: child.flowMap,
        u_resolution: [width, height], u_time: brushFlowTime,
        u_childTime: portal ? child.flowTime || 0 : brushFlowTime,
        u_seed: universeSeed, u_childSeed: portal ? child.seed : universeSeed,
        u_strength: brushFlowSettings.strength, u_speed: brushFlowSettings.speed,
        u_flowEnabled: brushFlowSettings.enabled ? 1 : 0,
        u_lodStrength: brushLODSettings.enabled ? brushLODSettings.strength : 0,
        u_cursor: [brushCursor.x, brushCursor.y],
        u_cursorRadius: brushFlowSettings.cursorRadius,
        u_cursorStrength: brushFlowSettings.cursorStrength,
        u_cursorActive: brushFlowSettings.cursorEnabled ? brushCursor.active : 0,
        u_cursorVelocity: [brushCursor.vx, brushCursor.vy], u_cursorSpeed: brushCursor.speed,
        u_camera: [camera.x, camera.y, camera.zoom],
        u_childCamera: [childCamera.x, childCamera.y, childCamera.zoom],
        u_portalActive: portal ? 1 : 0,
        u_portal: portal ? [portal.anchorX, portal.anchorY, portal.radius, portal.opening] : [0, 0, 1, 0]
    };
    brushFlowBuffer.shader(brushFlowProgram);
    for (const [name, value] of Object.entries(uniforms)) brushFlowProgram.setUniform(name, value);
    brushFlowBuffer.clear();
    brushFlowBuffer.plane(width, height);
    if (present) image(brushFlowBuffer, 0, 0, width, height);
    return brushFlowBuffer;
}
