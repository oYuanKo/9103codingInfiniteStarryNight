const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=process.argv[2]||path.resolve(__dirname,'..');
(async()=>{
 const calls=[];const c=vm.createContext({console,Math,document:{hidden:false,addEventListener(){}},lerp:(a,b,t)=>a+(b-a)*t,brushFlowSettings:{speed:1.2,enabled:true,paused:false},brushCursor:{},starHoverLightV2:{worlds:new Map()},paintingPresentationV2:{syncTimeButton(){calls.push('button');}},resetNestedV2(){calls.push('dispose');},initBrushV2(seed){calls.push(['generate',seed]);},rebuildBrushFlowMap(){calls.push('flowMap');},currentWorldNodeV2(){calls.push('node');},publishGroupResetV2(){calls.push('resetEvent');},brushFlowTime:99});
 for(const name of ['time-mechanic.js','time-integration.js','app_controller.js','input_controller.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),c);
 const run=s=>vm.runInContext(s,c);
 run('v2Camera={reset(){}};timeMechanic.enabled=true;timeMechanic.paintingTime=25;timePreviousFlow={speed:99};brushFlowSettings.paused=true;brushFlowSettings.enabled=false;key="r";handlePaintingKeyV2({repeat:false})');
 assert.equal(run('universeSeed'),12);assert.equal(run('timeMechanic.enabled'),false);assert.equal(run('timeMechanic.paintingTime'),0);assert.equal(run('timePreviousFlow'),null);assert.equal(run('brushFlowSettings.speed'),1.2);assert.equal(run('brushFlowSettings.paused'),false);assert.equal(run('brushFlowSettings.enabled'),true);assert.equal(calls.at(-1),'resetEvent');
 const count=calls.length;run('handlePaintingKeyV2({repeat:true})');assert.equal(calls.length,count);
 for(const k of ['q','w','e','Q','W','E']){c.key=k;run('handlePaintingKeyV2({})');}assert.equal(calls.length,count);
 run('restartPaintingV2(205)');assert.equal(run('universeSeed'),205);assert.throws(()=>run('restartPaintingV2(NaN)'));assert.equal(run('universeSeed'),205);
 const media=[],timers=new Map(),listeners={};let id=0;class Audio{constructor(src){this.src=src;this.paused=true;this.currentTime=0;media.push(this);}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}removeAttribute(){}load(){}}
 const subscribe=(name,cb)=>{listeners[name]=cb;return ()=>delete listeners[name];};
 const a=vm.createContext({console,Audio,location:{protocol:'file:'},performance:{now:()=>0},setTimeout:fn=>{timers.set(++id,fn);return id;},clearTimeout:id=>timers.delete(id),window:{addEventListener(){},removeEventListener(){}},StarryNight:{getState:()=>({ready:true,flow:{paused:false}}),onFrame:cb=>subscribe('frame',cb),onPortal:cb=>subscribe('portal',cb),onReset:cb=>subscribe('reset',cb)}});
 vm.runInContext(fs.readFileSync(path.join(root,'audio_module.js'),'utf8'),a);await Promise.resolve();await Promise.resolve();
 listeners.portal({phase:'begin'});listeners.portal({phase:'end',outcome:'completed',direction:'in'});await Promise.resolve();media.forEach(e=>e.currentTime=12);listeners.frame(16,{ready:true,flow:{paused:true}});assert(media.every(e=>e.paused));assert(timers.size===0);
 listeners.reset();await Promise.resolve();assert(!media[0].paused);assert(media.slice(1).every(e=>e.paused));assert(media.every(e=>e.currentTime===0));assert.equal(timers.size,0);assert(media.slice(0,3).every(e=>e.playbackRate===1));
 listeners.portal({phase:'end',outcome:'completed',direction:'in'});await Promise.resolve();assert(!media[1].paused);listeners.reset();await Promise.resolve();assert(!media[0].paused&&media.slice(1).every(e=>e.paused));assert.equal(timers.size,0);
 vm.runInContext('detachAudioModuleV1()',a);assert(!listeners.reset);
 console.log('PASS: full restart, Time/flow defaults, key repeat guard, removed seed shortcuts, explicit seed testing, paused audio reset, timer cancellation, track depth reset and cleanup');
})().catch(e=>{console.error(e);process.exitCode=1;});
