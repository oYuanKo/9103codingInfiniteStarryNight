// Time 的补充画面。AI acknowledgement: written with ChatGPT/Codex assistance.
// 用课堂的 for、if、数组、sin/cos、line/ellipse，以及 Week 10 的
// push/pop、translate/rotate/scale 绘图。不重新生成组员的世界。

function drawTimeWorld(world, camera, timeValues, opacity) {
    if (opacity <= 0) return;
    push();
    translate(camera.x, camera.y);
    scale(camera.zoom);
    drawTimeSkyStrokes(world, timeValues, opacity);
    drawTimeStarHighlights(world.stars, timeValues.starBrightness, opacity);
    drawTimeExtraStars(world, timeValues, opacity);
    pop();
}

function isTimeStarNearby(stars, x, y, margin) {
    // 给原画的星星和月亮留出空间，避免补充笔触盖住它们。
    for (let i = 0; i < stars.length; i++) {
        let star = stars[i];
        // Week 7 Tutorial 第 29 页：dist() 计算两点之间的距离。
        let distance = dist(x, y, star.x, star.y);
        let safeDistance = star.radius * 3 + margin;
        if (distance < safeDistance) return true;
    }
    return false;
}

function drawTimeSkyStrokes(world, timeValues, opacity) {
    // 只画上方天空和树的右侧，不覆盖山、村庄或柏树。
    // 原画笔触不变；这里的 strokeGap 控制补充笔触的间距。
    for (let row = 0; row < 5; row++) {
        for (let x = 240; x < 785; x = x + timeValues.strokeGap) {
            // 每行的基本高度，加上一大一小两次起伏。
            let rowHeight = 85 + row * 43;
            let waveAngle = x * 0.012 + row * 0.7;
            let mainWave = Math.sin(waveAngle) * 18;
            let smallWave = Math.sin(x * 0.037 + row * 2.7) * 8;
            let y = rowHeight + mainWave + smallWave;
            if (isTimeStarNearby(world.stars, x, y, 8)) continue;

            push();
            translate(x, y);
            // 方向从组员已有的流向图读取；Time 只控制这些笔触多密、多亮。
            rotate(getTimeStrokeAngle(world, x, y));
            // 保持原画的蓝色系，用细短线条表现额外的颜料笔触。
            // 亮度由 0.2 到 1，把它换成 0 到 1 的进度。
            let brightnessProgress = (timeValues.starBrightness - 0.2) / 0.8;
            let strokeOpacity = opacity * lerp(18, 145, brightnessProgress);
            let highlightOpacity = opacity * lerp(6, 65, brightnessProgress);
            stroke(111, 159, 190, strokeOpacity);
            strokeWeight(2.4);
            line(-7, 0, 7, 0);
            stroke(162, 192, 204, highlightOpacity);
            strokeWeight(0.8);
            line(-5, -0.7, 5, -0.7);
            pop();
        }
    }
}

function drawTimeStarHighlights(stars, brightness, opacity) {
    // 只增加星光笔触的强弱；不把整张画一起调亮。
    // 原本的主星和月亮始终保留，鼠标悬停光效仍由组员负责。
    for (let i = 0; i < stars.length; i++) {
        let star = stars[i];
        if (star.type === 'small') continue;
        for (let ring = 0; ring < 3; ring++) {
            for (let mark = 0; mark < 24; mark++) {
                // 用 sin 打散笔触，避免画成整齐的圆环。
                let circleAngle = mark / 24 * Math.PI * 2;
                let ringOffset = ring * 0.31;
                let angleVariation = Math.sin(mark * 1.7 + i) * 0.12;
                let angle = circleAngle + ringOffset + angleVariation;

                let radiusVariation = Math.sin(mark * 2.1 + ring) * 0.13;
                let radius = star.radius * (1.15 + ring * 0.34 + radiusVariation);
                let markX = star.x + Math.cos(angle) * radius;
                let markY = star.y + Math.sin(angle) * radius;
                push();
                translate(markX, markY);
                rotate(angle + Math.PI / 2);
                let brightnessProgress = (brightness - 0.2) / 0.8;
                let markOpacity = opacity * lerp(8, 175, brightnessProgress);
                stroke(255, 230, 156, markOpacity);
                if (star.type === 'moon') {
                    strokeWeight(2.2);
                } else {
                    strokeWeight(1.6);
                }
                line(-star.radius * 0.18, 0, star.radius * 0.18, 0);
                pop();
            }
        }
    }
}

function drawTimeExtraStars(world, timeValues, opacity) {
    // 在固定的天空网格中找空位。种子只改变取点的起点；不调用 random()
    // 或 noiseSeed()，所以不会打乱组员生成世界时使用的随机顺序。
    let starNumber = 0;
    for (let candidate = 0; candidate < 24 && starNumber < 6; candidate++) {
        // 24 个位置排成 6 列、4 行，按固定次序取点。
        let gridPosition = (candidate * 7 + world.seed) % 24;
        let column = gridPosition % 6;
        let row = Math.floor(gridPosition / 6);
        let x = width * (0.30 + column * 0.12);
        let y = height * (0.07 + row * 0.13);
        if (isTimeStarNearby(world.stars, x, y, 16)) continue;

        // 例如 visibleStars=2.5：前两颗全显现，第三颗显现一半。
        let visibility = timeValues.visibleStars - starNumber;
        if (visibility > 1) visibility = 1;
        if (visibility > 0) {
            drawTimeSmallStar(x, y, timeValues.starBrightness, visibility * opacity);
        }
        starNumber = starNumber + 1;
    }
}

function drawTimeSmallStar(x, y, brightness, opacity) {
    push();
    translate(x, y);
    // 一圈短笔触加一个小亮点；没有额外图片、发光滤镜或粒子系统。
    for (let mark = 0; mark < 7; mark++) {
        let circleAngle = mark / 7 * Math.PI * 2;
        let angleVariation = Math.sin(mark * 2.1) * 0.3;
        let angle = circleAngle + angleVariation;
        let radius = 4.3 + Math.sin(mark * 4.7) * 1.1;
        push();
        translate(Math.cos(angle) * radius, Math.sin(angle) * radius);
        rotate(angle + Math.PI / 2);
        stroke(241, 206, 119, opacity * (55 + brightness * 180));
        strokeWeight(1.8);
        line(-2, 0, 2, 0);
        pop();
    }
    noStroke();
    fill(255, 235, 170, opacity * (80 + brightness * 170));
    ellipse(0, 0, 5, 4.5);
    pop();
}
