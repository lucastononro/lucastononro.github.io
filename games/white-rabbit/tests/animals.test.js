import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {AnimalActor,installAnimals,updateAnimals,speakAnimal} from '../src/animals.js';

async function asset(name){
 const bytes=readFileSync(new URL(`../public/models/${name}.glb`,import.meta.url));
 return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
}

test('woodland characters export separate articulated idle, speech and curl clips within their physical size',async()=>{
 const animals=await asset('woodland-animals');
 assert.deepEqual(animals.animations.map(clip=>clip.name).sort(),['CaterpillarIdle','CaterpillarSpeak','FrogIdle','FrogSpeak','HedgehogCurl','HedgehogIdle']);
 animals.scene.traverse(object=>{if(object.isMesh){const positions=object.geometry.attributes.position;assert.ok(positions.count>0,object.name+' has vertices');assert.ok(Array.from(positions.array).every(Number.isFinite),object.name+' has finite geometry');assert.equal((object.geometry.index?.count||positions.count)%3,0,object.name+' contains complete triangles')}});
 for(const [id,maxSize] of [['messenger',[1.2,1.9,.9]],['caterpillar',[1.6,1.3,1.0]],['hedgehog',[.7,.65,.85]]]){
  const actor=new AnimalActor(animals,id);actor.update(.1,{});
  const size=new THREE.Box3().setFromObject(actor.model).getSize(new THREE.Vector3());
  assert.ok(size.toArray().every((dimension,i)=>dimension<maxSize[i]),`${id} bounds ${size.toArray()}`);
  assert.ok(Object.values(actor.actions).every(action=>action.getClip().tracks.length>=3),id+' exports articulated tracks');
 }
 const frog=new AnimalActor(animals,'messenger');const lid=frog.model.getObjectByName('FrogLidL');
 frog.update(.1,{});const open=lid.scale.y;frog.update(2.05,{});assert.ok(lid.scale.y>open*2,'the eyelid closes over the eye');
 const hedgehog=new AnimalActor(animals,'hedgehog');hedgehog.update(.3,{});const expanded=hedgehog.head.position.z;
 hedgehog.update(.3,{ballPath:{}});assert.ok(hedgehog.head.position.z<expanded-.08,'the head retracts for a shot');
 hedgehog.update(.3,{});assert.ok(hedgehog.head.position.z>expanded-.02,'the head extends after a shot');
});

test('installing animals retains the clock and letter clues in their original transformed clearings',async()=>{
 const [garden,animals]=await Promise.all([asset('garden'),asset('woodland-animals')]);
 const scene=new THREE.Scene(),root=new THREE.Group();scene.add(root);root.add(garden.scene);
 // Exercise attachment under a translated and rotated scene, not just at origin.
 root.position.set(7,0,-4);root.rotation.y=.3;
 const hotspots={};garden.scene.traverse(object=>{if(object.userData.hotspot)hotspots[object.userData.hotspot]=object});
 const invitation=hotspots.messenger.getObjectByName('invitation');
 const seal=hotspots.messenger.getObjectByName('wax_seal');
 const frogParts=[],caterpillarParts=[];
 hotspots.messenger.traverse(object=>{if(object.isMesh&&object.name.startsWith('frog_'))frogParts.push(object)});
 hotspots.caterpillar.traverse(object=>{if(object.isMesh&&object.name.startsWith('caterpillar'))caterpillarParts.push(object)});
 const clues=[];for(const hotspot of [hotspots.messenger,hotspots.caterpillar])hotspot.traverse(object=>{if(object.isMesh&&!frogParts.includes(object)&&!caterpillarParts.includes(object))clues.push(object)});
 scene.updateMatrixWorld(true);const position=invitation.getWorldPosition(new THREE.Vector3());
 const before=new Map(clues.map(object=>[object,object.getWorldPosition(new THREE.Vector3())]));
 const world={overworld:true,scene,root,hotspots,camera:new THREE.PerspectiveCamera()};
 await installAnimals(world,animals);scene.updateMatrixWorld(true);
 assert.equal(world.animalActors.length,2);
 assert.ok([...frogParts,...caterpillarParts].every(object=>!object.visible),'every old body part is hidden');
 for(const object of clues){assert.ok(object.visible,object.name+' stays visible');assert.ok(object.getWorldPosition(new THREE.Vector3()).distanceTo(before.get(object))<.0001,object.name+' retains its location');}
 assert.equal(invitation.parent.name,'FrogLetterGrip');assert.equal(seal.parent,invitation.parent);
 speakAnimal(world,'messenger',2);updateAnimals(world,.3);
 assert.equal(world.animalActors.find(actor=>actor.id==='messenger').current,'FrogSpeak');
 scene.updateMatrixWorld(true);assert.ok(invitation.getWorldPosition(new THREE.Vector3()).distanceTo(position)<.03,'breathing keeps the invitation between the hands');
});

test('the hedgehog curls inside the existing moving root without changing shot endpoints',async()=>{
 const animals=await asset('woodland-animals');
 const ball=new THREE.Group();ball.position.set(82,.3,-24.7);
 const old=new THREE.Mesh(new THREE.SphereGeometry(.3));old.name='hedgehog';ball.add(old);
 const world={overworld:true,ball,hotspots:{}};await installAnimals(world,animals);
 const start=ball.position.clone();world.ballPath={};updateAnimals(world,.3);
 assert.equal(world.animalActors[0].current,'HedgehogCurl');assert.deepEqual(ball.position.toArray(),start.toArray());
 assert.equal(old.visible,false);world.ballPath=null;ball.rotation.z=-4;
 for(let i=0;i<60;i++)updateAnimals(world,1/60);
 assert.ok(Math.abs(ball.rotation.z)<.01,'the hedgehog settles upright after the shot');
 assert.deepEqual(ball.position.toArray(),start.toArray());
});
