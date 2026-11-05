# Infinite Starry Night 🌌

Creative Coding major project | p5.js, JavaScript and WebGL

> Review draft for `main` at `78490ce6`. Resolve the **[TEAM TO CONFIRM]** notes and the sections left for Qingyang Fang before using this as the final submission README.

## Overview and inspiration

Our project reinterprets Vincent van Gogh's [*The Starry Night* (1889)](https://www.moma.org/collection/works/79802) as an interactive painting. We keep the blue and yellow palette, curved brush marks, bright stars, moon, village and cypress, then use code to give the painted sky movement and depth.

The viewer can disturb the flow with the mouse, awaken light around a star, and scroll into that star to discover another painted world. Sound responds to exploration, while a repeating Time cycle changes the painting's movement, starlight and density. The idea is to extend the feeling of movement in the original painting into an experience the viewer can explore.

The picture is generated from brushstrokes rather than displayed as a downloaded painting image. Each world has a seeded layout, so we can return to the same composition while its animation continues to change.

## How to interact

The painting starts with normal flow and Time off. Select **Start Time** to watch its 34-second cycle, or explore immediately with the mouse.

| Control | What it does |
|---|---|
| Move the mouse over the painting | Disturbs nearby paint flow. When Time is off, faster movement also increases the music's playback rate. When Time is on, only the Time cycle controls music speed. |
| Hover over a major star or the moon | Gradually spreads extra light made from brushstrokes. The music grows louder with the light. Small stars are not portals or hover-light targets. |
| Scroll inward | Zooms towards the pointer. At the normal zoom limit, keep the pointer over a major star or the moon and continue scrolling to enter its world. |
| Scroll outward | Zooms out. At the minimum zoom, keep scrolling to move into the parent world. An outer world can also be generated from the starting world. |
| Reverse scrolling during a portal transition | Reverses the transition. Scrolling back to its starting boundary cancels it. |
| Click the painting | Starts or unlocks audio if the browser has blocked autoplay. |
| **Start Time / Stop Time** | Start Time begins a fresh 34-second cycle of changing paint flow, starlight, sky density and music speed. While enabled, Time alone controls music speed. Stop Time returns to normal flow and mouse-controlled music speed. F pauses or resumes the running cycle together with the painting and music. Zooming and world navigation remain available. |
| **Start Time / Stop Time** | Start Time begins a fresh 34-second cycle of changing paint flow, starlight and sky density. Stop Time returns to normal flow. F pauses or resumes the running cycle together with the painting and music. |
| **F** | Pauses or resumes paint flow, the Time cycle and music, including transition sounds. Navigation controls remain available. |
| **C** | Toggles cursor disturbance and star-hover light. Developer only, not shown in guidance for user |
| **[ / ]** | Decreases or increases flow strength. Developer only, not shown in guidance for user |
| **R** | Restarts the original world (seed 12), clears navigation, resets the camera and Time, resumes normal flow, and restarts the first music track. |
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

The title describes the feeling of continuing into connected worlds. Detail has finite levels. Drawing resources are bounded to eight world slots including generation; navigation links and seeds remain available, and evicted paintings are regenerated with the same composition when revisited. This bounds drawing resources rather than the size of the navigation graph; rebuilding can add generation time on a return visit.

### 3. Audio-based interactions

**[TO BE COMPLETED BY QINGYANG FANG: review and expand this implementation summary, personal contribution, references and asset credits.]**

`audio_module.js` manages the three background tracks, transition sound, playback rate and shared pause. Music follows world depth: starting with track 1, inward navigation selects **1 → 2 → 3 → 1 → 2 → 3**, and returning selects the track associated with that depth. R restarts the initial world and the first track. Hovering over a major star or the moon still changes volume.

When Time is off, mouse speed controls music speed. When Time is on, the existing Time state alone controls playback rate through its approximately 34-second cycle; mouse speed is not added to that rate. The music continues from its current playback position when Start Time is selected. F pauses and resumes the painting, Time, music and transition sounds together, while navigation remains available.

`audio_reactivity.js` uses a Web Audio AnalyserNode with a 2048-point FFT to read the background music's frequency content. Low frequencies (60–250 Hz) gently brighten parts of the village; middle frequencies (300–2400 Hz) bend the upper cypress while its base stays anchored; high frequencies (3500–10000 Hz) increase the cypress's brightness. Responses are smoothed and bounded to retain the painting's forms. The transition sound does not feed this analysis, and no microphone is used.

Run the page through **localhost or HTTPS** for FFT-driven painting. Opening `index.html` directly with `file://` uses the existing direct-audio fallback without FFT response. A click may be needed to unlock sound under the browser's autoplay policy.

### 4. Time: changing the painting's rhythm

Before Time starts, the background keeps its initial normal flow and mouse speed controls music speed. Once Time starts, only Time controls music speed. This avoids mouse movement and Time competing to set the same playback rate. Stopping Time restores mouse-controlled music speed. Zooming, entering worlds and returning remain available in both modes.

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
| `audio_module.js`, `assets/` | Music, transition sound, playback rate and audio processing |
| `audio_reactivity.js` | FFT analysis and frequency-driven village light, cypress bending and brightness |
| `time-mechanic.js`, `time-atmosphere.js`, `time-integration.js` | Time calculations, Time paint layers and integration |


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

### Code Structures

https://github.com/tyshkovskii/reviewing-code-modularity-skill/blob/main/SKILL.md

https://github.com/lx-wnk/skills/blob/main/skills/component-review/SKILL.md

### Audio assets

| File | Use | Creator, source and licence |
|---|---|---|
| `assets/scene-01.mp3` | First scene's looping music | **[TO BE COMPLETED BY QINGYANG FANG]** |
| `assets/scene-02.wav` | Second scene's looping music | **[TO BE COMPLETED BY QINGYANG FANG]** |
| `assets/scene-03.mp3` | Third and deeper scenes' looping music | **[TO BE COMPLETED BY QINGYANG FANG]** |
| `assets/starfield-transition.wav` | Portal transition cue | **[TO BE COMPLETED BY QINGYANG FANG]** |

For each asset, add its title, creator, original source link, licence or permission, and any editing performed. If it is original or AI-generated, state who made it and how. The credits for an older, removed transition cue should not be applied to these current files.

For repeatable seeded development, call `restartPaintingV2(seed)` explicitly (for example 12, 89 or 205). Q/W/E are no longer user controls. `StarryNight.onReset(callback)` reports a full restart after the new world is ready; stale portal events are discarded.
