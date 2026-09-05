import test from 'node:test';
import assert from 'node:assert/strict';
import {TouchControls,usesTouchControls,joystickVector} from '../src/touch.js';

test('phone detection respects coarse touch input and a player override',()=>{
 assert.equal(usesTouchControls('auto',{points:5,coarse:true}),true);
 assert.equal(usesTouchControls('auto',{points:0,coarse:false}),false);
 assert.equal(usesTouchControls('auto',{points:5,coarse:false}),false);
 assert.equal(usesTouchControls('desktop',{points:5,coarse:true}),false);
 assert.equal(usesTouchControls('touch',{points:0,coarse:false}),true);
});
test('joystick has a rest zone, analog speed and capped diagonal movement',()=>{
 assert.deepEqual(joystickVector(2,2),{x:0,y:0});
 assert.deepEqual(joystickVector(0,-22),{x:0,y:.5});
 const diagonal=joystickVector(200,-200);assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.y)-1)<1e-8);
 assert.ok(diagonal.x>0&&diagonal.y>0);
});
test('two thumbs operate independently and cancel safely on interruption or rotation',t=>{
 class Element extends EventTarget {constructor(){super();this.style={};const set=new Set();this.classList={add:n=>set.add(n),remove:n=>set.delete(n),toggle:(n,v)=>v?set.add(n):set.delete(n),contains:n=>set.has(n)};}setPointerCapture(){}getBoundingClientRect(){return {left:0,top:0,width:126,height:126}}}
 const ids=['move-pad','move-knob','look-pad','rotate-device','touch-action','touch-explore','touch-fullscreen','rotate-fullscreen'];const els=Object.fromEntries(ids.map(id=>['#'+id,new Element()]));
 const saved=new Map();const setGlobal=(name,value)=>{if(!saved.has(name))saved.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{value,writable:true,configurable:true})};t.after(()=>{for(const [name,descriptor] of saved){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name]}});
 const doc=new EventTarget();doc.querySelector=id=>els[id];doc.body=new Element();doc.hidden=false;
 const win=new EventTarget();
 for(const [name,value] of Object.entries({document:doc,window:win,innerWidth:844,innerHeight:390,matchMedia:()=>({matches:true,addEventListener(){}})}))setGlobal(name,value);
 setGlobal('navigator',{maxTouchPoints:5});
 const world={active:true,title:false,blocked:false,yaw:0,pitch:0,sensitivity:1};const touch=new TouchControls({getWorld:()=>world,getState:()=>({settings:{controls:'auto'}}),onAction(){},onExplore(){},onMessage(){}});
 const send=(id,type,pointerId,x,y)=>{const e=new Event(type,{cancelable:true});Object.assign(e,{pointerId,clientX:x,clientY:y});els['#'+id].dispatchEvent(e)};
 send('move-pad','pointerdown',11,63,25);assert.ok(world.touchMove.y>.8);
 send('look-pad','pointerdown',22,700,300);send('look-pad','pointermove',22,740,280);assert.ok(world.yaw<0&&world.pitch>0);assert.ok(world.touchMove.y>.8);
 send('move-pad','pointerup',22,63,25);assert.ok(world.touchMove.y>.8,'the other thumb cannot release movement');
 send('look-pad','pointercancel',22,740,280);assert.equal(touch.lookId,null);assert.ok(world.touchMove.y>.8);
 win.dispatchEvent(new Event('blur'));assert.deepEqual(world.touchMove,{x:0,y:0});assert.equal(touch.moveId,null);
 send('move-pad','pointerdown',33,100,63);world.blocked=true;send('move-pad','pointermove',33,110,63);assert.deepEqual(world.touchMove,{x:0,y:0});
 setGlobal('innerWidth',390);setGlobal('innerHeight',650);win.dispatchEvent(new Event('resize'));assert.equal(world.suspended,true);assert.equal(els['#rotate-device'].classList.contains('hidden'),false);
 setGlobal('innerWidth',844);setGlobal('innerHeight',390);win.dispatchEvent(new Event('resize'));assert.equal(world.suspended,false);assert.equal(els['#rotate-device'].classList.contains('hidden'),true);
});
