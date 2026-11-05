const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),path=require('path');
const c=vm.createContext({Float32Array,Math,Number});vm.runInContext(fs.readFileSync(path.join(__dirname,'../audio_reactivity.js'),'utf8')+';this.painting=AudioPaintingV2',c);const p=c.painting;
const bins=new Float32Array(1024).fill(-Infinity);
for(const [band,hz]of [[0,100],[1,1000],[2,6000]]){bins.fill(-Infinity);bins[Math.round(hz*2048/48000)]=-30;const out=p.levels(bins,48000,2048);assert(out[band]>0);out.forEach((v,i)=>{if(i!==band)assert.equal(v,0)})}
bins.fill(-Infinity);assert(p.levels(bins,48000,2048).every(v=>v===0));
const analyser={fftSize:2048,frequencyBinCount:1024,getFloatFrequencyData:a=>a.set(bins)};p.attach({sampleRate:48000,createAnalyser:()=>analyser});
bins[Math.round(1000*2048/48000)]=-10;p.update(16,true);assert(p.values[1]>0&&p.values[1]<1);const first=p.values[1];p.update(16,false);assert(p.values[1]<first);for(let i=0;i<1000;i++)p.update(16,false);assert(p.values.every(v=>v<1e-7));p.reset();assert(p.values.every(v=>v===0));
const g=p.geometry({cypress:{baseX:84,baseY:558,height:336,width:68},village:{houses:[{x:300,baseY:420,w:20,h:15}]}});assert.equal(g.lights.length,48);assert.equal(g.lights[0],300);assert.equal(g.lights[1],413.25);assert.equal(g.tree[1],558);
console.log('PASS FFT Hz/bin selection; silence; bounded attack/release; no-source decay; reset; world-specific geometry.');

{
 const houses=Array.from({length:12},(_,i)=>({x:50+i*35,baseY:440,w:20,h:16}));
 const shape=p.geometry({village:{houses},cypress:{baseX:84,baseY:558,height:336,width:68}});
 let varied=0;
 for(let i=0;i<12;i++){
  const [x,y,rx,ry]=shape.lights.slice(i*4,i*4+4),h=houses[i];
  if(rx!==h.w*.22)varied++;
  assert(x-rx*1.45>=h.x-h.w/2&&x+rx*1.45<=h.x+h.w/2);
  assert(y-ry*1.45>=h.baseY-h.h&&y+ry*1.45<=h.baseY);
 }
 assert.equal(varied,4);
 console.log('PASS only four lights vary; compact glow support stays inside all house bodies.');
}
