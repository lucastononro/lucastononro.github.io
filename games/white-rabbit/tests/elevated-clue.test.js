import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {World} from '../src/world.js';

test('Explore reaches the tower cat eyes on foot while retaining their elevated viewing target',async()=>{
 const bytes=readFileSync(new URL('../public/models/tower.glb',import.meta.url));
 const tower=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
 tower.position.set(72,0,-75);tower.updateMatrixWorld(true);
 let eyes;tower.traverse(object=>{if(object.userData.hotspot==='cat_eyes')eyes=object});assert.ok(eyes);
 const box=new THREE.Box3().setFromObject(eyes),original=box.clone(),messages=[];
 const world=Object.create(World.prototype);
 Object.assign(world,{overworld:true,room:'tower',height:1.7,boxes:{cat_eyes:box},state:{solved:['signs','decree']},camera:new THREE.PerspectiveCamera(),callbacks:{onMessage:message=>messages.push(message)}});
 world.camera.position.set(72,1.7,-67);
 world.colliders=world.roomColliders('tower').map(([x,z,rx,rz])=>[x+72,z-75,rx,rz]);
 const done=()=>{};World.prototype.navigate.call(world,'cat_eyes',done);
 assert.ok(world.navigation?.path.length>1,'the actual navigation method finds a route');
 assert.equal(world.navigation.done,done);
 assert.ok(messages.at(-1).startsWith('Walking to'));
 for(const point of world.navigation.path){assert.ok(world.valid(point.x,point.z),'route is walkable');assert.equal(point.y,1.7,'walking never raises the player')}
 const end=world.navigation.path.at(-1),center=box.getCenter(new THREE.Vector3());
 assert.ok(box.distanceToPoint(end)>2.5,'the original 3D reach test would fail');
 assert.ok(Math.hypot(Math.max(box.min.x-end.x,0,end.x-box.max.x),Math.max(box.min.z-end.z,0,end.z-box.max.z))<2.5);
 assert.ok(end.z>center.z+.55,'approach is from in front of the clue');
 assert.ok(world.navigation.center.equals(center),'examination retains the elevated target');
 assert.ok(box.equals(original),'the hotspot bounds stay unchanged');
 // An equally high physical prop must still reject this route. The exception
 // belongs to the visual cat clue, not every object above the player.
 world.navigation=null;world.boxes.key=box;World.prototype.navigate.call(world,'key',done);
 assert.equal(world.navigation,null,'a high key does not get the visual-clue exception');
});
