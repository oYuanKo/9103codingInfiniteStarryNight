# Infinite Starry Night 🌌

Creative Coding major project | p5.js, JavaScript and WebGL

> Review draft for `main` at `78490ce6`. Resolve the **[TEAM TO CONFIRM]** notes and the sections left for Qingyang Fang before using this as the final submission README.

## Overview and inspiration

Our project reinterprets Vincent van Gogh's [*The Starry Night* (1889)](https://www.moma.org/collection/works/79802) as an interactive painting. We keep the blue and yellow palette, curved brush marks, bright stars, moon, village and cypress, then use code to give the painted sky movement and depth.

The viewer can disturb the flow with the mouse, awaken light around a star, and scroll into that star to discover another painted world. Sound responds to exploration, while a repeating Time cycle changes the painting's movement, starlight and density. The idea is to extend the feeling of movement in the original painting into an experience the viewer can explore.

The picture is generated from brushstrokes rather than displayed as a downloaded painting image. Each world has a seeded layout, so we can return to the same composition while its animation continues to change.

## How to interact

Start by watching the painting for about 35 seconds, then explore it with the mouse.

| Control | What it does |
|---|---|
| Move the mouse over the painting | Disturbs nearby paint flow. Faster movement also increases the music's playback rate. |
| Hover over a major star or the moon | Gradually spreads extra light made from brushstrokes. The music grows louder with the light. Small stars are not portals or hover-light targets. |
| Scroll inward | Zooms towards the pointer. At the normal zoom limit, keep the pointer over a major star or the moon and continue scrolling to enter its world. |
| Scroll outward | Zooms out. At the minimum zoom, keep scrolling to move into the parent world. An outer world can also be generated from the starting world. |
| Reverse scrolling during a portal transition | Reverses the transition. Scrolling back to its starting boundary cancels it. |
| Click the painting | Starts or unlocks audio if the browser has blocked autoplay. |
| **Space** | Pauses or resumes paint flow, the Time cycle and music, including transition sounds. Navigation controls remain available. |
| **F** | Turns paint flow off or on. The Time cycle also pauses while flow is off; this is separate from the shared music pause. |
| **C** | Toggles cursor disturbance and star-hover light. |
| **[ / ]** | Decreases or increases flow strength. |
| **R** | Resets the camera in the current world and cancels an unfinished portal. |
| **Q / W / E** | Rebuilds the world using seed 12, 89 or 205, and restarts the Time cycle. |
| **H** or the guide button | Shows or hides the interaction guide. |


## Team responsibilities

| Member | Main mechanic and contribution |
|---|---|
| **Yuan** | **Perlin Noise & Randomness**, plus user input, cursor-centred zoom and nested-world navigation. Developed the painterly core, shader flow, brush detail and star-hover light. Also worked on shared integration and later Time-layer/blending refinements. |
| **Qingyang Fang** | **Audio-based interactions**. **[TO BE COMPLETED BY QINGYANG FANG]** |
| **Yang Wu** | **Time-based effects and transitions**. Developed the Time cycle, changing small stars and sky highlights, and their integration with the shared painting. Also connected Space to the Audio module and repaired gaps in the painted vortex. |

These are the main responsibilities, not exclusive ownership of every shared file. Audio, Time and the core painting work together through the same application. Yang's shared audio-pause work and Yuan's later Time-rendering refinements build on the relevant mechanic owner's implementation.

## Techniques and technical decisions

### 1. Perlin Noise and Randomness: building the painting

`brush_renderer_v2.js` builds the sky from curved brush marks. Perlin noise gives neighbouring positions related directions and colours, while random variation changes individual marks' position, length, width and tone. This keeps neighbouring strokes related without making every mark identical. A separate vortex influence bends the directions around the centre of the sky. `artwork.js` adds the landscape, village and cypress.

Both `randomSeed()` and `noiseSeed()` are set when a world is generated. The same seed and generation conditions reproduce the base composition. A child world's seed is derived from its parent seed and the selected star ID, so a particular entrance has a stable destination. The navigation graph stores the actual parent-child relationship separately from these seeds.

