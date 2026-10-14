// Temporary paint geometry only: no world rebuild, image, texture or WebGL buffer.
const starHoverLightSettingsV2 = { enabled: true, moonStrokes: 120, majorStrokes: 96, detailEnabled: true };
const starHoverLightV2 = { worlds: new Map(), stats: { builds: 0, drawn: 0, detailDrawn: 0, detailBuilds: 0, updateMs: 0 } };
function hoverSmoothV2(a,b,x) {
    const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);
}
function hoverHashV2(seed,id,n) {
    let h=seed|0;for(let i=0;i<id.length;i++)h=Math.imul(h^id.charCodeAt(i),16777619);
    h=Math.imul(h^Math.imul(n+1,374761393),668265263);
    h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;
}
// Match the painting atlas ramps; evaluate with EACH view's camera, not v2Camera.
// Cached local paths retain world-space width. Magnification reveals pigment
// structure inside the original mass rather than capping/shrinking its width.
function drawHoverPigmentV2(context, stroke, seed, id, index, zoom, alpha) {
    if (!starHoverLightSettingsV2.detailEnabled || zoom <= 2.4) return;
    for (let level=1;level<=2;level++) {
        const lod=level===1?hoverSmoothV2(2.4,6,zoom):hoverSmoothV2(6,16,zoom);
        if (lod<=0) continue;
        if (!stroke.pigment) stroke.pigment=[];
        if (!stroke.pigment[level-1]) {
            stroke.pigment[level-1]=buildHoverPigmentV2(stroke,seed,id,index,level);
            starHoverLightV2.stats.detailBuilds++;
        }
        for (const mark of stroke.pigment[level-1]) {
            context.globalAlpha=alpha*lod*mark.opacity;
            context.strokeStyle=mark.colour;
            context.lineWidth=mark.width;
            context.stroke(mark.path);
            starHoverLightV2.stats.detailDrawn++;
        }
    }
}
function buildHoverPigmentV2(stroke,seed,id,index,level) {
    const marks=[],count=level===1?9:15,L=stroke.len,W=stroke.weight,B=L*stroke.bend;
    // Exact cubic centreline and derivative in the primary stroke's local axes.
    const point=t=>[L*(-.5+.96*t+.12*t*t-.08*t*t*t),3*B*t*(1-t)];
    const tangent=t=>[L*(.96+.24*t-.24*t*t),3*B*(1-2*t)];
    for(let k=0;k<count;k++) {
        const h=n=>hoverHashV2(seed,id+':pigment:'+index+':'+level,k*8+n);
        const t=.08+.84*h(0),span=(level===1?.15:.06)*( .65+.8*h(1));
        const a=Math.max(.025,t-span/2),b=Math.min(.975,t+span/2),d=b-a;
        const p=point(a),q=point(b),ta=tangent(a),tb=tangent(b);
        const na=Math.hypot(...ta),nb=Math.hypot(...tb);
        const offset=(h(2)-.5)*W*.62,swerve=(h(3)-.5)*W*.16;
        // Short cubic segments inherit tangent/curvature, with small normal
        // variation. Bounds stay inside the body including rounded end caps.
        const x0=p[0]-ta[1]/na*offset,y0=p[1]+ta[0]/na*offset;
        const x3=q[0]-tb[1]/nb*offset,y3=q[1]+tb[0]/nb*offset;
        const path=new Path2D();path.moveTo(x0,y0);
        path.bezierCurveTo(x0+ta[0]*d/3-ta[1]/na*swerve,y0+ta[1]*d/3+ta[0]/na*swerve,
            x3-tb[0]*d/3-tb[1]/nb*swerve,y3-tb[1]*d/3+tb[0]/nb*swerve,x3,y3);
        // Balanced light/dark pigment variation, no additive glow or white ridges.
        const shift=k%2===0?14:-17;
        const rgb=stroke.colour.map(v=>Math.max(0,Math.min(255,Math.round(v+shift*(.7+.3*h(4))))));
        marks.push({path,width:W*(level===1?.16:.07)*(.65+.7*h(5)),
            opacity:.32+.16*h(6),colour:'rgb('+rgb.join(',')+')'});
    }
    return marks;
}
function hoverWorldV2(world) {
    let cached=starHoverLightV2.worlds.get(world.detailSource);
    if(cached)return cached;
    cached={time:0,stars:world.stars.filter(s=>s.type==='moon'||s.type==='major').map(star=>{
        const strokes=[],count=star.type==='moon'?starHoverLightSettingsV2.moonStrokes:starHoverLightSettingsV2.majorStrokes;
        const outer=star.type==='moon'?3.6:3.25;
        for(let i=0;i<count;i++) {
            const h=n=>hoverHashV2(world.seed,star.id,i*9+n);
            const depth=h(0),r=star.radius*(1.03+(outer-1.03)*depth),a=h(1)*Math.PI*2;
            const x=star.x+Math.cos(a)*r,y=star.y+Math.sin(a)*r;
            const map=world.flowMap,px=Math.max(0,Math.min(map.width-1,Math.floor(x/width*map.width))),py=Math.max(0,Math.min(map.height-1,Math.floor(y/height*map.height)));
            const j=4*(py*map.width+px),fx=map.pixels[j]/127.5-1,fy=map.pixels[j+1]/127.5-1;
            // Tangential comma strokes, with a small existing-flow contribution.
            const angle=Math.atan2(Math.cos(a)*.86+fy*.14,-Math.sin(a)*.86+fx*.14)+(h(2)-.5)*.45;
            const palette=depth<.28?[[255,241,184],[255,233,153]]:depth<.67?[[247,207,112],[243,219,137]]:[[239,226,163],[248,240,209],[163,186,192]];
            strokes.push({x,y,depth,angle,len:star.radius*(.18+.27*h(3)),weight:.55+star.radius*.038*h(4),
                bend:(h(5)-.25)*.36,phase:h(6)*Math.PI*2,alpha:.48+.28*h(7),colour:palette[Math.floor(h(8)*palette.length)]});
        }
        return {star,strokes,intensity:0,dwell:0};
    })};
    starHoverLightV2.worlds.set(world.detailSource,cached);starHoverLightV2.stats.builds++;
    return cached;
}
function drawStarHoverLightV2(dt=deltaTime) {
    const started=performance.now();starHoverLightV2.stats.drawn=0;starHoverLightV2.stats.detailDrawn=0;
    if(!starHoverLightSettingsV2.enabled){starHoverLightV2.worlds.clear();return;}
    const portal=nestedV2.transition?getPortalRenderV2():null;
    const views=portal?[
        {world:captureWorldV2(),camera:getStarEntryCameraV2(),weight:1-hoverSmoothV2(0,.42,portal.progress)},
        {world:portal.child,camera:portal.childCamera,weight:hoverSmoothV2(.72,1,portal.progress)}
    ]:[{world:captureWorldV2(),camera:v2Camera,weight:1}];
    const keep=new Set(views.map(v=>v.world.detailSource));
    for(const key of starHoverLightV2.worlds.keys())if(!keep.has(key))starHoverLightV2.worlds.delete(key);
    const seconds=brushFlowSettings.paused?0:Math.min(Math.max(dt||0,0),50)/1000;
    const inside=brushCursor.inside&&mouseX>=0&&mouseX<=width&&mouseY>=0&&mouseY<=height;
    const context=drawingContext;context.save();context.lineCap='round';context.globalCompositeOperation='source-over';
    for(const {world,camera,weight} of views) {
        const cached=hoverWorldV2(world);
        if(brushFlowSettings.enabled)cached.time+=seconds;
        const mx=(mouseX-camera.x)/camera.zoom,my=(mouseY-camera.y)/camera.zoom;
        for(const state of cached.stars) {
            const s=state.star;
            if(!brushFlowSettings.cursorEnabled){state.intensity=state.dwell=0;continue;}
            const distance=Math.hypot(mx-s.x,my-s.y)/s.radius;
            const proximity=inside?(1-hoverSmoothV2(.45,s.type==='moon'?3.2:2.9,distance)):0;
            // Invisible portal worlds cannot accumulate a hidden hover burst.
            const target=proximity*weight;
            state.intensity+=(target-state.intensity)*(1-Math.exp(-seconds/(target > state.intensity ? .24 : .65)));
            state.dwell=target>.025?Math.min(4,state.dwell+seconds*target):state.dwell*Math.exp(-seconds/.75);
            if(state.intensity<.002||weight<=0)continue;
            const growth=1-Math.exp(-state.dwell/1.15);
            for(let strokeIndex=0;strokeIndex<state.strokes.length;strokeIndex++) {
                const stroke=state.strokes[strokeIndex];
                const reveal=hoverSmoothV2(stroke.depth*.72,stroke.depth*.72+.18,growth);
                const alpha=state.intensity*weight*reveal*stroke.alpha*(.94+.06*Math.sin(cached.time*.85+stroke.phase));
                if(alpha<.003)continue;
                const drift=Math.sin(cached.time*.7+stroke.phase)*Math.min(s.radius*.025,1.2/camera.zoom);
                const ux=Math.cos(stroke.angle),uy=Math.sin(stroke.angle);
                const x=camera.x+(stroke.x+ux*drift)*camera.zoom,y=camera.y+(stroke.y+uy*drift)*camera.zoom;
                const len=stroke.len*camera.zoom,w=stroke.weight*camera.zoom;
                if(x+len<0||x-len>width||y+len<0||y-len>height)continue;
                const bend=len*stroke.bend;
                context.strokeStyle=`rgb(${stroke.colour.join(',')})`;context.globalAlpha=alpha;context.lineWidth=w;
                context.beginPath();context.moveTo(x-ux*len*.5,y-uy*len*.5);
                context.bezierCurveTo(x-ux*len*.18-uy*bend,y-uy*len*.18+ux*bend,x+ux*len*.18-uy*bend,y+uy*len*.18+ux*bend,x+ux*len*.5,y+uy*len*.5);context.stroke();
                // A shorter raised ridge gives the paint body a non-uniform finish.
                context.globalAlpha=alpha*.42;context.lineWidth=Math.max(.35,w*.24);context.strokeStyle='rgb(255,243,199)';
                context.beginPath();context.moveTo(x-ux*len*.28-uy*w*.2,y-uy*len*.28+ux*w*.2);
                context.quadraticCurveTo(x-uy*bend*.7,y+ux*bend*.7,x+ux*len*.22,y+uy*len*.22);context.stroke();
                // Local transform shares the macro's exact anchor, drift and scale.
                // Alpha already includes proximity, dwell, breath and portal ownership.
                if (camera.zoom>2.4 && starHoverLightSettingsV2.detailEnabled) {
                    context.save();context.translate(x,y);context.rotate(stroke.angle);context.scale(camera.zoom,camera.zoom);
                    drawHoverPigmentV2(context,stroke,world.seed,s.id,strokeIndex,camera.zoom,alpha);
                    context.restore();
                }
                starHoverLightV2.stats.drawn++;
            }
        }
    }
    context.restore();starHoverLightV2.stats.updateMs=performance.now()-started;
}
