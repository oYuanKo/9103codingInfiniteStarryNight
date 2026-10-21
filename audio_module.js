// Scene music, transition jingle, and sound processing for the interactive painting.
const detachAudioModuleV1 = (() => {
    const bridge = typeof StarryNight !== 'undefined' ? StarryNight : null;
    if (!bridge) return () => {};

    const trackPaths = ['assets/scene-01.mp3', 'assets/scene-02.wav', 'assets/scene-03.mp3'];
    const tracks = [];
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    // file:// may give local media an opaque origin. Use direct playback there;
    // use Web Audio filters and a limiter on localhost or HTTPS.
    const useWebAudio = location.protocol !== 'file:' && !!AudioContextClass;
    const context = useWebAudio ? new AudioContextClass() : null;
    let compressor = null;
    if (context) {
        compressor = context.createDynamicsCompressor();
        const master = context.createGain();
        compressor.threshold.value = -12;
        compressor.knee.value = 3;
        compressor.ratio.value = 16;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.22;
        master.gain.value = 0.9;
        compressor.connect(master);
        master.connect(context.destination);
    }

    function makeCleanChain(source, initialGain, highpassHz, lowpassHz) {
        if (!context) return { level: null, fade: null };
        const highpass = context.createBiquadFilter();
        const lowpass = context.createBiquadFilter();
        const level = context.createGain();
        const fade = context.createGain();
        highpass.type = 'highpass';
        highpass.frequency.value = highpassHz;
        highpass.Q.value = 0.707;
        lowpass.type = 'lowpass';
        lowpass.frequency.value = lowpassHz;
        lowpass.Q.value = 0.707;
        level.gain.value = initialGain;
        fade.gain.value = 0;
        source.connect(highpass);
        highpass.connect(lowpass);
        lowpass.connect(level);
        level.connect(fade);
        fade.connect(compressor);
        return { level, fade };
    }

    for (let i = 0; i < trackPaths.length; i++) {
        const element = new Audio(trackPaths[i]);
        element.loop = true;
        element.preload = i === 0 ? 'auto' : 'metadata';
        element.playsInline = true;
        element.volume = context ? 1 : 0.05;
        element.playbackRate = 1;
        const chain = context
            ? makeCleanChain(context.createMediaElementSource(element), 0, 48, 15500)
            : { level: null, fade: null };
        tracks.push({ element, ...chain,
            fadeAmount: i === 0 ? 1 : 0, fadeTarget: i === 0 ? 1 : 0 });
    }
    if (tracks[0].fade) tracks[0].fade.gain.value = 1;

    const jingleElement = new Audio('assets/jingle-level-up.wav');
    jingleElement.preload = 'auto';
    jingleElement.playsInline = true;
    jingleElement.volume = 1;
    const jingleChain = context
        ? makeCleanChain(context.createMediaElementSource(jingleElement), 0.24, 65, 13500)
        : { level: null, fade: null };
    jingleElement.volume = context ? 1 : 0.24;
    if (jingleChain.fade) jingleChain.fade.gain.value = 1;

    let sceneDepth = 0;
    let activeTrack = 0;
    let disposed = false;
    let started = false;
    let volume = 0.08;
    let playbackRate = 1;
    let resumePromise = null;
    const pauseTimers = new Map();

    function setFade(track, value, seconds = 1.1) {
        track.fadeTarget = value;
        if (!track.fade) return;
        const param = track.fade.gain;
        const now = context.currentTime;
        param.cancelScheduledValues(now);
        param.setValueAtTime(param.value, now);
        param.linearRampToValueAtTime(value, now + seconds);
    }

    function playElement(element) {
        const result = element.play();
        if (result && typeof result.then === 'function') {
            result.then(() => {
                started = true;
                stopUnlockListeners();
            }).catch(error => {
                console.warn('[Audio] Playback was blocked or failed:', element.currentSrc || element.src, error);
            });
        }
    }

    async function startAudio() {
        if (disposed) return;
        if (context && context.state !== 'running') {
            if (!resumePromise) {
                resumePromise = context.resume().catch(error => {
                    console.warn('[Audio] AudioContext could not resume:', error);
                }).finally(() => { resumePromise = null; });
            }
            await resumePromise;
        }
        if (context && context.state !== 'running') return;
        for (const track of tracks) track.element.playbackRate = playbackRate;
        playElement(tracks[activeTrack].element);
    }

    function startFromGesture() {
        // Call play synchronously during the gesture for browser autoplay policies.
        playElement(tracks[activeTrack].element);
        void startAudio();
    }

    function stopUnlockListeners() {
        window.removeEventListener('pointerdown', startFromGesture, true);
        window.removeEventListener('keydown', startFromGesture, true);
        window.removeEventListener('wheel', startFromGesture, true);
    }

    function changeSceneTrack(nextTrack) {
        nextTrack = Math.max(0, Math.min(tracks.length - 1, nextTrack));
        if (nextTrack === activeTrack) return;
        const previous = activeTrack;
        activeTrack = nextTrack;
        const oldTrack = tracks[previous];
        const newTrack = tracks[activeTrack];
        const pending = pauseTimers.get(previous);
        if (pending) clearTimeout(pending);
        newTrack.element.currentTime = 0;
        newTrack.element.playbackRate = playbackRate;
        if (started && (!context || context.state === 'running')) playElement(newTrack.element);
        setFade(oldTrack, 0);
        setFade(newTrack, 1);
        const timer = setTimeout(() => {
            if (activeTrack !== previous) oldTrack.element.pause();
            pauseTimers.delete(previous);
        }, 1250);
        pauseTimers.set(previous, timer);
    }

    function playTransitionJingle() {
        if (disposed) return;
        const start = () => {
            if (disposed || (context && context.state !== 'running')) return;
            try { jingleElement.currentTime = 0; } catch (_) {}
            playElement(jingleElement);
        };
        if (!context || context.state === 'running') start();
        else void startAudio().then(start);
    }

    const offPortal = bridge.onPortal(event => {
        if (event.phase === 'begin') {
            playTransitionJingle();
            return;
        }
        if (event.phase !== 'end' || event.outcome !== 'completed') return;
        if (event.direction === 'in') sceneDepth++;
        else if (event.direction === 'out') sceneDepth = Math.max(0, sceneDepth - 1);
        changeSceneTrack(Math.min(sceneDepth, 2));
    });

    const offFrame = bridge.onFrame((dt, state) => {
        if (!state.ready) return;
        const elapsed = Math.max(1, Math.min(Number(dt) || 16.67, 100)) / 1000;
        const visual = state.visual || {};
        const spread = Math.max(0, Math.min(1, Number(visual.hoverSpread) || 0));
        const speed = Math.max(0, Math.min(1, Number(visual.pointerSpeed) || 0));
        const volumeTarget = 0.08 + spread * 0.82;
        const rateTarget = 1 + speed * 0.9;
        volume += (volumeTarget - volume) * (1 - Math.exp(-elapsed / 0.38));
        playbackRate += (rateTarget - playbackRate) * (1 - Math.exp(-elapsed / 0.22));
        for (const track of tracks) {
            const fadeAmount = 1 - Math.exp(-elapsed / 0.32);
            track.fadeAmount += (track.fadeTarget - track.fadeAmount) * fadeAmount;
            if (track.level) {
                track.level.gain.value = volume * 0.58;
                track.fade.gain.value = track.fadeAmount;
            } else {
                track.element.volume = Math.max(0, Math.min(0.6, volume * 0.58 * track.fadeAmount));
            }
            track.element.playbackRate = playbackRate;
        }
    });

    window.addEventListener('pointerdown', startFromGesture, true);
    window.addEventListener('keydown', startFromGesture, true);
    window.addEventListener('wheel', startFromGesture, true);
    void startAudio();

    function dispose() {
        if (disposed) return;
        disposed = true;
        offFrame();
        offPortal();
        stopUnlockListeners();
        for (const timer of pauseTimers.values()) clearTimeout(timer);
        for (const track of tracks) {
            track.element.pause();
            track.element.removeAttribute('src');
            track.element.load();
        }
        jingleElement.pause();
        jingleElement.removeAttribute('src');
        jingleElement.load();
        if (context) void context.close();
    }
    window.addEventListener('pagehide', dispose, { once: true });
    return dispose;
})();
