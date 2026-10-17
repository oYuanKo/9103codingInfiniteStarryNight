const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');const root=path.resolve(__dirname,'..');
(async()=>{const server=http.createServer((req,res)=>{const f=path.resolve(root,req.url==='/'?'index.html':req.url.split('?')[0].slice(1));if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end()}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(f))});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1000,height:800}}),errors=[],warnings=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errors.push(m.text());if(m.type()==='warning')warnings.push(m.text())});await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>typeof v2Camera!=='undefined'&&v2Camera&&brushFlowMap);

await page.evaluate(()=>{noLoop();brushFlowSettings.paused=true;brushFlowSettings.enabled=true;hoverWorldV2(captureWorldV2());const moon=starHoverLightV2.worlds.get(brushV2.detailSource).stars.find(s=>s.star.id==='moon');moon.intensity=1;moon.dwell=3;window.measureFrame=()=>{const t=performance.now();drawBrushFlowShader(true,v2Camera);drawStarHoverLightV2(0);const cpu=performance.now()-t;brushFlowBuffer.loadPixels();drawingContext.getImageData(0,0,width,height);return [cpu,performance.now()-t]}});
const rows=[];
for(const styled of [true,false,true,false]){
 await page.evaluate(flag=>{document.styleSheets[0].disabled=!flag},styled);
 const result=await page.evaluate(async()=>{const cpu=[],readback=[];for(let i=0;i<140;i++){const values=measureFrame();if(i>=30){cpu.push(values[0]);readback.push(values[1])}await new Promise(requestAnimationFrame)}const stats=a=>{a.sort((x,y)=>x-y);return {median:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)]}};return {cpu:stats(cpu),withReadback:stats(readback)}});rows.push({styled,...result});
}
assert.deepEqual(errors,[]);console.log('Same-page paired layout timing (ms)',rows);
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}})().catch(e=>{console.error(e);process.exitCode=1});
