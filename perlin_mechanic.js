let stars = [];
let worldPalette;
let flowField = [];
let brushStrokes = [];
let vortices = [];
let flowTime = 0;

const FLOW_TIME_SPEED = 0.003;
const FLOW_SPACING = 20;


// Different colour palettes for different universes
const WORLD_PALETTES = [
    {
        sky: [12, 32, 70],
        glow: [255, 197, 85],
        core: [255, 236, 171]
    },
    {
        sky: [7, 36, 50],
        glow: [128, 219, 198],
        core: [227, 246, 223]
    },
    {
        sky: [34, 22, 67],
        glow: [244, 166, 120],
        core: [255, 230, 185]
    }
];

const BRUSH_PALETTES = [
    // Blue universe
    [
        [65, 110, 175],
        [100, 155, 205],
        [150, 190, 220],
        [220, 185, 115]
    ],

    // Teal universe
    [
        [45, 115, 135],
        [90, 165, 175],
        [145, 205, 200],
        [220, 225, 170]
    ],

    // Purple universe
    [
        [90, 80, 155],
        [145, 120, 195],
        [185, 155, 215],
        [240, 175, 125]
    ]
];


function getFlowAngle(x, y, z = 0) {
    // Original Perlin direction
    const noiseValue = noise(
        x * debugParams.noiseScale,
        y * debugParams.noiseScale,
        z
    );

    const baseAngle = noiseValue * TWO_PI * 2;

    let vx = cos(baseAngle);
    let vy = sin(baseAngle);

    // Blend Perlin direction with vortices
    for (const vortex of vortices) {
        const dx = x - vortex.x;
        const dy = y - vortex.y;

        const distance = sqrt(dx * dx + dy * dy);

        if (distance >= vortex.radius || distance < 1) {
            continue;
        }

        // Strong near centre, weak near edge
        const falloff = 1 - distance / vortex.radius;
        const influence =
            vortex.strength * falloff * falloff;

        // Tangential direction around vortex
        const tx = -dy / distance * vortex.direction;
        const ty = dx / distance * vortex.direction;

        // Add a small outward spiral component
        const spiral = 0.12;

        vx += (tx + dx / distance * spiral) * influence;
        vy += (ty + dy / distance * spiral) * influence;
    }

    return atan2(vy, vx);
}




function generateUniverse(seed) {
    randomSeed(seed);
    noiseSeed(seed);

    const paletteIndex =
        Math.abs(seed) % WORLD_PALETTES.length;

    worldPalette = WORLD_PALETTES[paletteIndex];

    // 1. Generate stars
    stars = generateStarField();

    // 2. Generate vortex centres
    createVortices();

    // 3. Generate Perlin flow field
    createFlowField();

    // 4. Create moving brush strokes
    createBrushStrokes();

    console.log("Universe generated:", seed);
}



// Generate star positions and properties
function generateStarField() {
    const newStars = [];

    const starCount = floor(random(35, 65));

    for (let i = 0; i < starCount; i++) {
        const isMajor = i < 7;

        const star = {
            x: random(width * 0.12, width * 0.95),
            y: random(height * 0.13, height * 0.68),

            radius: isMajor
                ? random(8, 18)
                : random(1.1, 3.8),

            brightness: random(0.65, 1),
            glowSize: isMajor
                ? random(2.3, 3.6)
                : random(1.3, 2),

            isMajor: isMajor
        };

        newStars.push(star);
    }

    return newStars;
}

// Draw all generated stars
function displayStarField() {
    if (!worldPalette) return;

    push();
    noStroke();

    for (let star of stars) {
        const [r, g, b] = worldPalette.glow;
        const [cr, cg, cb] = worldPalette.core;

        // Outer glow
        fill(r, g, b, star.isMajor ? 22 : 8);
        circle(
            star.x,
            star.y,
            star.radius * star.glowSize * 2
        );

        // Inner glow
        fill(r, g, b, star.isMajor ? 65 : 28);
        circle(star.x, star.y, star.radius * 3);

        // Star core
        fill(cr, cg, cb, star.brightness * 255);
        circle(star.x, star.y, star.radius * 2);
    }

    pop();
}



function createFlowField() {
    flowField = [];

    for (let y = 20; y < height * 0.72; y += FLOW_SPACING) {
        for (let x = 10; x < width - 10; x += FLOW_SPACING) {

            // Slight random offsets for an organic layout
            let px = x + random(-5, 5);
            let py = y + random(-5, 5);

            // Get direction from the shared function
            let angle = getFlowAngle(px, py);

            flowField.push({
                x: px,
                y: py,
                angle: angle
            });
        }
    }

    console.log("Flow field created:", flowField.length);
}

function getFlowAngle(x, y, z = 0) {
    const noiseValue = noise(
        x * debugParams.noiseScale,
        y * debugParams.noiseScale,
        z
    );

    return noiseValue * TWO_PI * 2;
}


function displayFlowField() {
    if (!worldPalette) return;

    push();

    const [r, g, b] = worldPalette.core;

    stroke(r, g, b, 130);
    strokeWeight(1.6);

    for (let point of flowField) {
        let strokeLength = 13;

        let dx = cos(point.angle) * strokeLength / 2;
        let dy = sin(point.angle) * strokeLength / 2;

        line(
            point.x - dx,
            point.y - dy,
            point.x + dx,
            point.y + dy
        );
    }

    pop();
}


