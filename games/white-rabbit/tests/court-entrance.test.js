import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {addValley,insideValley,REGION_OFFSETS} from '../src/overworld.js';
import {World} from '../src/world.js';
import {installStaticBatching} from '../src/static-batching.js';

test('the court entrance has a visible six-metre opening and a walkable path to the maze',async()=>{
 const bytes=readFileSync(new URL('../public/models/court.glb',import.meta.url));
 const court=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
 court.position.set(72,0,-22);const scene=new THREE.Scene();scene.add(court);const valley=addValley(scene);
 const world=Object.create(World.prototype);Object.assign(world,{scene,valley,overworld:true,room:'court',state:{solved:['signs','decree']}});
 world.colliders=world.roomColliders('court').map(([x,z,rx,rz])=>[x+REGION_OFFSETS.court[0],z+REGION_OFFSETS.court[1],rx,rz]);
 const clear=()=>{scene.updateMatrixWorld(true);for(const z of [-24.9,-24,-22,-20,-19.1])for(const y of [.4,1.7,2.3]){
  const ray=new THREE.Raycaster(new THREE.Vector3(54,y,z),new THREE.Vector3(1,0,0),0,6);
  assert.equal(ray.intersectObject(scene,true).length,0,`geometry blocks entrance at height ${y}, z ${z}`);
  for(let x=54;x<=59.4;x+=.15)assert.ok(world.valid(x,z),`movement blocks entrance at ${x},${z}`);
 }};
 clear();installStaticBatching(world);clear();
 for(let z=-22;z<=-15.4;z+=.1)assert.ok(world.valid(59.4,z),`west corridor ${z}`);
 for(let x=59.4;x<=72;x+=.1)assert.ok(world.valid(x,-15.4),`maze approach ${x}`);
 for(const point of valley.entrancePath.getPoints(600).filter(point=>point.x>=54))assert.ok(world.valid(point.x,point.z),`the visible path crosses a collider at ${point.x},${point.z}`);
 const wallRay=new THREE.Raycaster(new THREE.Vector3(54,1.7,-30),new THREE.Vector3(1,0,0),0,6);
 scene.updateMatrixWorld(true);assert.ok(wallRay.intersectObject(scene,true).length,'the remaining northern wall is visible');
 assert.equal(insideValley(58,-30,world.state),false,'the remaining wall is solid');
});
