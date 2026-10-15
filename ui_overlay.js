// Presentation changes CSS dimensions only; p5 maps pointer coordinates itself.
const paintingPresentationV2 = (() => {
    let cleanup = null;
    function init(canvas) {
        cleanup?.();
        canvas.parent('artwork');
        canvas.elt.setAttribute('aria-label', 'Infinite Starry Night interactive painting');
        const help = document.getElementById('painting-help');
        const button = document.getElementById('help-toggle');
        let timer;
        const show = visible => {
            help.hidden = !visible;
            button.setAttribute('aria-expanded', String(visible));
            button.textContent = visible ? 'Hide guide' : 'Interaction guide';
        };
        const toggle = () => { clearTimeout(timer); show(help.hidden); };
        const resize = () => {
            // Native 800x600 on ordinary windows (also existing test viewports).
            // Large presentation displays can grow; small windows scale down.
            const cap = innerWidth >= 1280 && innerHeight >= 900 ? 1440 : 800;
            const w = Math.max(4, Math.floor(Math.min(cap, innerWidth - 32, (innerHeight - 116) * 4 / 3) / 4) * 4);
            canvas.elt.style.width = w + 'px';
            canvas.elt.style.height = w * .75 + 'px';
        };
        button.addEventListener('click', toggle);
        window.addEventListener('resize', resize);
        resize(); show(true);
        timer = setTimeout(() => show(false), 12000);
        cleanup = () => { clearTimeout(timer); button.removeEventListener('click', toggle); window.removeEventListener('resize', resize); };
        paintingPresentationV2.toggle = toggle;
    }
    return { init, toggle() {}, dispose() { cleanup?.(); cleanup = null; } };
})();
