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
uniform float u_flowEnabled;
uniform sampler2D u_detailA;
uniform sampler2D u_detailB;
uniform sampler2D u_childDetailA;
uniform sampler2D u_childDetailB;
uniform vec4 u_detailRectA;
uniform vec4 u_detailRectB;
uniform vec4 u_childDetailRectA;
uniform vec4 u_childDetailRectB;
uniform vec4 u_detailWeights;
uniform vec4 u_childDetailWeights;
uniform float u_progress;
uniform float u_portalActive;
uniform float u_microEnabled;
uniform vec2 u_portalAnchor;

float pigmentHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
// Overlapping elongated brush footprints, not polar coordinates or a noisy circle.
// Project LOCAL offsets, never absolute world positions onto a rotating flow field.
float brushOwnership(vec2 point, vec2 direction, vec2 seed) {
  vec2 cell = floor(point / 8.0);
  float sum = 0.0, weights = 0.0;
  for (int y = -2; y <= 2; y++) {
    for (int x = -2; x <= 2; x++) {
      vec2 id = cell + vec2(float(x), float(y));
      float value = pigmentHash(id + seed);
      vec2 centre = (id + 0.5 + vec2(value - 0.5, pigmentHash(id.yx + seed) - 0.5) * 0.5) * 8.0;
      vec2 q = point - centre;
      vec2 stroke = vec2(dot(q, direction) / 8.0, dot(q, vec2(-direction.y, direction.x)) / 2.3);
      float weight = exp(-dot(stroke, stroke));
      sum += value * weight;
      weights += weight;
    }
  }
  return sum / max(weights, 0.00001);
}

// Interpolate directions on the unit circle, avoiding cancellation at opposite vectors.
vec2 turnFlow(vec2 from, vec2 to, float t) {
  float a=atan(from.y+0.00001,from.x+0.00001);
  float b=atan(to.y+0.00001,to.x+0.00001);
  float d=mod(b-a+3.14159265,6.2831853)-3.14159265;
  return vec2(cos(a+d*t),sin(a+d*t));
}
vec2 cameraPoint(vec2 screen, vec3 camera) { return (screen - camera.xy) / camera.z; }
vec2 cameraScale(vec2 screen, vec3 camera, float reflectEdges) {
  vec2 scale = vec2(camera.z);
  if (reflectEdges > 0.0) {
    vec2 raw = cameraPoint(screen,camera)/u_resolution;
    // Jacobian signs of the peripheral continuation: cursor drag must follow
    // the visible paint even where its sampling direction is reflected.
    if (raw.x < 0.0 || raw.x > 1.0) scale.x = -scale.x;
    if (raw.y < 0.0 || raw.y > 1.0) scale.y = -scale.y;
  }
  return scale;
}

vec4 patchPaint(vec4 fallback, sampler2D patch, vec4 rect, vec2 point, float enabled, float zoom) {
  if (enabled <= 0.0) return fallback;
  vec2 uv = (point - rect.xy) / rect.zw;
  vec2 edge = min(uv, 1.0 - uv) * vec2(1024.0, 768.0);
  float coverage = smoothstep(0.0, 12.0, min(edge.x, edge.y)) * enabled;
  if (coverage <= 0.0) return fallback;
  // Half-texel inset prevents atlas neighbours bleeding into patch borders.
  vec2 at = clamp(uv, vec2(.5/1024.0,.5/768.0), vec2(1.0-.5/1024.0,1.0-.5/768.0)) * .5;
  vec4 exact = texture2D(patch, at);
  vec4 meso = texture2D(patch, at + vec2(.5,0.0));
  vec4 micro = texture2D(patch, at + vec2(0.0,.5));
  float a = smoothstep(2.4, 6.0, zoom) * u_microEnabled;
  float b = smoothstep(6.0, 16.0, zoom) * u_microEnabled;
  vec4 paint = mix(mix(exact, meso, a), micro, b);
  return mix(fallback, paint, coverage);
}
vec4 detailedPaint(sampler2D paint, sampler2D a, sampler2D b,
                   vec4 rectA, vec4 rectB, vec4 weights, vec2 uv, float zoom) {
  vec4 base = texture2D(paint, uv);
  if (weights.w <= 0.0) return base;
  vec4 oldPaint = patchPaint(base, a, rectA, uv * u_resolution, weights.x, zoom);
  vec4 newPaint = patchPaint(oldPaint, b, rectB, uv * u_resolution, weights.y, zoom);
  return mix(base, mix(oldPaint, newPaint, weights.z), weights.w);
}

