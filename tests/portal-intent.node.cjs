const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const root=process.argv[2]||path.resolve(__dirname,'..');
const c=vm.createContext({console,Math,width:800,height:600,mouseX:100,mouseY:100,brushCursor:{inside:true},universeSeed:12,brushV2:{stars:[{id:'moon',type:'moon',x:100,y:100,enterRadius:30},{id:'major-1',type:'major',x:300,y:100,enterRadius:30}]},brushFlowMap:null,brushFlowTime:0,constrain:(v,a,b)=>Math.max(a,Math.min(b,v)),lerp:(a,b,t)=>a+(b-a)*t});
vm.runInContext(fs.readFileSync(path.join(root,'nested_universe_v2.js'),'utf8'),c);
const run=s=>vm.runInContext(s,c);
run(`var requests=[]; var v2Camera={zoom:2.8,targetZoom:3,maxZoom:3,minZoom:1,screenToWorld:(x,y)=>({x,y})}; requestPortalV2=(edge,direction,delta)=>requests.push({star:edge.starId,direction,delta});`);
assert.equal(run('tryEnterStarV2(100,100,-120)'),true);
assert.equal(run('requests.length'),0);
run('tryEnterStarV2(100,100,-30); v2Camera.zoom=2.995; updateEntryIntentV2()');
assert.equal(run('requests.length'),1);assert.equal(run('requests[0].delta'),-150);
run('updateEntryIntentV2()');assert.equal(run('requests.length'),1);
for(const cancellation of ['handleStarEntryWheelV2(1)','brushCursor.inside=false','mouseX=300','v2Camera.targetZoom=2.9','nestedV2.current=newWorldNodeV2(99)']){
 run('requests=[]; mouseX=100; brushCursor.inside=true; v2Camera.targetZoom=3; v2Camera.zoom=2.8; tryEnterStarV2(100,100,-120)');run(cancellation);run('v2Camera.zoom=2.995; updateEntryIntentV2()');assert.equal(run('requests.length'),0,cancellation);assert.equal(run('nestedV2.entryIntent'),null,cancellation);
}
run('mouseX=100; v2Camera.zoom=2.8; v2Camera.targetZoom=3; tryEnterStarV2(100,100,-120); mouseX=300; tryEnterStarV2(300,100,-20); v2Camera.zoom=2.995; updateEntryIntentV2()');
assert.equal(run('requests[0].star'),'major-1');assert.equal(run('requests[0].delta'),-20);
run('requests=[]; v2Camera.targetZoom=2.9');assert.equal(run('tryEnterStarV2(300,100,-120)'),false);assert.equal(run('tryEnterStarV2(300,100,120)'),false);
run('nestedV2.entryIntent=null; nestedV2.transition=null; v2Camera.sensitivity=.0015; nestedV2.pending={direction:"in",distance:.18}; handleStarEntryWheelV2(120)');assert.equal(run('nestedV2.pending'),null);
run('nestedV2.pending={direction:"out",distance:-.18}; handleStarEntryWheelV2(-120)');assert.equal(run('nestedV2.pending'),null);
console.log('PASS: pending cancellation both directions; deferred single gesture, accumulated depth, exactly-once dispatch, reverse, leave, retarget, zoom-out, world change, no pre-limit intent');

