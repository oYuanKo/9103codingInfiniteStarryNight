// Time-based mechanic — Yang Wu.
// 这个文件只算时间和数值，不生成世界，也不控制滚轮。

// 整幅画的速度曲线。时间单位为秒，速度沿用现有画面的参数。
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

// 每行：[秒数，流速，融合量，起步位移]。
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
        this.enabled = true;
        this.showExtraMarks = true;
        this.reset();
    }

    reset() {
        // 所有效果共用 paintingTime，暂停和换世界时一起处理。
        this.starBrightness = 0.2;
        this.visibleStars = 2; // 原有小星的显现数量；主星和月亮始终保留。
        this.strokeGap = 36;  // 补充天空笔触的间距；越小，笔触越密。
        this.paintingTime = 0;
        this.hasLooped = false;
        this.paintSpeed = paintingTimeSettings.startSpeed;
        this.paintBlend = 0; // 0：单个运动位置；1：混合一个周期内的运动位置。
        this.paintRestartOffset = 0;
        // 每次重新进入世界时生成时间表，绘制期间不重新随机。
        this.starAppearTimes = this.makeStarTimes(paintingTimeSettings.starAppearInterval);
        this.starLeaveTimes = this.makeStarTimes(paintingTimeSettings.starLeaveInterval);
    }

    update(elapsedMilliseconds) {
        // elapsedMilliseconds 是这次经过的时间，由小组现有画面提供。
        // 忽略无效时间，避免破坏循环。
        if (!Number.isFinite(elapsedMilliseconds)) return;
        if (elapsedMilliseconds <= 0) return;
        const settings = paintingTimeSettings;
        const cycleSeconds = settings.cycleSeconds;
        if (this.paintingTime + elapsedMilliseconds / 1000 >= cycleSeconds) this.hasLooped = true;
        // 余数让循环重新开始，同时保留这一帧多出来的时间。
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
        // 用数组、循环和 lerp()，将相邻时间点连成柔和曲线。
        for (let i = 0; i < timeKeyframes.length - 1; i++) {
            const a = timeKeyframes[i];
            const b = timeKeyframes[i + 1];
            if (seconds > b[0]) continue;
            const duration = b[0] - a[0];
            const progress = (seconds - a[0]) / duration;
            // 中间两个控制值沿用相邻点的变化方向，避免连接处突然换挡。
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
        // 首尾和峰顶收平；其他点取两边较缓的变化率。
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
        // 星星和笔触仍在整段上升过程中渐增，不集中到高速时才出现。
        let intensity;
        if (progress < peak) {
            intensity = this.smoothProgress(progress / peak);
        } else if (progress < restart) {
            // 星光和密度随曲线回落，直到静止后的起步点。
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
        // 额外十颗小星逐颗淡入，最后一颗在加速末段仍然出现。
        const appeared = this.countStarChanges(this.paintingTime - s.starAppearStart,
            this.starAppearTimes, s.starAppearFade);
        const lastAppear = s.starAppearStart + 9 * s.starAppearInterval + s.starAppearFade;
        const leaveStart = lastAppear + s.starLeaveDelay;
        let leavingTime = this.paintingTime - leaveStart;
        // 循环换轮不清空星星；上一轮的退场继续到新一轮开头。
        if (leavingTime < 0 && this.hasLooped) leavingTime += s.cycleSeconds;
        if ((leavingTime >= 0 && this.paintingTime < s.starAppearStart) || this.paintingTime >= leaveStart) {
            this.visibleStars = 12 - this.countStarChanges(leavingTime,
                this.starLeaveTimes, s.starLeaveFade);
        } else this.visibleStars = 2 + appeared;
    }

    makeStarTimes(interval) {
        const times = [];
        for (let i = 0; i < 10; i++) {
            // 使用独立随机数，避免改变原画的 randomSeed() 绘画顺序。
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
        // cos 从 1 变到 -1，换算成首尾柔和的 0–1 进度。
        return (1 - Math.cos(progress * Math.PI)) / 2;
    }

}

let timeMechanic = new TimeMechanic();
