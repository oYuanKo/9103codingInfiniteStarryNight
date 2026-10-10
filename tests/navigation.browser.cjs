const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
(async () => {
  const server = http.createServer((req, res) => {
    const name = req.url === '/' ? 'index.html' : req.url.split('?')[0].slice(1);
    const file = path.resolve(root, name);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.html') ? 'text/html' : 'text/plain');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true});
    const page = await browser.newPage({viewport:{width:1000,height:800}});
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if(m.type()==='error' && !m.text().includes('404')) errors.push(m.text()); });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForFunction(() => typeof v2Camera !== 'undefined' && v2Camera && brushFlowMap, {timeout:30000});
    console.log('Browser:', browser.version(), 'p5:', await page.evaluate(()=>p5.VERSION));
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    async function move(x=400,y=300) {await page.mouse.move(box.x+x,box.y+y);}
    async function settle() {await page.waitForFunction(()=>!nestedV2.transition && !nestedV2.pending, {timeout:30000});}
    async function state() {return page.evaluate(()=>({seed:universeSeed,zoom:v2Camera.zoom,nodes:nestedV2.nodes.size,cached:[...nestedV2.nodes].filter(n=>n.world).length}));}
    async function wheel(delta) {await page.mouse.wheel(0,delta);await page.waitForTimeout(90);}
    async function aim(starId='moon') {
      const pt=await page.evaluate(id=>{const s=brushV2.stars.find(s=>s.id===id);return {x:v2Camera.x+s.x*v2Camera.zoom,y:v2Camera.y+s.y*v2Camera.zoom}},starId);
      await move(pt.x,pt.y);
    }
    async function enter(starId='moon') {
      await aim(starId);
      await wheel(-900);
      await page.waitForFunction(()=>v2Camera.zoom>2.99);
      await aim(starId);
      await wheel(-2500);
      await settle();
    }
    async function exit() {
      await move();await wheel(900);
      await page.waitForFunction(()=>v2Camera.zoom<1.01);
      await wheel(2500);await settle();
    }
    async function reset(k='q') {await page.keyboard.press(k);await page.waitForTimeout(200);}
    await move();
    await page.evaluate(()=>{window.original=currentWorldNodeV2();window.originalBase=brushV2.base;});
    await enter();
    await page.evaluate(()=>{window.child=currentWorldNodeV2();window.childBase=brushV2.base;window.returnCamera={...child.parent.camera};});
    assert.notEqual((await state()).seed,12);
    await exit();
    assert(await page.evaluate(()=>nestedV2.current===original && brushV2.base===originalBase && v2Camera.targetX===returnCamera.targetX));
    await enter();
    assert(await page.evaluate(()=>nestedV2.current===child && brushV2.base===childBase));
    console.log('PASS Child -> Parent -> Child, same identity/textures and parent camera');
    await enter('major-1');
    await page.evaluate(()=>window.grandchild=nestedV2.current);
    await exit();assert(await page.evaluate(()=>nestedV2.current===child));
    await enter('major-1');assert(await page.evaluate(()=>nestedV2.current===grandchild));
    await exit();await exit();assert(await page.evaluate(()=>nestedV2.current===original));
    console.log('PASS two nested levels round trip');
    await reset();await page.evaluate(()=>{window.original=currentWorldNodeV2();window.originalBase=brushV2.base});
    await exit();assert(await page.evaluate(()=>nestedV2.current.children.get('moon').child===original));
    await page.evaluate(()=>window.outer=nestedV2.current);
    await enter();assert(await page.evaluate(()=>nestedV2.current===original && brushV2.base===originalBase));
    await exit();assert(await page.evaluate(()=>nestedV2.current===outer));
    await exit();await page.evaluate(()=>window.outer2=nestedV2.current);
    await enter();assert(await page.evaluate(()=>nestedV2.current===outer));
    await enter();assert(await page.evaluate(()=>nestedV2.current===original));
    console.log('PASS Outer -> Original and two outer levels -> Original');
    // Stop at an intermediate progress, then reverse using actual wheel events.
    await aim();await wheel(-900);await page.waitForFunction(()=>v2Camera.zoom>2.99);await aim();await wheel(-400);
    await page.waitForFunction(()=>!!nestedV2.transition);
    await page.waitForTimeout(700);
    const progress=await page.evaluate(()=>nestedV2.transition.progress);
    assert(progress>0 && progress<1);
    await page.waitForTimeout(500);
    assert(Math.abs(await page.evaluate(()=>nestedV2.transition.progress)-progress)<0.01);
    await wheel(400);await settle();assert(await page.evaluate(()=>nestedV2.current===original));
    await exit();await enter();await move();await wheel(400);
    await page.waitForFunction(()=>!!nestedV2.transition);await wheel(-400);await settle();assert(await page.evaluate(()=>nestedV2.current===original));
    console.log('PASS stationary wheel progress and reversal in both directions');
    // Cancel before the generator is advanced: no wall-clock animation or switch.
    await reset();
    assert(await page.evaluate(()=>{
      noLoop(); currentWorldNodeV2(); tryExitWorldV2(100);const waiting=!!nestedV2.pending;
      handleStarEntryWheelV2(-100);const cancelled=!nestedV2.pending && !nestedV2.transition;loop();return waiting&&cancelled;
    }));
    console.log('PASS reversal while outer generation is pending');
    for (const [key,seed] of [['w',89],['e',205],['q',12]]) {
      await reset(key);assert.equal((await state()).seed,seed);
      assert(await page.evaluate(()=>nestedV2.nodes.size===1 && !nestedV2.pending && !nestedV2.transition && !nestedV2.preload && !nestedV2.current.parent));
    }
    console.log('PASS Q/W/E reset discards graph and jobs');
    for (const [key,field] of [['f','enabled'],['Space','paused'],['c','cursorEnabled']]) {
      const before=await page.evaluate(f=>brushFlowSettings[f],field);await page.keyboard.press(key);
      assert.equal(await page.evaluate(f=>brushFlowSettings[f],field),!before);await page.keyboard.press(key);
    }
    await enter();await page.keyboard.press('r');await page.waitForTimeout(100);assert.equal((await state()).zoom,1);
    console.log('PASS F / Space / C / R');
    await move(200,200);await page.waitForTimeout(100);await move(350,250);
    await page.waitForTimeout(60);assert(await page.evaluate(()=>brushCursor.active>0&&brushCursor.speed>0));
    await aim();await wheel(-900);await page.waitForFunction(()=>v2Camera.zoom>2.99);await aim();await wheel(-400);
    await page.waitForFunction(()=>!!nestedV2.transition);
    await reset('w');assert.equal((await state()).seed,89);
    assert(await page.evaluate(()=>!nestedV2.transition&&!nestedV2.pending&&nestedV2.nodes.size===1));
    await move();await wheel(300);await page.waitForFunction(()=>!!nestedV2.transition);
    await page.keyboard.press('r');await settle();assert.equal((await state()).zoom,1);
    assert.equal((await state()).seed,89);
    console.log('PASS cursor motion, seed reset during portal, R cancels outward portal');
    // Resource stress uses the same generators/state machine, with controlled frame stepping.
    const stress = await page.evaluate(() => {
      noLoop(); resetNestedV2(); universeSeed=12; initBrushV2(12); rebuildBrushFlowMap(); v2Camera.reset();
      const root=currentWorldNodeV2();
      const paintHash = world => {
        const data=world.base.drawingContext.getImageData(0,0,width,height).data;
        let h=2166136261; for(const b of data) h=Math.imul(h^b,16777619)>>>0;
        let f=2166136261; for(const b of world.flowMap.pixels) f=Math.imul(f^b,16777619)>>>0;
        return [h,f].join(':');
      };
      const drain=()=>{let n=0;while(nestedV2.preload||nestedV2.pending){updateChildPreloadV2();if(++n>2000)throw Error('job stuck');}};
      const finish=()=>{for(let i=0;i<100&&nestedV2.transition;i++)updateStarEntryV2(50);if(nestedV2.transition)throw Error('transition stuck');};
      const entry=id=>{
        const star=brushV2.stars.find(s=>s.id===id);
        Object.assign(v2Camera,stillCameraV2(3,constrain(width/2-star.x*3,-1600,0),constrain(height/2-star.y*3,-1200,0)));
        requestPortalV2(childEdgeV2(star),'in',-10000);drain();finish();drawBrushFlowShader(false,v2Camera);
      };
      const leave=()=>{v2Camera.reset();tryExitWorldV2(10000);drain();finish();drawBrushFlowShader(false,v2Camera);};
      entry('moon');const first=nestedV2.current;const hash=paintHash(first.world);leave();
      // Reduce the cache for an affordable eviction/rebuild regression.
      nestedV2.cacheLimit=3;
      for(const id of ['major-0','major-1','major-2','major-3','major-4']){entry(id);leave();}
      const evicted=first.world===null;
      entry('moon');const restored=nestedV2.current===first&&paintHash(first.world)===hash;
      entry('major-0');entry('major-1');entry('major-2');
      let pinned=true;for(let n=nestedV2.current;n;n=n.parent?.parent)pinned&&=!!n.world;
      const neighbour=childEdgeV2(brushV2.stars[0]).child;
      prepareWorldV2(neighbour);drain();trimWorldCacheV2();
      const neighbourWorld=neighbour.world;prepareWorldV2(neighbour);
      const noThrash=!!neighbourWorld&&neighbour.world===neighbourWorld&&!nestedV2.preload;
      const textureCount=brushFlowBuffer._renderer.textures.size;
      resetNestedV2();const cleanTextures=brushFlowBuffer._renderer.textures.size;
      universeSeed=12;initBrushV2(12);rebuildBrushFlowMap();v2Camera.reset();nestedV2.cacheLimit=8;
      currentWorldNodeV2();
      // Cancel a partially allocated child job; the active flow map must survive.
      const activeFlow=brushFlowMap,activeBase=brushV2.base;
      startChildPreloadV2(brushV2.stars[0]);updateChildPreloadV2();clearChildPreloadV2();
      const activeSafe=brushFlowMap===activeFlow&&brushV2.base===activeBase&&activeBase.width===width;
      loop();return {evicted,restored,pinned,textureCount,cleanTextures,activeSafe,noThrash};
    });
    assert.equal(stress.evicted,true);assert.equal(stress.restored,true);assert.equal(stress.pinned,true);
    assert.equal(stress.cleanTextures,0);assert.equal(stress.activeSafe,true);assert.equal(stress.noThrash,true);
    console.log('PASS cache eviction, pixel-identical regeneration, ancestor pinning, partial-job disposal:',stress);
    await canvas.screenshot({path:path.join(root,'tests','step6c.png')});
    console.log('Resources:', await page.evaluate(()=>({cached:[...nestedV2.nodes].filter(n=>n.world).length,graphics:document.querySelectorAll('canvas').length,textures:brushFlowBuffer._renderer.textures.size})));
    assert.deepEqual(errors,[]);
    console.log('PASS no browser JavaScript/WebGL errors');
  } finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1});
