// Time-based mechanic — Yang Wu.
// ChatGPT/Codex-assisted: Time cycle and interpolation.
// 课堂依据：Week 8 的 class；Week 10 第 8–19 页的 lerp()。
// 这个文件只算时间和数值，不生成世界，也不控制滚轮。

class TimeMechanic {
    constructor() {
        this.enabled = true;
        this.phaseDuration = 10000; // 毫秒：10000 毫秒 = 10 秒。
        this.reset();
    }

    reset() {
        this.phase = 0;
        this.recoveryStep = 0;
        this.phaseTime = 0;
        this.phaseName = 'Calm';

        // 四项输出。flowSpeed 是速度，不是组员代码里的摆动幅度 strength。
        this.flowSpeed = 0;
        this.starBrightness = 0.2;
        this.visibleStars = 2; // 补充小星星的数量；原画的星星一直保留。
        this.strokeGap = 36;  // 补充天空笔触的间距；越小，笔触越密。

        this.rememberStartValues();
        this.setTargets();
    }

    rememberStartValues() {
        // 下一步从当前值开始，避免在两个阶段之间突然跳变。
        this.startFlowSpeed = this.flowSpeed;
        this.startStarBrightness = this.starBrightness;
        this.startVisibleStars = this.visibleStars;
        this.startStrokeGap = this.strokeGap;
    }

    setTargets() {
        if (this.phase === 0) {
            this.phaseName = 'Calm';
            this.targetFlowSpeed = 0.2;
            this.targetStarBrightness = 0.4;
            this.targetVisibleStars = 3;
            this.targetStrokeGap = 30;
        } else if (this.phase === 1) {
            this.phaseName = 'Active';
            this.targetFlowSpeed = 0.7;
            this.targetStarBrightness = 0.7;
            this.targetVisibleStars = 4;
            this.targetStrokeGap = 24;
        } else if (this.phase === 2) {
            this.phaseName = 'Peak';
            this.targetFlowSpeed = 1.4;
            this.targetStarBrightness = 1;
            this.targetVisibleStars = 6;
            this.targetStrokeGap = 18;
        } else {
            this.phaseName = 'Recovery';
            // Recovery 一共有三个十秒步骤，沿原来的数值逐步退回。
            if (this.recoveryStep === 0) {
                this.targetFlowSpeed = 0.7;
                this.targetStarBrightness = 0.7;
                this.targetVisibleStars = 4;
                this.targetStrokeGap = 24;
            } else if (this.recoveryStep === 1) {
                this.targetFlowSpeed = 0.2;
                this.targetStarBrightness = 0.4;
                this.targetVisibleStars = 3;
                this.targetStrokeGap = 30;
            } else {
                this.targetFlowSpeed = 0;
                this.targetStarBrightness = 0.2;
                this.targetVisibleStars = 2;
                this.targetStrokeGap = 36;
            }
        }
    }

    update(elapsedMilliseconds) {
        // elapsedMilliseconds 是这次经过的时间，由小组现有画面提供。
        // 辅助检查：Number.isFinite() 判断传入的时间是不是正常的有限数值。
        // 它不是已找到的课堂例子；保留它是为了防止异常时间破坏循环。
        if (!Number.isFinite(elapsedMilliseconds)) return;
        if (elapsedMilliseconds <= 0) return;
        this.phaseTime = this.phaseTime + elapsedMilliseconds;

        // 如果这一帧跨过了阶段边界，保留多出来的时间。
        while (this.phaseTime >= this.phaseDuration) {
            this.flowSpeed = this.targetFlowSpeed;
            this.starBrightness = this.targetStarBrightness;
            this.visibleStars = this.targetVisibleStars;
            this.strokeGap = this.targetStrokeGap;
            this.phaseTime = this.phaseTime - this.phaseDuration;
            this.changePhase();
        }

        // 例如：经过 5 秒 / 总共 10 秒 = 0.5，表示走到一半。
        let progress = this.phaseTime / this.phaseDuration;
        // lerp(起始值, 目标值, 进度)，与原型的“起始值 + 差值 × 进度”等价。
        this.flowSpeed = lerp(this.startFlowSpeed, this.targetFlowSpeed, progress);
        this.starBrightness = lerp(this.startStarBrightness, this.targetStarBrightness, progress);
        this.visibleStars = lerp(this.startVisibleStars, this.targetVisibleStars, progress);
        this.strokeGap = lerp(this.startStrokeGap, this.targetStrokeGap, progress);
    }

    changePhase() {
        if (this.phase === 3) {
            if (this.recoveryStep < 2) {
                this.recoveryStep = this.recoveryStep + 1;
            } else {
                this.phase = 0;
                this.recoveryStep = 0;
            }
        } else {
            this.phase = this.phase + 1;
        }
        this.rememberStartValues();
        this.setTargets();
    }
}

let timeMechanic = new TimeMechanic();
