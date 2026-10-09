// Mountains and cypress, etc.
const MOUNTAIN_PALETTES = [
    // Distant hills: lighter blue
    [
        [35, 65, 112],
        [45, 79, 128],
        [59, 96, 146],
        [79, 117, 160]
    ],

    // Foreground hills: darker blue
    [
        [12, 29, 64],
        [20, 42, 82],
        [29, 55, 100],
        [43, 75, 119]
    ]
];

// Deterministic ridge based on Perlin Noise
function mountainRidgeY(x, layer) {
    const t = x / width;

    const distant = layer === 0;
    const baseY = height * (distant ? 0.69 : 0.82);

    const broadWave = sin(
        t * TWO_PI * (distant ? 1.3 : 1.0) +
        (distant ? 0.5 : 2.0)
    ) * height * 0.028;

    const terrainNoise =
        (noise(x * 0.007, 47 + layer * 37) - 0.5) *
        height * 0.095;

    const fineNoise =
        (noise(x * 0.022, 90 + layer * 31) - 0.5) *
        height * 0.012;

    return baseY + broadWave + terrainNoise + fineNoise;
}

// Paint mountains entirely with brushstrokes
function paintBrushMountains(g) {
    for (let layer = 0; layer < 2; layer++) {
        const palette = MOUNTAIN_PALETTES[layer];
        const spacing = 8;

        const startY = height * (
            layer === 0 ? 0.55 : 0.70
        );

        // Dense painted mountain surface
        for (let y = startY; y < height + 12; y += spacing) {
            for (let x = -12; x < width + 12; x += spacing) {
                const px = x + random(-3, 3);
                const py = y + random(-3, 3);

                const ridge = mountainRidgeY(px, layer);

                // Stay inside the mountain region
                if (py < ridge - 4) continue;

                const depth = constrain(
                    (py - ridge + 4) / 20, 0, 1
                );

                // Follow the local slope
                const slope =
                    mountainRidgeY(px + 9, layer) -
                    mountainRidgeY(px - 9, layer);

                const angle =
                    atan2(slope, 18) +
                    (noise(px * 0.02, py * 0.02, 18 + layer) - 0.5) * 0.55;

                const n = noise(
                    px * 0.013,
                    py * 0.015,
                    31 + layer * 12
                );

                const colourIndex = constrain(
                    floor(n * palette.length),
                    0,
                    palette.length - 1
                );

                const colour = palette[colourIndex];

                // Softer at the ridge, denser inside
                const alpha = lerp(80, 245, depth);

                paintV2Stroke(
                    g,
                    px,
                    py,
                    angle,
                    random(13, 24),
                    random(6, 10),
                    colour,
                    alpha
                );
            }
        }

        // Fine directional texture
        for (let i = 0; i < 650; i++) {
            const x = random(width);
            const y = random(startY, height);

            const ridge = mountainRidgeY(x, layer);

            if (y < ridge + 5) continue;

            const slope =
                mountainRidgeY(x + 8, layer) -
                mountainRidgeY(x - 8, layer);

            const angle =
                atan2(slope, 16) + random(-0.25, 0.25);

            paintV2Stroke(
                g,
                x,
                y,
                angle,
                random(8, 18),
                random(1.3, 3),
                random(palette),
                random(75, 150)
            );
        }
    }
}

// How strongly should the mountains move?
function getMountainFlowWeight(x, y) {
    let weight = 1.0;

    const farRidge = mountainRidgeY(x, 0);
    const nearRidge = mountainRidgeY(x, 1);

    function smoothTransition(distance) {
        const t = constrain((distance + 8) / 28, 0, 1);
        return t * t * (3 - 2 * t);
    }

    const farBlend = smoothTransition(y - farRidge);
    weight = lerp(weight, 0.18, farBlend);

    const nearBlend = smoothTransition(y - nearRidge);
    weight = lerp(weight, 0.05, nearBlend);

    return weight;
}

const VILLAGE_PALETTE = {
    wall: [
        [160, 180, 210],
        [135, 155, 188],
        [118, 138, 170]
    ],
    roof: [
        [70, 86, 118],
        [56, 70, 98],
        [82, 96, 128]
    ],
    shadow: [45, 56, 82],
    highlight: [210, 220, 235],
    steeple: [35, 45, 68]
};

function pointInTriangle(px, py, ax, ay, bx, by, cx, cy) {
    const v0x = cx - ax;
    const v0y = cy - ay;
    const v1x = bx - ax;
    const v1y = by - ay;
    const v2x = px - ax;
    const v2y = py - ay;

    const dot00 = v0x * v0x + v0y * v0y;
    const dot01 = v0x * v1x + v0y * v1y;
    const dot02 = v0x * v2x + v0y * v2y;
    const dot11 = v1x * v1x + v1y * v1y;
    const dot12 = v1x * v2x + v1y * v2y;

    const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
    const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    const v = (dot00 * dot12 - dot01 * dot02) * invDenom;

    return u >= 0 && v >= 0 && u + v <= 1;
}

function generateVillageLayout() {
    const houses = [];

    let x = width * 0.06;

    while (x < width * 0.78) {
        const w = random(16, 28);
        const h = random(10, 22);

        // Put the village in front of the far ridge
        const baseY =
            mountainRidgeY(x, 0) + random(24, 36);

        houses.push({
            x,
            baseY,
            w,
            h,
            roofH: random(6, 11)
        });

        x += w + random(4, 10);
    }

    const steepleX = width * 0.43 + random(-10, 10);
    const steepleBaseY = mountainRidgeY(steepleX, 0) + 28;

    return {
        houses,
        steeple: {
            x: steepleX,
            baseY: steepleBaseY,
            w: 16,
            h: 52,
            spireH: 22
        }
    };
}

