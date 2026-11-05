// Time-based mechanic — Yang Wu.
// ChatGPT/Codex helped Yang Wu with the elapsed-time clock and keyframe interpolation.
// Calculate the Time cycle and the values it passes to the painting.

// Timing is in seconds. Speed uses the renderer's flow parameter.
const paintingTimeSettings = {
    cycleSeconds: 34,
    startSpeed: 1.8,
    peakTime: 29.85,
    restartTime: 31.57,
    starAppearStart: 8,
    starAppearInterval: 2.4,
    starAppearFade: 1.2,
    starLeaveDelay: 1.5,
    starLeaveInterval: 0.8,
    starLeaveFade: 0.6
};

// Each row contains seconds, flow speed, blending amount and restart offset.
const timeKeyframes = [
    [0, 1.8, 0, 0],
    [8, 1.8, 0, 0],
    [16, 1.8, 0, 0],
    [20, 1.83, 0, 0],
    [22, 2.16, 0, 0],
    [24, 5.15, 0.0002, 0],
    [25, 10.41, 0.001, 0],
    [26, 21.41, 0.0048, 0],
    [27, 40.93, 0.0199, 0],
    [28, 68.84, 0.071, 0],
    [29, 97.09, 0.2124, 0],
    [29.85, 108, 0.4527, 0],
    [30.5, 100.21, 0.7021, 0],
    [31, 83.55, 0.8827, 0],
    [31.07, 80.6, 0.9031, 0],
    [31.2, 66.47, 0.9358, 0],
    [31.35, 26.65, 0.9635, 0],
    [31.45, 6.03, 0.9749, 0],
    [31.57, 0, 0.98, 0],
    [31.67, 0.0012, 0.9794, 0.00003],
    [31.8, 0.01, 0.9729, 0.0007],
    [32, 0.07, 0.9394, 0.008],
    [32.4, 0.4, 0.7628, 0.0719],
    [32.8, 0.92, 0.4792, 0.1663],
    [33.2, 1.43, 0.2, 0.1475],
    [33.6, 1.74, 0.0337, 0.0335],
    [34, 1.8, 0, 0],
];

class TimeMechanic {
    constructor() {
        this.enabled = false;
        this.showExtraMarks = true;
        this.reset();
    }

    reset() {
        // All Time effects share one clock for pause and world changes.
        this.starBrightness = 0.2;
        this.visibleStars = 2; // Number of visible small stars.
        this.strokeGap = 36;  // Smaller gaps make the extra sky strokes denser.
        this.paintingTime = 0;
        this.hasLooped = false;
        this.paintSpeed = paintingTimeSettings.startSpeed;
        this.paintBlend = 0; // 0 samples one position. 1 blends a full motion cycle.
        this.paintRestartOffset = 0;
        // Choose the star timings on reset and reuse them while drawing.
        this.starAppearTimes = this.makeStarTimes(paintingTimeSettings.starAppearInterval);
        this.starLeaveTimes = this.makeStarTimes(paintingTimeSettings.starLeaveInterval);
    }

    update(elapsedMilliseconds) {
        // The main draw loop supplies the elapsed milliseconds.
        // Ignore invalid values to keep the cycle running correctly.
        if (!Number.isFinite(elapsedMilliseconds)) return;
        if (elapsedMilliseconds <= 0) return;
        const settings = paintingTimeSettings;
        const cycleSeconds = settings.cycleSeconds;
        if (this.paintingTime + elapsedMilliseconds / 1000 >= cycleSeconds) this.hasLooped = true;
        // Wrap at the end of the cycle and carry any extra time into the next one.
        this.paintingTime = (this.paintingTime + elapsedMilliseconds / 1000) % cycleSeconds;
        this.updatePaintingLoop();
        this.updateAtmosphere();
    }

    updatePaintingLoop() {
        this.paintSpeed = this.curveValue(this.paintingTime, 1);
        this.paintBlend = this.curveValue(this.paintingTime, 2);
        this.paintRestartOffset = this.curveValue(this.paintingTime, 3);
    }

