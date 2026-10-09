let stars = [];
let worldPalette;
let flowField = [];
let brushStrokes = [];
let flowTime = 0;

const BRUSH_COUNT = 320;
const FLOW_TIME_SPEED = 0.003;

const FLOW_SPACING = 20;
const FLOW_NOISE_SCALE = 0.006;

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

function getFlowAngle(x, y, z = 0) {
    const noiseValue = noise(
        x * FLOW_NOISE_SCALE,
        y * FLOW_NOISE_SCALE,
        z
    );

    return noiseValue * TWO_PI * 2;
}


function generateUniverse(seed) {
    randomSeed(seed);
    noiseSeed(seed);

    const paletteIndex =
        Math.abs(seed) % WORLD_PALETTES.length;

    worldPalette = WORLD_PALETTES[paletteIndex];

    // Generate stars
    stars = generateStarField();

    // Generate static flow field
    createFlowField();

    // Generate animated brush strokes
    createBrushStrokes();

    console.log("Universe generated:", seed);
    console.log("Number of stars:", stars.length);
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
        x * FLOW_NOISE_SCALE,
        y * FLOW_NOISE_SCALE,
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
        this.length = random(8, 22);
        this.speed = random(0.8, 1.8);
        this.weight = random(1, 2.5);
        this.alpha = random(90, 185);

        // Colour from the current universe
        this.colour = random() < 0.65
            ? [...worldPalette.core]
            : [...worldPalette.glow];

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

        stroke(r, g, b, this.alpha);
        strokeWeight(this.weight);

        const half = this.length / 2;

        const dx = cos(this.angle) * half;
        const dy = sin(this.angle) * half;

        line(
            this.position.x - dx,
            this.position.y - dy,
            this.position.x + dx,
            this.position.y + dy
        );
    }
}

// Create all brush strokes for the current universe
function createBrushStrokes() {
    brushStrokes = [];
    flowTime = 0;

    for (let i = 0; i < BRUSH_COUNT; i++) {
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
