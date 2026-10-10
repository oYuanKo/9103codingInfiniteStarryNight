const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const server=http.createServer((req,res)=>{const f=path.resolve(root,req.url==='/'?'index.html':req.url.slice(1));if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end()};res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':'text/html');res.end(fs.readFileSync(f));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
 browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1000,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errors.push(m.text())});
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForFunction(()=>typeof v2Camera!=='undefined'&&v2Camera&&brushFlowMap);
 await page.evaluate(()=>{
  noLoop();brushDetailSettings.enabled=false;brushFlowSettings.paused=true;brushFlowSettings.cursorEnabled=false;
  const star=brushV2.stars[0];Object.assign(v2Camera,stillCameraV2(3,-1328,-204));
  requestPortalV2(childEdgeV2(star),'in',-500);
  let n=0;while(nestedV2.preload||nestedV2.pending){updateChildPreloadV2();if(++n>2000)throw Error('generation stuck');}
  window.pixels=()=>{brushFlowBuffer.loadPixels();return Uint8Array.from(brushFlowBuffer.pixels)};
  window.renderAt=p=>{nestedV2.transition.progress=nestedV2.transition.targetProgress=p;drawStarEntryV2();return pixels()};
  window.same=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
 });
 const endpoint=await page.evaluate(()=>{
  const tr=nestedV2.transition;
  const p0=renderAt(0);drawBrushFlowShader(false,tr.camera);const parentExact=same(p0,pixels());
  const p1=renderAt(1);const active=captureWorldV2();activateWorldV2(tr.child);drawBrushFlowShader(false,tr.childCamera);const childExact=same(p1,pixels());activateWorldV2(active);
  const half=renderAt(.5);renderAt(.8);const reversible=same(half,renderAt(.5));
  renderAt(.32);const maskImage=pixels(),cam=getStarEntryCameraV2();drawBrushFlowShader(false,cam);const parent=pixels();
  // The opposite bottom-left region remains precisely parent: no whole-screen fade.
  let outsideSame=true;for(let y=560;y<590;y++)for(let x=10;x<50;x++)for(let c=0;c<3;c++){const i=(y*width+x)*4+c;if(maskImage[i]!==parent[i])outsideSame=false;}
  let changed=0;for(let i=0;i<parent.length;i+=4)if(parent[i]!==maskImage[i]||parent[i+1]!==maskImage[i+1])changed++;
  return {parentExact,childExact,reversible,outsideSame,changed};
 });
 console.log('Portal pixel checks:',endpoint);for(const name of ['parentExact','childExact','reversible','outsideSame'])assert.equal(endpoint[name],true,name);assert.equal(endpoint.changed,0); // Early zoom is now entirely parent paint.
 for(const p of [0,.2,.45,.7,.9,1]){await page.evaluate(p=>renderAt(p),p);await page.locator('canvas').first().screenshot({path:path.join(root,'tests',`step6d-${Math.round(p*100)}.png`)});}
 // Geometry replay / sharpness checks now live in detail.browser.cjs.
 const cursor=await page.evaluate(()=>{
  renderAt(.5);brushCursor.x=650;brushCursor.y=150;brushCursor.vx=9;brushCursor.vy=5;brushCursor.active=1;brushCursor.speed=1;
  brushFlowSettings.cursorEnabled=false;drawStarEntryV2();const a=pixels();brushFlowSettings.cursorEnabled=true;drawStarEntryV2();const b=pixels();
  let near=0,far=0;for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4;let d=0;for(let c=0;c<3;c++)d+=Math.abs(a[i+c]-b[i+c]);const r=Math.hypot(x-650,y-150);if(r<90)near+=d;else if(r>300)far+=d;}
  brushFlowSettings.cursorEnabled=false;return {near,far};
 });assert(cursor.near>cursor.far);console.log('Portal cursor locality:',cursor);
 const resource=await page.evaluate(()=>{
  const buffer=brushFlowBuffer,renderer=buffer._renderer;renderAt(.5);const start=renderer.textures.size,canvases=document.querySelectorAll('canvas').length;
  for(let i=0;i<120;i++)renderAt(.15+(i%70)/100);
  return {sameBuffer:brushFlowBuffer===buffer,start,end:renderer.textures.size,canvases,after:document.querySelectorAll('canvas').length};
 });assert(resource.sameBuffer);assert.equal(resource.start,resource.end);assert.equal(resource.canvases,resource.after);console.log('Repeated portal resource check:',resource);
 // Endpoint of an outward portal must use the actual unsettled child camera.
 const outward=await page.evaluate(()=>{
  renderAt(1);finishPortalV2(true);Object.assign(v2Camera,stillCameraV2(1.007,-2,-1));v2Camera.targetZoom=1;v2Camera.targetX=0;v2Camera.targetY=0;
  drawBrushFlowShader(false,v2Camera);const before=pixels();requestPortalV2(nestedV2.current.parent,'out',100);const after=renderAt(1);
  return same(before,after);
 });assert(outward);console.log('PASS outward start matches actual child camera exactly');
 async function timing(portal){return page.evaluate(async portal=>{
  const tr=nestedV2.transition;tr.progress=tr.targetProgress=.65;brushFlowSettings.paused=false;
  const values=[];let last=performance.now();
  for(let i=0;i<100;i++){await new Promise(requestAnimationFrame);const now=performance.now();if(i>10)values.push(now-last);last=now;if(portal)drawStarEntryV2();else drawBrushFlowShader(true,v2Camera);}
  values.sort((a,b)=>a-b);brushFlowSettings.paused=true;
  return {median:values[Math.floor(values.length*.5)],p95:values[Math.floor(values.length*.95)],max:values.at(-1)};
 },portal)}
 console.log('Headless frame intervals ms (not a hardware FPS guarantee):', {normal:await timing(false),portal:await timing(true)});
 assert.deepEqual(errors,[]);console.log('PASS no browser JavaScript/WebGL errors');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
