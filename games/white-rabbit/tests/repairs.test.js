import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {World} from '../src/world.js';
import {SIZE_MARKS,canResize,canPassLittleDoor,LITTLE_DOOR} from '../src/mechanics.js';
import {initialState} from '../src/puzzles.js';

async function hall(){const b=readFileSync(new URL('../public/models/hall.glb',import.meta.url));return (await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;}

test('the cake only grows and the bottle only shrinks, including recovery from either limit',()=>{
 for(const from of SIZE_MARKS)for(const to of SIZE_MARKS){
  assert.equal(canResize('biscuit',from,to),to>from);
  assert.equal(canResize('bottle',from,to),to<from);
 }
 assert.ok(canResize('biscuit',11,55));assert.ok(canResize('bottle',55,11));
 for(const bad of [-1,0,12,99,NaN])assert.equal(canResize('bottle',55,bad),false);
});

test('the five exported door frames are separate and door six matches its physical clearance',async()=>{
 const scene=await hall(),doors=[];scene.traverse(o=>{if(o.userData.hotspot==='small_door'||o.userData.hotspot?.startsWith('door_'))doors.push(o)});
 assert.equal(doors.length,5);scene.updateMatrixWorld(true);
 const boxes=doors.map(o=>new THREE.Box3().setFromObject(o));
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)assert.equal(boxes[i].intersectsBox(boxes[j]),false,`${doors[i].name} overlaps ${doors[j].name}`);
 const door=doors.find(o=>o.userData.hotspot==='small_door');assert.equal(door.userData.passageHeight,LITTLE_DOOR.height);assert.equal(door.userData.passageWidth,LITTLE_DOOR.width);
 const leaf=door.children.find(o=>o.userData.doorLeaf);assert.ok(leaf);assert.ok(leaf.children.some(o=>o.name.startsWith('triangular_keyway')));
 const box=new THREE.Box3().setFromObject(door);assert.ok(box.min.y<.05);assert.ok(box.max.y<1.05);
 assert.deepEqual(SIZE_MARKS.filter(canPassLittleDoor),[11]);
 leaf.rotation.y=-Math.PI*.46;scene.updateMatrixWorld(true);
 assert.ok(leaf.children.find(o=>o.name.startsWith('door_knob')).getWorldPosition(new THREE.Vector3()).z>LITTLE_DOOR.z+.3,'the knob follows the swinging leaf');
});

test('walking through the actual doorway requires both the key and a fitting body',()=>{
 const world=Object.create(World.prototype);world.room='hall';world.overworld=false;world.colliders=[];world.state=initialState();
 world.state.size=11;assert.equal(world.valid(LITTLE_DOOR.x,-12.4),false);
 world.state.solved.push('door_unlock');assert.equal(world.valid(LITTLE_DOOR.x,-12.4),true);
 for(const size of [22,33,44,55]){world.state.size=size;assert.equal(world.valid(LITTLE_DOOR.x,-12.4),false)}
 world.state.size=11;assert.equal(world.valid(LITTLE_DOOR.x+1,-12.4),false);assert.equal(world.valid(LITTLE_DOOR.x,-14.5),false);
});

test('the locked door hides its wall opening from high and oblique views, then opens a real passage',async()=>{
 const scene=await hall();scene.updateMatrixWorld(true);const ray=new THREE.Raycaster();
 // Probe the rectangular wall cutout, including its corners above the arch.
 // These lines exposed the passage in the player's two close-up screenshots.
 for(const dx of [-2,-1,0,1,2])for(const y of [.57,1.7,2.83])for(const z of [-10.65,-9.5]){
  const eye=new THREE.Vector3(LITTLE_DOOR.x+dx,y,z);
  for(const tx of [-.39,-.2,0,.2,.39])for(const ty of [.05,.35,.6,.8,.855]){
   const target=new THREE.Vector3(LITTLE_DOOR.x+tx,ty,-11.83);
   ray.set(eye,target.clone().sub(eye).normalize());ray.far=eye.distanceTo(target)+.002;
   assert.ok(ray.intersectObject(scene,true).length,`uncovered wall opening from ${eye.toArray()} to ${target.toArray()}`);
  }
 }
 let leaf;scene.traverse(o=>{if(o.userData.doorLeaf==='small_door')leaf=o});
 leaf.rotation.y=-Math.PI*.46;scene.updateMatrixWorld(true);
 ray.set(new THREE.Vector3(LITTLE_DOOR.x,.4,-10.65),new THREE.Vector3(0,0,-1));ray.far=2;
 assert.equal(ray.intersectObject(scene,true).length,0,'the repair must not plug the unlocked passage');
});

test('hidden collected objects do not intercept clicks on visible objects behind them',()=>{
 const world=Object.create(World.prototype);world.root=new THREE.Group();world.camera=new THREE.PerspectiveCamera(62,1,.01,20);world.ray=new THREE.Raycaster();
 const hidden=new THREE.Group();hidden.userData.hotspot='key';hidden.visible=false;const a=new THREE.Mesh(new THREE.BoxGeometry(1,1,.1));a.position.z=-1;hidden.add(a);world.root.add(hidden);
 const visible=new THREE.Group();visible.userData.hotspot='letter';const b=new THREE.Mesh(new THREE.BoxGeometry(1,1,.1));b.position.z=-2;visible.add(b);world.root.add(visible);world.root.updateMatrixWorld(true);world.camera.updateMatrixWorld(true);
 assert.equal(world.targetAt()?.id,'letter');
 const wall=new THREE.Mesh(new THREE.BoxGeometry(1,1,.1));wall.position.z=-1.5;world.root.add(wall);world.root.updateMatrixWorld(true);assert.equal(world.targetAt(),null,'opaque walls still block clicks');
});
