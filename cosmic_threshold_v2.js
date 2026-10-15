// Experimental visual treatment, never a navigation state or a timer.
const cosmicThresholdSettingsV2 = { enabled: true };
const cosmicThresholdV2 = { cache: new Map(), stats: { builds: 0, buildMs: 0, drawn: 0 } };
function cosmicRampV2(a,b,p) {
    const t=Math.max(0,Math.min(1,(p-a)/(b-a)));return t*t*(3-2*t);
}
function cosmicMarksV2(tr) {
    const key=tr.edge.parent.seed+':'+tr.edge.child.seed+':'+tr.edge.starId;
    const cache=cosmicThresholdV2.cache;
    if(cache.has(key)) { const marks=cache.get(key);cache.delete(key);cache.set(key,marks);return marks; }
    const started=performance.now(), marks=[], world=tr.child, map=world.flowMap;
    const seed=childSeedV2(tr.edge.parent.seed,key);
    // Sample actual child sky brush records, keeping its positions and local flow; curved forms and colours
    // use the existing painting vocabulary. No RNG/noiseSeed changes, no world references
    // retained by the cache. Geometry can be reconstructed after eviction.
    const records=world.detailSource.records, count=records.length/BRUSH_RECORD_STRIDE;
    for(let n=0;n<48;n++) {
        const h=k=>microHashV2(seed,n,k,11);
        let i=Math.floor(h(0)*count)*BRUSH_RECORD_STRIDE;
        for(let tries=0;tries<80;tries++) {
            if(records[i+1]<height*.57 && records[i+3]>3)break;
            i=(i+BRUSH_RECORD_STRIDE)%records.length;
        }
        const x=records[i],y=records[i+1];
        if(y>=height*.57)continue;
        const j=4*(Math.min(map.height-1,Math.max(0,Math.floor(y/height*map.height)))*map.width+
            Math.min(map.width-1,Math.max(0,Math.floor(x/width*map.width))));
        const angle=Math.atan2(map.pixels[j+1]/127.5-1,map.pixels[j]/127.5-1);
        const len=5+10*h(1),w=.8+1.3*h(2),bend=(h(3)-.3)*len*.5;
        const path=new Path2D();path.moveTo(-len*.5,0);
        path.bezierCurveTo(-len*.2,bend,len*.2,bend,len*.5,0);
        marks.push({x,y,angle,path,w,arrival:.35+.09*h(4),end:.69+.15*h(5),
            colour:['rgb(245,210,115)','rgb(255,235,170)','rgb(163,186,192)'][n%3]});
    }
    cache.set(key,marks);while(cache.size>4)cache.delete(cache.keys().next().value);
    cosmicThresholdV2.stats.builds++;
    cosmicThresholdV2.stats.buildMs=performance.now()-started;
    return marks;
}
function drawCosmicThresholdV2(portal) {
    cosmicThresholdV2.stats.drawn=0;
    const p=portal.progress;
    if(!cosmicThresholdSettingsV2.enabled || p<=.35 || p>=.88)return;
    const camera=portal.childCamera,c=drawingContext;
    c.save();c.globalCompositeOperation='source-over';c.lineCap='round';
    c.translate(camera.x,camera.y);c.scale(camera.zoom,camera.zoom);
    for(const mark of cosmicMarksV2(nestedV2.transition)) {
        const opacity=.66*cosmicRampV2(mark.arrival,mark.arrival+.14,p)*
            (1-cosmicRampV2(.58,mark.end,p));
        if(opacity<=0)continue;
        c.save();c.translate(mark.x,mark.y);c.rotate(mark.angle);
        c.globalAlpha=opacity;c.strokeStyle=mark.colour;c.lineWidth=mark.w;c.stroke(mark.path);
        // Shorter dry-paint ridge, same curved geometry, not a glowing sprite.
        c.globalAlpha=opacity*.35;c.strokeStyle='rgb(255,244,205)';
        c.lineWidth=mark.w*.30;c.scale(.72,.75);c.stroke(mark.path);c.restore();
        cosmicThresholdV2.stats.drawn++;
    }
    c.restore();
}