    curveValue(seconds, column) {
        // Use lerp() to join adjacent keyframes into a smooth curve.
        for (let i = 0; i < timeKeyframes.length - 1; i++) {
            const a = timeKeyframes[i];
            const b = timeKeyframes[i + 1];
            if (seconds > b[0]) continue;
            const duration = b[0] - a[0];
            const progress = (seconds - a[0]) / duration;
            // Two control values use neighbouring slopes to smooth the joins.
            const values = [a[column],
                a[column] + this.changeRate(i, column) * duration / 3,
                b[column] - this.changeRate(i + 1, column) * duration / 3,
                b[column]];
            for (let remaining = 3; remaining > 0; remaining--) {
                for (let j = 0; j < remaining; j++) {
                    values[j] = lerp(values[j], values[j + 1], progress);
                }
            }
            return values[0];
        }
        return timeKeyframes[timeKeyframes.length - 1][column];
    }

    changeRate(index, column) {
        // Flatten the endpoints and peak. Elsewhere, use the gentler slope.
        if (index === 0 || index === timeKeyframes.length - 1) return 0;
        const before = timeKeyframes[index - 1];
        const here = timeKeyframes[index];
        const after = timeKeyframes[index + 1];
        const arriving = (here[column] - before[column]) / (here[0] - before[0]);
        const leaving = (after[column] - here[column]) / (after[0] - here[0]);
        if (arriving * leaving <= 0) return 0;
        if (arriving > 0) return Math.min(arriving, leaving);
        return Math.max(arriving, leaving);
    }

    updateAtmosphere() {
        const settings = paintingTimeSettings;
        const progress = this.paintingTime / settings.cycleSeconds;
        const peak = settings.peakTime / settings.cycleSeconds;
        const restart = settings.restartTime / settings.cycleSeconds;
        // Starlight and stroke density build throughout the rise.
        let intensity;
        if (progress < peak) {
            intensity = this.smoothProgress(progress / peak);
        } else if (progress < restart) {
            // Starlight and stroke density fall as the paint settles.
            intensity = this.smoothProgress((1 - progress) / (1 - peak));
        } else {
            const startingIntensity = this.smoothProgress((1 - restart) / (1 - peak));
            intensity = startingIntensity * (1 - this.paintSpeed / settings.startSpeed);
        }
        this.starBrightness = lerp(0.2, 1, intensity);
        this.updateStarCount();
        this.strokeGap = lerp(36, 18, intensity);
    }

    updateStarCount() {
        const s = paintingTimeSettings;
        // Ten additional small stars fade in one at a time as the sky speeds up.
        const appeared = this.countStarChanges(this.paintingTime - s.starAppearStart,
            this.starAppearTimes, s.starAppearFade);
        const lastAppear = s.starAppearStart + 9 * s.starAppearInterval + s.starAppearFade;
        const leaveStart = lastAppear + s.starLeaveDelay;
        let leavingTime = this.paintingTime - leaveStart;
        // Let the small stars keep fading out across the loop boundary.
        if (leavingTime < 0 && this.hasLooped) leavingTime += s.cycleSeconds;
        if ((leavingTime >= 0 && this.paintingTime < s.starAppearStart) || this.paintingTime >= leaveStart) {
            this.visibleStars = 12 - this.countStarChanges(leavingTime,
                this.starLeaveTimes, s.starLeaveFade);
        } else this.visibleStars = 2 + appeared;
    }

    makeStarTimes(interval) {
        const times = [];
        for (let i = 0; i < 10; i++) {
            // Math.random() keeps the star timings separate from p5's seeded paint sequence.
            let jitter = 0;
            if (i > 0 && i < 9) jitter = (Math.random() - 0.5) * interval * 0.8;
            times.push(i * interval + jitter);
        }
        return times;
    }

    countStarChanges(elapsed, times, fadeSeconds) {
        let count = 0;
        for (let i = 0; i < times.length; i++) {
            const time = times[i];
            const progress = Math.max(0, Math.min(1, (elapsed - time) / fadeSeconds));
            count += this.smoothProgress(progress);
        }
        return count;
    }

    smoothProgress(progress) {
        // Map cosine to a 0–1 fade with a gentle start and finish.
        return (1 - Math.cos(progress * Math.PI)) / 2;
    }

}

let timeMechanic = new TimeMechanic();