vec4 samplePainting(sampler2D paint, sampler2D flow, vec2 point,
                    vec3 camera, float time,
                    sampler2D detailA, sampler2D detailB, vec4 rectA, vec4 rectB, vec4 weights,
                    vec2 morphDirection, float morph, float reflectEdges) {
  vec2 uv = clamp(point / u_resolution, vec2(0.0), vec2(1.0));
  vec2 screen = vTexCoord * u_resolution;
  vec2 localScale = cameraScale(screen, camera, reflectEdges);

  // Read the existing Perlin + Vortex direction
  vec2 encoded = texture2D(flow, uv).rg;
  vec2 direction = encoded * 2.0 - 1.0;

  float magnitude = length(direction);

  if (magnitude > 0.1) {
    direction /= magnitude;
  } else {
    direction = vec2(0.0);
  }

  if (morph > 0.0) direction = turnFlow(direction, morphDirection, morph);

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



  // Cap global deformation in screen space; 12x must not turn a 5px flow into 60px.
  vec2 globalOffset = direction * displacement;
  globalOffset *= min(1.0, max(6.0, u_strength) / max(length(globalOffset * localScale), 0.001));
  vec2 displacedUV = uv -
    (globalOffset + cursorOffset) * u_flowEnabled
    / u_resolution;

  displacedUV = clamp(
    displacedUV,
    vec2(0.001),
    vec2(0.999)
  );

  return detailedPaint(paint, detailA, detailB, rectA, rectB, weights, displacedUV, camera.z);
}

