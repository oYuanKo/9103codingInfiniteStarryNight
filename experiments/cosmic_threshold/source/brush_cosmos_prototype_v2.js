// Step 11.5: isolated material-lineage experiment, not a world or navigation state.
// A transition owns this small numeric geometry cache weakly; no texture/world retained.
const brushCosmosPrototypeV2 = { cache: new WeakMap(), stats: { builds: 0, buildMs: 0, sources: 0, fragments: 0, drawn: 0 } };
function usesBrushCosmosV2() {
    return cosmicThresholdSettingsV2.enabled && cosmicThresholdSettingsV2.brushContinuity;
}
function brushCosmosTargetV2(tr) {
    return tr && tr.edge.parent.seed === 12 && tr.edge.starId === 'moon';
}
function setCosmicReviewModeV2(mode) {
    if (!['A','B','C'].includes(mode)) throw new Error('Use review mode A, B or C');
    cosmicThresholdSettingsV2.enabled = mode !== 'A';
    cosmicThresholdSettingsV2.brushContinuity = mode === 'C';
    if (mode === 'B') Object.assign(cosmicThresholdSettingsV2, { galaxyInterior: true, protoUniverse: true });
}
function brushCosmosPointV2(curve,t) {
    const u=1-t;
    return [u*u*u*curve[0]+3*u*u*t*curve[2]+3*u*t*t*curve[4]+t*t*t*curve[6],
        u*u*u*curve[1]+3*u*u*t*curve[3]+3*u*t*t*curve[5]+t*t*t*curve[7]];
}
function brushCosmosDerivativeV2(curve,t) {
    const u=1-t;
    return [3*u*u*(curve[2]-curve[0])+6*u*t*(curve[4]-curve[2])+3*t*t*(curve[6]-curve[4]),
        3*u*u*(curve[3]-curve[1])+6*u*t*(curve[5]-curve[3])+3*t*t*(curve[7]-curve[5])];
}
function brushCosmosFlowV2(map,x,y) {
    const ix=Math.max(0,Math.min(map.width-1,Math.floor(x/width*map.width)));
    const iy=Math.max(0,Math.min(map.height-1,Math.floor(y/height*map.height)));
    const i=4*(iy*map.width+ix),vx=map.pixels[i]/127.5-1,vy=map.pixels[i+1]/127.5-1;
    return { angle: Math.atan2(vy,vx), weight: map.pixels[i+2]/255 };
}
function brushCosmosMaterialV2(tr) {
    if (brushCosmosPrototypeV2.cache.has(tr)) return brushCosmosPrototypeV2.cache.get(tr);
    const started=performance.now(),source=tr.parent.detailSource,a=source.records;
    // Select paint within the entry star and visible at the middle of the zoom.
    // Spatial-index query and CPU paint samples happen once, never per frame.
    const z=tr.camera.zoom*Math.pow(tr.finalZoom/tr.camera.zoom,.55);
    const r=Math.min(tr.star.radius*1.6,Math.min(width,height)*.38/z);
    const rect={x:Math.max(0,Math.floor(tr.star.x-r)),y:Math.max(0,Math.floor(tr.star.y-r)),
        w:Math.ceil(r*2+2),h:Math.ceil(r*2+2)};
    rect.w=Math.min(width-rect.x,rect.w);rect.h=Math.min(height-rect.y,rect.h);
    const paint=tr.parent.base.drawingContext.getImageData(rect.x,rect.y,rect.w,rect.h).data;
    const selected=[],fragments=[];
    // Later paint wins. Reject buried strokes using final CPU paint colour and
    // spread the small selection across the real brush body rather than adding stars.
    for(const id of brushIdsInRectV2(source,rect).reverse()) {
        const i=id*BRUSH_RECORD_STRIDE,x=a[i],y=a[i+1],len=a[i+3],w=a[i+4];
        if(x<rect.x||y<rect.y||x>=rect.x+rect.w||y>=rect.y+rect.h||len<3||w<.8||a[i+8]<140)continue;
        const px=4*(Math.floor(y-rect.y)*rect.w+Math.floor(x-rect.x));
        const error=Math.hypot(paint[px]-a[i+5],paint[px+1]-a[i+6],paint[px+2]-a[i+7]);
        if(error>70 || selected.some(s=>Math.hypot(s.x-x,s.y-y)<r*.19))continue;
        const angle=a[i+2],ux=Math.cos(angle),uy=Math.sin(angle),bend=Math.sin(x*.017+y*.021)*len*.18;
        const curve=[x-ux*len/2,y-uy*len/2,x-ux*len*.2-uy*bend,y-uy*len*.2+ux*bend,
            x+ux*len*.2-uy*bend,y+uy*len*.2+ux*bend,x+ux*len/2,y+uy*len/2];
        const record={id,x,y,curve,colour:a.slice(i+5,i+8),alpha:a[i+8]/255,w};
        selected.push(record);if(selected.length===12)break;
    }
    selected.sort((a,b)=>a.id-b.id);
    for(const stroke of selected)for(let piece=0;piece<6;piece++) {
        // Same seed/id/strand hash family as the existing meso paint. Irregular
        // lengths and offsets inherit pigment structure, not paired dotted rails.
        const h=n=>microHashV2(source.seed,stroke.id,piece*7+n,1);
        const len=a[stroke.id*BRUSH_RECORD_STRIDE+3];
        const mid=.06+.88*h(0),spanSize=Math.min(.36,5/len)*(.4+.6*h(1));
        const t0=Math.max(.04,mid-spanSize/2),t1=Math.min(.96,mid+spanSize/2);
        const centre=brushCosmosPointV2(stroke.curve,mid);
        const tangent=brushCosmosDerivativeV2(stroke.curve,mid),angle=Math.atan2(tangent[1],tangent[0]);
        const offset=(h(2)-.5)*stroke.w*.72;
        const shifted=stroke.curve.map((v,j)=>v+(j%2?Math.cos(angle):-Math.sin(angle))*offset);
        const p=brushCosmosPointV2(shifted,t0),q=brushCosmosPointV2(shifted,t1);
        const d=brushCosmosDerivativeV2(shifted,t0),e=brushCosmosDerivativeV2(shifted,t1),span=(t1-t0)/3;
        const cx=centre[0]-Math.sin(angle)*offset,cy=centre[1]+Math.cos(angle)*offset;
        // Exact cubic restriction: each path has demonstrable source-stroke lineage.
        const points=[p[0],p[1],p[0]+d[0]*span,p[1]+d[1]*span,q[0]-e[0]*span,q[1]-e[1]*span,q[0],q[1]];
        fragments.push({sourceId:stroke.id,piece,t0,t1,offset,cx,cy,angle,points,
            width:Math.min(.48,stroke.w*.075)*(.45+.55*h(6)),colour:stroke.colour,alpha:stroke.alpha,
            delay:h(0)*.06,shade:h(4)>.48?1.09:.80});
    }
    const material={sources:selected,fragments};
    brushCosmosPrototypeV2.cache.set(tr,material);
    Object.assign(brushCosmosPrototypeV2.stats,{builds:brushCosmosPrototypeV2.stats.builds+1,
        buildMs:performance.now()-started,sources:selected.length,fragments:fragments.length});
    return material;
}
function brushCosmosPoseV2(fragment,tr,parent,child,p) {
    // Centres continue along the existing parent camera, never flying to a new layout.
    const x=parent.x+fragment.cx*parent.zoom,y=parent.y+fragment.cy*parent.zoom;
    const wx=(x-child.x)/child.zoom,wy=(y-child.y)/child.zoom;
    const flow=brushCosmosFlowV2(tr.child.flowMap,wx,wy);
    const depth=cosmicRampV2(.35+fragment.delay,.76,p);
    const angle=Math.atan2(Math.sin(flow.angle-fragment.angle),Math.cos(flow.angle-fragment.angle));
    // A capped local turn: aligning material with the destination flow is not a
    // long-distance flight towards an arbitrary child-space target.
    const rotation=Math.max(-.65,Math.min(.65,angle))*depth;
    const size=parent.zoom*(1-.78*depth);
    const opacity=cosmicRampV2(.20,.35,p)*(1-cosmicRampV2(.64,.88,p))*.45;
    return {x,y,rotation,size,opacity};
}
function drawBrushCosmosV2(portal) {
    brushCosmosPrototypeV2.stats.drawn=0;
    const tr=nestedV2.transition,p=portal.progress;
    if(!usesBrushCosmosV2()||!brushCosmosTargetV2(tr)||p<=.20||p>=.88)return;
    const material=brushCosmosMaterialV2(tr),parent=getStarEntryCameraV2(),c=drawingContext;
    c.save();c.lineCap='round';c.globalCompositeOperation='source-over';
    for(const fragment of material.fragments) {
        const pose=brushCosmosPoseV2(fragment,tr,parent,portal.childCamera,p);
        // Cropping is ordinary canvas clipping; no pop-producing visibility cull.
        c.save();c.translate(pose.x,pose.y);c.rotate(pose.rotation);c.scale(pose.size,pose.size);
        c.globalAlpha=pose.opacity*fragment.alpha;
        c.strokeStyle='rgb('+fragment.colour.map(v=>Math.min(255,Math.round(v*fragment.shade))).join(',')+')';
        c.lineWidth=fragment.width;
        const q=fragment.points;
        c.beginPath();c.moveTo(q[0]-fragment.cx,q[1]-fragment.cy);
        c.bezierCurveTo(q[2]-fragment.cx,q[3]-fragment.cy,q[4]-fragment.cx,q[5]-fragment.cy,q[6]-fragment.cx,q[7]-fragment.cy);
        c.stroke();c.restore();
        brushCosmosPrototypeV2.stats.drawn++;
    }
    c.restore();
}
