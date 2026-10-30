// Time-based mechanic — Yang Wu.
// 这个文件只算时间和数值，不生成世界，也不控制滚轮。

// 整幅画的速度曲线。时间单位为秒，速度沿用现有画面的参数。
const paintingTimeSettings = {
    cycleSeconds: 34,
    startSpeed: 1.8,
    peakSpeed: 108,
    risePower: 36, // 较大的上升指数让低速铺垫更长。
    fallPower: 5,  // 较小的回落指数让峰值靠后、高速更短。
    exposureRisePower: 52,
    exposureFallPower: 4, // 融合最强处作为静止后的起步点。
    settleSeconds: 0.5, // 在融合末尾收住运动。
    maxBlend: 0.98
};

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
        this.paintSpeed = paintingTimeSettings.startSpeed;
        this.paintBlend = 0; // 0：单个运动位置；1：混合一个周期内的运动位置。
        this.restartTravel = 0;
        this.paintRestartOffset = 0;
    }

    update(elapsedMilliseconds) {
        // elapsedMilliseconds 是这次经过的时间，由小组现有画面提供。
        // 忽略无效时间，避免破坏循环。
        if (!Number.isFinite(elapsedMilliseconds)) return;
        if (elapsedMilliseconds <= 0) return;
        const settings = paintingTimeSettings;
        const cycleSeconds = settings.cycleSeconds;
        // 余数让循环重新开始，同时保留这一帧多出来的时间。
        this.paintingTime = (this.paintingTime + elapsedMilliseconds / 1000) % cycleSeconds;
        this.updatePaintingLoop();
        this.updateAtmosphere();
    }

    updatePaintingLoop() {
        const settings = paintingTimeSettings;
        const progress = this.paintingTime / settings.cycleSeconds;
        const restart = settings.exposureRisePower /
            (settings.exposureRisePower + settings.exposureFallPower);

        // 一条完整圆峰曲线决定整轮速度，不在某一秒额外叠加强加速。
        const speedCurve = this.roundedPeak(progress, settings.risePower, settings.fallPower);
        this.paintSpeed = lerp(settings.startSpeed, settings.peakSpeed, speedCurve);

        // 同一个循环进度，融合的圆峰稍晚，让恢复过程保持连贯。
        const exposureCurve = this.roundedPeak(progress,
            settings.exposureRisePower, settings.exposureFallPower);
        this.paintBlend = settings.maxBlend * exposureCurve;

        // 融合末尾平滑收住运动。
        const settle = restart - settings.settleSeconds / settings.cycleSeconds;
        if (progress > settle && progress < restart) {
            const settling = (progress - settle) / (restart - settle);
            this.paintSpeed *= 1 - this.easeAcceleration(settling);
        }

        this.restartTravel = 0;
        this.paintRestartOffset = 0;
        if (progress >= restart) {
            const starting = (progress - restart) / (1 - restart);
            // 从同一帧的 0 速度起步，不重置渲染器累积的运动位置。
            this.paintSpeed = settings.startSpeed * this.easeAcceleration(starting);
            // 对上面的起步速度求累计距离，再归一到 0–1。
            // 刚起步几乎没有位移，因此画面也不会先发生淡出变化。
            this.restartTravel = Math.pow(starting, 4) * (5 - 6 * starting + 2 * starting * starting);
            this.paintBlend = settings.maxBlend * (1 - this.easeAcceleration(this.restartTravel));
            // 让融合后的画面本身先动起来，而不是只由模糊变清楚。
            const startingSeconds = settings.cycleSeconds * (1 - restart);
            const distance = this.restartTravel * settings.startSpeed * startingSeconds / 2;
            this.paintRestartOffset = Math.sin(distance) * this.paintBlend;
        }
    }

    roundedPeak(progress, risePower, fallPower) {
        // 上升量与回落量相乘，形成两端为 0、中间为 1 的平滑圆峰。
        // 除以峰值位置，把最高点归一到 1，方便交给 lerp()。
        if (progress <= 0 || progress >= 1) return 0;
        const peak = risePower / (risePower + fallPower);
        const rising = Math.pow(progress / peak, risePower);
        const falling = Math.pow((1 - progress) / (1 - peak), fallPower);
        return Math.min(1, rising * falling);
    }

    updateAtmosphere() {
        const settings = paintingTimeSettings;
        const progress = this.paintingTime / settings.cycleSeconds;
        const peak = settings.risePower / (settings.risePower + settings.fallPower);
        const restart = settings.exposureRisePower /
            (settings.exposureRisePower + settings.exposureFallPower);
        // 星星和笔触仍在整段上升过程中渐增，不集中到高速时才出现。
        let intensity;
        if (progress < peak) {
            intensity = this.easeAcceleration(progress / peak);
        } else if (progress < restart) {
            // 星光和密度随曲线回落，直到静止后的起步点。
            intensity = this.easeAcceleration((1 - progress) / (1 - peak));
        } else {
            const startingIntensity = this.easeAcceleration((1 - restart) / (1 - peak));
            intensity = startingIntensity * (1 - this.easeAcceleration(this.restartTravel));
        }
        this.starBrightness = lerp(0.2, 1, intensity);
        this.visibleStars = lerp(2, 12, intensity);
        this.strokeGap = lerp(36, 18, intensity);
    }

    easeAcceleration(progress) {
        // S 形进度：从 0 到 1，两端的变化率都回到 0。
        // 10p³ - 15p⁴ + 6p⁵，用基本乘法算出，再交给 lerp()。
        const squared = progress * progress;
        const cubed = squared * progress;
        return cubed * (10 - 15 * progress + 6 * squared);
    }

}

let timeMechanic = new TimeMechanic();
