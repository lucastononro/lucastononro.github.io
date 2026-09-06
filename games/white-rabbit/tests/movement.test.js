import test from 'node:test';
import assert from 'node:assert/strict';
import {moveWithCollision,advancePath,inKitchenEntrance} from '../src/movement.js';

test('manual movement covers the same distance at 60, 15 and 5 frames per second',()=>{
 for(const fps of [60,15,5]){
  const p={x:0,z:0};for(let i=0;i<fps*2;i++)moveWithCollision(p,0,-6/fps,()=>true);
  assert.ok(Math.abs(p.z+12)<.00001);
 }
});
test('a slow frame cannot jump a thin wall, and diagonal movement slides along it',()=>{
 const p={x:0,z:0};moveWithCollision(p,1.5,-1.5,(x,z)=>!(z<-.4&&z>-.7));
 assert.ok(p.z>=-.4);assert.ok(Math.abs(p.x-1.5)<.00001);
});
test('assisted walking spends remaining travel across bends without losing frames at waypoints',()=>{
 for(const fps of [60,15,5]){
  const p={x:0,z:0};const nav={index:0,path:[{x:0,z:0},{x:0,z:-.5},{x:.5,z:-.5},{x:.5,z:-1}]};
  let result;for(let i=0;i<fps;i++)result=advancePath(p,nav,1.5/fps);
  assert.ok(Math.abs(p.x-.5)<.00001);assert.ok(Math.abs(p.z+1)<.00001);
  assert.equal(advancePath(p,nav,.00001).done,true);
 }
});

test('the fan requires the open kitchen entrance, never its side or back wall',()=>{
 const box={min:{x:-20,z:-25},max:{x:-16,z:-20}};
 assert.equal(inKitchenEntrance(box,{x:-18,z:-19}),true);
 for(const p of [{x:-15,z:-21},{x:-21,z:-21},{x:-18,z:-26},{x:-18,z:-21},{x:-18,z:-15}])assert.equal(inKitchenEntrance(box,p),false);
});
