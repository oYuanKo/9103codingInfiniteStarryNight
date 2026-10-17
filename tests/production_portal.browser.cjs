const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');const root=path.resolve(__dirname,'..');
const diagnose=process.argv.includes('--diagnose-old')?'old':process.argv.includes('--diagnose-new')?'new':null;
const measureOnly=process.argv.includes('--measure-only');
const capture=process.argv.includes('--capture-mode-a');
assert(!(measureOnly&&capture),'Timing mode must not overwrite the pre-cleanup baseline');
const baselinePath=path.join(__dirname,'step11-final-modeA-baseline.log');
const crypto=require('node:crypto');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
(async()=>{
 const server=http.createServer((req,res)=>{const f=path.resolve(root,req.url==='/'?'index.html':req.url.slice(1));if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end()};res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');if(f.endsWith('index.html')){
 let html=fs.readFileSync(f,'utf8');
 if(diagnose==='old')html=html.replace('<script src="brush_flow_shader.js">','<script src="experiments/cosmic_threshold/source/cosmic_threshold_v2.js"></script><script src="experiments/cosmic_threshold/source/brush_cosmos_prototype_v2.js"></script><script src="brush_flow_shader.js">');
 const probe="<script>window.finalProbe={shaderObjects:0,initMs:0};const makeShader=p5.prototype.createShader;p5.prototype.createShader=function(...args){finalProbe.shaderObjects++;return makeShader.apply(this,args)};<\/script>";
 html=html.replace('</script>','</script>'+probe);
 html=html.replace('<script src="sketch.js"></script>',"<script>const initReference=initBrushFlowShader;initBrushFlowShader=function(){const t=performance.now();try{return initReference()}finally{finalProbe.initMs=performance.now()-t}};<\/script><script src=\"sketch.js\"></script>");
 res.end(html);
 }else res.end(fs.readFileSync(diagnose==='old'&&f===path.join(root,'brush_flow_shader.js')?path.join(root,'experiments/cosmic_threshold/source/brush_flow_shader.js'):f));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
 browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});const page=await browser.newPage({viewport:{width:1000,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errors.push(m.text())});
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForFunction(()=>typeof v2Camera!=='undefined'&&v2Camera&&brushFlowMap);
 await page.evaluate(()=>{
  noLoop();if(typeof cosmicThresholdSettingsV2!=='undefined')cosmicThresholdSettingsV2.enabled=false;brushFlowSettings.paused=true;brushFlowSettings.cursorEnabled=false;
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


 // Fail closed if the preserved reference was accidentally edited.
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'experiments/cosmic_threshold/manifest.json'),'utf8'));
 for(const file of manifest.files)assert.equal(hash(Buffer.from(fs.readFileSync(path.join(root,file.archived),'utf8').replace(/\r\n/g,'\n'))),file.sha256,'Archive changed: '+file.archived);
 const reference=fs.readFileSync(path.join(root,'experiments/cosmic_threshold/source/brush_flow_shader.js'),'utf8');
 const factory=reference.slice(reference.indexOf('function drawBrushFlowShader('));
 await page.evaluate(({source,factory,capture})=>{
  if(capture && typeof cosmicThresholdSettingsV2==='undefined')throw Error('Capture requires pre-cleanup experimental runtime in Mode A');
  const fragment=new Function(source+';return BRUSH_FLOW_FRAG;')();
  if(new Function(source+';return BRUSH_FLOW_VERT;')()!==BRUSH_FLOW_VERT)throw Error('Accepted vertex shader changed');
  if(fragment!==BRUSH_FLOW_FRAG)throw Error('Accepted fragment shader changed');
  window.drawModeAReference=new Function('const cosmicThresholdSettingsV2={enabled:false};let cosmicFlowWarmedV2=false;function usesBrushCosmosV2(){return false};'+factory+';return drawBrushFlowShader;')();
 },{source:reference,factory,capture});
 const resources=()=>page.evaluate(()=>({
  ...finalProbe,shaderPrograms:brushFlowProgram._glProgram?1:0,
  experimentalShaderObjects:(typeof cosmicFlowProgramV2==='undefined'?0:1)+(typeof cosmicFormationProgramV2==='undefined'?0:1),
  experimentalLinkedPrograms:(typeof cosmicFlowProgramV2!=='undefined'&&cosmicFlowProgramV2._glProgram?1:0)+(typeof cosmicFormationProgramV2!=='undefined'&&cosmicFormationProgramV2._glProgram?1:0),
  textures:brushFlowBuffer._renderer.textures.size,graphics:document.querySelectorAll('canvas').length,
  cosmicCache:typeof cosmicThresholdV2==='undefined'?null:cosmicThresholdV2.cache.size,
  prototypeCacheExists:typeof brushCosmosPrototypeV2!=='undefined',
  experimentalScripts:[...document.scripts].filter(s=>/cosmic|cosmos/.test(s.src)).length
 }));
 const startup=await resources(),rows=[];
 const prior=fs.existsSync(baselinePath)?JSON.parse(fs.readFileSync(baselinePath,'utf8')):null;
 let referenceComparisons=0,storedComparisons=0;const crossRunDifferences=[];
 if(measureOnly)await page.keyboard.press('e');
 for(const [key,seed] of (measureOnly?[]:[['q',12],['w',89],['e',205]])){
  await page.keyboard.press(key);assert.equal(await page.evaluate(()=>universeSeed),seed);
  for(const id of ['moon','major-1']){
   await page.evaluate(id=>startStar(id),id);
   await page.evaluate(()=>{brushFlowTime=0;nestedV2.transition.child.flowTime=0});
   for(const p of [0,.2,.35,.45,.5,.6,.7,.85,1]){
    await page.evaluate(p=>settle(p),p);
    const result=await page.evaluate(p=>{
     const update=updateBrushDetailsV2;updateBrushDetailsV2=()=>{};
     try{const camera=getStarEntryCameraV2(),portal=getPortalRenderV2();
      drawModeAReference(true,camera,portal);const reference=pixels();
      drawStarEntryV2();const actual=pixels();
      let count=0,max=0;for(let i=0;i<actual.length;i++){const d=Math.abs(reference[i]-actual[i]);if(d)count++;max=Math.max(max,d)}
      return {bytes:Array.from(actual),count,max,parent:[camera.x,camera.y,camera.zoom],child:portal.childCamera,
       parentWeights:brushDetailUniformsV2(captureWorldV2(),camera).weights,childWeights:brushDetailUniformsV2(portal.child,portal.childCamera).weights};
     }finally{updateBrushDetailsV2=update}
    },p);
    assert.equal(result.count,0,JSON.stringify({seed,id,p,count:result.count,max:result.max}));referenceComparisons++;
    const row={seed,id,p,hash:hash(Buffer.from(result.bytes)),parent:result.parent,child:result.child,parentWeights:result.parentWeights,childWeights:result.childWeights};rows.push(row);
    if(diagnose){await page.locator('canvas').first().screenshot({path:path.join(root,'tests','step11-final-diagnose-'+diagnose+'.png')});console.log(JSON.stringify({diagnose,row,stored:prior.rows[0]}));return;}
    if(!capture&&prior){const previous=prior.rows.find(r=>r.seed===seed&&r.id===id&&r.p===p);assert(previous);const {hash:actualHash,...actualState}=row,{hash:previousHash,...previousState}=previous;assert.deepEqual(actualState,previousState,'Captured Mode A state mismatch '+seed+'/'+id+'/'+p);if(actualHash!==previousHash)crossRunDifferences.push({seed,id,p,actualHash,previousHash});storedComparisons++}
    if(seed===12&&id==='moon')await page.locator('canvas').first().screenshot({path:path.join(root,'tests','step11-final-'+(capture?'before':'after')+'-'+Math.round(p*100)+'.png')});
   }
   await page.evaluate(()=>finishPortalV2(false));
  }
 }
 await page.evaluate(async()=>{await startStar('moon');await settle(.5)});
 const perf=await page.evaluate(async measureOnly=>{
  if(measureOnly){
   const rows=[];
   for(const p of [0,.5]){
    await settle(p);
    const update=updateBrushDetailsV2;updateBrushDetailsV2=()=>{};
    try{for(const mode of ['reference','production','production','reference']){
     const samples=[];
     for(let i=0;i<70;i++){
      const t=performance.now();
      if(mode==='reference')drawModeAReference(true,getStarEntryCameraV2(),getPortalRenderV2());else drawStarEntryV2();
      pixels();if(i>=10)samples.push(performance.now()-t);
     }
     samples.sort((a,b)=>a-b);rows.push({p,mode,median:samples[30],p95:samples[57]});
    }}finally{updateBrushDetailsV2=update}
   }
   return rows;
  }
  const update=updateBrushDetailsV2;updateBrushDetailsV2=()=>{};const rows=[];
  try{for(const p of [0,.5]){const samples=[];for(let i=0;i<70;i++){const t=performance.now();renderAt(p);if(i>=10)samples.push(performance.now()-t)}samples.sort((a,b)=>a-b);rows.push({p,median:samples[30],p95:samples[57]})}}
  finally{updateBrushDetailsV2=update}return rows;
 },measureOnly);
 const final=await resources();
 if(!capture){assert.equal(final.experimentalShaderObjects,0);assert.equal(final.experimentalScripts,0);assert.equal(final.cosmicCache,null);assert.equal(final.prototypeCacheExists,false);assert.equal(startup.shaderObjects,1)}
 const report={browser:browser.version(),rows,startup,final,perf,crossRunDifferences};
 if(capture)fs.writeFileSync(baselinePath,JSON.stringify(report,null,2));
 else fs.writeFileSync(path.join(root,'tests/step11-final-'+(measureOnly?'timing':'report')+'.log'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({capture,referenceComparisons,storedComparisons,crossRunHashDifferences:crossRunDifferences.length,startup,final,perf}));assert.deepEqual(errors,[]);

 if(!capture&&!measureOnly){
  const box=await page.locator('canvas').first().boundingBox();
  for(const target of [.4,.5,.6]){
   await page.evaluate(async()=>{await startStar('major-1');nestedV2.transition.progress=nestedV2.transition.targetProgress=.01;loop()});
   await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
   const delta=await page.evaluate(p=>-(p-.01)*nestedV2.transition.range/v2Camera.sensitivity,target);
   await page.mouse.wheel(0,delta);await page.waitForTimeout(1000);
   const a=await page.evaluate(()=>nestedV2.transition.progress);await page.waitForTimeout(350);
   const b=await page.evaluate(()=>nestedV2.transition.progress);
   assert(Math.abs(a-target)<.005&&Math.abs(a-b)<.001);
   await page.mouse.wheel(0,-delta*1.15);await page.waitForFunction(()=>!nestedV2.transition&&!nestedV2.pending);
   await page.evaluate(()=>noLoop());console.log('Actual wheel pause/reversal',target,a,b);
  }
  assert.deepEqual(errors,[]);
 }
 console.log(measureOnly?'PASS isolated timing and production resource checks':'PASS accepted Mode A exact source/same-resource pixels, captured camera/LOD states and resources');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