The painting is drawn into an offscreen buffer and reused. A direction texture stores horizontal direction, vertical direction and local movement strength in its colour channels. In `brush_flow_shader.js`, the fragment shader reads this texture and shifts where it samples the painted image over time. The main animation therefore does not need to redraw every original brushstroke each frame. Lower movement weights around important forms help keep the composition recognisable.

### 2. User input, nested worlds and close-up detail

`zoom_camera.js` converts between screen and painting coordinates. Zoom is centred on the pointer, so the area being explored stays near the cursor. Normal camera zoom runs from 1× to 3×. Continuing inward over a major star or the moon starts a portal into a child painting; continuing outward at 1× opens the parent world.

`nested_universe_v2.js` keeps world nodes, navigation links and saved cameras. Portal progress comes from wheel input, so the viewer can stop or reverse the transition. The shader gradually combines the colours, structure and flow of the two paintings. This is a 2D rendering technique, not a physical 3D scene or a one-to-one morph between individual strokes.

New worlds are generated in small steps across frames and cached for reuse. When zoomed in, `brush_detail_v2.js` replays recorded brush geometry into local high-resolution textures, then adds two levels of smaller brush marks. This preserves painted detail better than enlarging the base image alone. `star_hover_light_v2.js` adds temporary light strokes that grow during a hover and fade after the pointer leaves, without changing the world's seed.

The title describes the feeling of continuing into connected worlds. Detail has finite levels, and cached ancestors can use more memory as exploration goes deeper.

### 3. Audio-based interactions

**[TO BE COMPLETED BY QINGYANG FANG]**

### 4. Time: changing the painting's rhythm

The Time mechanic repeats over **34 seconds**. It begins gently, gradually accelerates, reaches a short rounded peak near 30 seconds, then settles to rest as the paint blending becomes strongest. The same painting starts moving again slowly. Its clarity and sky highlights return with the restarting movement rather than through a separate fade timer.

The moon and main stars keep their positions. Small stars appear using their saved original brushstrokes and home positions. They begin appearing after eight seconds at uneven intervals averaging 2.4 seconds. After a 1.5-second wait following the appearance sequence, they leave at uneven intervals averaging 0.8 seconds. Their exit continues into the beginning of the next loop. The intervals are chosen on reset, not randomised on every frame.

Three files organise this mechanic:

- `time-mechanic.js` uses one elapsed-time clock and a `timeKeyframes` array to calculate speed, paint blending, restart movement, star visibility and sky-stroke density.
- `time-atmosphere.js` draws saved small-star strokes and additional sky highlights.
- `time-integration.js` connects these values and paint layers to the existing renderer, world state and pause controls.

Repeated `lerp()` calls join the keyframe values into smooth curves. Cosine easing softens star fades. `Math.random()` creates uneven star timings without advancing the p5 random sequence used to generate the painting. These choices combine arrays, loops, interpolation and maths while keeping the base composition stable.

The shared shader combines samples of moving paint to create the exposure/blending effect. The small stars and extra sky strokes use the painting's flow direction, strength and clock so they settle and restart with the rest of the paint. Yang developed the Time mechanic and its integration; Yuan's later shared-renderer work refined how these Time layers move and blend with the base painting.

## Code structure and collaboration

There is one p5 application, with one `setup()` and `draw()` entry point in `sketch.js`.

| Files | Purpose |
|---|---|
| `index.html`, `style.css`, `ui_overlay.js` | Script loading, presentation and interaction guide |
| `sketch.js`, `app_controller.js`, `input_controller.js` | p5 callbacks, frame order and input routing |
| `brush_renderer_v2.js`, `artwork.js` | Base brush painting and landscape |
| `brush_flow_shader.js`, `brush_detail_v2.js` | Animated paint sampling, portal blending and close-up detail |
| `zoom_camera.js`, `nested_universe_v2.js` | Camera, world generation, navigation and cache |
| `star_hover_light_v2.js` | Interactive light around major stars and the moon |
| `group_bridge.js` | Shared state and frame, portal and world-change events |
| `audio_module.js`, `assets/` | Music, transition sound and audio processing |
| `time-mechanic.js`, `time-atmosphere.js`, `time-integration.js` | Time calculations, Time paint layers and integration |

