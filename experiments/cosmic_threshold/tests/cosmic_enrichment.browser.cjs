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

 for(const [key,seed] of [['q',12],['w',89],['e',205]]) {
  await page.keyboard.press(key);
  assert.equal(await page.evaluate(()=>universeSeed),seed);
  for(const id of ['moon','major-1']) {
   await page.evaluate(id=>startStar(id),id);
   await page.evaluate(()=>{brushFlowTime=0;nestedV2.transition.child.flowTime=0;cosmicThresholdSettingsV2.enabled=true});
   for(const p of (seed===12&&id==='moon'?[.2,.35,.45,.5,.55,.65,.8,1]:[.35,.5,.65,1])) {
    await page.evaluate(p=>settle(p),p);
    const result=await page.evaluate(p=>{
     const update=updateBrushDetailsV2;updateBrushDetailsV2=()=>{};
     try {
      cosmicThresholdSettingsV2.enabled=true;renderAt(p);const first=pixels();
      const stats={...cosmicThresholdV2.stats};
      cosmicThresholdV2.cache.clear();renderAt(p);const rebuilt=same(first,pixels());
      renderAt(Math.max(0,p-.03));renderAt(p);const reversed=same(first,pixels());
      const marks=cosmicMarksV2(nestedV2.transition);
      const river=marks.filter(m=>m.group>=12);
      const lane=river.length===72 && Math.max(...river.map(m=>m.x))-Math.min(...river.map(m=>m.x))>width*.75 && river.every(m=>m.y>0&&m.y<height*.6);
      const geometry=marks.every(m=>m.w>0&&m.w<1.7&&Math.abs(m.points[6]-m.points[0])<15);
      const groups=new Set(marks.map(m=>m.group)).size,layers=new Set(marks.map(m=>m.layer)).size;
      cosmicThresholdSettingsV2.enabled=false;renderAt(p);const unchanged=same(first,pixels());
      cosmicThresholdSettingsV2.enabled=true;
      return {p,rebuilt,reversed,geometry,lane,riverBounds:[river.length,Math.min(...river.map(m=>m.x)),Math.max(...river.map(m=>m.x)),Math.min(...river.map(m=>m.y)),Math.max(...river.map(m=>m.y))],groups,layers,unchanged,stats,marks:marks.length};
     }finally{updateBrushDetailsV2=update}
    },p);
    assert(result.rebuilt&&result.reversed&&result.geometry&&result.lane,JSON.stringify(result));assert(result.marks<=120&&result.groups>=6&&result.layers===3);
    if(p<=.35||p===1)assert(result.unchanged);else assert(!result.unchanged);
    for(const enabled of [false,true]) {
     await page.evaluate(({p,enabled})=>{cosmicThresholdSettingsV2.enabled=enabled;renderAt(p)},{p,enabled});
     await page.locator('canvas').first().screenshot({path:path.join(root,'tests','step113-'+seed+'-'+id+'-'+(enabled?'on':'off')+'-'+Math.round(p*100)+'.png')});
    }
    console.log(seed,id,JSON.stringify(result));
   }
   await page.evaluate(()=>finishPortalV2(false));
  }
 }
 assert.deepEqual(errors,[]);console.log('PASS three seeds, two entries, three scale layers, bounded thin geometry, pixel-identical cache regeneration and reversal');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
