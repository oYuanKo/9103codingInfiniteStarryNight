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


 assert.equal(await page.evaluate(()=>cosmicThresholdSettingsV2.enabled),false);
 await page.evaluate(async()=>{setCosmicReviewModeV2('C');await startStar('moon');brushFlowTime=0;nestedV2.transition.child.flowTime=0});
 const sourceCheck=await page.evaluate(()=>{
  const tr=nestedV2.transition,material=brushCosmosMaterialV2(tr),a=tr.parent.detailSource.records;
  let maxError=0;
  for(const f of material.fragments){
   const s=material.sources.find(s=>s.id===f.sourceId);
   for(const u of [0,.25,.5,.75,1]){
    const actual=brushCosmosPointV2(f.points,u),expected=brushCosmosPointV2(s.curve,f.t0+u*(f.t1-f.t0));
    expected[0]-=Math.sin(f.angle)*f.offset;expected[1]+=Math.cos(f.angle)*f.offset;
    maxError=Math.max(maxError,Math.hypot(actual[0]-expected[0],actual[1]-expected[1]));
   }
   if(s.colour.some((v,i)=>v!==a[s.id*BRUSH_RECORD_STRIDE+5+i]))throw Error('source colour mismatch');
  }
  return {sources:material.sources.map(s=>({id:s.id,x:s.x,y:s.y})),count:material.fragments.length,maxError,buildMs:brushCosmosPrototypeV2.stats.buildMs};
 });assert(sourceCheck.sources.length>0&&sourceCheck.sources.length<=12);assert(sourceCheck.count<=72);assert(sourceCheck.maxError<1e-9);console.log('actual source geometry',JSON.stringify(sourceCheck));
 for(const p of [.2,.35,.45,.5,.6,.7,.85,1]){
  await page.evaluate(p=>settle(p),p);
  const result=await page.evaluate(p=>{
   const update=updateBrushDetailsV2;updateBrushDetailsV2=()=>{};
   try{
    setCosmicReviewModeV2('C');const first=renderAt(p);
    const slots=()=>[...brushDetailV2.slots.values()].map(s=>({age:performance.now()-s.started,previous:!!s.previous,active:!!s.active}));
    const firstSlots=slots(),signature=m=>JSON.stringify(m.fragments.map(({path,...f})=>f));
    const tr=nestedV2.transition,material=brushCosmosMaterialV2(tr),ids=material.sources.map(s=>s.id).join(',');
    const sig=signature(material);
    brushCosmosPrototypeV2.cache.delete(tr);renderAt(p);const after=pixels(),rebuilt=same(first,after);
    let count=0,max=0,sum=0;for(let i=0;i<after.length;i++){const d=Math.abs(after[i]-first[i]);if(d)count++;max=Math.max(max,d);sum+=d}
    const sameGeometry=sig===signature(brushCosmosMaterialV2(tr));
    const stableIds=ids===brushCosmosMaterialV2(tr).sources.map(s=>s.id).join(',');
    if(p>0&&p<1)for(let n=0;n<60;n++)updateStarEntryV2(16.67);renderAt(p);const stopped=same(first,pixels());
    renderAt(Math.max(0,p-.1));renderAt(p);const reversed=same(first,pixels());
    setCosmicReviewModeV2('A');renderAt(p);const original=same(first,pixels());
    return {p,rebuilt,stableIds,stopped,reversed,original,sameGeometry,count,max,sum,firstSlots,lastSlots:slots(),drawn:brushCosmosPrototypeV2.stats.drawn};
   }finally{updateBrushDetailsV2=update}
  },p);
  console.log('depth',result);
  assert(result.rebuilt&&result.stableIds&&result.stopped&&result.reversed,JSON.stringify(result));if(p===.2||p>=.88)assert(result.original);
  for(const mode of ['A','B','C']){
   await page.evaluate(({mode,p})=>{setCosmicReviewModeV2(mode);renderAt(p)},{mode,p});
   await page.locator('canvas').first().screenshot({path:path.join(root,'tests','step115-'+mode+'-'+Math.round(p*100)+'.png')});
  }
 }
 await page.evaluate(async()=>{setCosmicReviewModeV2('C');await settle(.5)});
 const performanceRows=await page.evaluate(()=>{
  const update=updateBrushDetailsV2;updateBrushDetailsV2=()=>{};const textures=brushFlowBuffer._renderer.textures.size,rows=[];
  try{for(let round=0;round<4;round++)for(const mode of round%2?['C','A','B']:['A','B','C']){
   setCosmicReviewModeV2(mode);const times=[];
   for(let i=0;i<40;i++){const t=performance.now();renderAt(.5);if(i>4)times.push(performance.now()-t)}times.sort((a,b)=>a-b);
   rows.push({mode,median:times[17],p95:times[33]});
  }}finally{updateBrushDetailsV2=update}
  return {rows,textures,after:brushFlowBuffer._renderer.textures.size};
 });assert.equal(performanceRows.textures,performanceRows.after);console.log('paired draw + readback',JSON.stringify(performanceRows));
 await page.evaluate(async()=>{await startStar('major-1');await settle(.5)});
 const fallback=await page.evaluate(()=>{const update=updateBrushDetailsV2;updateBrushDetailsV2=()=>{};try{setCosmicReviewModeV2('C');const c=renderAt(.5);setCosmicReviewModeV2('A');renderAt(.5);return same(c,pixels())}finally{updateBrushDetailsV2=update}});assert(fallback);
 // Real wheel entry/exit at the single selected star. No scripted progress sweep.
 await page.evaluate(()=>{finishPortalV2(false);v2Camera.reset();setCosmicReviewModeV2('C');brushFlowSettings.paused=false;loop();
  window.chunks=[];window.stream=document.querySelector('canvas').captureStream(30);window.recorder=new MediaRecorder(stream,{mimeType:'video/webm'});
  recorder.ondataavailable=e=>chunks.push(e.data);window.recorded=new Promise(r=>recorder.onstop=r);recorder.start();
 });
 const box=await page.locator('canvas').first().boundingBox();
 async function aim(){const pt=await page.evaluate(()=>{const s=brushV2.stars.find(s=>s.id==='moon');return {x:v2Camera.x+s.x*v2Camera.zoom,y:v2Camera.y+s.y*v2Camera.zoom}});await page.mouse.move(box.x+pt.x,box.y+pt.y)}
 await aim();await page.mouse.wheel(0,-900);await page.waitForFunction(()=>v2Camera.zoom>2.99);await aim();await page.mouse.wheel(0,-100);await page.waitForFunction(()=>!!nestedV2.transition);
 const entry=await page.evaluate(()=>({range:nestedV2.transition.range,seed:nestedV2.transition.edge.parent.seed,star:nestedV2.transition.edge.starId}));assert.equal(entry.seed,12);assert.equal(entry.star,'moon');
 const stop=async target=>{const delta=await page.evaluate(p=>-(p-nestedV2.transition.targetProgress)*nestedV2.transition.range/v2Camera.sensitivity,target);await page.mouse.wheel(0,delta);await page.waitForTimeout(850);const a=await page.evaluate(()=>nestedV2.transition.progress);await page.waitForTimeout(200);const b=await page.evaluate(()=>nestedV2.transition.progress);assert(Math.abs(a-target)<.005&&Math.abs(b-a)<.001)};
 for(const p of [.35,.5,.4,.6,.7])await stop(p);
 for(let n=0;n<12;n++){if(!await page.evaluate(()=>!!nestedV2.transition))break;await page.mouse.wheel(0,-entry.range/12/.0015);await page.waitForTimeout(170)}
 await page.waitForFunction(()=>!nestedV2.transition&&!nestedV2.pending);assert.equal(await page.evaluate(()=>v2Camera.zoom),1);
 await page.mouse.wheel(0,100);await page.waitForFunction(()=>!!nestedV2.transition);
 for(let n=0;n<30;n++){if(!await page.evaluate(()=>!!nestedV2.transition))break;await page.mouse.wheel(0,entry.range/12/.0015);await page.waitForTimeout(170)}
 await page.waitForFunction(()=>!nestedV2.transition&&!nestedV2.pending);assert.equal(await page.evaluate(()=>nestedV2.current.seed),12);
 const video=await page.evaluate(async()=>{recorder.stop();await recorded;stream.getTracks().forEach(t=>t.stop());const b=new Uint8Array(await new Blob(chunks).arrayBuffer());let s='';for(let i=0;i<b.length;i+=16384)s+=String.fromCharCode(...b.subarray(i,i+16384));return btoa(s)});
 fs.writeFileSync(path.join(root,'tests','step115-wheel-roundtrip.webm'),Buffer.from(video,'base64'));
 await page.keyboard.press('w');assert.equal(await page.evaluate(()=>universeSeed),89);assert.equal(await page.evaluate(()=>nestedV2.transition),null);
 assert.deepEqual(errors,[]);console.log('PASS actual-source lineage, deterministic cache/reversal, A/B/C, bounded resources, target isolation and real-wheel roundtrip');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
