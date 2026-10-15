const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');const root=path.resolve(__dirname,'..');
(async()=>{
 const server=http.createServer((req,res)=>{const f=path.resolve(root,req.url==='/'?'index.html':req.url.slice(1));if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end()};res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(f));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
 browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});const page=await browser.newPage({viewport:{width:1000,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errors.push(m.text())});
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForFunction(()=>typeof v2Camera!=='undefined'&&v2Camera&&brushFlowMap);
 await page.evaluate(()=>{
  noLoop();brushFlowSettings.paused=true;brushFlowSettings.cursorEnabled=false;
  window.pixels=()=>Uint8Array.from(drawingContext.getImageData(0,0,width,height).data);
  window.same=(a,b)=>a.every((v,i)=>v===b[i]);
  window.renderAt=p=>{nestedV2.transition.progress=nestedV2.transition.targetProgress=p;drawStarEntryV2();return pixels()};
  window.settle=async(p)=>{for(let i=0;i<1600;i++){renderAt(p);await new Promise(r=>setTimeout(r,4));if(!brushDetailV2.job){renderAt(p);if(!brushDetailV2.job)break}if(i===1599)throw Error('detail timeout')}await new Promise(r=>setTimeout(r,160));renderAt(p)};
  window.startStar=async id=>{
   noLoop();
   if(nestedV2.transition)finishPortalV2(false);
   v2Camera.reset();const star=brushV2.stars.find(s=>s.id===id),z=3;
   Object.assign(v2Camera,stillCameraV2(z,constrain(width/2-star.x*z,width*(1-z),0),constrain(height/2-star.y*z,height*(1-z),0)));
   requestPortalV2(childEdgeV2(star),'in',-100);
   while(nestedV2.pending||nestedV2.preload){updateChildPreloadV2();await new Promise(requestAnimationFrame)}
  };
 });

 await page.evaluate(()=>startStar(brushV2.stars[0].id));
 const cold=await page.evaluate(()=>{
  const update=updateBrushDetailsV2;updateBrushDetailsV2=()=>{};
  const rows=[];for(const enabled of [false,true,true]){
   cosmicThresholdSettingsV2.enabled=enabled;const t=performance.now();renderAt(.5);pixels();
   rows.push({enabled,ms:performance.now()-t,textures:brushFlowBuffer._renderer.textures.size,buildMs:cosmicThresholdV2.stats.buildMs});
  }updateBrushDetailsV2=update;return rows;
 });console.log('first-use costs including shader/texture warmup',cold);
 assert(await page.evaluate(()=>COSMIC_FLOW_FRAG_V2.includes('structure *= 1.0-threshold*.72;')));

 const originalPath=path.join(root,'tests/step11-original-shader.log');
 if(fs.existsSync(originalPath)) {
  const source=fs.readFileSync(originalPath,'utf8');
  const fragment=source.split('const BRUSH_FLOW_FRAG = \x60')[1].split('\x60;')[0];
  await page.evaluate(fragment=>{window.originalProgram=brushFlowBuffer.createShader(BRUSH_FLOW_VERT,fragment)},fragment);
 }
 for(const p of [0,.2,.35,.45,.5,.55,.65,.8,1]) {
  await page.evaluate(p=>settle(p),p);
  const result=await page.evaluate(p=>{
   cosmicThresholdSettingsV2.enabled=false;renderAt(p);const before=pixels();
   let original=true;
   if(window.originalProgram){const current=brushFlowProgram;brushFlowProgram=originalProgram;renderAt(p);original=same(before,pixels());brushFlowProgram=current;}
   cosmicThresholdSettingsV2.enabled=true;renderAt(p);const enabled=pixels();
   const stats={...cosmicThresholdV2.stats};const update=updateBrushDetailsV2;updateBrushDetailsV2=()=>{};renderAt(Math.max(0,p-.02));renderAt(p);updateBrushDetailsV2=update;
   return {p,original,endpoint:same(before,enabled),reversed:same(enabled,pixels()),stats,
    parent:getStarEntryCameraV2().zoom,child:getPortalRenderV2().childCamera.zoom};
  },p);
  assert(result.original,'Disabled differs from saved pre-change shader');assert(result.reversed);
  if(p<=.35||p>=.88)assert(result.endpoint,'Unaffected depth changed');
  console.log('depth',JSON.stringify(result));
  for(const enabled of [false,true]) {
   await page.evaluate(({p,enabled})=>{cosmicThresholdSettingsV2.enabled=enabled;renderAt(p)},{p,enabled});
   await page.locator('canvas').first().screenshot({path:path.join(root,'tests','step11-'+(enabled?'on':'off')+'-'+Math.round(p*100)+'.png')});
  }
 }
 // Paired settled frame cost includes GPU readback; not a GPU timer or FPS claim.
 await page.evaluate(()=>settle(.5));
 const performanceResults=await page.evaluate(()=>{
  const initialTextures=brushFlowBuffer._renderer.textures.size;
  const results=[];const update=updateBrushDetailsV2;updateBrushDetailsV2=()=>{};
  for(let round=0;round<4;round++)for(const enabled of (round%2?[true,false]:[false,true])) {
   cosmicThresholdSettingsV2.enabled=enabled;
   const samples=[];for(let n=0;n<65;n++){const t=performance.now();renderAt(.5);pixels();if(n>4)samples.push(performance.now()-t)}
   samples.sort((a,b)=>a-b);results.push({enabled,median:samples[30],p95:samples[57]});
  }
  updateBrushDetailsV2=update;cosmicThresholdSettingsV2.enabled=true;
  return {initialTextures,results,textures:brushFlowBuffer._renderer.textures.size,cache:cosmicThresholdV2.cache.size,marks:[...cosmicThresholdV2.cache.values()].reduce((a,b)=>a+b.length,0)};
 });assert.equal(performanceResults.textures,performanceResults.initialTextures);console.log('paired performance',JSON.stringify(performanceResults));
 const box=await page.locator('canvas').first().boundingBox();
 for(const target of [.4,.5,.6]) {
  await page.evaluate(()=>{nestedV2.transition.progress=nestedV2.transition.targetProgress=.1;loop()});
  await page.mouse.move(box.x+400,box.y+300);
  const delta=await page.evaluate(p=>-(p-.1)*nestedV2.transition.range/v2Camera.sensitivity,target);
  await page.mouse.wheel(0,delta);await page.waitForTimeout(900);
  const a=await page.evaluate(()=>nestedV2.transition.progress);await page.waitForTimeout(350);
  const b=await page.evaluate(()=>nestedV2.transition.progress);assert(Math.abs(a-target)<.005&&Math.abs(a-b)<.001);
  for(let i=0;i<3;i++){await page.mouse.wheel(0,delta*.1);await page.waitForTimeout(150);await page.mouse.wheel(0,-delta*.1);await page.waitForTimeout(350)}
  assert(Math.abs(await page.evaluate(()=>nestedV2.transition.targetProgress)-target)<.005);
  await page.evaluate(()=>noLoop());console.log('actual wheel pause/repeated reversal',target);
 }
 // Cache pressure: seven actual distinct edges, then deterministic regeneration.
 const cache=await page.evaluate(async()=>{
  const tr=nestedV2.transition,signature=marks=>JSON.stringify(marks.map(({path,...m})=>m));
  const expected=signature(cosmicMarksV2(tr));
  finishPortalV2(false);
  for(const star of brushV2.stars.slice(0,7)){await startStar(star.id);renderAt(.5);finishPortalV2(false)}
  await startStar(tr.edge.starId);const actual=signature(cosmicMarksV2(nestedV2.transition));
  return {same:expected===actual,entries:cosmicThresholdV2.cache.size,marks:[...cosmicThresholdV2.cache.values()].reduce((a,b)=>a+b.length,0),buildMs:cosmicThresholdV2.stats.buildMs};
 });assert(cache.same&&cache.entries<=4&&cache.marks<=192);console.log('cache eviction/regeneration',cache);
 assert.deepEqual(errors,[]);console.log('PASS cosmic A/B, endpoints, deterministic reversal, wheel pause and bounded cache');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