void main() {
  vec2 screen = vTexCoord * u_resolution;
  vec2 parentPoint = cameraPoint(screen, u_camera);
  vec2 childPoint = cameraPoint(screen, u_childCamera);
  // Continue peripheral paint by reflection while the virtual plane is distant.
  // This avoids stretched boundary pixels and adds no separate framed canvas.
  // At the normal endpoint every sample is inside [0,1], so the map is identity.
  vec2 childRawUV = childPoint/u_resolution;
  if (u_portalActive > 0.0 && u_progress > 0.0 && u_progress < 1.0) {
    vec2 reflected = (1.0-abs(1.0-mod(childRawUV,2.0)))*u_resolution;
    if (childRawUV.x < 0.0 || childRawUV.x > 1.0) childPoint.x = reflected.x;
    if (childRawUV.y < 0.0 || childRawUV.y > 1.0) childPoint.y = reflected.y;
  }
  // Depth is wheel driven; colour, direction and structure share continuous endpoints.
  float phase = u_progress * u_portalActive;
  if (phase <= 0.0) {
    gl_FragColor = samplePainting(u_paint, u_flowMap, parentPoint, u_camera, u_time,
      u_detailA, u_detailB, u_detailRectA, u_detailRectB, u_detailWeights, vec2(0.0), 0.0, 0.0);
    return;
  }
  if (phase >= 1.0) {
    gl_FragColor = samplePainting(u_childPaint, u_childFlow, childPoint, u_childCamera, u_childTime,
      u_childDetailA, u_childDetailB, u_childDetailRectA, u_childDetailRectB, u_childDetailWeights, vec2(0.0), 0.0, 0.0);
    return;
  }
  vec2 parentFlow = texture2D(u_flowMap, clamp(parentPoint/u_resolution, 0.0, 1.0)).rg * 2.0 - 1.0;
  vec2 childFlow = texture2D(u_childFlow, clamp(childPoint/u_resolution, 0.0, 1.0)).rg * 2.0 - 1.0;
  vec2 direction = normalize(parentFlow + vec2(0.00001));
  vec2 seed = vec2(mod(u_seed, 997.0), mod(u_seed, 577.0));
  float stroke = brushOwnership(parentPoint, direction, seed);
  // A broad flow-aligned influence from the entered star changes local DEPTH,
  // not opacity of a hole. p + k*p*(1-p) has exact endpoints and is monotonic
  // for |k| < 1. Fixed world coordinates keep the brush pattern reversible.
  vec2 offset = (screen-u_portalAnchor)/u_resolution;
  vec2 along = vec2(dot(offset,direction),dot(offset,vec2(-direction.y,direction.x)));
  float origin = exp(-dot(along*vec2(1.3,3.0),along*vec2(1.3,3.0)));
  float local = phase + phase*(1.0-phase)*(.55*(origin-.5)+.35*(stroke-.5));
  float depth = local*local*(3.0-2.0*local);
  vec2 childUV = clamp(childPoint/u_resolution,0.0,1.0);
  // Local paint first changes pigment; only then does its child structure form.
  // Terrain joins later than sky. No binary aperture, window or uniform image fade.
  float terrain = smoothstep(.42,.85,childUV.y);
  float arrival = clamp(.38 + .24*(1.0-origin) + .20*(stroke-.5) + .18*terrain,.34,.76);
  float colour = smoothstep(arrival-.30,arrival-.03,phase);
  float structure = smoothstep(arrival-.02,arrival+.20,phase);
  vec2 blendedFlow = turnFlow(parentFlow, childFlow, depth);
  vec4 parent = samplePainting(u_paint, u_flowMap, parentPoint, u_camera, u_time,
    u_detailA, u_detailB, u_detailRectA, u_detailRectB, u_detailWeights, blendedFlow, depth, 0.0);
  vec4 child = samplePainting(u_childPaint, u_childFlow, childPoint, u_childCamera, u_childTime,
    u_childDetailA, u_childDetailB, u_childDetailRectA, u_childDetailRectB, u_childDetailWeights, blendedFlow, 1.0-depth, 1.0);
  // Transport child colour along its flow before resolving its composition.
  // Flow-aligned samples transfer chroma before restoring child luminance/contrast.
  vec2 spread = normalize(childFlow+vec2(.00001))*vec2(24.0)/u_resolution;
  vec3 pigment = (texture2D(u_childPaint,clamp(childUV-spread,0.0,1.0)).rgb +
                  texture2D(u_childPaint,childUV).rgb*2.0 +
                  texture2D(u_childPaint,clamp(childUV+spread,0.0,1.0)).rgb)*.25;
  // Remove parent contrast BEFORE revealing child contrast in this region.
  // With these overlapping smooth ramps, simultaneous high-contrast ownership
  // is tiny rather than the old 50/50 double exposure. This is pigment/structure
  // reconstruction, NOT matched Bezier morphing, and does not blur the viewport.
  // A palette carrier sampled from this SAME painting compresses structural
  // contrast without brightening dark blue into a new saturated colour.
  vec3 palette = (texture2D(u_childPaint,vec2(.23,.31)).rgb +
                  texture2D(u_childPaint,vec2(.57,.25)).rgb +
                  texture2D(u_childPaint,vec2(.81,.42)).rgb)/3.0;
  vec3 underpaint = mix(palette,pigment,.30);
  // Retain a small amount of the existing sharp replay/micro relief while
  // suppressing large parent silhouettes; no new grain or extra LOD is created.
  vec3 relief = clamp(parent.rgb-texture2D(u_paint,clamp(parentPoint/u_resolution,0.0,1.0)).rgb,-.035,.035);
  vec3 evolving = mix(parent.rgb,underpaint+relief,colour);
  gl_FragColor = vec4(mix(evolving,child.rgb,structure),1.0);
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
    const parentWorld = captureWorldV2();
    updateBrushDetailsV2([
        portal && portal.progress >= 1 ? null : detailViewV2(parentWorld, camera),
        portal && portal.progress > 0 ? detailViewV2(child, childCamera) : null
    ]);
    const parentDetail = brushDetailUniformsV2(parentWorld, camera);
    const childDetail = portal ? brushDetailUniformsV2(child, childCamera) : parentDetail;
    const uniforms = {
        u_paint: brushV2.base, u_flowMap: brushFlowMap,
        u_childPaint: child.base, u_childFlow: child.flowMap,
        u_resolution: [width, height], u_time: brushFlowTime,
        u_childTime: portal ? child.flowTime || 0 : brushFlowTime,
        u_seed: universeSeed,
        u_strength: brushFlowSettings.strength, u_speed: brushFlowSettings.speed,
        u_flowEnabled: brushFlowSettings.enabled ? 1 : 0,
        u_detailA: parentDetail.a, u_detailB: parentDetail.b,
        u_detailRectA: parentDetail.rectA, u_detailRectB: parentDetail.rectB, u_detailWeights: parentDetail.weights,
        u_childDetailA: childDetail.a, u_childDetailB: childDetail.b,
        u_childDetailRectA: childDetail.rectA, u_childDetailRectB: childDetail.rectB, u_childDetailWeights: childDetail.weights,
        u_progress: portal ? portal.progress : 0,
        u_microEnabled: brushDetailSettings.microEnabled ? 1 : 0,
        u_portalAnchor: portal ? [portal.anchorX,portal.anchorY] : [width/2,height/2],
        u_cursor: [brushCursor.x, brushCursor.y],
        u_cursorRadius: brushFlowSettings.cursorRadius,
        u_cursorStrength: brushFlowSettings.cursorStrength,
        u_cursorActive: brushFlowSettings.cursorEnabled ? brushCursor.active : 0,
        u_cursorVelocity: [brushCursor.vx, brushCursor.vy], u_cursorSpeed: brushCursor.speed,
        u_camera: [camera.x, camera.y, camera.zoom],
        u_childCamera: [childCamera.x, childCamera.y, childCamera.zoom],
        u_portalActive: portal ? 1 : 0
    };
    brushFlowBuffer.shader(brushFlowProgram);
    for (const [name, value] of Object.entries(uniforms)) brushFlowProgram.setUniform(name, value);
    brushFlowBuffer.clear();
    brushFlowBuffer.plane(width, height);
    if (present) image(brushFlowBuffer, 0, 0, width, height);
    return brushFlowBuffer;
}
