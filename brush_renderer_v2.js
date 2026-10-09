
const BRUSH_V2_SETTINGS = {
    spacing: 8,
    detailCount: 3500,
    movingCount: 650,
    noiseScale: 0.005,

    // Continuous flow settings
    flowSegments: 5,
    flowStep: 10,
    driftAmountX: 16,
    driftAmountY: 12,
    motionAlpha: 165
};

const BRUSH_V2_COLORS = [
    [13, 35, 75],
    [23, 53, 105],
    [40, 78, 137],
    [57, 102, 159],
    [82, 135, 184],
    [116, 166, 204]
];

const brushV2 = {
    base: null,
    motion: null,
    marks: [],
    time: 0
};

// Shared direction field
function brushV2Angle(x, y, time = 0) {
    const s = BRUSH_V2_SETTINGS.noiseScale;

    const n = noise(x * s, y * s, time);
    const baseAngle = n * TWO_PI * 2;

    let vx = cos(baseAngle);
    let vy = sin(baseAngle);

    // Main vortex
    const cx = width * 0.48;
    const cy = height * 0.32;

    const dx = x - cx;
    const dy = y - cy;
    const d = Math.hypot(dx, dy);
    const radius = min(width, height) * 0.48;

    if (d > 1 && d < radius) {
        const falloff = 1 - d / radius;
        const influence = 5 * falloff * falloff;

        vx += (-dy / d) * influence;
        vy += (dx / d) * influence;
    }

    return atan2(vy, vx);
}

// Smooth colour regions with small variation
function brushV2Color(x, y) {
    const n = noise(x * 0.004, y * 0.005, 10);
    const t = constrain((n - 0.25) * 2, 0, 0.999);

    const index = floor(t * (BRUSH_V2_COLORS.length - 1));
    const amount = t * (BRUSH_V2_COLORS.length - 1) - index;

    const a = BRUSH_V2_COLORS[index];
    const b = BRUSH_V2_COLORS[index + 1];

    const variation = random(-10, 10);

    return a.map((c, i) =>
        constrain(lerp(c, b[i], amount) + variation, 0, 255)
    );
}

// Paint one thick brush mark

function paintV2Stroke(g, x, y, angle, len, weight, colour, alpha = 255) {
    const ux = cos(angle);
    const uy = sin(angle);

    // Perpendicular direction
    const nx = -uy;
    const ny = ux;

    const half = len / 2;

    // Start and end of the stroke
    const x1 = x - ux * half;
    const y1 = y - uy * half;
    const x2 = x + ux * half;
    const y2 = y + uy * half;

    // Deterministic organic curvature
    const bend = sin(x * 0.017 + y * 0.021) * len * 0.18;

    const cx1 = x - ux * len * 0.2 + nx * bend;
    const cy1 = y - uy * len * 0.2 + ny * bend;

    const cx2 = x + ux * len * 0.2 + nx * bend;
    const cy2 = y + uy * len * 0.2 + ny * bend;

    g.noFill();
    g.strokeCap(ROUND);

    // Main paint body
    g.stroke(...colour, alpha);
    g.strokeWeight(weight);

    g.bezier(
        x1, y1,
        cx1, cy1,
        cx2, cy2,
        x2, y2
    );

    // Thin highlight on top of the paint
    g.stroke(
        min(255, colour[0] + 35),
        min(255, colour[1] + 35),
        min(255, colour[2] + 35),
        alpha * 0.45
    );

    g.strokeWeight(max(0.6, weight * 0.25));

    const offset = weight * 0.25;

    g.bezier(
        x1 + nx * offset, y1 + ny * offset,
        cx1 + nx * offset, cy1 + ny * offset,
        cx2 + nx * offset, cy2 + ny * offset,
        x2 + nx * offset, y2 + ny * offset
    );
}


// Generate the complete painted world
function initBrushV2(seed) {
    randomSeed(seed);
    noiseSeed(seed);

    // Release previous buffers if regenerating
    if (brushV2.base) brushV2.base.remove();
    if (brushV2.motion) brushV2.motion.remove();

    brushV2.base = createGraphics(width, height);
    brushV2.motion = createGraphics(width, height);

    brushV2.base.pixelDensity(1);
    brushV2.motion.pixelDensity(1);

    brushV2.base.background(12, 28, 60);

    brushV2.time = 0;
    brushV2.marks = [];

    // Pass 1: dense coverage
    const step = BRUSH_V2_SETTINGS.spacing;

    for (let y = -step; y < height + step; y += step) {
        for (let x = -step; x < width + step; x += step) {
            const px = x + random(-3, 3);
            const py = y + random(-3, 3);

            const angle = brushV2Angle(px, py);
            const colour = brushV2Color(px, py);

            paintV2Stroke(
                brushV2.base,
                px, py,
                angle,
                random(15, 25),
                random(8, 12),
                colour
            );
        }
    }

    // Pass 2: finer surface texture
    for (let i = 0; i < BRUSH_V2_SETTINGS.detailCount; i++) {
        const x = random(width);
        const y = random(height);

        const colour = brushV2Color(x, y);
        const angle = brushV2Angle(x, y);

        paintV2Stroke(
            brushV2.base,
            x, y,
            angle,
            random(8, 22),
            random(1.2, 3),
            colour,
            random(110, 190)
        );
    }

    // Living brush marks keep stable home positions
    for (let i = 0; i < BRUSH_V2_SETTINGS.movingCount; i++) {
        const x = random(width);
        const y = random(height);

        brushV2.marks.push({
            homeX: x,
            homeY: y,
            x: x,
            y: y,
            length: random(12, 24),
            weight: random(1.4, 3.4),
            colour: brushV2Color(x, y),
            phase: random(1000),
            speedPhase: random(1000)
        });
    }

    console.log("Brush V2 generated:", seed);
}

// Render the layered painting
function drawBrushV2() {
    if (!brushV2.base) return;

    // Cached dense painting
    image(brushV2.base, 0, 0);

    const layer = brushV2.motion;
    layer.clear();

    brushV2.time += min(deltaTime, 33) * 0.00018;


    for (const mark of brushV2.marks) {

        // Each stroke moves independently
        // along a short section of the flow field
        const progress =
            (brushV2.time * 0.7 + mark.speedPhase) % 1;

        // Get the local flow direction
        const baseAngle = brushV2Angle(
            mark.homeX,
            mark.homeY,
            0
        );

        // Small movement along the flow direction
        const travel = (progress - 0.5) * 32;

        const px =
            mark.homeX + cos(baseAngle) * travel;

        const py =
            mark.homeY + sin(baseAngle) * travel;

        // Align the brushstroke with its local field
        const angle = brushV2Angle(px, py, 0);

        // Fade in and out to avoid visible jumps
        const opacity =
            145 * pow(sin(PI * progress), 2);

        // Draw ONE short stroke, not a chain
        paintV2Stroke(
            layer,
            px,
            py,
            angle,
            mark.length,
            mark.weight,
            mark.colour,
            opacity
        );
    }


    image(layer, 0, 0);
}
