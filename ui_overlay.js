// AI acknowledgement (Yuan): Responsive canvas presentation and Start/Stop Time controls was generated and revised for Yuan with OpenAI ChatGPT and its coding tools.
// Presentation changes CSS dimensions only; p5 maps pointer coordinates itself.
const paintingPresentationV2 = (() => {
    let cleanup = null;
    function init(canvas) {
        cleanup?.();
        canvas.parent('artwork');
        canvas.elt.setAttribute('aria-label', 'Infinite Starry Night interactive painting');
        const help = document.getElementById('painting-help');
        const button = document.getElementById('help-toggle');
        const timeButton = document.getElementById('time-toggle');
        const syncTimeButton = () => {
            timeButton.textContent = timeMechanic.enabled ? 'Stop Time' : 'Start Time';
            timeButton.setAttribute('aria-pressed', String(timeMechanic.enabled));
        };
        paintingPresentationV2.syncTimeButton = syncTimeButton;
        const toggleTime = () => {
            setTimeEffectEnabled(!timeMechanic.enabled);
            syncTimeButton();
        };
        timeButton.addEventListener('click', toggleTime);
        syncTimeButton();
        let timer;
        const show = visible => {
            help.hidden = !visible;
            button.setAttribute('aria-expanded', String(visible));
            button.textContent = visible ? 'Hide guide' : 'Interaction guide';
            resize();
        };
        const toggle = () => { clearTimeout(timer); show(help.hidden); };
        const resize = () => {
            // Help never changes canvas size or position. Narrow layouts scroll
            // the explanation below the painting instead of covering/shrinking it.
            const cap = innerWidth >= 1280 && innerHeight >= 900 ? 1440 : 960;
            const w = Math.max(4, Math.floor(Math.min(cap, innerWidth - 32,
                (innerHeight - 70) * 4 / 3) / 4) * 4);
            const presentation = document.getElementById('presentation');
            const panel = document.getElementById('interaction-guide');
            const footer = document.getElementById('presentation-guide');
            const side = innerWidth >= w + 2 * (260 + 24) + 32;
            presentation.dataset.guideSide = String(side);
            presentation.style.setProperty('--painting-width', w + 'px');
            presentation.style.setProperty('--painting-height', w * .75 + 'px');
            if (side && button.parentElement !== panel) panel.prepend(button);
            if (!side && button.parentElement !== footer) footer.append(button);
            panel.hidden = !side && help.hidden;
            canvas.elt.style.width = w + 'px';
            canvas.elt.style.height = w * .75 + 'px';
        };
        button.addEventListener('click', toggle);
        window.addEventListener('resize', resize);
        resize(); show(true);
        timer = setTimeout(() => show(false), 12000);
        cleanup = () => { timeButton.removeEventListener('click', toggleTime); clearTimeout(timer); button.removeEventListener('click', toggle); window.removeEventListener('resize', resize); };
        paintingPresentationV2.toggle = toggle;
    }
    return { init, toggle() {}, syncTimeButton() {}, dispose() { cleanup?.(); cleanup = null; } };
})();
