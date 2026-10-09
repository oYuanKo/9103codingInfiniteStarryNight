
const BRUSH_V2_SETTINGS = {
    spacing: 8,
    detailCount: 3500,
    movingCount: 650,
    noiseScale: 0.005,

    // Motion
    driftAmountX: 16,
    driftAmountY: 12,
    motionAlpha: 165,

    // Star composition
    majorStarCount: 7,
    smallStarCount: 18,
    moonRadius: 28,
    starMinRadius: 10,
    starMaxRadius: 18
};

const BRUSH_V2_COLORS = [
    [13, 35, 75],
    [23, 53, 105],
    [40, 78, 137],
    [57, 102, 159],
    [82, 135, 184],
    [116, 166, 204]
];

const STAR_BRUSH_COLORS = {
    glow: [245, 210, 115],
    warm: [255, 228, 150],
    core: [255, 244, 205],
    pale: [255, 235, 170]
};

function generateBrushV2Stars() {
    const stars = [];

    // One larger moon / dominant star
    stars.push({
        x: width * 0.83,
        y: height * 0.17,
        radius: BRUSH_V2_SETTINGS.moonRadius,
        type: "moon",
        enterRadius: BRUSH_V2_SETTINGS.moonRadius * 1.8
    });

    // Main stars, mostly in the upper sky
    for (let i = 0; i < BRUSH_V2_SETTINGS.majorStarCount; i++) {
        stars.push({
            x: random(width * 0.08, width * 0.92),
            y: random(height * 0.08, height * 0.46),
            radius: random(
                BRUSH_V2_SETTINGS.starMinRadius,
                BRUSH_V2_SETTINGS.starMaxRadius
            ),
            type: "major",
            enterRadius: random(22, 34)
        });
    }

    // Smaller stars for support
    for (let i = 0; i < BRUSH_V2_SETTINGS.smallStarCount; i++) {
        stars.push({
            x: random(width * 0.05, width * 0.95),
            y: random(height * 0.06, height * 0.55),
            radius: random(3, 6),
            type: "small",
            enterRadius: 10
        });
    }

    return stars;
}

const brushV2 = {
    base: null,
    motion: null,
    marks: [],
    stars: [],
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
    brushV2.stars = [];

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

    brushV2.stars = generateBrushV2Stars();
    paintAllBrushV2Stars(brushV2.base);

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

function paintStarGlowField(g, star) {
    const glowRadius =
        star.type === "moon"
            ? star.radius * 3.8
            : star.radius * 3.0;

    const count =
        star.type === "moon"
            ? 220
            : star.type === "major"
                ? 140
                : 45;

    for (let i = 0; i < count; i++) {
        const angle = random(TWO_PI);
        const distRatio = sqrt(random());
        const r = distRatio * glowRadius;

        const px = star.x + cos(angle) * r;
        const py = star.y + sin(angle) * r;

        const localAngle =
            brushV2Angle(px, py, 0) + random(-0.3, 0.3);

        const alpha =
            map(distRatio, 0, 1, 70, 8);

        const colour = [
            STAR_BRUSH_COLORS.glow[0] + random(-8, 8),
            STAR_BRUSH_COLORS.glow[1] + random(-8, 8),
            STAR_BRUSH_COLORS.glow[2] + random(-8, 8)
        ];

        paintV2Stroke(
            g,
            px,
            py,
            localAngle,
            random(8, 18),
            random(1.2, 2.6),
            colour,
            alpha
        );
    }
}

function paintStarHaloRings(g, star) {
    const ringCount =
        star.type === "moon" ? 4 :
            star.type === "major" ? 3 : 1;

    for (let ring = 0; ring < ringCount; ring++) {
        const baseRadius =
            star.radius * (1.35 + ring * 0.48);

        const strokeCount =
            star.type === "moon"
                ? 34 - ring * 4
                : star.type === "major"
                    ? 24 - ring * 3
                    : 10;

        for (let i = 0; i < strokeCount; i++) {
            const theta =
                (i / strokeCount) * TWO_PI +
                random(-0.08, 0.08);

            const px = star.x + cos(theta) * baseRadius;
            const py = star.y + sin(theta) * baseRadius;

            // Tangential direction around the star
            const tangent = theta + HALF_PI + random(-0.22, 0.22);

            const len =
                star.type === "moon"
                    ? random(14, 24)
                    : random(10, 18);

            const weight =
                star.type === "moon"
                    ? random(1.8, 3.2)
                    : random(1.2, 2.4);

            const alpha =
                map(ring, 0, ringCount - 1, 135, 60);

            const colour =
                ring === 0
                    ? STAR_BRUSH_COLORS.warm
                    : STAR_BRUSH_COLORS.pale;

            paintV2Stroke(
                g,
                px,
                py,
                tangent,
                len,
                weight,
                colour,
                alpha
            );
        }
    }
}

function paintStarCore(g, star) {
    const coreCount =
        star.type === "moon"
            ? 90
            : star.type === "major"
                ? 55
                : 18;

    for (let i = 0; i < coreCount; i++) {
        const angle = random(TWO_PI);
        const r = sqrt(random()) * star.radius;

        const px = star.x + cos(angle) * r;
        const py = star.y + sin(angle) * r;

        const dir = random(TWO_PI);

        const len =
            star.type === "moon"
                ? random(6, 12)
                : random(4, 9);

        const weight =
            star.type === "moon"
                ? random(1.8, 3.4)
                : random(1.1, 2.4);

        const colour =
            random() < 0.7
                ? STAR_BRUSH_COLORS.core
                : STAR_BRUSH_COLORS.warm;

        paintV2Stroke(
            g,
            px,
            py,
            dir,
            len,
            weight,
            colour,
            random(150, 235)
        );
    }
}

function paintAllBrushV2Stars(g) {
    for (const star of brushV2.stars) {
        paintStarGlowField(g, star);
    }

    for (const star of brushV2.stars) {
        paintStarHaloRings(g, star);
    }

    for (const star of brushV2.stars) {
        paintStarCore(g, star);
    }
}