function paintVillageHouseBody(g, house) {
    const left = house.x - house.w / 2;
    const right = house.x + house.w / 2;
    const top = house.baseY - house.h;

    const strokeCount = Math.floor(house.w * house.h * 0.22);

    for (let i = 0; i < strokeCount; i++) {
        const px = random(left, right);
        const py = random(top, house.baseY);

        const colour = random(VILLAGE_PALETTE.wall);

        const angle =
            random(-0.18, 0.18) +
            (noise(px * 0.03, py * 0.03, 51) - 0.5) * 0.25;

        paintV2Stroke(
            g,
            px,
            py,
            angle,
            random(4, 9),
            random(1.2, 2.4),
            colour,
            random(150, 230)
        );
    }

    // darker shadow line near the bottom
    for (let i = 0; i < 10; i++) {
        paintV2Stroke(
            g,
            random(left, right),
            house.baseY - random(0, 3),
            random(-0.1, 0.1),
            random(5, 10),
            random(1.2, 2),
            VILLAGE_PALETTE.shadow,
            random(120, 190)
        );
    }
}

function paintVillageHouseRoof(g, house) {
    const ax = house.x - house.w / 2;
    const ay = house.baseY - house.h;

    const bx = house.x + house.w / 2;
    const by = house.baseY - house.h;

    const cx = house.x;
    const cy = house.baseY - house.h - house.roofH;

    for (let i = 0; i < 55; i++) {
        const px = random(ax, bx);
        const py = random(cy, ay);

        if (!pointInTriangle(px, py, ax, ay, bx, by, cx, cy)) {
            continue;
        }

        const colour = random(VILLAGE_PALETTE.roof);
        const angle = random(-0.45, 0.45);

        paintV2Stroke(
            g,
            px,
            py,
            angle,
            random(4, 8),
            random(1, 2.2),
            colour,
            random(130, 210)
        );
    }
}

function paintVillageSteeple(g, steeple) {
    const left = steeple.x - steeple.w / 2;
    const right = steeple.x + steeple.w / 2;
    const top = steeple.baseY - steeple.h;

    // body
    for (let i = 0; i < 120; i++) {
        const px = random(left, right);
        const py = random(top, steeple.baseY);

        paintV2Stroke(
            g,
            px,
            py,
            random(HALF_PI - 0.25, HALF_PI + 0.25),
            random(5, 11),
            random(1.4, 2.7),
            random() < 0.75
                ? VILLAGE_PALETTE.steeple
                : VILLAGE_PALETTE.wall[0],
            random(145, 220)
        );
    }

    // spire triangle
    const ax = left;
    const ay = top;
    const bx = right;
    const by = top;
    const cx = steeple.x;
    const cy = top - steeple.spireH;

    for (let i = 0; i < 80; i++) {
        const px = random(ax, bx);
        const py = random(cy, ay);

        if (!pointInTriangle(px, py, ax, ay, bx, by, cx, cy)) {
            continue;
        }

        paintV2Stroke(
            g,
            px,
            py,
            random(HALF_PI - 0.4, HALF_PI + 0.4),
            random(4, 9),
            random(1.2, 2.3),
            VILLAGE_PALETTE.steeple,
            random(150, 220)
        );
    }
}

function paintBrushVillage(g) {
    if (!brushV2.village) return;

    // low horizontal village band to connect houses
    for (let i = 0; i < 220; i++) {
        const x = random(width * 0.04, width * 0.8);
        const y = mountainRidgeY(x, 0) + random(22, 40);

        paintV2Stroke(
            g,
            x,
            y,
            random(-0.12, 0.12),
            random(7, 16),
            random(1.3, 2.8),
            random(VILLAGE_PALETTE.wall),
            random(70, 130)
        );
    }

    for (const house of brushV2.village.houses) {
        paintVillageHouseBody(g, house);
        paintVillageHouseRoof(g, house);
    }

    paintVillageSteeple(g, brushV2.village.steeple);

    // a few light accents
    for (let i = 0; i < 40; i++) {
        const x = random(width * 0.06, width * 0.78);
        const y = mountainRidgeY(x, 0) + random(20, 36);

        paintV2Stroke(
            g,
            x,
            y,
            random(-0.2, 0.2),
            random(3, 6),
            random(0.8, 1.6),
            VILLAGE_PALETTE.highlight,
            random(90, 160)
        );
    }
}

function getVillageFlowWeight(x, y) {
    if (!brushV2.village) return 1.0;

    let weight = 1.0;

    for (const house of brushV2.village.houses) {
        const left = house.x - house.w / 2 - 6;
        const right = house.x + house.w / 2 + 6;
        const top = house.baseY - house.h - house.roofH - 6;
        const bottom = house.baseY + 5;

        if (x >= left && x <= right && y >= top && y <= bottom) {
            weight = Math.min(weight, 0.08);
        }
    }

    const s = brushV2.village.steeple;
    if (s) {
        const left = s.x - s.w / 2 - 6;
        const right = s.x + s.w / 2 + 6;
        const top = s.baseY - s.h - s.spireH - 6;
        const bottom = s.baseY + 5;

        if (x >= left && x <= right && y >= top && y <= bottom) {
            weight = Math.min(weight, 0.04);
        }
    }

    return weight;
}