const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = process.argv[2] || path.resolve(__dirname, '..');
const context = vm.createContext({
  console, Math, document: {hidden: false, addEventListener() {}},
  lerp: (a,b,t) => a+(b-a)*t,
  brushFlowSettings: {speed:1.2,timeBlend:0,restartOffset:0,paused:false,enabled:true},
  state: {ready:true,universe:{id:1},flow:{paused:false,enabled:true},portal:null,loading:false}
});
for (const name of ['time-mechanic.js','time-integration.js','input_controller.js']) {
  vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),context);
}
const run = code => vm.runInContext(code,context);
assert.equal(run('timeMechanic.enabled'),false);
run('updateTimeMechanic(40000,state)');
assert.equal(run('timeMechanic.paintingTime'),0);
assert.equal(run('brushFlowSettings.speed'),1.2);
assert.equal(run('timeDisplay.visibleStars'),12);
assert.equal(run('timeDisplay.extraMarkOpacity'),0);
run('setTimeEffectEnabled(true); updateTimeMechanic(0,state)');
assert.equal(run('timeMechanic.paintingTime'),0);
assert.equal(run('timeDisplay.visibleStars'),12);
run('updateTimeMechanic(300,state)');
assert.ok(run('timeDisplay.visibleStars > 2 && timeDisplay.visibleStars < 12'));
run('updateTimeMechanic(300,state)');
assert.equal(run('timeDisplay.visibleStars'),2);
run('updateTimeMechanic(29250,state)');
assert.ok(Math.abs(run('timeMechanic.paintingTime')-29.85)<1e-6);
assert.equal(run('brushFlowSettings.speed'),108);
run('setTimeEffectEnabled(false); updateTimeMechanic(0,state)');
assert.equal(run('brushFlowSettings.speed'),1.2);
assert.equal(run('brushFlowSettings.timeBlend'),0);
run('updateTimeMechanic(600,state)');
assert.equal(run('timeDisplay.visibleStars'),12);
assert.equal(run('timeDisplay.extraMarkOpacity'),0);
run('setTimeEffectEnabled(true); updateTimeMechanic(0,state); updateTimeMechanic(100,state); setTimeEffectEnabled(false); updateTimeMechanic(100,state); setTimeEffectEnabled(true); updateTimeMechanic(0,state)');
assert.equal(run('timeMechanic.paintingTime'),0);
run('state.flow.paused=true; updateTimeMechanic(2000,state)');
assert.equal(run('timeMechanic.paintingTime'),0);
run('state.flow.paused=false; state.flow.enabled=false; updateTimeMechanic(2000,state)');
assert.equal(run('timeMechanic.paintingTime'),0);
run('state.flow.enabled=true; updateTimeMechanic(34000,state)');
assert.equal(run('timeMechanic.paintingTime'),0);
assert.equal(run('timeMechanic.hasLooped'),true);
run("key=' '; handlePaintingKeyV2({target:{closest:s=>s==='button'}})");
assert.equal(run('brushFlowSettings.paused'),false);
run("handlePaintingKeyV2({target:{closest:()=>false}})");
assert.equal(run('brushFlowSettings.paused'),true);
run("key='f'; handlePaintingKeyV2({target:{closest:()=>false}})");
assert.equal(run('brushFlowSettings.enabled'),false);
console.log('PASS: default normal flow; fresh starts; preserved peak/cycle; 600ms star transitions; rapid toggles; stop restores flow; Space/F gates; focused-button Space guard.');
