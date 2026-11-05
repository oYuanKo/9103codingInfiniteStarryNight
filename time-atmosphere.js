// Paint Time details in world space BEFORE the shared flow/exposure shader.
// Reuse two surfaces across worlds; never allocate one per animation frame.
const timePaintBuffers = [];
// AI acknowledgement (Yuan): Yuan's world-space compositing revision was made with OpenAI ChatGPT and its coding tools. 
// AI acknowledgement (Yuan): this note does not attribute the original star
function drawTimePaintLayer(slot, world, timeValues, opacity = 1) {
    let g = timePaintBuffers[slot];
    if (!g || g.width !== width || g.height !== height) {
        if (g) g.remove();
        g = timePaintBuffers[slot] = createGraphics(width, height);
        g.pixelDensity(1);
    }
    g.clear();
    drawTimeOriginalStars(g, world, timeValues);
    opacity *= timeValues.extraMarkOpacity;
    if (timeMechanic.showExtraMarks && opacity > 0) {
        drawTimeSkyStrokes(g, world, timeValues, opacity);
        drawTimeStarHighlights(g, world, timeValues, opacity);
    }
    return g;
}

function isTimeStarNearby(stars, x, y, margin) {
    // Leave space for the stars and moon in the original artwork, and ensure that any added brushstrokes do not cover them.
    for (let i = 0; i < stars.length; i++) {
        let star = stars[i];
        let distance = dist(x, y, star.x, star.y);
        let safeDistance = star.radius * 3 + margin;
        if (distance < safeDistance) return true;
    }
    return false;
}

function drawTimeSkyStrokes(g, world, timeValues, opacity) {
    // Draw only the sky above and the right side of the trees, without obscuring the mountains, villages, or cypress trees.
    // Fix the starting point; retain the base strokes at regular intervals, while allowing the intermediate strokes to gradually fade in based on density.
    // Do not directly alter the loop step size, so as to prevent the existing strokes from shifting or jumping as the density changes.
    const density = (36 - timeValues.strokeGap) / 18;
    for (let row = 0; row < 5; row++) {
        for (let mark = 0; mark < 31; mark++) {
            const visibility = mark % 2 === 0 ? 1 : density;
            if (visibility <= 0) continue;
            const x = 240 + mark * 18 + Math.sin(mark * 2.3 + row) * 4;
            // The base height for each line, plus two fluctuations—one large and one small.
            let rowHeight = 85 + row * 43;
            let waveAngle = x * 0.012 + row * 0.7;
            let mainWave = Math.sin(waveAngle) * 18;
            let smallWave = Math.sin(x * 0.037 + row * 2.7) * 8;
            let y = rowHeight + mainWave + smallWave + Math.sin(mark * 1.9 + row * 3) * 6;
            if (isTimeStarNearby(world.stars, x, y, 8)) continue;

            // Same curved paint body and pigment highlight as the original sky.
            const flow = getTimeFlow(world, x, y);
            const brightnessProgress = (timeValues.starBrightness - 0.2) / 0.8;
            const strokeOpacity = opacity * visibility * lerp(18, 85, brightnessProgress);
            const variation = (Math.sin(mark * 4.7 + row * 2.1) + 1) / 2;
            paintV2Stroke(g, x, y, flow.angle, lerp(10, 17, variation),
                lerp(2.2, 3.2, variation), [111, 159, 190], strokeOpacity);
        }
    }
}

function drawTimeStarHighlights(g, world, timeValues, opacity) {
    const stars = world.stars;
    const brightness = timeValues.starBrightness;
    // Increase only the intensity of the starlight brush strokes; do not brighten the entire image.
    // The original primary stars and the moon must remain unchanged, and the hover-effect (triggered when the mouse is positioned over an element) remains the responsibility of the respective team member.
    for (let i = 0; i < stars.length; i++) {
        let star = stars[i];
        if (star.type === 'small') continue;
        for (let mark = 0; mark < 18; mark++) {
            // Scattered within the existing starlight, at varying distances and in different directions—not forming concentric circles.
            let angle = mark * 2.4 + i * 0.7;
            let radiusVariation = (Math.sin(mark * 4.7 + i) + 1) / 2;
            let radius = star.radius * (0.25 + radiusVariation * 0.95);
            let markX = star.x + Math.cos(angle) * radius;
            let markY = star.y + Math.sin(angle) * radius;
            const brightnessProgress = (brightness - 0.2) / 0.8;
            const markOpacity = opacity * lerp(8, 145, brightnessProgress);
            paintV2Stroke(g, markX, markY, angle + Math.PI / 2,
                star.radius * 0.2, star.type === 'moon' ? 2.2 : 1.6,
                [255, 230, 156], markOpacity);
        }
    }
}

function drawTimeOriginalStars(g, world, timeValues) {
    // Redraw the strokes of the existing small stars; do not generate an additional set of stars.
    let starNumber = 0;
    for (const star of world.stars) {
        if (star.type !== 'small' || !star.timeStrokes) continue;
        // For example, 2.5: the first two are fully visible, while the third is half-visible.
        let visibility = Math.max(0, Math.min(1, timeValues.visibleStars - starNumber));
        starNumber++;
        if (visibility <= 0) continue;
        for (const mark of star.timeStrokes) {
            // The cypress tree remains in front of the starlight; do not add the brushstrokes obscured by the tree onto the tree itself.
            if (world.cypress && pointInCypress(mark.x, mark.y, world.cypress)) continue;
            paintV2Stroke(g, mark.x, mark.y, mark.angle, mark.len, mark.weight,
                mark.colour, mark.alpha * visibility);
        }
    }
}
