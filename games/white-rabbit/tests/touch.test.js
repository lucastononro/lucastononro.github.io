import test from 'node:test';
import assert from 'node:assert/strict';
import {TouchControls,usesTouchControls,joystickVector,smoothJoystick} from '../src/touch.js';

test('phone detection respects coarse touch input and a player override',()=>{
 assert.equal(usesTouchControls('auto',{points:5,coarse:true}),true);
 assert.equal(usesTouchControls('auto',{points:0,coarse:false}),false);
 assert.equal(usesTouchControls('auto',{points:5,coarse:false}),false);
 assert.equal(usesTouchControls('desktop',{points:5,coarse:true}),false);
 assert.equal(usesTouchControls('touch',{points:0,coarse:false}),true);
});
test('joystick starts smoothly at the rest zone and caps diagonal movement',()=>{
 assert.deepEqual(joystickVector(2,2),{x:0,y:0});
 assert.ok(joystickVector(0,-4.41).y<.001,'leaving the rest zone must not jump to walking speed');
 const half=joystickVector(0,-22);assert.ok(half.y>.3&&half.y<.5);
 const diagonal=joystickVector(200,-200);assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.y)-1)<1e-8);
 assert.ok(diagonal.x>0&&diagonal.y>0);
});
test('movement eases into a direction without overshooting or frame-rate dependence',()=>{
 const target={x:0,y:1};let slow={x:0,y:0},fast={x:0,y:0};
 for(let i=0;i<6;i++)slow=smoothJoystick(slow,target,1/30);
 for(let i=0;i<24;i++)fast=smoothJoystick(fast,target,1/120);
 assert.ok(Math.abs(slow.y-fast.y)<1e-10);
 assert.ok(slow.y>.98&&slow.y<1);
 const reversed=smoothJoystick(slow,{x:0,y:-1},1/60);
 assert.ok(reversed.y<slow.y&&reversed.y>-1);
});
test('two thumbs, run toggle, and cancellation work without stuck movement',t=>{
 class Element extends EventTarget {
  constructor(){super();this.style={};this.attributes={};const set=new Set();this.classList={add:n=>set.add(n),remove:n=>set.delete(n),toggle:(n,v)=>v?set.add(n):set.delete(n),contains:n=>set.has(n)};}
  setPointerCapture(){}setAttribute(k,v){this.attributes[k]=v}querySelector(){return this.label??={textContent:''}}
  getBoundingClientRect(){return {left:0,top:0,width:126,height:126}}
 }
 const ids=['move-pad','move-knob','look-pad','rotate-device','touch-action','touch-explore','touch-run','touch-fullscreen','rotate-fullscreen'];const els=Object.fromEntries(ids.map(id=>['#'+id,new Element()]));
 const saved=new Map();const setGlobal=(name,value)=>{if(!saved.has(name))saved.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{value,writable:true,configurable:true})};t.after(()=>{for(const [name,descriptor] of saved){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name]}});
 const doc=new EventTarget();doc.querySelector=id=>els[id];doc.body=new Element();doc.hidden=false;
 const win=new EventTarget();let time=0,frameId=0;const frames=new Map();
 for(const [name,value] of Object.entries({document:doc,window:win,innerWidth:844,innerHeight:390,matchMedia:()=>({matches:true,addEventListener(){}}),performance:{now:()=>time},requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId},cancelAnimationFrame:id=>frames.delete(id)}))setGlobal(name,value);
 setGlobal('navigator',{maxTouchPoints:5});
 const frame=()=>{time+=1000/60;const callbacks=[...frames.values()];frames.clear();for(const callback of callbacks)callback(time)};
 const settle=()=>{for(let i=0;i<12;i++)frame()};
 const state={settings:{controls:'auto'}},world={active:true,title:false,blocked:false,yaw:0,pitch:0,sensitivity:1};
 const touch=new TouchControls({getWorld:()=>world,getState:()=>state,onAction(){},onExplore(){},onMessage(){}});
 const send=(id,type,pointerId,x,y)=>{const e=new Event(type,{cancelable:true});Object.assign(e,{pointerId,clientX:x,clientY:y});els['#'+id].dispatchEvent(e)};
 send('move-pad','pointerdown',11,63,20);assert.deepEqual(world.touchMove,{x:0,y:0},'movement does not jump on the initial tap');settle();assert.ok(world.touchMove.y>.95);
 send('look-pad','pointerdown',22,700,300);send('look-pad','pointermove',22,740,280);assert.ok(world.yaw<0&&world.pitch>0);assert.ok(world.touchMove.y>.95);
 send('move-pad','pointerup',22,63,20);assert.ok(world.touchMove.y>.95,'the other thumb cannot release movement');
 els['#touch-run'].onclick();assert.equal(world.touchRun,true);assert.equal(els['#touch-run'].attributes['aria-pressed'],'true');
 send('look-pad','pointercancel',22,740,280);assert.equal(touch.lookId,null);assert.ok(world.touchMove.y>.95);
 win.dispatchEvent(new Event('blur'));assert.deepEqual(world.touchMove,{x:0,y:0});assert.equal(frames.size,0);assert.equal(touch.moveId,null);
 assert.equal(world.touchRun,true,'an interruption stops motion without changing the chosen pace');
 send('move-pad','pointerdown',33,110,63);settle();world.blocked=true;frame();assert.deepEqual(world.touchMove,{x:0,y:0});assert.equal(frames.size,0,'a modal stops a held thumb without waiting for another pointer event');
 world.blocked=false;send('move-pad','pointerdown',44,63,20);settle();send('move-pad','pointercancel',44,63,20);assert.deepEqual(world.touchMove,{x:0,y:0});assert.equal(frames.size,0);
 setGlobal('innerWidth',390);setGlobal('innerHeight',650);win.dispatchEvent(new Event('resize'));assert.equal(world.suspended,true);assert.equal(els['#rotate-device'].classList.contains('hidden'),false);
 setGlobal('innerWidth',844);setGlobal('innerHeight',390);win.dispatchEvent(new Event('resize'));assert.equal(world.suspended,false);assert.equal(els['#rotate-device'].classList.contains('hidden'),true);
 state.settings.controls='desktop';touch.update();assert.equal(world.touchRun,false);assert.deepEqual(world.touchMove,{x:0,y:0});
});
