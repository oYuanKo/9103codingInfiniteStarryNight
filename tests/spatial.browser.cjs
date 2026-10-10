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
 const ids=await page.evaluate(()=>[brushV2.stars[0].id,brushV2.stars.find(s=>s.id==='major-1').id,brushV2.stars.at(-1).id]);
 for(const [index,id] of ids.entries()){
  await page.evaluate(id=>startStar(id),id);
  const scales=await page.evaluate(()=>{
   const rows=[];for(let n=0;n<=100;n++){const p=n/100;renderAt(p);const parent=getStarEntryCameraV2(),child=getPortalRenderV2();rows.push({p,parent:parent.zoom,child:child.childCamera.zoom,anchorError:Math.hypot(child.childCamera.x+(child.anchorX-nestedV2.transition.childCamera.x)/nestedV2.transition.childCamera.zoom*child.childCamera.zoom-child.anchorX,child.childCamera.y+(child.anchorY-nestedV2.transition.childCamera.y)/nestedV2.transition.childCamera.zoom*child.childCamera.zoom-child.anchorY)})}return rows;
  });assert(scales.every((r,i)=>r.anchorError<1e-9&&(!i||(r.parent>scales[i-1].parent&&r.child>scales[i-1].child))));console.log('Monotonic screen scales and fixed anchor',id,scales.filter((r,i)=>i%20===0));
  for(const p of [.2,.4,.5,.6,.7,.8,.9]){
   await page.evaluate(p=>settle(p),p);await page.locator('canvas').first().screenshot({path:path.join(root,'tests',`step6d3-star-${index}-${Math.round(p*100)}.png`)});
  }
  const reverse=await page.evaluate(async()=>{
   const results=[];for(const p of [.3,.5,.7]){await settle(p);const first=pixels();for(let i=0;i<80;i++)updateStarEntryV2(16.67);drawStarEntryV2();const stopped=same(first,pixels());const update=updateBrushDetailsV2;updateBrushDetailsV2=()=>{};renderAt(p-.02);renderAt(p);updateBrushDetailsV2=update;results.push({p,stopped,reversed:same(first,pixels())})}return results;
  });console.log('Stopped/reversed settled frames',id,reverse);assert(reverse.every(r=>r.stopped&&r.reversed));
 }
 // Cursor locality also covers the reflected peripheral paint, not just the centre.
 const edgeCursor=await page.evaluate(async()=>{
  await startStar(brushV2.stars[0].id);await settle(.9);
  brushFlowSettings.paused=true;brushFlowSettings.cursorEnabled=false;
  renderAt(.9);const before=pixels();
  Object.assign(brushCursor,{x:2,y:300,vx:9,vy:2,active:1,speed:1});brushFlowSettings.cursorEnabled=true;
  renderAt(.9);const after=pixels();let near=0,far=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4;let d=0;for(let c=0;c<3;c++)d+=Math.abs(before[i+c]-after[i+c]);if(Math.hypot(x-2,y-300)<100)near+=d;else if(x>300)far+=d}
  brushFlowSettings.cursorEnabled=false;return {near,far};
 });assert(edgeCursor.near>edgeCursor.far);console.log('Peripheral cursor locality',edgeCursor);
 // Record a controlled continuous depth sweep, with the actual renderer and live flow.
 // Navigation's actual wheel/state-machine paths are separately tested below and in navigation.browser.cjs.
 await page.evaluate(id=>startStar(id),ids[0]);
 const video=await page.evaluate(async()=>{
  brushFlowSettings.paused=false;brushFlowSettings.cursorEnabled=false;
  const chunks=[],stream=document.querySelector('canvas').captureStream(30),recorder=new MediaRecorder(stream,{mimeType:'video/webm'});
  recorder.ondataavailable=e=>chunks.push(e.data);const done=new Promise(r=>recorder.onstop=r);recorder.start();
  for(const direction of [1,-1])for(let n=0;n<=150;n++){renderAt(direction===1?n/150:1-n/150);await new Promise(r=>setTimeout(r,33))}
  recorder.stop();await done;stream.getTracks().forEach(t=>t.stop());
  const bytes=new Uint8Array(await new Blob(chunks).arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(binary);
 });fs.writeFileSync(path.join(root,'tests','step6d3-depth-roundtrip.webm'),Buffer.from(video,'base64'));
 await page.evaluate(()=>{renderAt(0);finishPortalV2(false);brushFlowSettings.paused=true;loop()});
 const box=await page.locator('canvas').first().boundingBox();
 for(const target of [.3,.5,.7]){
  await page.evaluate(id=>startStar(id),ids[0]);
  await page.evaluate(()=>{nestedV2.transition.progress=nestedV2.transition.targetProgress=.01;loop()});
  await page.mouse.move(box.x+400,box.y+300);
  const delta=await page.evaluate(p=>-(p-.01)*nestedV2.transition.range/v2Camera.sensitivity,target);
  await page.mouse.wheel(0,delta);await page.waitForTimeout(900);
  const a=await page.evaluate(()=>nestedV2.transition.progress);await page.waitForTimeout(300);const b=await page.evaluate(()=>nestedV2.transition.progress);
  assert(Math.abs(a-target)<.005&&Math.abs(a-b)<.001);
  await page.mouse.wheel(0,-delta*1.15);await page.waitForFunction(()=>!nestedV2.transition&&!nestedV2.pending);
  console.log('Actual wheel pause and reverse',target,a,b);
  await page.evaluate(()=>noLoop());
 }
 // A second recording uses actual wheel events from the ordinary 1x camera.
 await page.evaluate(()=>{
  v2Camera.reset();brushFlowSettings.paused=false;loop();
  window.wheelChunks=[];window.wheelStream=document.querySelector('canvas').captureStream(30);
  window.wheelRecorder=new MediaRecorder(wheelStream,{mimeType:'video/webm'});
  wheelRecorder.ondataavailable=e=>wheelChunks.push(e.data);
  window.wheelDone=new Promise(r=>wheelRecorder.onstop=r);wheelRecorder.start();
 });
 async function aim(){const pt=await page.evaluate(()=>{const s=brushV2.stars[0];return {x:v2Camera.x+s.x*v2Camera.zoom,y:v2Camera.y+s.y*v2Camera.zoom}});await page.mouse.move(box.x+pt.x,box.y+pt.y)}
 await aim();await page.mouse.wheel(0,-900);await page.waitForFunction(()=>v2Camera.zoom>2.99);await aim();await page.mouse.wheel(0,-100);
 await page.waitForFunction(()=>!!nestedV2.transition);
 for(let n=0;n<35;n++){const range=await page.evaluate(()=>nestedV2.transition?.range);if(!range)break;await page.mouse.wheel(0,-range/10/.0015);await page.waitForTimeout(160)}
 await page.waitForFunction(()=>!nestedV2.transition&&!nestedV2.pending);
 assert.equal(await page.evaluate(()=>v2Camera.zoom),1);
 await page.waitForTimeout(400);await page.mouse.wheel(0,100);await page.waitForFunction(()=>!!nestedV2.transition);
 for(let n=0;n<35;n++){const range=await page.evaluate(()=>nestedV2.transition?.range);if(!range)break;await page.mouse.wheel(0,range/10/.0015);await page.waitForTimeout(160)}
 await page.waitForFunction(()=>!nestedV2.transition&&!nestedV2.pending);
 await page.waitForTimeout(400);
 const wheelVideo=await page.evaluate(async()=>{
  wheelRecorder.stop();await wheelDone;wheelStream.getTracks().forEach(t=>t.stop());
  const bytes=new Uint8Array(await new Blob(wheelChunks).arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(binary);
 });fs.writeFileSync(path.join(root,'tests','step6d3-wheel-roundtrip.webm'),Buffer.from(wheelVideo,'base64'));
 console.log('PASS recorded full real-wheel Parent -> Child -> Parent');
 assert.deepEqual(errors,[]);console.log('PASS spatial screenshots, recording, scales, anchored paths and wheel reversal');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
