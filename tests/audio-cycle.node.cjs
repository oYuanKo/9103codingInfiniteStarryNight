const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
(async()=>{const media=[],listeners={},timers=new Map();let id=0;class Audio{constructor(){this.paused=true;this.currentTime=0;this.playbackRate=1;media.push(this)}play(){this.paused=false;return Promise.resolve()}pause(){this.paused=true}removeAttribute(){}load(){}}
const state={ready:true,flow:{paused:false,enabled:true},visual:{},time:{enabled:true,seconds:0,paintSpeed:1.8,startSpeed:1.8,peakSpeed:108,peakTime:29.85,restartTime:31.57}};
const c=vm.createContext({console,Math,Number,Audio,location:{protocol:'file:'},performance:{now:()=>0},setTimeout:(f,ms)=>{timers.set(++id,f);return id},clearTimeout:i=>timers.delete(i),window:{addEventListener(){},removeEventListener(){}},StarryNight:{getState:()=>state,onFrame:f=>(listeners.frame=f,()=>{}),onPortal:f=>(listeners.portal=f,()=>{}),onReset:f=>(listeners.reset=f,()=>{})}});vm.runInContext(fs.readFileSync(path.join(__dirname,'../audio_module.js'),'utf8'),c);
async function settle(){await Promise.resolve();await Promise.resolve();for(const [i,f]of [...timers]){timers.delete(i);f()}await Promise.resolve()}
const song=()=>media.slice(0,3).map((e,i)=>!e.paused?i+1:null).filter(Boolean);
async function navigate(direction,outcome='completed'){listeners.portal({phase:'begin'});listeners.portal({phase:'end',outcome,direction});listeners.frame(16,state);await settle()}
await settle();const inward=[song()[0]];for(let i=0;i<7;i++){await navigate('in');inward.push(song()[0])}assert.deepEqual(inward,[1,2,3,1,2,3,1,2]);
const outward=[];for(let i=0;i<9;i++){await navigate('out');outward.push(song()[0])}assert.deepEqual(outward,[1,3,2,1,3,2,1,3,2]);
await navigate('in');assert.deepEqual(song(),[3]);await navigate('in');assert.deepEqual(song(),[1]);await navigate('out','cancelled');assert.deepEqual(song(),[1]);await navigate('in','cancelled');assert.deepEqual(song(),[1]);
state.flow.paused=true;listeners.frame(16,state);await navigate('in');assert(media.every(e=>e.paused));state.flow.paused=false;listeners.frame(16,state);await settle();assert.deepEqual(song(),[2]);assert.equal(media[1].playbackRate,1);
state.time.seconds=29.85;state.time.paintSpeed=108;listeners.frame(16,state);assert.equal(media[1].playbackRate,1.6);state.time.seconds=0;state.time.paintSpeed=1.8;await navigate('in');assert.deepEqual(song(),[3]);assert.equal(media[2].playbackRate,1);assert.equal(media[3].playbackRate,1);
state.time.enabled=false;state.visual.pointerSpeed=1;for(let i=0;i<100;i++)listeners.frame(16,state);assert(media[2].playbackRate>1.89);listeners.reset();await settle();assert.deepEqual(song(),[1]);assert(media.slice(0,3).every(e=>e.playbackRate===1));
console.log('PASS 7 inward levels 1,2,3,1,2,3,1,2; nine outward levels across root; returns/cancellations; paused entry; Time peak/new-world reset; cue unchanged; mouse mode; R resets song 1.');
})().catch(e=>{console.error(e);process.exitCode=1});
