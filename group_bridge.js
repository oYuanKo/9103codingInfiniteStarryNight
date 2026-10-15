// Optional team boundary. No renderer/graph/cache references leave this closure.
const { StarryNight, publishGroupFrameV2, queueGroupPortalV2 } = (() => {
    const listeners = { frame: new Set(), universe: new Set(), portal: new Set() };
    const ids = new WeakMap();
    let nextId = 1, previousUniverse = null;
    let portalEvents = [];
    const identify = object => {
        if (!object) return null;
        if (!ids.has(object)) ids.set(object, nextId++);
        return ids.get(object);
    };
    const cameraCopy = camera => Object.freeze({ x: camera.x, y: camera.y, zoom: camera.zoom });
    function universeCopy() {
        const node = nestedV2.current, source = node?.world?.detailSource || brushV2.detailSource;
        // Lazy graph creation must not look like a universe change.
        if (node && !ids.has(node) && source && ids.has(source)) ids.set(node, ids.get(source));
        const id = identify(node || source);
        if (source && !ids.has(source)) ids.set(source, id);
        return Object.freeze({ id, seed: node?.seed ?? universeSeed });
    }
    function portalCopy(tr) {
        return Object.freeze({ id: identify(tr), direction: tr.direction,
            parentSeed: tr.edge.parent.seed, childSeed: tr.edge.child.seed,
            starId: tr.edge.starId, progress: tr.progress, targetProgress: tr.targetProgress });
    }
    function getState() {
        if (!v2Camera) return Object.freeze({ ready: false });
        const portal = nestedV2.transition;
        const render = portal ? getPortalRenderV2() : null;
        return Object.freeze({ ready: true, universe: universeCopy(),
            canvas: Object.freeze({ width, height }),
            camera: cameraCopy(portal ? getStarEntryCameraV2() : v2Camera),
            portal: portal ? Object.freeze({ ...portalCopy(portal), childCamera: cameraCopy(render.childCamera) }) : null,
            loading: !!nestedV2.pending,
            flow: Object.freeze({ speed: brushFlowSettings.speed, strength: brushFlowSettings.strength,
                enabled: brushFlowSettings.enabled, paused: brushFlowSettings.paused,
                cursorEnabled: brushFlowSettings.cursorEnabled }) });
    }
    function subscribe(type, callback) {
        if (typeof callback !== 'function') throw new TypeError('Expected a callback');
        const entry = { callback };
        listeners[type].add(entry);
        return () => { listeners[type].delete(entry); };
    }
    function emit(type, ...args) {
        // Snapshot subscriptions: subscribing/unsubscribing during dispatch is safe.
        for (const entry of [...listeners[type]]) {
            if (!listeners[type].has(entry)) continue;
            const failed = error => {
                listeners[type].delete(entry);
                console.warn('StarryNight: disabled failing ' + type + ' subscriber', error);
            };
            try {
                const result = entry.callback(...args);
                if (result && typeof result.then === 'function') Promise.resolve(result).catch(failed);
            } catch (error) { failed(error); }
        }
    }
    function setParameter(name, value, max) {
        if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError('Expected a finite number');
        brushFlowSettings[name] = Math.max(0, Math.min(max, value));
        return brushFlowSettings[name];
    }
    function queuePortal(phase, tr, outcome = null) {
        if (listeners.portal.size) portalEvents.push(Object.freeze({ phase, outcome, ...portalCopy(tr) }));
    }
    function publishFrame(dt) {
        const events = portalEvents; portalEvents = [];
        if (!listeners.frame.size && !listeners.universe.size && !listeners.portal.size) {
            previousUniverse = null;
            return;
        }
        const state = getState();
        if (!state.ready) return;
        // Publish only after rendering: a subscriber's approved settings apply next frame.
        if (listeners.universe.size && previousUniverse?.id !== state.universe.id) {
            emit('universe', Object.freeze({ previous: previousUniverse, current: state.universe }));
        }
        previousUniverse = state.universe;
        for (const event of events) emit('portal', event);
        if (state.portal) emit('portal', Object.freeze({ phase: 'progress', outcome: null, ...state.portal }));
        emit('frame', dt, state);
    }
    return {
        StarryNight: Object.freeze({ version: 1, getState,
            setFlowSpeed: value => setParameter('speed', value, 3),
            setFlowStrength: value => setParameter('strength', value, 30),
            onFrame: callback => subscribe('frame', callback),
            onUniverseChanged: callback => subscribe('universe', callback),
            onPortal: callback => subscribe('portal', callback) }),
        publishGroupFrameV2: publishFrame, queueGroupPortalV2: queuePortal
    };
})();
