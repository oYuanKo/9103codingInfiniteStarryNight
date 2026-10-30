# 9103codingInfiniteStarryNight
Creative coding major project (Final)
# Infinite Starry Night 🌌

## Project Overview

**Course:** Creative Coding  
**Artwork:** *The Starry Night* – Vincent van Gogh  
**Platform:** p5.js (JavaScript)

Our project reinterprets Van Gogh's *The Starry Night* as an interactive and dynamic artwork.

Through generative visuals, sound, and time-based changes, we aim to bring the painting to life and create an immersive experience.

Users can explore different layers of the artwork by zooming in, moving from the night sky into space and stars, creating a journey through interconnected worlds.

## Team Responsibilities

| Member / Branch | Main Responsibility |
|---|---|
| Yuan / `yuan` | Perlin Noise & Randomness + User Input (Zoom & Navigation) |
| Qingyang Fang / `audio` | Audio-based Interactions |
| Yang Wu / `time-based` | Time-based Effects & Transitions |


## Time-based mechanic — Yang Wu

My part changes the rhythm of the painting over time. I wanted the brushstrokes
to speed up until the sky looks still, then gradually start moving again.

The cycle lasts 60 seconds:

| Time | What happens |
|---|---|
| 0–30 seconds | The flow accelerates. Short paint trails begin blending in near the peak. |
| 30–40 seconds | The blended painting stays visually still. |
| 40–60 seconds | The trails fade and clear movement gradually returns. |

The effect follows the painting's existing flow directions and colours. It uses
a small blend of nearby paint samples, so the stars do not turn into rotating rings.
This is a visual effect created by blending the painting, rather than a physical
simulation of motion becoming invisible.

The earlier extra-star and sky-stroke layer is kept in the code but switched off
in this version. The original stars and moon remain available for navigation.

### Code structure

- `time-mechanic.js` calculates the cycle, flow speed and paint blending.
- `time-integration.js` connects these values to the shared renderer and handles pause and reset.
- `brush_flow_shader.js` blends the existing paint samples along their flow direction.
- `time-atmosphere.js` retains the earlier optional star and stroke drawings.

Time uses elapsed time from the existing draw loop. The values change through
simple arithmetic and `lerp()`.

### How to try it

Watch the painting for one minute to see the full cycle. Click the painting once to start music.

- **Space:** pause or continue the Time cycle, flow and music.
- **F:** turn flow off or on. Time also pauses while flow is off.
- **Scroll:** zoom and move between worlds.
- **Q / W / E:** change the world and start the cycle again from Calm.

Time pauses while a world is loading or a transition is happening. If the
transition is cancelled, the cycle continues from where it stopped. When the
world changes, the cycle starts again. It also pauses while the browser tab is hidden.

I also connected Space with Qingyang Fang's Audio module so the picture, music
and transition sounds pause together and continue from the same place. The music
keeps its own scene and mouse controls.

I also noticed a small dark gap in the centre of the sky vortex. I widened the
existing centre brushstroke to fill it, and checked that the flow animation,
zoom and star navigation still worked correctly.

**AI acknowledgement:** ChatGPT/Codex assisted with my Time implementation, shared pause and vortex fix.

## GitHub 使用指南

### 1. 下载项目（第一次）

```bash
git clone https://github.com/oYuanKo/9103codingInfiniteStarryNight.git
cd 9103codingInfiniteStarryNight
```

### 2. 创建自己的 Branch（第一次）

```bash
git switch -c 自己的名字
git push -u origin 自己的名字
```

每个人在自己的 branch 开发，不要直接修改 `main`。

### 3. 开始写代码前（同步 main）

```bash
git switch main
git pull --ff-only origin main
git switch 自己的名字
git merge main
```

### 4. 写完代码后（上传修改）

```bash
git add .
git commit -m "描述本次修改"
git push
```

### 5. 合并到 Main

在 GitHub 网站上创建 **Pull Request**：

`自己的 branch → main`

检查后点击 **Merge pull request**。

### Useful Commands

| Command | Description |
|---|---|
| `git branch` | 查看本地分支 |
| `git switch 分支名` | 切换分支 |
| `git status` | 查看修改状态 |
| `git pull` | 拉取当前分支的最新代码 |
| `git push` | 上传已提交的修改 |

## 文件调用说明

### 如何接入自己的模块

请尽量把自己的功能写在独立 JS 文件里，不要直接改复杂的 Camera、Portal、Brush Detail 或 Shader 内部逻辑。`group_bridge.js` 已提供以下实际接口，模块应在它加载后使用：

- `StarryNight.getState()`：读取当前状态；未就绪时 `ready` 为 false。
- `StarryNight.setFlowSpeed(value)` / `StarryNight.setFlowStrength(value)`：设置允许调整的 Flow 参数；接受有限数字，分别限制在 0–3 / 0–30。
- `StarryNight.onFrame(callback)`：接收每帧的 `(dt, state)`。
- `StarryNight.onUniverseChanged(callback)`：接收含 `previous`、`current` 的世界变化事件。
- `StarryNight.onPortal(callback)`：接收过渡事件，包含 `phase`、进度等信息。

以上订阅方法都会返回取消订阅函数。最简单的例子：

```javascript
const unsubscribe = StarryNight.onFrame((dt, state) => {
  if (!state.ready) return;
  // 在这里更新自己的模块；dt 的单位是毫秒。
});
// 不再需要时调用 unsubscribe();
```

`onFrame` 在当前帧绘制完成后执行，修改通常影响下一帧。若要画新的图层，请先和组员协调一个安全的绘制调用位置，不要重新定义全局 `draw()`；状态订阅接口并不等同于图层绘制接口。

### 一起开发时的小约定

先同步最新 `main`，再在自己的分支开发；尽量只修改自己模块的 JS 文件。改 `index.html`、`app_controller.js`、`group_bridge.js`、`brush_flow_shader.js` 等共享文件前先沟通，不直接覆盖别人的实现。测试后创建 Pull Request，经检查再合入 `main`。已有 `v3` 工作继续保留，之后单独审查和集成，不要用 `main` 替换它。

详细接口和测试见 [GROUP_INTEGRATION.md](GROUP_INTEGRATION.md)；开发过程见 [开发历史](docs/DEVELOPMENT_HISTORY.md)，未采用的实验保存在 [实验档案](experiments/cosmic_threshold/README.md)。


## Notes

- Always work on your own branch.
- Pull and merge the latest `main` before starting new work.
- Keep individual features in separate `.js` files where possible.
- Use Pull Requests to merge completed features into `main`.
- Communicate before editing shared files such as `sketch.js`.

## Use of AI Statement:
ChatGPT (OpenAI) and Codex were used to improve code quality; help with difficult features;
