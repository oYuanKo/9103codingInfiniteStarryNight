const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');const root=path.resolve(__dirname,'..');
(async()=>{const server=http.createServer((req,res)=>{const f=path.resolve(root,req.url==='/'?'index.html':req.url.split('?')[0].slice(1));if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end()}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(f))});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1000,height:800}}),errors=[],warnings=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errors.push(m.text());if(m.type()==='warning')warnings.push(m.text())});await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>typeof v2Camera!=='undefined'&&v2Camera&&brushFlowMap);
await page.evaluate(()=>{noLoop();brushFlowSettings.paused=true;window.addEventListener('mousemove',e=>{window.testPointer={x:e.clientX,y:e.clientY}})});
const api=await page.evaluate(()=>{
 const initial=StarryNight.getState(),nodes=nestedV2.nodes.size;const snap=StarryNight.getState();let immutable=false;
 try{(function(){'use strict';snap.camera.zoom=99})()}catch(e){immutable=e instanceof TypeError}
 const bad=[];for(const value of [NaN,Infinity,-Infinity,'1',null])try{StarryNight.setFlowSpeed(value);bad.push(false)}catch(e){bad.push(e instanceof TypeError)}
 const clamp=[StarryNight.setFlowSpeed(9),StarryNight.setFlowSpeed(-1),StarryNight.setFlowStrength(99),StarryNight.setFlowStrength(-1)];StarryNight.setFlowSpeed(1.2);StarryNight.setFlowStrength(5);
 let invalidSubscriber=false;try{StarryNight.onFrame(4)}catch(e){invalidSubscriber=e instanceof TypeError}
 const untouched=initial.camera.zoom===v2Camera.zoom&&nodes===nestedV2.nodes.size;
 window.frameCalls=0;const off=StarryNight.onFrame((dt,state)=>{if(!Object.isFrozen(state.flow)||!Number.isFinite(dt))throw Error('invalid frame');frameCalls++});draw();draw();off();off();draw();
 return {initial,immutable,bad,clamp,invalidSubscriber,calls:frameCalls,untouched};
});console.log('API checks',api);assert(api.immutable&&api.untouched&&api.bad.every(Boolean)&&api.invalidSubscriber);assert.equal(api.calls,2);assert.deepEqual(api.clamp,[3,0,30,0]);assert.equal(api.initial.flow.speed,1.2);assert.equal(api.initial.flow.strength,5);console.log('PASS frozen snapshots, validation/clamps, defaults, unsubscribe');
const faults=await page.evaluate(async()=>{let sync=0,asyncCount=0;StarryNight.onFrame(()=>{sync++;throw Error('intentional sync test')});StarryNight.onFrame(async()=>{asyncCount++;throw Error('intentional async test')});draw();await new Promise(r=>setTimeout(r,0));draw();return {sync,asyncCount}});assert.deepEqual(faults,{sync:1,asyncCount:1});assert.equal(warnings.length,2);
await page.evaluate(()=>{window.events=[];window.changes=[];window.offPortal=StarryNight.onPortal(e=>{events.push(e);if(!Object.isFrozen(e))throw Error('mutable portal')});window.offUniverse=StarryNight.onUniverseChanged(e=>changes.push(e));draw();window.openPortal=async(edge,direction)=>{requestPortalV2(edge,direction,direction==='in'?-100:100);while(nestedV2.pending||nestedV2.preload){updateChildPreloadV2();await new Promise(requestAnimationFrame)}nestedV2.transition.progress=nestedV2.transition.targetProgress=.4;draw()}});
const navigation=await page.evaluate(async()=>{
 const initial=StarryNight.getState().universe.id;
 await openPortal(childEdgeV2(brushV2.stars[0]),'in');const p=nestedV2.transition.progress;let frozen=false;try{(function(){'use strict';StarryNight.getState().portal.progress=.99})()}catch(e){frozen=e instanceof TypeError}
 draw();const held=nestedV2.transition.progress===p;finishPortalV2(true);draw();const child=StarryNight.getState().universe.id;
 await openPortal(childEdgeV2(brushV2.stars[0]),'in');finishPortalV2(true);draw();
 for(let n=0;n<2;n++){await openPortal(nestedV2.current.parent,'out');finishPortalV2(false);draw()}
 const returned=StarryNight.getState().universe.id===initial;
 // An interrupted portal emits a reset end; no callback can write its progress.
 await openPortal(childEdgeV2(brushV2.stars[0]),'in');return {initial,child,returned,held,frozen};
});assert(navigation.returned&&navigation.held&&navigation.frozen&&navigation.initial!==navigation.child);
await page.keyboard.press('w');await page.evaluate(()=>draw());
const events=await page.evaluate(()=>{offPortal();offUniverse();const n=events.length;draw();return {events,changes,unsubscribed:events.length===n,worlds:starHoverLightV2.worlds.size}});
assert(events.unsubscribed&&events.worlds===1);assert.equal(events.events.filter(e=>e.phase==='begin').length,5);assert.equal(events.events.filter(e=>e.phase==='end').length,5);assert(events.events.some(e=>e.outcome==='reset'));assert.equal(events.changes.at(-1).current.seed,89);console.log('PASS nested graph IDs, begin/progress/end/reset, stopped progress, callback isolation',navigation);
await page.keyboard.press('q');await page.evaluate(()=>draw());
for(const [w,h] of [[1000,800],[640,580],[1920,1080],[1366,768]]){
 await page.setViewportSize({width:w,height:h});const canvas=page.locator('#artwork canvas');const box=await canvas.boundingBox();const target=await page.evaluate(()=>{v2Camera.reset();return brushV2.stars[0]});
 await page.mouse.move(box.x+target.x*box.width/800,box.y+target.y*box.height/600);
 const pointer=await page.evaluate(()=>({x:mouseX,y:mouseY,width,height,density:pixelDensity(),css:getComputedStyle(document.body).backgroundColor,event:testPointer}));const expected={x:(pointer.event.x-box.x)*800/box.width,y:(pointer.event.y-box.y)*600/box.height};assert(Math.hypot(pointer.x-expected.x,pointer.y-expected.y)<.01);assert(Math.hypot(pointer.x-target.x,pointer.y-target.y)<Math.SQRT2*800/box.width);assert.equal(pointer.width,800);assert.equal(pointer.height,600);assert.equal(pointer.density,1);assert.equal(pointer.css,'rgb(9, 21, 37)');assert(Math.abs(box.width/box.height-4/3)<1e-6);
 await page.mouse.wheel(0,-100);await page.waitForFunction(()=>v2Camera.targetZoom>1);
 const anchor=await page.evaluate(()=>({x:v2Camera.targetX+mouseX*v2Camera.targetZoom,y:v2Camera.targetY+mouseY*v2Camera.targetZoom}));assert(Math.hypot(anchor.x-pointer.x,anchor.y-pointer.y)<.01);
 await page.evaluate(()=>{v2Camera.reset();brushFlowSettings.paused=false;for(let i=0;i<80;i++)drawStarHoverLightV2(16.67);brushFlowSettings.paused=true;draw()});assert((await page.evaluate(()=>starHoverLightV2.stats.drawn))>0);
 await page.screenshot({path:path.join(root,'tests','step10-layout-'+w+'.png')});console.log('Responsive pointer/zoom',w,h,{displayWidth:box.width,mappingError:Math.hypot(pointer.x-expected.x,pointer.y-expected.y)});
}
const guide=page.locator('#painting-help');const before=await guide.isVisible();await page.keyboard.press('h');assert.equal(await guide.isVisible(),!before);await page.locator('#help-toggle').click();assert.equal(await guide.isVisible(),before);await page.locator('#help-toggle').blur();console.log('PASS guide toggle, responsive hover, aspect ratio and cursor-centred zoom');
// Allow real animation after all synthetic state checks. Sample resource stability.
if(process.argv.includes('--soak')){
 await page.setViewportSize({width:1000,height:800});await page.mouse.move(900,740);
 await page.evaluate(()=>{brushFlowSettings.paused=false;window.frameIntervals=[];window.offTiming=StarryNight.onFrame(dt=>frameIntervals.push(dt));loop()});
 const samples=[];for(let i=0;i<6;i++){await page.waitForTimeout(5000);samples.push(await page.evaluate(()=>({nodes:nestedV2.nodes.size,worlds:starHoverLightV2.worlds.size,atlases:brushDetailV2.patches.length,textures:brushFlowBuffer._renderer.textures.size,canvases:document.querySelectorAll('canvas').length})))}
 const timing=await page.evaluate(()=>{noLoop();offTiming();const a=frameIntervals.slice(30).sort((x,y)=>x-y);return {frames:a.length,median:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)]}});assert(samples.every(s=>s.worlds<=2&&s.atlases<=5));assert.deepEqual(samples[0],samples.at(-1));console.log('30-second real-loop stability',samples,timing);
}
assert.deepEqual(errors,[]);console.log('PASS application integration and presentation; no JS/console errors');
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}})().catch(e=>{console.error(e);process.exitCode=1});
