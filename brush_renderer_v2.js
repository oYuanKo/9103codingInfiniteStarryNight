
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
    majorStarCount: 5,
    smallStarCount: 12,
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

    // 1. Main moon: dominant focal point
    stars.push({
        id: "moon",
        x: width * 0.83,
        y: height * 0.17,
        radius: BRUSH_V2_SETTINGS.moonRadius,
        type: "moon",
        enterRadius: BRUSH_V2_SETTINGS.moonRadius * 1.8
    });

    // 2. Composition anchors for major stars
    // Normalised positions: 0-1
    const majorAnchors = [
        [0.16, 0.13],
        [0.34, 0.105],
        [0.22, 0.34],
        [0.58, 0.14],
        [0.72, 0.41]
    ];

    const majorCount = Math.min(
        BRUSH_V2_SETTINGS.majorStarCount,
        majorAnchors.length
    );

    for (let i = 0; i < majorCount; i++) {
        const [ax, ay] = majorAnchors[i];

        // Seed-controlled variation around each anchor
        const x = width * (
            ax + random(-0.012, 0.012)
        );

        const y = height * (
            ay + random(-0.016, 0.016)
        );

        // First two major stars are more prominent
        const radius = i < 2
            ? random(14, 18)
            : random(10, 13.5);

        stars.push({
            id: `major-${i}`,
            x, y,
            radius,
            type: "major",
            enterRadius: radius * 2
        });
    }

    // 3. Smaller supporting stars
    let attempts = 0;
    let placed = 0;

    while (
        placed < BRUSH_V2_SETTINGS.smallStarCount &&
        attempts < 1500
    ) {
        attempts++;

        const x = random(width * 0.06, width * 0.94);
        const y = random(height * 0.06, height * 0.54);
        const radius = random(3, 5);

        // Keep the main vortex visually open
        const vortexDistance = dist(
            x, y,
            width * 0.48,
            height * 0.32
        );

        if (vortexDistance < min(width, height) * 0.14) {
            continue;
        }

        // Avoid overcrowding and overlapping halos
        const overlaps = stars.some(star => {
            const d = dist(x, y, star.x, star.y);

            let minimumDistance;

            if (star.type === "moon") {
                minimumDistance = star.radius * 3.8 + 12;
            } else if (star.type === "major") {
                minimumDistance = star.radius * 2.8 + 12;
            } else {
                minimumDistance = star.radius + radius + 8;
            }

            return d < minimumDistance;
        });

        if (overlaps) continue;

        stars.push({
            id: `small-${placed}`,
            x, y,
            radius,
            type: "small",
            enterRadius: radius * 2
        });

        placed++;
    }

    return stars;
}


const brushV2 = {
    base: null,
    motion: null,
    marks: [],
    stars: [],
    village: null,
    cypress: null,
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
function initBrushV2(seed, preservePrevious = false) {
    randomSeed(seed);
    noiseSeed(seed);

    // Release previous buffers if regenerating
    if (!preservePrevious) {
        if (brushV2.base) brushV2.base.remove();
        if (brushV2.motion) brushV2.motion.remove();
    }

    brushV2.base = createGraphics(width, height);
    brushV2.motion = createGraphics(width, height);

    brushV2.base.pixelDensity(1);
    brushV2.motion.pixelDensity(1);

    brushV2.base.background(12, 28, 60);

    brushV2.time = 0;
    brushV2.marks = [];
    brushV2.stars = [];
    brushV2.village = null;
    brushV2.cypress = null;

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
    paintBrushMountains(brushV2.base);

    brushV2.village = generateVillageLayout();
    paintBrushVillage(brushV2.base);

    brushV2.cypress = generateCypressLayout();
    paintBrushCypress(brushV2.base);


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
    const isMoon = star.type === "moon";
    const isMajor = star.type === "major";

    const ringCount = isMoon ? 3 : isMajor ? 2 : 1;

    for (let ring = 0; ring < ringCount; ring++) {
        const baseRadius =
            star.radius * (1.3 + ring * 0.65);

        const count = isMoon
            ? 22 + ring * 3
            : isMajor ? 16 + ring * 3 : 8;

        for (let i = 0; i < count; i++) {
            // Leave irregular gaps between brush marks
            if (random() < (ring === 0 ? 0.15 : 0.35)) {
                continue;
            }

            const theta =
                (i / count) * TWO_PI + random(-0.18, 0.18);

            // Break up the perfect circular outline
            const radius =
                baseRadius + random(-0.25, 0.25) * star.radius;

            const px = star.x + cos(theta) * radius;
            const py = star.y + sin(theta) * radius;

            const tangent =
                theta + HALF_PI + random(-0.35, 0.35);

            const len = isMoon
                ? random(9, 18)
                : isMajor ? random(7, 14) : random(3, 7);

            const weight = isMoon
                ? random(2.8, 5)
                : isMajor ? random(2, 3.8) : random(1.2, 2);

            // Warm inner marks, cooler outer marks
            let colour;

            if (ring === 0) {
                colour = STAR_BRUSH_COLORS.warm;
            } else if (random() < 0.35) {
                colour = [140, 181, 205];
            } else {
                colour = STAR_BRUSH_COLORS.glow;
            }

            const alpha = ring === 0
                ? random(140, 210)
                : random(60, 140);

            paintV2Stroke(
                g, px, py, tangent,
                len, weight, colour, alpha
            );
        }
    }
}



function paintStarCore(g, star) {
    const isMoon = star.type === "moon";
    const isMajor = star.type === "major";

    const count = isMoon ? 190 : isMajor ? 90 : 25;

    for (let i = 0; i < count; i++) {
        const theta = random(TWO_PI);
        const ratio = sqrt(random());
        const r = ratio * star.radius;

        const px = star.x + cos(theta) * r;
        const py = star.y + sin(theta) * r;

        // Mostly follow the circular paint direction
        const angle =
            theta + HALF_PI + random(-0.45, 0.45);

        const len = isMoon
            ? random(6, 12)
            : isMajor ? random(5, 10) : random(3, 6);

        const weight = isMoon
            ? random(3, 5.5)
            : isMajor ? random(2.5, 4.5) : random(1.5, 2.8);

        // Bright centre, warmer outer edges
        const colour = ratio < 0.55
            ? STAR_BRUSH_COLORS.core
            : random() < 0.65
                ? STAR_BRUSH_COLORS.warm
                : STAR_BRUSH_COLORS.glow;

        const alpha = map(ratio, 0, 1, 240, 145);

        paintV2Stroke(
            g, px, py, angle,
            len, weight, colour, alpha
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
