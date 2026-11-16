import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { TASKS, PHASES, DURATIONS, targetFor, measuredFit, smooth } from '../web/src/task.js';
import { fitJointAngleToRange } from '../web/src/selectedIkSolver.js';

for(const task of TASKS){
  test(`${task.key}: lateral correction stays above the socket before descent`,()=>{
    const rough=targetFor(task,'register'), centered=targetFor(task,'correct');
    assert.ok(Math.hypot(rough.x-task.x,rough.y-task.y)>.004);
    assert.equal(centered.x,task.x);assert.equal(centered.y,task.y);
    assert.equal(centered.z,rough.z);
    assert.ok(centered.z>targetFor(task,'align').z);
    assert.deepEqual(PHASES,['approach','register','correct','align','insert']);
    assert.ok(Math.abs(Object.values(DURATIONS).reduce((a,b)=>a+b,0)-12.4)<1e-10);
  });
  test(`${task.key}: approach, alignment and seating are distinct poses`,()=>{
    assert.ok(targetFor(task,'approach').z>targetFor(task,'align').z);
    assert.ok(targetFor(task,'align').z>task.mouth);
    assert.ok(targetFor(task,'insert').z<task.mouth);
  });
  test(`${task.key}: seating is a measured pose condition`,()=>{
    const p=[task.x,task.y,task.mouth-task.depth];
    assert.equal(measuredFit(task,p,[0,0,-1]).seated,true);
    assert.equal(measuredFit(task,[p[0]+0.003,p[1],p[2]],[0,0,-1]).seated,false);
    assert.equal(measuredFit(task,[p[0],p[1],task.mouth+0.001],[0,0,-1]).seated,false);
    assert.equal(measuredFit(task,p,[0,0,1]).seated,false);
    assert.equal(measuredFit(task,[NaN,p[1],p[2]],[0,0,-1]).seated,false);
  });
}
test('smooth interpolation clamps and preserves endpoints',()=>{
  assert.equal(smooth(-1),0); assert.equal(smooth(2),1); assert.equal(smooth(0.5),0.5);
});
test('reference IK helper respects joint bounds',()=>{
  assert.equal(fitJointAngleToRange(7,-1,1),7-2*Math.PI);
  assert.equal(fitJointAngleToRange(2,-1,1),1);
});
test('all Panda mesh dependencies and its original license are packaged',()=>{
  const base=new URL('../web/public/franka/',import.meta.url);
  const xml=readFileSync(new URL('panda.xml',base),'utf8');
  const files=[...xml.matchAll(/<mesh[^>]*file="([^"]+)"/g)].map(m=>m[1]);
  assert.ok(files.length>60);
  for(const file of files) assert.ok(existsSync(new URL(`assets/${file}`,base)),file);
  assert.match(readFileSync(new URL('LICENSE',base),'utf8'),/Apache License/);
});
