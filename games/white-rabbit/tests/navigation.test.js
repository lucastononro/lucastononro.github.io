import test from 'node:test';
import assert from 'node:assert/strict';
import {findWalkingPath,clearWalkingSegment,dampHeading} from '../src/navigation.js';
import {advancePath} from '../src/movement.js';

test('an open diagonal becomes one continuous segment, starting at the exact player position',()=>{
 const start={x:.13,z:.27},target={x:8.13,z:-7.73};
 const path=findWalkingPath({start,target,valid:()=>true,isGoal:p=>Math.hypot(p.x-target.x,p.z-target.z)<.1});
 assert.deepEqual(path,[start,target]);
 for(const fps of [60,15,5]){
  const p={...start},n={path,index:0};for(let i=0;i<fps;i++){const before={...p};advancePath(p,n,4/fps);assert.ok(Math.abs((p.x-before.x)+(p.z-before.z))<1e-8,'every frame moves along both axes');}
  assert.ok(Math.abs(Math.hypot(p.x-start.x,p.z-start.z)-4)<1e-8);
 }
});

test('shortcutting keeps every segment out of walls and river gaps',()=>{
 const start={x:-3,z:0},target={x:3,z:0};
 const valid=(x,z)=>Math.abs(x)<5&&Math.abs(z)<5&&!(x>-.4&&x<.4&&z<1.4);
 const path=findWalkingPath({start,target,valid,isGoal:p=>Math.hypot(p.x-target.x,p.z-target.z)<.1});
 assert.ok(path.length>2);assert.ok(path.length<8);
 for(let i=1;i<path.length;i++)assert.ok(clearWalkingSegment(path[i-1],path[i],valid));
 assert.ok(path.some(p=>p.z>=1.4));
});

test('a diagonal cannot squeeze through touching blocked corners',()=>{
 const valid=(x,z)=>x>=0&&z>=0&&x<=1&&z<=1&&!((x>.1&&z<.9)||(z>.1&&x<.9));
 assert.equal(findWalkingPath({start:{x:0,z:0},target:{x:1,z:1},valid,isGoal:p=>p.x===1&&p.z===1}),null);
});

test('a thin obstacle between otherwise valid grid nodes is never skipped',()=>{
 const valid=(x,z)=>x>=0&&x<=1&&Math.abs(z)<.05&&!(x>.2&&x<.3);
 assert.equal(findWalkingPath({start:{x:0,z:0},target:{x:1,z:0},valid,isGoal:p=>p.x===1}),null);
});

test('turning across the angle boundary takes the short arc',()=>{
 const start=Math.PI-.01,end=-Math.PI+.01;
 const next=dampHeading(start,end,6,1/60);
 assert.ok(next>start&&next<start+.02);
});