For group development, keep separate features in their own files where possible, sync with `main` before starting work, and use a feature branch and pull request. Coordinate changes to shared files rather than replacing another member's implementation. Do not create another global p5 `draw()` function. Bridge subscriptions return cleanup functions, and `onFrame` receives elapsed milliseconds and a state snapshot after drawing.

See [GROUP_INTEGRATION.md](GROUP_INTEGRATION.md) for the bridge API and existing browser-test instructions. [DEVELOPMENT_HISTORY.md](docs/DEVELOPMENT_HISTORY.md) records the earlier core iterations. [PRODUCTION_RELEASE.md](docs/PRODUCTION_RELEASE.md), [legacy/](legacy/README.md) and the [cosmic experiments](experiments/cosmic_threshold/README.md) describe older releases or archived approaches, not additional modes in the current application. In particular, older notes saying Audio or Time is still pending predate their integration.

## AI acknowledgement

This README was initially generated with AI assistance and is to be reviewed and edited by each group member.

[ChatGPT](https://chatgpt.com/overview/) and [Codex](https://openai.com/codex/) from OpenAI were used to help with difficult features and improve code quality, as recorded in the project's earlier README. AI also assisted in consolidating this README from the repository documentation and current code.

- **Yuan:** **[TEAM TO CONFIRM: identify the tools used, the specific features/files they helped with, what code or suggestions were adopted, and how that work was checked.]** The core techniques are explained above; this note is needed to identify which parts were AI-assisted accurately.
- **Qingyang Fang:** **[TO BE COMPLETED BY QINGYANG FANG]**
- **Yang Wu:** the existing acknowledgement states that ChatGPT/Codex assisted with the Time implementation, shared pause and vortex fix. The Time code uses an elapsed-time clock, keyframe interpolation and saved paint layers. The shared pause stores playing sounds and remaining timer durations so they resume from the same place. The vortex repair adjusts existing brush geometry to fill the centre gap. **[TEAM TO CONFIRM: add the exact assistance received and review/testing performed, including any other AI use.]**

**[TEAM TO CONFIRM: all members should check that this statement covers the full development process, any AI-generated media and this documentation. Add any required prompt or conversation references.]**

## References and asset credits

### Artwork and technical documentation

These links identify the artwork and document APIs used in the implementation. They do not imply that example code was copied from these pages.

- [Vincent van Gogh, *The Starry Night*, MoMA](https://www.moma.org/collection/works/79802): the visual reference for the palette, composition, stars and painted sky.
- [p5.js `noise()`](https://p5js.org/reference/p5/noise/): explains the smooth spatial variation used for brush direction, colour and landscape.
- [p5.js `randomSeed()`](https://p5js.org/reference/p5/randomSeed/) and [`noiseSeed()`](https://p5js.org/reference/p5/noiseSeed/): document the seeded generation used to reconstruct a world's base painting.
- [p5.js `createShader()`](https://p5js.org/reference/p5/createShader/): documents the GLSL shader interface used for the GPU rendering path.
- [p5.js `lerp()`](https://p5js.org/reference/p5/lerp/): documents interpolation used in the Time curves and other smooth changes.
- **Audio references: [TO BE COMPLETED BY QINGYANG FANG]**

**[TEAM TO CONFIRM: add any tutorials, external examples, borrowed/adapted code or other visual references actually used during development. For each, link the original source and explain the relevant file/function and changes made. Documentation links above do not replace those credits.]**

### Audio assets

| File | Use | Creator, source and licence |
|---|---|---|
| `assets/scene-01.mp3` | First scene's looping music | **[TO BE COMPLETED BY QINGYANG FANG]** |
| `assets/scene-02.wav` | Second scene's looping music | **[TO BE COMPLETED BY QINGYANG FANG]** |
| `assets/scene-03.mp3` | Third and deeper scenes' looping music | **[TO BE COMPLETED BY QINGYANG FANG]** |
| `assets/starfield-transition.wav` | Portal transition cue | **[TO BE COMPLETED BY QINGYANG FANG]** |

For each asset, add its title, creator, original source link, licence or permission, and any editing performed. If it is original or AI-generated, state who made it and how. The credits for an older, removed transition cue should not be applied to these current files.
