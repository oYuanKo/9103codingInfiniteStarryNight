// Scene music, transition jingle, and visual interaction for the painting.
const detachAudioModuleV1 = (() => {
    const bridge = typeof StarryNight !== 'undefined' ? StarryNight : null;
    if (!bridge) return () => {};

    const tracks = ['assets/scene-01.mp3', 'assets/scene-02.wav', 'assets/scene-03.mp3']
        .map((src, index) => {
            const audio = new Audio(src);
            audio.loop = true;
            audio.preload = index === 0 ? 'auto' : 'metadata';
            audio.playsInline = true;
            audio.volume = 0.08;
            return audio;
        });
    const jingle = new Audio('assets/jingle-level-up.wav');
    jingle.preload = 'auto';
    jingle.playsInline = true;
    jingle.volume = 0.22;

    let sceneDepth = 0;
    let activeTrack = 0;
    let disposed = false;
    let volume = 0.08;
    let playbackRate = 1;

    function play(audio) {
        const result = audio.play();
        if (result && typeof result.catch === 'function') result.catch(() => {});
    }

    function startActiveTrack() {
        if (!disposed) play(tracks[activeTrack]);
    }

    function changeScene(nextTrack) {
        nextTrack = Math.max(0, Math.min(tracks.length - 1, nextTrack));
        if (nextTrack === activeTrack) return;
        tracks[activeTrack].pause();
        activeTrack = nextTrack;
        tracks[activeTrack].currentTime = 0;
        tracks[activeTrack].playbackRate = playbackRate;
        tracks[activeTrack].volume = volume;
        startActiveTrack();
    }

    const offPortal = bridge.onPortal(event => {
        if (event.phase === 'begin') {
            jingle.currentTime = 0;
            play(jingle);
            return;
        }
        if (event.phase !== 'end' || event.outcome !== 'completed') return;
        if (event.direction === 'in') sceneDepth++;
        else if (event.direction === 'out') sceneDepth = Math.max(0, sceneDepth - 1);
        changeScene(Math.min(sceneDepth, 2));
    });

    const offFrame = bridge.onFrame((dt, state) => {
        if (!state.ready) return;
        const seconds = Math.max(1, Math.min(Number(dt) || 16.67, 100)) / 1000;
        const visual = state.visual || {};
        const spread = Math.max(0, Math.min(1, Number(visual.hoverSpread) || 0));
        const speed = Math.max(0, Math.min(1, Number(visual.pointerSpeed) || 0));
        const targetVolume = 0.06 + spread * 0.36;
        const targetRate = 1 + speed * 0.75;
        volume += (targetVolume - volume) * (1 - Math.exp(-seconds / 0.4));
        playbackRate += (targetRate - playbackRate) * (1 - Math.exp(-seconds / 0.25));
        for (const track of tracks) {
            track.volume = volume;
            track.playbackRate = playbackRate;
        }
    });

    window.addEventListener('pointerdown', startActiveTrack, true);
    window.addEventListener('wheel', startActiveTrack, true);
    startActiveTrack();

    function dispose() {
        if (disposed) return;
        disposed = true;
        offFrame();
        offPortal();
        window.removeEventListener('pointerdown', startActiveTrack, true);
        window.removeEventListener('wheel', startActiveTrack, true);
        for (const track of tracks) {
            track.pause();
            track.removeAttribute('src');
            track.load();
        }
        jingle.pause();
        jingle.removeAttribute('src');
        jingle.load();
    }
    window.addEventListener('pagehide', dispose, { once: true });
    return dispose;
})();
