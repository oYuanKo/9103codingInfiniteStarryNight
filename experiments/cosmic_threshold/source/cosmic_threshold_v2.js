// Experimental visual treatment, never a navigation state or a timer.
const cosmicThresholdSettingsV2 = { enabled: false, brushContinuity: false, galaxyInterior: true, protoUniverse: true };
const cosmicThresholdV2 = { cache: new Map(), stats: { builds: 0, buildMs: 0, drawn: 0 } };
function cosmicRampV2(a,b,p) {
    const t=Math.max(0,Math.min(1,(p-a)/(b-a)));return t*t*(3-2*t);
}
// Overlapping visual weights only. No elapsed time or navigation state.
function cosmicStagesV2(p) {
    return [cosmicThresholdSettingsV2.galaxyInterior ? cosmicRampV2(.35,.55,p)*(1-cosmicRampV2(.55,.84,p)) : 0,
        cosmicThresholdSettingsV2.protoUniverse ? cosmicRampV2(.40,.68,p)*(1-cosmicRampV2(.74,.88,p)) : 0,
        cosmicRampV2(.38,.84,p)];
}
function releaseCosmicWorldV2(seed) {
    for(const [key,marks] of cosmicThresholdV2.cache)if(marks.worldSeeds.includes(seed))cosmicThresholdV2.cache.delete(key);
}
function cosmicMarksV2(tr) {
    const key=tr.edge.parent.seed+':'+tr.edge.child.seed+':'+tr.edge.starId;
    const cache=cosmicThresholdV2.cache;
    if(cache.has(key)) { const marks=cache.get(key);cache.delete(key);cache.set(key,marks);return marks; }
    const started=performance.now(), marks=[], world=tr.child, map=world.flowMap;
    const seed=childSeedV2(tr.edge.parent.seed,key);
    // Twelve sparse groups, at most four short fragments each. Half anticipate
    // actual child star halos; half borrow sky paint positions. Blank space is
    // intentional. A single scan at cache creation replaces repeated failed probes.
    const records=world.detailSource.records, candidates=[];
    for(let i=0;i<records.length;i+=BRUSH_RECORD_STRIDE) {
        if(records[i+1]<height*.55 && records[i+3]>3) candidates.push(i);
    }
    const stars=world.stars.filter(s=>s.type==='major'||s.type==='moon');
    const flowAt=(x,y)=>{
        const j=4*(Math.min(map.height-1,Math.max(0,Math.floor(y/height*map.height)))*map.width+
            Math.min(map.width-1,Math.max(0,Math.floor(x/width*map.width))));
        return Math.atan2(map.pixels[j+1]/127.5-1,map.pixels[j]/127.5-1);
    };
    for(let group=0;group<12;group++) {
        const h=k=>microHashV2(seed,group,k,12);
        const star=group<6?stars[group%stars.length]:null;
        if(!star&&!candidates.length)continue;
        const record=candidates[Math.floor(h(0)*candidates.length)];
        const theta=h(1)*Math.PI*2;
        const radius=star?star.radius*(1.1+.9*h(2)):0;
        const x=star?star.x+Math.cos(theta)*radius:records[record];
        const y=star?star.y+Math.sin(theta)*radius:records[record+1];
        const flow=flowAt(x,y),ux=Math.cos(flow),uy=Math.sin(flow);
        const layer=group%3; // Tonal/size depth only: no parallax, moving particles or timer.
        const scale=[.58,.85,1.15][layer];
        const count=3+(h(3)>.4?1:0);
        for(let k=0;k<count;k++) {
            const r=n=>microHashV2(seed,group,k*16+n,13);
            const along=(k-(count-1)/2)*(7+8*r(0)),across=(r(1)-.5)*16;
            const px=x+ux*along-uy*across,py=y+uy*along+ux*across;
            if(px<8||px>width-8||py<8||py>height*.58)continue;
            const local=flowAt(px,py);
            // Curves inherit local flow, with a small halo tangent contribution.
            const tangent=star?Math.atan2(py-star.y,px-star.x)+Math.PI/2:local;
            const angle=Math.atan2(Math.sin(local)*.75+Math.sin(tangent)*.25,
                Math.cos(local)*.75+Math.cos(tangent)*.25)+(r(2)-.5)*.3;
            const len=(3.5+7*r(3))*scale,w=(.65+.8*r(4))*scale;
            const bend=(r(5)-.35)*len*.6,skew=(r(6)-.5)*len*.18;
            // Cached cubic segments: occasional gaps and asymmetry avoid stamps.
            const points=[-len*.5,0,-len*.20,bend+skew,len*.18,bend-skew,len*.5,0];
            const path=new Path2D();path.moveTo(points[0],points[1]);
            if(r(7)<.28) {
                // Exact subsegments of this cubic retain its curvature across a dry gap.
                const point=t=>{
                    const u=1-t;return [u*u*u*points[0]+3*u*u*t*points[2]+3*u*t*t*points[4]+t*t*t*points[6],
                        3*u*u*t*points[3]+3*u*t*t*points[5]];
                };
                const derivative=t=>{const u=1-t;return [3*u*u*(points[2]-points[0])+6*u*t*(points[4]-points[2])+3*t*t*(points[6]-points[4]),
                    3*u*u*points[3]+6*u*t*(points[5]-points[3])-3*t*t*points[5]]};
                for(const [start,end] of [[0,.43],[.61,1]]) {
                    const p=point(start),q=point(end),d=derivative(start),e=derivative(end),span=(end-start)/3;
                    path.moveTo(...p);path.bezierCurveTo(p[0]+d[0]*span,p[1]+d[1]*span,q[0]-e[0]*span,q[1]-e[1]*span,...q);
                }
            } else path.bezierCurveTo(...points.slice(2));
            const palette=layer===0?[[116,150,174],[163,186,192],[203,203,168]]:
                [[245,210,115],[255,235,170],[163,186,192]];
            const rgb=palette[Math.floor(r(8)*palette.length)];
            marks.push({x:px,y:py,angle,path,w,points,group,layer,
                opacity:[.42,.58,.72][layer]*(.85+.15*r(9)),
                arrival:.35+.065*h(4)+.018*k,end:.74+.12*h(5),
                colour:'rgb('+rgb.join(',')+')'});
        }
    }
    // A broken star river, tied to the child's sky/swirl coordinates. Each
    // station has a few short fragments; no connected ribbon or particle motion.
    for(let station=0;station<24;station++) {
        const h=n=>microHashV2(seed,station,n,14);
        const u=.08+.84*(station+.25+.5*h(0))/24;
        const centre=.30+.13*Math.sin((u-.10)*4.5)-.10*u;
        const spread=.035+.035*h(1);
        for(let k=0;k<3;k++) {
            const r=n=>microHashV2(seed,station,k*12+n,15);
            const x=width*(u+(r(0)-.5)*.025);
            const y=height*(centre+(r(1)+r(2)-1)*spread*2.2);
            const layer=k,local=flowAt(x,y);
            const tangent=Math.atan((.585*Math.cos((u-.10)*4.5)-.10)*height/width);
            const angle=Math.atan2(.65*Math.sin(local)+.35*Math.sin(tangent),.65*Math.cos(local)+.35*Math.cos(tangent));
            const len=(3+8*r(3))*[.65,1,1.35][layer],w=(.5+.7*r(4))*[.8,1,1.35][layer];
            const bend=(r(5)-.4)*len*.6;
            const points=[-len/2,0,-len*.23,bend,len*.20,bend*.6,len/2,0];
            const path=new Path2D();path.moveTo(points[0],0);path.bezierCurveTo(...points.slice(2));
            const colours=layer===0?['rgb(83,119,159)','rgb(116,150,174)']:
                layer===1?['rgb(163,186,192)','rgb(203,203,168)']:['rgb(245,210,115)','rgb(255,235,170)'];
            marks.push({x,y,angle,path,w,points,group:12+station,layer,
                opacity:[.32,.48,.68][layer]*(.65+.35*r(6)),
                arrival:.36+.045*h(2)+.015*k,end:.76+.09*h(3),
                colour:colours[r(7)>.5?1:0]});
        }
    }
    // Same paths, two endpoint placements. Each cloud fragment has an explicit
    // destination in an actual child halo; there is no third painted world.
    marks.worldSeeds=[tr.edge.parent.seed,tr.edge.child.seed];
    marks.starUniforms=new Float32Array(18);
    stars.slice(0,6).forEach((star,i)=>marks.starUniforms.set([star.x/width,star.y/height,star.radius/height],i*3));
    marks.forEach((mark,i)=>{
        const h=n=>microHashV2(seed,i,n,16);
        const u=mark.x/width,river=.30+.13*Math.sin((u-.10)*4.5)-.10*u;
        const star=stars.reduce((a,b)=>Math.abs(a.x-mark.x)<Math.abs(b.x-mark.x)?a:b);
        const theta=h(0)*Math.PI*2,radius=star.radius*(.8+1.5*h(1));
        mark.gx=mark.x;mark.gy=height*(river+(h(2)+h(3)-1)*.12);
        mark.ga=Math.atan((.585*Math.cos((u-.10)*4.5)-.10)*height/width)+(h(4)-.5)*.6;
        mark.tx=star.x+Math.cos(theta)*radius;mark.ty=star.y+Math.sin(theta)*radius;
        mark.ta=flowAt(mark.tx,mark.ty);mark.targetStar=star.id;
    });
    cache.set(key,marks);while(cache.size>4)cache.delete(cache.keys().next().value);
    cosmicThresholdV2.stats.builds++;
    cosmicThresholdV2.stats.buildMs=performance.now()-started;
    return marks;
}
function drawCosmicThresholdV2(portal) {
    if (usesBrushCosmosV2()) { drawBrushCosmosV2(portal); return; }
    cosmicThresholdV2.stats.drawn=0;
    const p=portal.progress;
    if(!cosmicThresholdSettingsV2.enabled || p<=.35 || p>=.88)return;
    const camera=portal.childCamera,c=drawingContext;
    const formation=cosmicStagesV2(p)[2];
    const enhanced=cosmicThresholdSettingsV2.galaxyInterior || cosmicThresholdSettingsV2.protoUniverse;
    c.save();c.globalCompositeOperation='source-over';c.lineCap='round';
    c.translate(camera.x,camera.y);c.scale(camera.zoom,camera.zoom);
    for(const mark of cosmicMarksV2(nestedV2.transition)) {
        // Stay anchored in the emerging child's paint. The former river-to-halo
        // flight moved fragments across the viewport and looked like a scene change.
        const rise=cosmicRampV2(mark.arrival,mark.arrival+(enhanced?.22:.14),p);
        const fade=1-cosmicRampV2(enhanced?.64:.60,enhanced?Math.min(.88,mark.end+.04):mark.end,p);
        const opacity=mark.opacity*rise*fade;
        if(opacity<=0)continue;
        const dx=mark.tx-mark.x,dy=mark.ty-mark.y;
        const gather=enhanced && cosmicThresholdSettingsV2.protoUniverse ?
            formation*Math.min(1,12/Math.max(1,Math.hypot(dx,dy))) : 0;
        const x=mark.x+dx*gather,y=mark.y+dy*gather;
        const delta=Math.atan2(Math.sin(mark.ta-mark.angle),Math.cos(mark.ta-mark.angle));
        c.save();c.translate(x,y);c.rotate(mark.angle+delta*gather);
        c.globalAlpha=opacity;c.strokeStyle=mark.colour;c.lineWidth=mark.w;c.stroke(mark.path);
        // Shorter dry-paint ridge, same curved geometry, not a glowing sprite.
        c.globalAlpha=opacity*.35;c.strokeStyle='rgb(255,244,205)';
        c.lineWidth=mark.w*.30;c.scale(.72,.75);c.stroke(mark.path);c.restore();
        cosmicThresholdV2.stats.drawn++;
    }
    c.restore();
}
