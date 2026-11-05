// deltaTime 的单位是毫秒：由已有 draw() 每帧提供，不再另开一个计时器。
let timeWorldId = null;
let timePreviousFlow = null;
let timeSkipNextFrame = false;
let timeCalmPreview = new TimeMechanic();

// 回到页面时，不把后台停留的时间一次算进去。
document.addEventListener('visibilitychange', function () {
    timeSkipNextFrame = true;
});

function updateTimeMechanic(elapsedMilliseconds, state) {
    if (!state.ready) return;
    if (!timeMechanic.enabled) {
        if (timePreviousFlow !== null) {
            brushFlowSettings.speed = timePreviousFlow.speed;
            brushFlowSettings.timeBlend = timePreviousFlow.timeBlend;
            brushFlowSettings.restartOffset = timePreviousFlow.restartOffset;
            timePreviousFlow = null;
        }
        timeWorldId = null;
        return;
    }

    if (timePreviousFlow === null) {
        timePreviousFlow = {
            speed: brushFlowSettings.speed,
            timeBlend: brushFlowSettings.timeBlend || 0,
            restartOffset: brushFlowSettings.restartOffset || 0
        };
    }

    if (timeWorldId !== state.universe.id) {
        // 首次进入、成功换世界、Q/W/E 换种子：都从 Calm 开始。
        timeWorldId = state.universe.id;
        timeMechanic.reset();
    } else {
        advanceTimeIfPlaying(elapsedMilliseconds, state);
    }
    timeSkipNextFrame = false;

    // Time 传入速度、融合量和起步位移；方向、颜色和笔触仍来自原画。
    // strength 仍由原来的 [ / ] 按键控制。
    brushFlowSettings.speed = timeMechanic.paintSpeed;
    brushFlowSettings.timeBlend = timeMechanic.paintBlend;
    brushFlowSettings.restartOffset = timeMechanic.paintRestartOffset;
}

function advanceTimeIfPlaying(elapsedMilliseconds, state) {
    // 每行检查一种暂停情况，全部通过后才计时。
    if (state.flow.paused) return; // 按下了 Space。
    if (!state.flow.enabled) return; // 按 F 关闭了流动。
    if (state.portal) return; // 正在两个世界之间穿梭。
    if (state.loading) return; // 正在等待世界生成。
    if (document.hidden) return; // 页面进入后台。
    if (timeSkipNextFrame) return; // 刚从后台返回。
    timeMechanic.update(elapsedMilliseconds);
}

// The shader now transports and exposes Time paint together with the base paint.
function getTimePaintLayers(parentWorld, portal) {
    if (!portal) {
        const parent = drawTimePaintLayer(0, parentWorld, timeMechanic);
        return {parent, child: parent};
    }
    const leavingChild = nestedV2.transition.direction === 'out';
    const parentTime = leavingChild ? timeCalmPreview : timeMechanic;
    const childTime = leavingChild ? timeMechanic : timeCalmPreview;
    // Preserve the existing extra-mark exit/entry windows during navigation.
    // Original small stars follow the shader's structure transition, once only.
    return {
        parent: drawTimePaintLayer(0, parentWorld, parentTime,
            Math.max(0, 1 - portal.progress / 0.42)),
        child: drawTimePaintLayer(1, portal.child, childTime,
            Math.max(0, (portal.progress - 0.72) / 0.28))
    };
}

function getTimeFlow(world, x, y) {
    // 工程连接：复用组员的 flowMap，和已有悬停光效读取方向的方式相同。
    // 读取像素里保存的横、纵方向和流动强度。
    let map = world.flowMap;
    let column = Math.floor(x / width * map.width);
    let row = Math.floor(y / height * map.height);
    // 坐标必须落在流向图里面，不能读到图外。
    if (column < 0) column = 0;
    if (column >= map.width) column = map.width - 1;
    if (row < 0) row = 0;
    if (row >= map.height) row = map.height - 1;

    // 每个像素占 4 个数。组员用前两个数保存横、纵方向。
    let pixelNumber = row * map.width + column;
    let firstChannel = pixelNumber * 4;
    let directionX = map.pixels[firstChannel] / 127.5 - 1;
    let directionY = map.pixels[firstChannel + 1] / 127.5 - 1;
    const length = Math.hypot(directionX, directionY);
    if (length > 0.1) {
        directionX /= length;
        directionY /= length;
    } else {
        directionX = 0;
        directionY = 0;
    }
    return {x: directionX, y: directionY,
        strength: map.pixels[firstChannel + 2] / 255,
        angle: Math.atan2(directionY, directionX)};
}
