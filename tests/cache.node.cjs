const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const removed=[],textures=new Map();let serial=0;
const resource=()=>{const r={id:++serial,remove(){removed.push(this.id)}};textures.set(r,{glTex:r.id});return r};
const world=seed=>({seed,base:resource(),motion:null,flowMap:resource(),detailSource:{seed},flowTime:seed+.5,time:seed+.25});
const c=vm.createContext({console,Math,Number,Set,Map,brushFlowBuffer:{_renderer:{textures,GL:{deleteTexture(){}}}},disposeBrushDetailsV2(){},brushV2:{},brushFlowMap:null,brushFlowTime:0,universeSeed:0,buildBrushV2Steps:function*(){},world});
vm.runInContext(fs.readFileSync(path.join(root,'nested_universe_v2.js'),'utf8'),c);
const run=s=>vm.runInContext(s,c);
run('var trail=[]; var rootNode=newWorldNodeV2(0,world(0)); nestedV2.current=rootNode; trail.push(rootNode);');
for(let depth=1;depth<=80;depth++){
 run(`var parent=nestedV2.current;var child=newWorldNodeV2(${depth},world(${depth}));var edge={parent,child,starId:'moon',camera:{zoom:3}};child.parent=edge;parent.children.set('moon',edge);nestedV2.current=child;trail.push(child);trimWorldCacheV2();`);
 assert(run('[...nestedV2.nodes].filter(n=>n.world).length<=8'));
}
assert.equal(run('rootNode.world'),null);assert.equal(run('trail.length'),81);assert.equal(run('rootNode.flowTime'),.5);
run('var active=nestedV2.current;var target=trail[0];nestedV2.pending={edge:{parent:target,child:active}};prepareWorldV2(target);');
assert.equal(run('[...nestedV2.nodes].filter(n=>n.world).length'),7,'reserve before allocation');
assert(run('nestedV2.current.world.base!==null'));
run('clearChildPreloadV2();nestedV2.pending=null;');
// Walk back by the original graph identities; reconstruction is permitted, links persist.
for(let depth=79;depth>=0;depth--){run(`var n=nestedV2.current.parent.parent;if(!n.world){prepareWorldV2(n);clearChildPreloadV2();n.world=world(n.seed);n.world.flowTime=n.flowTime;n.world.time=n.time;}nestedV2.current=n;n.used=++nestedV2.clock;trimWorldCacheV2();`);assert.equal(run('nestedV2.current===trail['+depth+']'),true);assert(run('[...nestedV2.nodes].filter(n=>n.world).length<=8'));}
assert.equal(run('nestedV2.current.world.flowTime'),.5);
// Both transition endpoints survive pressure even when the current node is a child.
run('nestedV2.cacheLimit=3;var a=trail[0],b=trail[1];if(!b.world)b.world=world(1);nestedV2.transition={edge:{parent:a,child:b}};for(let i=90;i<95;i++)newWorldNodeV2(i,world(i));trimWorldCacheV2();');
assert(run('!!a.world&&!!b.world'));assert.equal(run('[...nestedV2.nodes].filter(n=>n.world).length'),3);
assert(removed.length>0);assert.equal(textures.size,6,'evicted GPU references removed');
console.log('PASS 80-level resource bound; in-flight reservation; ancestor graph/identity/time retention; return reconstruction; portal endpoint protection; GPU disposal.');

function generated(seed,legacy){let rng=0,draws=0,allocations=0;const trace=[];
 const random=(a=1,b)=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;draws++;const r=rng/4294967296;return b===undefined?r*a:a+(b-a)*r};
 const box=vm.createContext({console:{log(){}},Math,Float64Array,width:32,height:24,universeSeed:seed,random,randomSeed:s=>{rng=s},noiseSeed(){},noise:()=>.5,constrain:(x,a,b)=>Math.max(a,Math.min(b,x)),lerp:(a,b,t)=>a+(b-a)*t,floor:Math.floor,abs:Math.abs,min:Math.min,sin:Math.sin,cos:Math.cos,atan2:Math.atan2,TWO_PI:2*Math.PI,disposeBrushDetailsV2(){},newBrushDetailSourceV2:()=>({records:[]}),createGraphics:()=>{allocations++;return {pixelDensity:()=>1,background(){},remove(){},drawingContext:{getImageData:()=>({data:new Uint8Array(32*4).fill(255)})}}},generateVillageLayout:()=>({houses:[]}),generateCypressLayout:()=>null,paintBrushVillage(){},paintBrushCypress(){},paintBrushMountainsSteps:function*(){},paintAllBrushV2Stars(){}});
 vm.runInContext(fs.readFileSync(path.join(root,'brush_renderer_v2.js'),'utf8'),box);
 box.collect=(...args)=>trace.push(args.slice(1));vm.runInContext('paintV2Stroke=collect;generateBrushV2Stars=()=>[];BRUSH_V2_SETTINGS.detailCount=10;',box);
 vm.runInContext(`for(const _ of buildBrushV2Steps(${seed},false,false,${legacy})){};this.result={motion:!!brushV2.motion,marks:brushV2.marks.length};`,box);
 return {trace,draws,next:Array.from({length:20},()=>random()),allocations,result:box.result};
}
for(const seed of [12,89,402180]){const old=generated(seed,true),shader=generated(seed,false);assert.equal(JSON.stringify(shader.trace),JSON.stringify(old.trace));assert.deepEqual(shader.next,old.next);assert.equal(shader.draws,old.draws);assert.equal(shader.allocations,1);assert.equal(old.allocations,2);assert.equal(old.result.marks,650);assert.equal(shader.result.marks,0);}
console.log('PASS legacy/shader paint arguments and subsequent RNG sequence identical for 3 seeds; shader allocates one canvas and zero legacy marks.');
