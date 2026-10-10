const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');const root=path.resolve(__dirname,'..');
(async()=>{
 const server=http.createServer((req,res)=>{const f=path.resolve(root,req.url==='/'?'index.html':req.url.slice(1));if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end()};res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':'text/html');res.end(fs.readFileSync(f));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
 browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});const page=await browser.newPage({viewport:{width:1000,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errors.push(m.text())});
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForFunction(()=>typeof v2Camera!=='undefined'&&v2Camera&&brushFlowMap);
 await page.evaluate(()=>{
  noLoop();brushDetailSettings.microEnabled=true;brushFlowSettings.paused=true;brushFlowSettings.enabled=false;brushFlowSettings.cursorEnabled=false;
  window.screenPixels=()=>Uint8Array.from(drawingContext.getImageData(0,0,width,height).data);
  window.errorPixels=(a,b)=>{let sum=0;for(let i=0;i<a.length;i+=4)for(let c=0;c<3;c++)sum+=Math.abs(a[i+c]-b[i+c]);return sum/(width*height*3)};
  window.equalPixels=(a,b)=>a.every((v,i)=>v===b[i]);
  window.settleDetail=async render=>{for(let i=0;i<1600;i++){render();await new Promise(r=>setTimeout(r,4));if(!brushDetailV2.job){render();if(!brushDetailV2.job)break;}if(i===1599)throw Error('detail stuck '+JSON.stringify({cursor:brushDetailV2.job?.cursor,total:brushDetailV2.job?.ids?.length,stats:brushDetailV2.stats,progress:nestedV2.transition?.progress}));}await new Promise(r=>setTimeout(r,160));render();};
 });
 const results=[];
 for(const zoom of [3,6,12,24]) {
  const result=await page.evaluate(async zoom=>{
   const s=brushV2.stars[0];window.testCamera={zoom,x:width/2-(s.x+s.radius*.7)*zoom,y:height/2-(s.y+s.radius*.4)*zoom};
   brushDetailSettings.microEnabled=false;await settleDetail(()=>drawBrushFlowShader(true,testCamera));const before=screenPixels();
   brushDetailSettings.microEnabled=true;drawBrushFlowShader(true,testCamera);const after=screenPixels();
   const change=errorPixels(before,after),builds=brushDetailV2.stats.builds;
   drawBrushFlowShader(true,{...testCamera,zoom:zoom+.0001});drawBrushFlowShader(true,testCamera);
   const reversible=equalPixels(after,screenPixels());
   window.microBefore=before;window.microAfter=after;
   return {zoom,change,reversible,noBuild:builds===brushDetailV2.stats.builds};
  },zoom);results.push(result);assert(result.change>0);assert(result.reversible&&result.noBuild);
  await page.locator('canvas').first().screenshot({path:path.join(root,'tests',`step6d2-micro-${zoom}.png`)});
  await page.evaluate(()=>{brushDetailSettings.microEnabled=false;drawBrushFlowShader(true,testCamera);brushDetailSettings.microEnabled=true});
  await page.locator('canvas').first().screenshot({path:path.join(root,'tests',`step6d2-replay-${zoom}.png`)});
 }
 console.log('Hierarchical geometric detail:',results);
 const deterministic=await page.evaluate(async()=>{
  const originalHash=microHashV2;let trace=2166136261;
  microHashV2=(...args)=>{const v=originalHash(...args);trace=Math.imul(trace^Math.floor(v*4294967296),16777619)>>>0;return v};
  disposeBrushDetailsV2(brushV2.detailSource);
  await settleDetail(()=>drawBrushFlowShader(true,testCamera));const geometryTrace=trace;trace=2166136261;const first=screenPixels(), firstAtlas=Uint8Array.from(brushDetailV2.slots.get(brushV2.detailSource).active.g.drawingContext.getImageData(0,0,2048,1536).data), firstRect={x:brushDetailV2.slots.get(brushV2.detailSource).active.x,y:brushDetailV2.slots.get(brushV2.detailSource).active.y};
  disposeBrushDetailsV2(brushV2.detailSource);await settleDetail(()=>drawBrushFlowShader(true,testCamera));
  const exact=equalPixels(first,screenPixels()),error=errorPixels(first,screenPixels()),lastRect={x:brushDetailV2.slots.get(brushV2.detailSource).active.x,y:brushDetailV2.slots.get(brushV2.detailSource).active.y};
  const secondAtlas=brushDetailV2.slots.get(brushV2.detailSource).active.g.drawingContext.getImageData(0,0,2048,1536).data;
  let atlasMaxError=0,atlasChanged=0;
  firstAtlas.forEach((v,i)=>{const e=Math.abs(v-secondAtlas[i]);atlasMaxError=Math.max(atlasMaxError,e);if(e)atlasChanged++});
  const geometryExact=geometryTrace===trace;microHashV2=originalHash;
  const source=brushV2.detailSource;const a=detailViewV2(captureWorldV2(),{zoom:6,x:-600,y:-600});updateBrushDetailsV2([a]);const old=brushDetailV2.job;
  const b=detailViewV2(captureWorldV2(),{zoom:12,x:-6000,y:-3000});updateBrushDetailsV2([b]);
  return {exact,geometryExact,atlasMaxError,atlasChanged,error,firstRect,lastRect,obsoleteCancelled:!!old&&!brushDetailV2.patches.includes(old),patches:brushDetailV2.patches.length};
 });console.log('Seeded regeneration and stale job cancellation:',deterministic);assert(deterministic.geometryExact&&deterministic.atlasMaxError<=4&&deterministic.atlasChanged<256&&deterministic.error<.001&&deterministic.obsoleteCancelled);
 await page.evaluate(()=>{
  const star=brushV2.stars[0];Object.assign(v2Camera,stillCameraV2(3,-1328,-204));requestPortalV2(childEdgeV2(star),'in',-500);
  let n=0;while(nestedV2.preload||nestedV2.pending){updateChildPreloadV2();if(++n>2000)throw Error('generation stuck')}
  window.renderAt=p=>{nestedV2.transition.progress=nestedV2.transition.targetProgress=p;drawStarEntryV2();return screenPixels()};
 });
 for(const p of [0,.2,.4,.6,.8,1]){
  await page.evaluate(async p=>{await settleDetail(()=>renderAt(p))},p);
  await page.locator('canvas').first().screenshot({path:path.join(root,'tests',`step6d2-transition-${Math.round(p*100)}.png`)});
 }
 const transition=await page.evaluate(async()=>{
  await settleDetail(()=>renderAt(.25));const early=screenPixels();drawBrushFlowShader(true,getStarEntryCameraV2());const earlyParent=equalPixels(early,screenPixels());
  // Compare stable assets, so this measures transition reversibility rather than LOD arrival.
  await settleDetail(()=>renderAt(.6));const middle=screenPixels();renderAt(.7);renderAt(.6);const reversible=equalPixels(middle,screenPixels());
  const tr=nestedV2.transition;renderAt(1);const end=screenPixels(),active=captureWorldV2();activateWorldV2(tr.child);drawBrushFlowShader(true,tr.childCamera);const endpoint=equalPixels(end,screenPixels());activateWorldV2(active);
  // Check the old geometric mask is gone from the shader.
  return {earlyParent,reversible,endpoint,radialMask:BRUSH_FLOW_FRAG.includes('length(screen - u_portal')};
 });console.log('Painterly transition:',transition);assert(!transition.earlyParent&&transition.reversible&&transition.endpoint&&!transition.radialMask);
 const moving=await page.evaluate(async()=>{
  brushFlowSettings.enabled=true;brushFlowSettings.paused=false;brushFlowSettings.cursorEnabled=true;
  await settleDetail(()=>renderAt(.65));const ms=[];
  for(let i=0;i<70;i++){const start=performance.now();renderAt(.65);brushFlowBuffer.loadPixels();ms.push(performance.now()-start);await new Promise(requestAnimationFrame)}
  ms.sort((a,b)=>a-b);return {median:ms[35],p95:ms[66],max:ms[69]};
 });console.log('Moving two-world transition including GPU readback (ms):',moving);
 await page.locator('canvas').first().screenshot({path:path.join(root,'tests','step6d2-flow-transition.png')});
 await page.evaluate(()=>{brushFlowSettings.enabled=false;brushFlowSettings.paused=true;brushFlowSettings.cursorEnabled=false});
 const stability=await page.evaluate(async()=>{
  await settleDetail(()=>renderAt(.6));const before=screenPixels(),builds=brushDetailV2.stats.builds;
  for(let i=0;i<60;i++)renderAt(.6);const stable=equalPixels(before,screenPixels());
  const noRebuild=builds===brushDetailV2.stats.builds;
  for(let i=0;i<12;i++){const z=[3,6,12][i%3],cam={zoom:z,x:400-(100+i*50)*z,y:300-180*z};await settleDetail(()=>drawBrushFlowShader(true,cam));if(brushDetailV2.patches.length>brushDetailSettings.maxTextures)throw Error('cache unbounded');}
  const patches=brushDetailV2.patches.length,textures=brushFlowBuffer._renderer.textures.size;
  const stats={...brushDetailV2.stats};resetNestedV2();const clean=brushDetailV2.patches.length===0&&brushDetailV2.slots.size===0&&!brushDetailV2.job&&brushFlowBuffer._renderer.textures.size===0;
  universeSeed=12;initBrushV2(12);rebuildBrushFlowMap();v2Camera.reset();currentWorldNodeV2();
  return {stable,noRebuild,patches,textures,clean,stats};
 });console.log('Detail cache stress:',stability);assert(stability.stable&&stability.noRebuild&&stability.clean);
 const frames=await page.evaluate(async()=>{
  brushFlowSettings.enabled=true;brushFlowSettings.paused=false;
  const cam={zoom:12,x:400-700*12,y:300-124*12};await settleDetail(()=>drawBrushFlowShader(true,cam));
  const ms=[];for(let i=0;i<100;i++){const start=performance.now();drawBrushFlowShader(true,cam);brushFlowBuffer.loadPixels();ms.push(performance.now()-start);await new Promise(requestAnimationFrame)}ms.sort((a,b)=>a-b);return {median:ms[50],p95:ms[95],max:ms[99]};
 });console.log('12x completed-frame timing including GPU readback (ms):',frames);
 const cold=await page.evaluate(async()=>{
  disposeBrushDetailsV2(brushV2.detailSource);const cam={zoom:6,x:400-650*6,y:300-145*6};
  const times=[];for(let i=0;i<40;i++){const start=performance.now();drawBrushFlowShader(true,cam);brushFlowBuffer.loadPixels();times.push(performance.now()-start);await new Promise(requestAnimationFrame)}
  times.sort((a,b)=>a-b);return {median:times[20],p95:times[38],max:times[39],maxPaintBatch:brushDetailV2.stats.maxBatchMs};
 });console.log('Cold detail request + upload (ms):',cold);
 const arrival=await page.evaluate(async()=>{
  brushFlowSettings.enabled=false;brushFlowSettings.paused=true;
  disposeBrushDetailsV2(brushV2.detailSource);
  const cam={zoom:6,x:400-650*6,y:300-145*6};let frames=0;const start=performance.now();
  do{drawBrushFlowShader(true,cam);frames++;await new Promise(requestAnimationFrame)}while(brushDetailV2.job&&frames<1500);
  const elapsed=performance.now()-start;
  return {frames,elapsed,complete:!brushDetailV2.job,atlasMiB:brushDetailV2.patches.length*2048*1536*4/1048576};
 });console.log('Cold 6x atlas arrival (incremental, before refinement blend):',arrival);assert(arrival.complete);
 assert.deepEqual(errors,[]);console.log('PASS no browser JavaScript/WebGL errors');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
