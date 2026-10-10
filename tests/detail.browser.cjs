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
  noLoop();brushFlowSettings.paused=true;brushFlowSettings.enabled=false;brushFlowSettings.cursorEnabled=false;
  window.screenPixels=()=>Uint8Array.from(drawingContext.getImageData(0,0,width,height).data);
  window.errorPixels=(a,b)=>{let sum=0;for(let i=0;i<a.length;i+=4)for(let c=0;c<3;c++)sum+=Math.abs(a[i+c]-b[i+c]);return sum/(width*height*3)};
  window.equalPixels=(a,b)=>a.every((v,i)=>v===b[i]);
  window.settleDetail=async render=>{for(let i=0;i<400;i++){render();await new Promise(r=>setTimeout(r,4));if(!brushDetailV2.job){render();if(!brushDetailV2.job)break;}if(i===399)throw Error('detail stuck');}await new Promise(r=>setTimeout(r,160));render();};
 });
 const replay=await page.evaluate(()=>{
  const g=createGraphics(width,height);g.pixelDensity(1);g.background(12,28,60);const source=brushV2.detailSource;
  for(let i=0;i<source.records.length/BRUSH_RECORD_STRIDE;i++)replayBrushRecordV2(g,source.records,i);
  g.loadPixels();brushV2.base.loadPixels();const exact=equalPixels(g.pixels,brushV2.base.pixels);g.remove();return {exact,strokes:source.records.length/BRUSH_RECORD_STRIDE,recordBytes:source.records.byteLength};
 });assert(replay.exact);console.log('Exact full-paint geometry replay:',replay);
 for(const zoom of [3,6,12]){
  const result=await page.evaluate(async zoom=>{
   const s=brushV2.stars[0];window.testCamera={zoom,x:constrain(width/2-(s.x+s.radius*1.3)*zoom,width*(1-zoom),0),y:constrain(height/2-(s.y+s.radius*.8)*zoom,height*(1-zoom),0)};
   brushDetailSettings.enabled=false;drawBrushFlowShader(true,testCamera);window.low=screenPixels();
   brushDetailSettings.enabled=true;await settleDetail(()=>drawBrushFlowShader(true,testCamera));window.high=screenPixels();
   const g=createGraphics(width,height);g.pixelDensity(1);g.background(12,28,60);g.translate(testCamera.x,testCamera.y);g.scale(zoom);
   const rect={x:-testCamera.x/zoom,y:-testCamera.y/zoom,w:width/zoom,h:height/zoom};
   for(const id of brushIdsInRectV2(brushV2.detailSource,rect))replayBrushRecordV2(g,brushV2.detailSource.records,id);
   image(g,0,0);const reference=screenPixels();window.referenceCanvas=g;drawBrushFlowShader(true,testCamera);
   return {zoom,lowError:errorPixels(low,reference),detailError:errorPixels(high,reference),patches:brushDetailV2.patches.length,stats:{...brushDetailV2.stats}};
  },zoom);
  console.log('Sharpness against direct geometry reference:',result);assert(result.detailError<result.lowError*.55);
  await page.locator('canvas').first().screenshot({path:path.join(root,'tests',`step6d1-sharp-${zoom}.png`)});
  await page.evaluate(()=>image(referenceCanvas,0,0));await page.locator('canvas').first().screenshot({path:path.join(root,'tests',`step6d1-reference-${zoom}.png`)});await page.evaluate(()=>referenceCanvas.remove());
  await page.evaluate(()=>{brushDetailSettings.enabled=false;drawBrushFlowShader(true,testCamera);brushDetailSettings.enabled=true});
  await page.locator('canvas').first().screenshot({path:path.join(root,'tests',`step6d1-cache-${zoom}.png`)});
 }
 await page.evaluate(()=>{
  const star=brushV2.stars[0];Object.assign(v2Camera,stillCameraV2(3,-1328,-204));requestPortalV2(childEdgeV2(star),'in',-500);
  let n=0;while(nestedV2.preload||nestedV2.pending){updateChildPreloadV2();if(++n>2000)throw Error('generation stuck')}
  window.renderAt=p=>{nestedV2.transition.progress=nestedV2.transition.targetProgress=p;drawStarEntryV2();return screenPixels()};
 });
 for(const p of [0,.25,.4,.5,.6,.7,.85,1]){
  await page.evaluate(async p=>{await settleDetail(()=>renderAt(p))},p);
  await page.locator('canvas').first().screenshot({path:path.join(root,'tests',`step6d1-transition-${Math.round(p*100)}.png`)});
 }
 const transition=await page.evaluate(async()=>{
  await settleDetail(()=>renderAt(.25));const early=screenPixels();drawBrushFlowShader(true,getStarEntryCameraV2());const earlyParent=equalPixels(early,screenPixels());
  // Compare stable assets, so this measures transition reversibility rather than LOD arrival.
  await settleDetail(()=>renderAt(.6));const middle=screenPixels();renderAt(.7);renderAt(.6);const reversible=equalPixels(middle,screenPixels());
  const tr=nestedV2.transition;renderAt(1);const end=screenPixels(),active=captureWorldV2();activateWorldV2(tr.child);drawBrushFlowShader(true,tr.childCamera);const endpoint=equalPixels(end,screenPixels());activateWorldV2(active);
  // Check the old geometric mask is gone from the shader.
  return {earlyParent,reversible,endpoint,radialMask:BRUSH_FLOW_FRAG.includes('length(screen - u_portal')};
 });console.log('Painterly transition:',transition);assert(transition.earlyParent&&transition.reversible&&transition.endpoint&&!transition.radialMask);
 const moving=await page.evaluate(async()=>{
  brushFlowSettings.enabled=true;brushFlowSettings.paused=false;brushFlowSettings.cursorEnabled=true;
  await settleDetail(()=>renderAt(.65));const ms=[];
  for(let i=0;i<70;i++){const start=performance.now();renderAt(.65);brushFlowBuffer.loadPixels();ms.push(performance.now()-start);await new Promise(requestAnimationFrame)}
  ms.sort((a,b)=>a-b);return {median:ms[35],p95:ms[66],max:ms[69]};
 });console.log('Moving two-world transition including GPU readback (ms):',moving);
 await page.locator('canvas').first().screenshot({path:path.join(root,'tests','step6d1-flow-transition.png')});
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
 assert.deepEqual(errors,[]);console.log('PASS no browser JavaScript/WebGL errors');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
