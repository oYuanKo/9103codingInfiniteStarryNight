const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');const root=path.resolve(__dirname,'..');
(async()=>{
 const server=http.createServer((req,res)=>{const f=path.resolve(root,req.url==='/'?'index.html':req.url.slice(1));if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end()}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(f))});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1000,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errors.push(m.text())});
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>typeof v2Camera!=='undefined'&&v2Camera&&brushFlowMap);
 await page.evaluate(()=>{
  noLoop();brushFlowSettings.enabled=false;brushFlowSettings.paused=true;
  window.hoverPixels=()=>Uint8Array.from(drawingContext.getImageData(0,0,width,height).data);
  window.hoverPaint=()=>{drawBrushFlowShader(true,v2Camera);drawStarHoverLightV2(0)};
  window.pose=(z,id='major-1')=>{const s=brushV2.stars.find(s=>s.id===id);Object.assign(v2Camera,stillCameraV2(z,width/2-s.x*z,height/2-s.y*z));hoverWorldV2(captureWorldV2()).time=0;for(const t of starHoverLightV2.worlds.get(brushV2.detailSource).stars){t.intensity=t.star.id===id?1:0;t.dwell=t.star.id===id?3:0}};
  window.settleDetail=async()=>{for(let n=0;n<1800;n++){hoverPaint();await new Promise(r=>setTimeout(r,3));if(!brushDetailV2.job){hoverPaint();if(!brushDetailV2.job)break}if(n===1799)throw Error('detail timeout')}await new Promise(r=>setTimeout(r,180));hoverPaint()};
 });
 const canvas=page.locator('canvas').first(),box=await canvas.boundingBox();await page.mouse.move(box.x+400,box.y+300);
 for(const z of [1,3,6,12,24]){
  await page.evaluate(async z=>{pose(z);await settleDetail();starHoverLightSettingsV2.detailEnabled=false;hoverPaint();window.macroPixels=hoverPixels()},z);
  await canvas.screenshot({path:path.join(root,'tests','step7b-macro-'+z+'.png')});
  const result=await page.evaluate(()=>{starHoverLightSettingsV2.detailEnabled=true;hoverPaint();const a=hoverPixels();let diff=0,light=0;for(let i=0;i<a.length;i+=4)for(let c=0;c<3;c++){diff+=Math.abs(a[i+c]-macroPixels[i+c]);light+=a[i+c]-macroPixels[i+c]}return {drawn:starHoverLightV2.stats.drawn,detail:starHoverLightV2.stats.detailDrawn,difference:diff,meanColourShift:light/(width*height*3)}});
  assert(z===1?result.difference===0:result.difference>0);assert(Math.abs(result.meanColourShift)<1);console.log('Zoom',z,result);
  await canvas.screenshot({path:path.join(root,'tests','step7b-detail-'+z+'.png')});
 }
 // Additional halo crop keeps light geometry visible when the core fills the view.
 for(const z of [12,24]){
  await page.evaluate(async z=>{pose(z);const state=hoverWorldV2(captureWorldV2()).stars.find(s=>s.star.id==='major-1');const stroke=state.strokes.find(s=>s.depth>.3&&s.depth<.5);v2Camera.x=width/2-stroke.x*z;v2Camera.y=height/2-stroke.y*z;await settleDetail()},z);
  await canvas.screenshot({path:path.join(root,'tests','step7b-halo-'+z+'.png')});
 }
 // Moon uses the same inherited hierarchy; retain matching camera and dwell.
 for(const z of [1,3,6,12]){
  await page.evaluate(async z=>{pose(z,'moon');await settleDetail()},z);
  await canvas.screenshot({path:path.join(root,'tests','step7b-moon-'+z+'.png')});
 }
 // Controlled zoom sweep, frozen hover/flow, no camera/state-machine changes.
 await page.evaluate(async()=>{pose(6);await settleDetail();window.recChunks=[];window.recStream=document.querySelector('canvas').captureStream(30);window.recorder=new MediaRecorder(recStream,{mimeType:'video/webm'});recorder.ondataavailable=e=>recChunks.push(e.data);window.recDone=new Promise(r=>recorder.onstop=r);recorder.start()});
 for(let i=0;i<=120;i++){
  const z=Math.exp(Math.log(12)*(i<=60?i:120-i)/60);
  await page.evaluate(z=>{pose(z);hoverPaint()},z);await page.waitForTimeout(30);
 }
 const video=await page.evaluate(async()=>{recorder.stop();await recDone;recStream.getTracks().forEach(t=>t.stop());const a=new Uint8Array(await new Blob(recChunks).arrayBuffer());let s='';for(let i=0;i<a.length;i+=16384)s+=String.fromCharCode(...a.subarray(i,i+16384));return btoa(s)});
 fs.writeFileSync(path.join(root,'tests','step7b-detail-roundtrip.webm'),Buffer.from(video,'base64'));
 // Freeze painting assets to isolate overlay reversal, deterministic regeneration and LOD.
 const checks=await page.evaluate(()=>{
  const renderer=brushFlowBuffer._renderer,textureCount=renderer.textures.size;
  window.paintBackup=drawingContext.getImageData(0,0,width,height);
  window.overlay=()=>{drawingContext.putImageData(paintBackup,0,0);drawStarHoverLightV2(0);return hoverPixels()};
  pose(6);const a=overlay(),builds=starHoverLightV2.stats.detailBuilds;
  for(const z of [6.01,8,12,24,12,8,6.01,6]){pose(z);overlay()}
  const b=overlay();
  const same=a.every((v,i)=>v===b[i]);starHoverLightV2.worlds.clear();pose(6);const c=overlay();
  const regenerated=a.every((v,i)=>v===c[i]);
  const warmed=starHoverLightV2.stats.detailBuilds;for(let i=0;i<50;i++)overlay();
  return {same,regenerated,reused:warmed===starHoverLightV2.stats.detailBuilds,textures:textureCount===renderer.textures.size,
   cachedMarks:[...starHoverLightV2.worlds.values()].flatMap(w=>w.stars).flatMap(s=>s.strokes).reduce((n,s)=>n+(s.pigment||[]).reduce((n,a)=>n+a.length,0),0)};
 });console.log('Reversal/cache',checks);assert(checks.same&&checks.regenerated&&checks.reused&&checks.textures);
 const cold=await page.evaluate(()=>{starHoverLightV2.worlds.clear();pose(12);overlay();return {coldMs:starHoverLightV2.stats.updateMs,paths:[...starHoverLightV2.worlds.values()].flatMap(w=>w.stars).flatMap(s=>s.strokes).reduce((n,s)=>n+(s.pigment||[]).reduce((n,a)=>n+a.length,0),0)}});console.log('First visible detail build/draw',cold);
 // Matched, warmed A/B CPU renderer cost, excluding painting and pixel readback.
 for(const z of [1,3,6,12,24]){
  const timing=await page.evaluate(z=>{
   pose(z);const samples=[[],[]];
   for(let i=0;i<160;i++)for(const flag of [i%2,(i+1)%2]){starHoverLightSettingsV2.detailEnabled=!!flag;drawingContext.clearRect(0,0,width,height);drawStarHoverLightV2(0);if(i>=20)samples[flag].push(starHoverLightV2.stats.updateMs)}
   starHoverLightSettingsV2.detailEnabled=true;
   return samples.map(a=>{a.sort((x,y)=>x-y);return {median:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)]}});
  },z);console.log('Overlay CPU ms macro/detail',z,timing);
 }
 // Detail is a child of the same reveal: no active primary means no pigment.
 for(const z of [6,12]){
  const growth=await page.evaluate(z=>{
   pose(z);const state=starHoverLightV2.worlds.get(brushV2.detailSource).stars.find(s=>s.star.id==='major-1');
   const rows=[];for(const dwell of [0,.15,.7,3]){state.dwell=dwell;overlay();rows.push({dwell,macro:starHoverLightV2.stats.drawn,detail:starHoverLightV2.stats.detailDrawn})}
   return rows;
  },z);assert.equal(growth[0].detail,0);assert(growth[3].detail>growth[1].detail);console.log('Inherited reveal',z,growth);
 }
 await page.mouse.move(box.x+950,box.y+700);
 const decay=await page.evaluate(()=>{brushFlowSettings.paused=false;for(let n=0;n<480;n++)drawStarHoverLightV2(1000/60);brushFlowSettings.paused=true;return {macro:starHoverLightV2.stats.drawn,detail:starHoverLightV2.stats.detailDrawn}});assert.equal(decay.detail,0);assert.equal(decay.macro,0);
 // Real graph edges with different parent/child cameras, bounded geometry caches.
 await page.evaluate(async()=>{
  v2Camera.reset();const star=brushV2.stars.find(s=>s.id==='major-1');Object.assign(v2Camera,stillCameraV2(3,width/2-star.x*3,height/2-star.y*3));
  requestPortalV2(childEdgeV2(star),'in',-100);while(nestedV2.pending||nestedV2.preload){updateChildPreloadV2();await new Promise(requestAnimationFrame)}
 });
 const portal=await page.evaluate(()=>{
  const rows=[];for(const p of [.2,.4,.8,1,.8,.4,.2]){
   nestedV2.transition.progress=nestedV2.transition.targetProgress=p;const render=getPortalRenderV2();
   for(const world of [captureWorldV2(),render.child])for(const s of hoverWorldV2(world).stars){s.intensity=1;s.dwell=3}
   drawStarEntryV2();drawStarHoverLightV2(0);
   rows.push({p,parentZoom:getStarEntryCameraV2().zoom,childZoom:render.childCamera.zoom,worlds:starHoverLightV2.worlds.size,childHasDetail:hoverWorldV2(render.child).stars.some(s=>s.strokes.some(t=>t.pigment))});
  }
  finishPortalV2(false);drawStarHoverLightV2(0);return {rows,after:starHoverLightV2.worlds.size};
 });assert(portal.rows.every(r=>r.worlds===2&&!r.childHasDetail));assert.equal(portal.after,1);console.log('Per-world portal LOD',portal);
 assert.deepEqual(errors,[]);console.log('PASS zoom frames, deterministic reversal, cache reuse, per-world LOD, reveal, fade, bounded resources');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
