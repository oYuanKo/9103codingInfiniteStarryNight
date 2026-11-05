// BGM-only frequency response. Original mapping/shader; API reference:
// https://www.w3.org/TR/webaudio-1.1/#AnalyserNode
// No oscillator, random animation, microphone or second media source.
const AudioPaintingV2 = (() => {
    const bands = [[60, 250], [300, 2400], [3500, 10000]];
    const values = [0, 0, 0];
    const geometryCache = new WeakMap();
    let analyser = null, bins = null, sampleRate = 48000;
    function attach(context) {
        analyser = context.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0;
        bins = new Float32Array(analyser.frequencyBinCount);
        sampleRate = context.sampleRate;
        // AnalyserNode works with its output unconnected: no duplicate audio path.
        return analyser;
    }
    function levels(data, rate, fftSize) {
        return bands.map(([lo, hi]) => {
            let power = 0;
            for (let i = Math.ceil(lo * fftSize / rate); i <= Math.min(data.length - 1, Math.floor(hi * fftSize / rate)); i++) {
                if (Number.isFinite(data[i])) power += Math.pow(10, data[i] / 10);
            }
            // Sum spectral power, then map -55..-18 dB to a bounded envelope.
            const db = 10 * Math.log10(Math.max(power, 1e-12));
            return Math.max(0, Math.min(1, (db + 55) / 37));
        });
    }
    function update(dt, playing) {
        let target = [0, 0, 0];
        if (analyser && playing) {
            analyser.getFloatFrequencyData(bins);
            target = levels(bins, sampleRate, analyser.fftSize);
        }
        const seconds = Math.max(0, Math.min(dt, 100)) / 1000;
        for (let i = 0; i < 3; i++) {
            const tau = target[i] > values[i] ? [0.18, 0.32, 0.16][i] : [0.65, 0.8, 0.4][i];
            values[i] += (target[i] - values[i]) * (1 - Math.exp(-seconds / tau));
        }
    }
    function reset() { values.fill(0); }
    function geometry(world) {
        if (world.village && geometryCache.has(world.village)) return geometryCache.get(world.village);
        const c = world.cypress;
        const lights = Array(48).fill(0);
        // Twelve small painted house centres; use actual seed-specific metadata.
        const houses = world.village?.houses || [];
        for (let i = 0; i < Math.min(12, houses.length); i++) {
            const h = houses[Math.floor(i * houses.length / Math.min(12, houses.length))];
            lights.splice(i * 4, 4, h.x, h.baseY - h.h * 0.45, h.w * 0.22 * (i % 3 === 1 ? [0.78, 0.9, 1.08, 0.86][i % 4] : 1), h.h * 0.3 * (i % 3 === 1 ? 0.82 : 1));
        }
        const bounds = [Infinity, Infinity, -Infinity, -Infinity];
        for(let i=0;i<48;i+=4) if(lights[i+2]>0) {
            bounds[0]=Math.min(bounds[0],lights[i]-lights[i+2]*3);
            bounds[1]=Math.min(bounds[1],lights[i+1]-lights[i+3]*3);
            bounds[2]=Math.max(bounds[2],lights[i]+lights[i+2]*3);
            bounds[3]=Math.max(bounds[3],lights[i+1]+lights[i+3]*3);
        }
        const result = { tree: c ? [c.baseX, c.baseY, c.height, c.width] : [0, 0, 1, 0], lights,
            bounds: houses.length ? bounds : [0,0,0,0] };
        if(world.village) geometryCache.set(world.village,result);
        return result;
    }
    return { attach, update, reset, levels, geometry, values };
})();