class BrushStroke {
    constructor(x, y) {
        // Position and movement
        this.position = createVector(x, y);
        this.velocity = createVector(0, 0);
        this.angle = 0;

        // Individual stroke properties
        this.length = random(12, 30);
        this.speed = random(0.5, 1.4);
        this.weight = random(1.2, 2.8);
        this.alpha = random(110, 200);

        // Colour from the current universe
        const paletteIndex =
            Math.abs(universeSeed) % BRUSH_PALETTES.length;

        this.colour = [
            ...random(BRUSH_PALETTES[paletteIndex])
        ];
        // Small individual variation
        this.noiseOffset = random(1000);
    }

    update(dt, z, speedMultiplier = 1) {
        // Read the Perlin Flow Field
        const baseAngle = getFlowAngle(
            this.position.x,
            this.position.y,
            z
        );

        // Add subtle independent variation
        const wobble = (
            noise(this.noiseOffset, z * 2) - 0.5
        ) * 0.2;

        this.angle = baseAngle + wobble;

        // Update velocity
        this.velocity.set(
            cos(this.angle),
            sin(this.angle)
        );

        this.velocity.mult(
            this.speed * speedMultiplier * dt
        );

        // Move the stroke
        this.position.add(this.velocity);

        // Wrap around the sky boundaries
        const top = 20;
        const bottom = height * 0.72;

        if (this.position.x > width) {
            this.position.x = 0;
        } else if (this.position.x < 0) {
            this.position.x = width;
        }

        if (this.position.y > bottom) {
            this.position.y = top;
        } else if (this.position.y < top) {
            this.position.y = bottom;
        }
    }


    display() {
        const [r, g, b] = this.colour;

        const x = this.position.x;
        const y = this.position.y;

        const ux = cos(this.angle);
        const uy = sin(this.angle);

        // Perpendicular direction
        const nx = -uy;
        const ny = ux;

        const half = this.length / 2;

        // A small bend for painterly appearance
        const bend =
            sin(this.noiseOffset) * this.length * 0.14;

        const points = [
            { x: x - ux * half, y: y - uy * half },
            {
                x: x - ux * half * 0.33 + nx * bend * 0.5,
                y: y - uy * half * 0.33 + ny * bend * 0.5
            },
            {
                x: x + ux * half * 0.33 + nx * bend,
                y: y + uy * half * 0.33 + ny * bend
            },
            { x: x + ux * half, y: y + uy * half }
        ];

        noFill();
        strokeCap(ROUND);

        // Wider, translucent paint layer
        stroke(r, g, b, this.alpha * 0.25);
        strokeWeight(this.weight * 2.8);

        beginShape();
        for (const p of points) {
            vertex(p.x, p.y);
        }
        endShape();

        // Narrow, brighter paint layer
        stroke(r, g, b, this.alpha);
        strokeWeight(this.weight);

        beginShape();
        for (const p of points) {
            vertex(p.x, p.y);
        }
        endShape();
    }

}

// Create all brush strokes for the current universe
function createBrushStrokes() {
    brushStrokes = [];
    flowTime = 0;

    for (let i = 0; i < debugParams.brushCount; i++) {
        const x = random(0, width);
        const y = random(20, height * 0.72);

        brushStrokes.push(new BrushStroke(x, y));
    }

    console.log("Brush strokes created:", brushStrokes.length);
}

// Update all moving strokes
function updateBrushStrokes(dt, speedMultiplier = 1) {
    flowTime += FLOW_TIME_SPEED * dt;

    for (let stroke of brushStrokes) {
        stroke.update(dt, flowTime, speedMultiplier);
    }
}

// Render all moving strokes
function displayBrushStrokes() {
    push();

    strokeCap(ROUND);

    for (let stroke of brushStrokes) {
        stroke.display();
    }

    pop();
}


function createVortices() {
    vortices = [
        {
            // Main spiral near the centre of the sky
            x: width * 0.44 + random(-25, 25),
            y: height * 0.34 + random(-15, 15),
            radius: min(width, height) * debugParams.vortexRadius,
            strength: debugParams.vortexStrength,
            direction: 1
        },
        {
            // Smaller secondary spiral
            x: width * 0.73 + random(-20, 20),
            y: height * 0.49 + random(-20, 20),
            radius: min(width, height) * 0.25,
            strength: 4.0,
            direction: -1
        }
    ];
}


function displayStarHalos() {
    if (!worldPalette) return;

    push();
    noFill();
    strokeCap(ROUND);

    for (let i = 0; i < stars.length; i++) {
        const star = stars[i];

        // Only major stars receive large halos
        if (!star.isMajor) continue;

        // Gentle breathing animation
        const phase = frameCount * 0.01 + i * 0.65;
        const pulse = 1 + 0.04 * sin(phase);

        const baseRadius = star.radius * 2.5;

        for (let ring = 0; ring < 3; ring++) {
            const radius =
                baseRadius + ring * star.radius * 0.8;

            const start =
                i * 1.9 + ring * 2.2 +
                frameCount * 0.001 * (ring % 2 === 0 ? 1 : -1);

            const end =
                start + PI * (1.2 - ring * 0.12);

            const [r, g, b] = worldPalette.glow;

            stroke(r, g, b, 100 - ring * 24);
            strokeWeight(max(1, 2.5 - ring * 0.6));

            arc(
                star.x,
                star.y,
                radius * 2 * pulse,
                radius * 2 * pulse,
                start,
                end
            );
        }
    }

    pop();
}


function resizeBrushStrokes(targetCount) {
    targetCount = Math.floor(targetCount);

    // Add new strokes when increasing count
    while (brushStrokes.length < targetCount) {
        const x = random(0, width);
        const y = random(20, height * 0.72);

        brushStrokes.push(new BrushStroke(x, y));
    }

    // Remove extra strokes when decreasing count
    if (brushStrokes.length > targetCount) {
        brushStrokes.length = targetCount;
    }
}
