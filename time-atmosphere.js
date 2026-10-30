// 绘制原有小星和天空高亮，坐标沿用世界和相机。

function drawTimeWorld(world, camera, timeValues, opacity, starOpacity = opacity) {
    if (opacity <= 0 && starOpacity <= 0) return;
    push();
    translate(camera.x, camera.y);
    scale(camera.zoom);
    drawTimeOriginalStars(world, timeValues, starOpacity);
    if (timeMechanic.enabled && timeMechanic.showExtraMarks) {
        drawTimeSkyStrokes(world, timeValues, opacity);
        drawTimeStarHighlights(world.stars, timeValues.starBrightness, opacity);
    }
    pop();
}

function isTimeStarNearby(stars, x, y, margin) {
    // 给原画的星星和月亮留出空间，避免补充笔触盖住它们。
    for (let i = 0; i < stars.length; i++) {
        let star = stars[i];
        let distance = dist(x, y, star.x, star.y);
        let safeDistance = star.radius * 3 + margin;
        if (distance < safeDistance) return true;
    }
    return false;
}

function drawTimeSkyStrokes(world, timeValues, opacity) {
    // 只画上方天空和树的右侧，不覆盖山、村庄或柏树。
    // 固定位置，每隔一笔保留基础笔触，中间的笔触随密度逐渐淡入。
    // 不直接改变循环步长，避免原有笔触随着密度变化滑动或跳位。
    const density = (36 - timeValues.strokeGap) / 18;
    for (let row = 0; row < 5; row++) {
        for (let mark = 0; mark < 31; mark++) {
            const visibility = mark % 2 === 0 ? 1 : density;
            if (visibility <= 0) continue;
            const x = 240 + mark * 18 + Math.sin(mark * 2.3 + row) * 4;
            // 每行的基本高度，加上一大一小两次起伏。
            let rowHeight = 85 + row * 43;
            let waveAngle = x * 0.012 + row * 0.7;
            let mainWave = Math.sin(waveAngle) * 18;
            let smallWave = Math.sin(x * 0.037 + row * 2.7) * 8;
            let y = rowHeight + mainWave + smallWave + Math.sin(mark * 1.9 + row * 3) * 6;
            if (isTimeStarNearby(world.stars, x, y, 8)) continue;

            push();
            translate(x, y);
            // 方向从组员已有的流向图读取；Time 只控制这些笔触多密、多亮。
            rotate(getTimeStrokeAngle(world, x, y));
            // 保持原画的蓝色系，用细短线条表现额外的颜料笔触。
            // 亮度由 0.2 到 1，把它换成 0 到 1 的进度。
            let brightnessProgress = (timeValues.starBrightness - 0.2) / 0.8;
            let strokeOpacity = opacity * visibility * lerp(18, 85, brightnessProgress);
            let highlightOpacity = opacity * visibility * lerp(6, 35, brightnessProgress);
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
        for (let mark = 0; mark < 18; mark++) {
            // 分散在原有星光内，距离和方向各不相同，不围成同心圆。
            let angle = mark * 2.4 + i * 0.7;
            let radiusVariation = (Math.sin(mark * 4.7 + i) + 1) / 2;
            let radius = star.radius * (0.25 + radiusVariation * 0.95);
            let markX = star.x + Math.cos(angle) * radius;
            let markY = star.y + Math.sin(angle) * radius;
            push();
            translate(markX, markY);
            rotate(angle + Math.PI / 2);
            let brightnessProgress = (brightness - 0.2) / 0.8;
            let markOpacity = opacity * lerp(8, 145, brightnessProgress);
            stroke(255, 230, 156, markOpacity);
            if (star.type === 'moon') {
                strokeWeight(2.2);
            } else {
                strokeWeight(1.6);
            }
            line(-star.radius * 0.10, 0, star.radius * 0.10, 0);
            pop();
        }
    }
}

function drawTimeOriginalStars(world, timeValues, opacity) {
    // 重画原有小星的笔触，不再额外生成一套星星。
    let starNumber = 0;
    for (const star of world.stars) {
        if (star.type !== 'small' || !star.timeStrokes) continue;
        // 例如 2.5：前两颗完整显现，第三颗显现一半。
        let visibility = Math.max(0, Math.min(1, timeValues.visibleStars - starNumber));
        if (!timeMechanic.enabled) visibility = 1;
        starNumber++;
        if (visibility <= 0) continue;
        for (const mark of star.timeStrokes) {
            // 柏树仍在星光前面；不把被树遮住的笔触补到树上。
            if (world.cypress && pointInCypress(mark.x, mark.y, world.cypress)) continue;
            paintV2Stroke(window, mark.x, mark.y, mark.angle, mark.len, mark.weight,
                mark.colour, mark.alpha * visibility * opacity);
        }
    }
}