// Shape follows artwork.js cypressHalfWidth/cypressCenterX, in world pixels.
const AUDIO_PAINTING_GLSL = `
uniform vec3 u_audioBands;
uniform vec4 u_audioTree;
uniform vec4 u_audioChildTree;
uniform vec4 u_audioBounds;
uniform vec4 u_audioChildBounds;
uniform vec4 u_audioLights[12];
uniform vec4 u_audioChildLights[12];
float audioTreeMask(vec2 p, vec4 tree) {
    float t = (tree.y-p.y)/tree.z;
    if(t<=0.0 || t>=1.0 || tree.w<=0.0 || abs(p.x-tree.x)>tree.w*1.2) return 0.0;
    float profile = .12 + .58*exp(-pow((t-.22)/.20,2.0))
        + .34*exp(-pow((t-.52)/.17,2.0)) + .16*exp(-pow((t-.76)/.10,2.0));
    float halfWidth = tree.w*profile*mix(1.05,.20,pow(t,1.25));
    float centre = tree.x+sin(t*3.8+.4)*tree.w*.10-sin(t*7.5+1.2)*tree.w*.04;
    return (1.0-smoothstep(halfWidth-2.0,halfWidth+3.0,abs(p.x-centre)))
        * smoothstep(0.0,.025,t)*(1.0-smoothstep(.98,1.0,t));
}
vec2 audioWarp(vec2 p, float child) {
    if(u_audioBands.y < .00001) return p;
    vec4 tree = mix(u_audioTree,u_audioChildTree,child);
    float t = clamp((tree.y-p.y)/tree.z,0.0,1.0);
    // Move the outline with the paint. The former silhouette mask pinned its
    // edges and tip; increasing its amplitude mostly warped the interior.
    // A wider smooth support transports a narrow band of adjacent background,
    // avoiding holes/rectangular overlays. Bottom 12% stays anchored.
    if(t<=.12 || p.y<tree.y-tree.z-24.0 || abs(p.x-tree.x)>tree.w*1.2+48.0 || tree.w<=0.0) return p;
    float profile = .12 + .58*exp(-pow((t-.22)/.20,2.0))
        + .34*exp(-pow((t-.52)/.17,2.0)) + .16*exp(-pow((t-.76)/.10,2.0));
    float halfWidth = tree.w*profile*mix(1.05,.20,pow(t,1.25));
    float centre = tree.x+sin(t*3.8+.4)*tree.w*.10-sin(t*7.5+1.2)*tree.w*.04;
    float bend = 12.0*pow(u_audioBands.y,.75)*smoothstep(.12,.90,t);
    float support = 1.0-smoothstep(halfWidth+bend+3.0,halfWidth+bend+35.0,abs(p.x-centre));
    p.x -= bend*support*smoothstep(tree.y-tree.z-24.0,tree.y-tree.z-2.0,p.y);
    return p;
}
vec4 audioLight(vec4 paint, vec2 p, float child) {
    if (u_audioBands.x+u_audioBands.z < .00001) return paint;
    vec4 tree = mix(u_audioTree,u_audioChildTree,child);
    float treeMask = audioTreeMask(p,tree);
    vec3 glow = vec3(0.0);
    vec4 bounds = mix(u_audioBounds,u_audioChildBounds,child);
    if(p.x>=bounds.x && p.y>=bounds.y && p.x<=bounds.z && p.y<=bounds.w) {
    for(int i=0;i<12;i++) {
        vec4 h = mix(u_audioLights[i],u_audioChildLights[i],child);
        if(h.z>0.0) {
            vec2 q = (p-h.xy)/max(h.zw,vec2(1.0));
            float soft = exp(-dot(q,q)*2.0);
            vec3 warmth = vec3(.45,.28,.07);
            // Four of twelve lights vary deterministically; no random flicker.
            if(mod(float(i),3.0)==1.0) {
                warmth = mod(float(i),2.0)<1.0 ? vec3(.36,.29,.15) : vec3(.40,.26,.11);
                soft = exp(-dot(q,q)*1.35);
            }
            // Compact soft support stays within the existing house body.
            soft *= 1.0-smoothstep(1.1,1.45,length(q));
            glow += warmth*soft;
        }
    }
    }
    // Preserve underlying pigment/alpha; no opaque overlay or replacement tree.
    paint.rgb += min(glow,vec3(.45,.29,.15))*u_audioBands.x*(1.0-treeMask);
    paint.rgb += paint.rgb*.18*sqrt(u_audioBands.z)*treeMask;
    return paint;
}
`;
