const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
(async()=>{
 const media=[],listeners={};let timer=0;
 class Audio{constructor(){this.paused=true;this.currentTime=0;this.playbackRate=1;media.push(this)}play(){this.paused=false;return Promise.resolve()}pause(){this.paused=true}removeAttribute(){}load(){}}
 const state={ready:true,flow:{paused:false,enabled:true},visual:{hoverSpread:0,pointerSpeed:0},time:null};
 const c=vm.createContext({console,Math,Audio,Number,location:{protocol:'file:'},performance:{now:()=>0},setTimeout:()=>++timer,clearTimeout(){},window:{addEventListener(){},removeEventListener(){}},lerp:(a,b,t)=>a+(b-a)*t,StarryNight:{getState:()=>state,onFrame:f=>(listeners.frame=f,()=>{}),onPortal:f=>(listeners.portal=f,()=>{}),onReset:f=>(listeners.reset=f,()=>{})}});
 for(const f of ['time-mechanic.js','audio_module.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),c);
 const run=s=>vm.runInContext(s,c);
 function phase(seconds){c.seconds=seconds;state.time=run('timeMechanic.enabled=true;timeMechanic.paintingTime=seconds;timeMechanic.updatePaintingLoop();({enabled:true,seconds:timeMechanic.paintingTime,paintSpeed:timeMechanic.paintSpeed,...paintingTimeSettings,peakSpeed:timeMechanic.curveValue(paintingTimeSettings.peakTime,1)})');}
 const frame=(dt=16)=>listeners.frame(dt,state);const rates=()=>media.slice(0,3).map(e=>e.playbackRate);
 await Promise.resolve();await Promise.resolve();
 for(const [seconds,expected]of [[0,1],[29.85,1.6],[31.57,.8],[34,1]]){phase(seconds);frame();rates().forEach(r=>assert(Math.abs(r-expected)<1e-12));}
 let previous=1,maxStep=0;for(let i=0;i<=3400;i++){phase(i/100);frame();const rate=rates()[0];assert(rate>=.8&&rate<=1.6);maxStep=Math.max(maxStep,Math.abs(rate-previous));previous=rate;}assert(maxStep<.04);
 phase(28);frame();const held=rates()[0];state.visual.pointerSpeed=1;frame(100);assert.equal(rates()[0],held);state.portal={};state.loading=true;for(let i=0;i<100;i++)frame(100);assert.equal(rates()[0],held);state.portal=null;state.loading=false;
 state.flow.paused=true;frame();assert(media.every(e=>e.paused));assert.equal(rates()[0],held);phase(0);listeners.portal({phase:'end',outcome:'completed',direction:'in'});assert.deepEqual(rates(),[1,1,1]);state.flow.paused=false;frame();await Promise.resolve();assert(!media[1].paused);
 listeners.portal({phase:'end',outcome:'completed',direction:'in'});await Promise.resolve();assert(!media[2].paused);phase(29.85);frame();assert.deepEqual(rates(),[1.6,1.6,1.6]);assert.equal(media[3].playbackRate,1);
 const current=media[2];const quiet=current.volume;state.visual.hoverSpread=1;for(let i=0;i<100;i++)frame();assert(current.volume>quiet);assert.equal(current.playbackRate,1.6);assert(media.slice(0,3).every(e=>e.preservesPitch===true));
 listeners.portal({phase:'end',outcome:'cancelled',direction:'out'});frame();assert.equal(current.playbackRate,1.6);phase(0);listeners.portal({phase:'end',outcome:'completed',direction:'out'});assert.deepEqual(rates(),[1,1,1]);
 state.time.enabled=false;state.visual.pointerSpeed=1;for(let i=0;i<200;i++)frame();assert(rates()[0]>1.89);state.visual.pointerSpeed=0;for(let i=0;i<200;i++)frame();assert(Math.abs(rates()[0]-1)<1e-5);
 listeners.reset();await Promise.resolve();assert.deepEqual(rates(),[1,1,1]);assert(!media[0].paused);assert(media.slice(1).every(e=>e.paused));
 // Exercise the real Time integration freeze gates, including return from hidden.
 c.document={hidden:false,addEventListener(){}};c.brushFlowSettings={speed:1.2,timeBlend:0,restartOffset:0};c.state=state;state.universe={id:1};state.portal=null;state.loading=false;state.flow.paused=false;state.flow.enabled=true;
 vm.runInContext(fs.readFileSync(path.join(root,'time-integration.js'),'utf8'),c);
 run('timeMechanic.enabled=true;updateTimeMechanic(0,state);updateTimeMechanic(1000,state)');const clockBefore=run('timeMechanic.paintingTime');
 for(const gate of ['paused','portal','loading','hidden']){if(gate==='paused')state.flow.paused=true;if(gate==='portal')state.portal={};if(gate==='loading')state.loading=true;if(gate==='hidden')c.document.hidden=true;run('updateTimeMechanic(10000,state)');assert.equal(run('timeMechanic.paintingTime'),clockBefore);state.flow.paused=false;state.portal=null;state.loading=false;c.document.hidden=false;}
 run('timeSkipNextFrame=true;updateTimeMechanic(10000,state)');assert.equal(run('timeMechanic.paintingTime'),clockBefore);run('updateTimeMechanic(100,state)');assert(Math.abs(run('timeMechanic.paintingTime')-clockBefore-.1)<1e-12);
 console.log('PASS actual Time freeze gates: F, portal, loading, hidden and first return frame.');
 console.log('PASS actual Time curve anchors/bounds/continuity; no pointer mixing or independent clock; frozen phase; paused/new-world rates; all 3 tracks; hover volume; cue unchanged; pitch flag; cancellation/return/reset; mouse mode restored. Max step per 10ms:',maxStep);
})().catch(e=>{console.error(e);process.exitCode=1});
