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

 for(const [file,name] of [['brush_flow_shader.js','previousFragment'],['cosmic_threshold_v2.js','previousDraw']]) {
  const f=path.join(root,'tests/step114-before-'+file+'.log');
  if(fs.existsSync(f))await page.evaluate(({source,name})=>{window[name]=new Function(source+';return '+(name==='previousFragment'?'COSMIC_FLOW_FRAG_V2':'drawCosmicThresholdV2')+';')()},{source:fs.readFileSync(f,'utf8'),name});
 }
 await page.evaluate(()=>{if(window.previousFragment)window.previousProgram=brushFlowBuffer.createShader(BRUSH_FLOW_VERT,previousFragment)});
 for(const [key,seed] of [['q',12],['w',89],['e',205]]) {
  await page.keyboard.press(key);
  for(const id of ['moon','major-1']) {
   await page.evaluate(id=>startStar(id),id);
   await page.evaluate(()=>{brushFlowTime=0;nestedV2.transition.child.flowTime=0;Object.assign(cosmicThresholdSettingsV2,{enabled:true,galaxyInterior:true,protoUniverse:true})});
   for(const p of (seed===12&&id==='moon'?[0,.2,.35,.4,.5,.6,.7,.85,1]:[.35,.5,.6,.7,1])) {
    await page.evaluate(p=>settle(p),p);
    const result=await page.evaluate(p=>{
     const update=updateBrushDetailsV2;updateBrushDetailsV2=()=>{};
     try {
      Object.assign(cosmicThresholdSettingsV2,{enabled:true,galaxyInterior:true,protoUniverse:true});renderAt(p);const first=pixels();
      cosmicThresholdV2.cache.clear();renderAt(p);const rebuilt=same(first,pixels());
      renderAt(Math.max(0,p-.03));renderAt(p);const reversed=same(first,pixels());
      const tr=nestedV2.transition,marks=cosmicMarksV2(tr);
      const targets=marks.every(m=>{const star=tr.child.stars.find(s=>s.id===m.targetStar);return star&&Math.hypot(m.tx-star.x,m.ty-star.y)<=star.radius*2.31});
      const weights=cosmicStagesV2(p);
      cosmicThresholdSettingsV2.enabled=false;renderAt(p);const endpoint=same(first,pixels());
      Object.assign(cosmicThresholdSettingsV2,{enabled:true,galaxyInterior:false,protoUniverse:false});renderAt(p);const prior=pixels();
      let previousExact=null;
      if(window.previousProgram&&window.previousDraw){const program=cosmicFlowProgramV2,overlay=drawCosmicThresholdV2;try{cosmicFlowProgramV2=previousProgram;drawCosmicThresholdV2=previousDraw;renderAt(p);previousExact=same(prior,pixels())}finally{cosmicFlowProgramV2=program;drawCosmicThresholdV2=overlay}}
      Object.assign(cosmicThresholdSettingsV2,{galaxyInterior:true,protoUniverse:true});
      return {p,rebuilt,reversed,targets,weights,endpoint,previousExact,count:marks.length};
     }finally{updateBrushDetailsV2=update}
    },p);
    assert(result.rebuilt&&result.reversed&&result.targets);assert(result.count<=120);
    if(p<=.35||p===1)assert(result.endpoint);if(result.previousExact!==null)assert(result.previousExact);
    for(const mode of ['off','previous','enhanced']) {
     await page.evaluate(({mode,p})=>{Object.assign(cosmicThresholdSettingsV2,{enabled:mode!=='off',galaxyInterior:mode==='enhanced',protoUniverse:mode==='enhanced'});renderAt(p)},{mode,p});
     await page.locator('canvas').first().screenshot({path:path.join(root,'tests','step114-'+seed+'-'+id+'-'+mode+'-'+Math.round(p*100)+'.png')});
    }
    console.log(seed,id,JSON.stringify(result));
   }
   await page.evaluate(()=>finishPortalV2(false));
  }
 }
 await page.evaluate(async()=>{await startStar('moon');await settle(.5)});
 const perf=await page.evaluate(()=>{
  const update=updateBrushDetailsV2;updateBrushDetailsV2=()=>{};const textures=brushFlowBuffer._renderer.textures.size,rows=[];
  try{for(let round=0;round<4;round++)for(const enhanced of (round%2?[true,false]:[false,true])){
   Object.assign(cosmicThresholdSettingsV2,{enabled:true,galaxyInterior:enhanced,protoUniverse:enhanced});const times=[];
   for(let n=0;n<55;n++){const t=performance.now();renderAt(.5);if(n>4)times.push(performance.now()-t)}times.sort((a,b)=>a-b);rows.push({enhanced,median:times[25],p95:times[47]});
  }}finally{updateBrushDetailsV2=update}
  return {rows,textures,after:brushFlowBuffer._renderer.textures.size,buildMs:cosmicThresholdV2.stats.buildMs};
 });assert.equal(perf.textures,perf.after);console.log('prior/enhanced draw + readback',JSON.stringify(perf));
 await page.evaluate(()=>{Object.assign(cosmicThresholdSettingsV2,{enabled:true,galaxyInterior:true,protoUniverse:true})});
 const toggles=await page.evaluate(()=>{
  const update=updateBrushDetailsV2;updateBrushDetailsV2=()=>{};try{
   renderAt(.6);const both=pixels();
   cosmicThresholdSettingsV2.protoUniverse=false;renderAt(.6);const galaxyOnly=!same(both,pixels());
   cosmicThresholdSettingsV2.galaxyInterior=false;cosmicThresholdSettingsV2.protoUniverse=true;renderAt(.6);const protoOnly=!same(both,pixels());
   Object.assign(cosmicThresholdSettingsV2,{galaxyInterior:true,protoUniverse:true});
   return {galaxyOnly,protoOnly};
  }finally{updateBrushDetailsV2=update}
 });assert(toggles.galaxyOnly&&toggles.protoOnly);console.log('independent stage toggles',toggles);
 await page.keyboard.press('q');assert.equal(await page.evaluate(()=>cosmicThresholdV2.cache.size),0);
 assert.deepEqual(errors,[]);console.log('PASS stages, prior-version exact pixels, target-star correspondence, cache regeneration, reversal, seeds and cleanup');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
