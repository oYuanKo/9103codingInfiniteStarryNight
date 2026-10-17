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


 // An optional local before snapshot is evidence only, never a clone dependency.
 const shaderFile=path.join(root,'tests/step114-continuity-before-shader.log');
 const overlayFile=path.join(root,'tests/step114-continuity-before-cosmic.log');
 const hasBefore=fs.existsSync(shaderFile)&&fs.existsSync(overlayFile);
 if(hasBefore)await page.evaluate(({shader,overlay})=>{
  window.beforeProgram=brushFlowBuffer.createShader(BRUSH_FLOW_VERT,new Function(shader+';return COSMIC_FORMATION_FRAG_V2;')());
  window.beforeCosmic=new Function(overlay+';return {draw:drawCosmicThresholdV2,stages:cosmicStagesV2,marks:cosmicMarksV2};')();
 },{shader:fs.readFileSync(shaderFile,'utf8'),overlay:fs.readFileSync(overlayFile,'utf8')});
 await page.evaluate(()=>{
  window.drawVariant=(p,before=false)=>{
   const program=cosmicFormationProgramV2,stages=cosmicStagesV2,marks=cosmicMarksV2,overlay=drawCosmicThresholdV2;
   try{if(before){cosmicFormationProgramV2=beforeProgram;cosmicStagesV2=beforeCosmic.stages;cosmicMarksV2=beforeCosmic.marks;drawCosmicThresholdV2=beforeCosmic.draw}return renderAt(p)}
   finally{cosmicFormationProgramV2=program;cosmicStagesV2=stages;cosmicMarksV2=marks;drawCosmicThresholdV2=overlay}
  };
 });
 await page.evaluate(async()=>{await startStar('moon');brushFlowTime=0;nestedV2.transition.child.flowTime=0;await settle(.5)});
 // Freeze already-settled LOD for comparisons: async texture completion is not depth.
 await page.evaluate(()=>{window.savedDetailUpdate=updateBrushDetailsV2;updateBrushDetailsV2=()=>{}});
 const evidence=await page.evaluate(hasBefore=>{
  const results=[];
  for(const before of hasBefore?[true,false]:[false]){
   let previous=null;const deltas=[],frames=[];
   for(let n=30;n<=90;n++){
    const p=n/100,frame=drawVariant(p,before);let delta=0,luma=0;
    for(let i=0;i<frame.length;i+=4){luma+=.2126*frame[i]+.7152*frame[i+1]+.0722*frame[i+2];if(previous)for(let c=0;c<3;c++)delta+=Math.abs(frame[i+c]-previous[i+c])}
    if(previous)deltas.push({p,mean:delta/(width*height*3)});
    frames.push({p,luma:luma/(width*height)});previous=frame;
   }
   results.push({before,peak:deltas.reduce((a,b)=>a.mean>b.mean?a:b),midPeak:deltas.filter(d=>d.p>.35&&d.p<=.88).reduce((a,b)=>a.mean>b.mean?a:b),deltas,frames});
  }
  const reverse=[.4,.5,.6,.7].map(p=>{const first=renderAt(p);for(let i=0;i<60;i++)updateStarEntryV2(16.67);drawStarEntryV2();const stopped=same(first,pixels());renderAt(p-.1);renderAt(p);return {p,stopped,reversed:same(first,pixels())}});
  let maxWeightStep=0;
  for(let n=0;n<100;n++){const a=cosmicStagesV2(n/100),b=cosmicStagesV2((n+1)/100);maxWeightStep=Math.max(maxWeightStep,...a.map((v,i)=>Math.abs(v-b[i])))}
  const marks=cosmicMarksV2(nestedV2.transition);
  // Observe actual overlay placements, rather than restating its travel formula.
  const c=drawingContext,translate=c.translate,placements=[];
  try{c.translate=function(x,y){placements.push([x,y]);return translate.call(this,x,y)};
   nestedV2.transition.progress=nestedV2.transition.targetProgress=.7;
   drawCosmicThresholdV2(getPortalRenderV2());
  }finally{c.translate=translate}
  if(placements.length!==marks.length+1)throw Error('expected one camera and one translation per visible mark');
  const maxTravel=Math.max(...marks.map((m,i)=>Math.hypot(placements[i+1][0]-m.x,placements[i+1][1]-m.y)));
  return {results,reverse,maxWeightStep,maxTravel};
 },hasBefore);
 assert(evidence.reverse.every(r=>r.stopped&&r.reversed));assert(evidence.maxWeightStep<.12);assert(evidence.maxTravel<=12+1e-9);
 // This catches a gross flash, not subjective naturalness or a cross-machine hash.
 assert(evidence.results.at(-1).peak.mean<10);
 fs.writeFileSync(path.join(root,'tests/step114-continuity-metrics.log'),JSON.stringify(evidence,null,2));
 console.log('continuity',JSON.stringify({...evidence,results:evidence.results.map(r=>({before:r.before,peak:r.peak,midPeak:r.midPeak,frames:r.frames.filter(f=>Math.round(f.p*100)%5===0)}))}));
 for(const p of [.35,.4,.45,.5,.55,.6,.65,.7,.8,.88])for(const before of hasBefore?[true,false]:[false]){
  await page.evaluate(({p,before})=>drawVariant(p,before),{p,before});
  await page.locator('canvas').first().screenshot({path:path.join(root,'tests','step114-continuity-'+(before?'before':'after')+'-'+Math.round(p*100)+'.png')});
 }
 await page.evaluate(()=>{updateBrushDetailsV2=savedDetailUpdate});
 assert.deepEqual(errors,[]);console.log('PASS continuous-depth samples, pause/reversal and bounded local gathering; visual inspection still required');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
