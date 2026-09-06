import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {installResidents, updateResidents} from '../src/residents.js';

async function parse(name) {
  const b = readFileSync(new URL(`../public/models/${name}.glb`, import.meta.url));
  return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
}

test('resident clips stay attached to their articulated body and repeat without a jump', async () => {
  const asset = await parse('wonderland-residents');
  assert.deepEqual(asset.animations.map(clip => clip.name).sort(), ['CookStir', 'HatterTea', 'QueenCommand']);
  for (const [role, clipName] of [['Cook','CookStir'], ['Hatter','HatterTea'], ['Queen','QueenCommand']]) {
    const model = asset.scene.getObjectByName(`${role}Resident`).clone(true);
    const clip = asset.animations.find(clip => clip.name === clipName);
    const mixer = new THREE.AnimationMixer(model);
    mixer.clipAction(clip).setLoop(THREE.LoopOnce,1).play();
    const joints = ['Head','Blink','ShoulderL','ElbowL','HandL','ShoulderR','ElbowR','HandR'].map(part=>model.getObjectByName(`${role}_${part}`));
    assert.ok(joints.every(Boolean));
    assert.equal(model.getObjectByName(`${role}_HandL`).parent.name,`${role}_ElbowL`);
    assert.equal(model.getObjectByName(`${role}_Blink`).parent.name,`${role}_Head`);
    const start = joints.map(joint=>joint.quaternion.clone());
    mixer.setTime(2.5);
    assert.ok(joints.some((joint,i)=>joint.quaternion.angleTo(start[i])>.04), `${role} moves its joints`);
    model.updateMatrixWorld(true);
    const hand=model.getObjectByName(`${role}_HandL`).getWorldPosition(new THREE.Vector3());
    assert.ok(hand.length()<2.5,`${role}'s hand remains near its body`);
    mixer.setTime(clip.duration-.001);
    for (const [i,joint] of joints.entries())assert.ok(joint.quaternion.angleTo(start[i])<.012,`${role} ${joint.name} repeats smoothly`);
  }
  const cook = asset.scene.getObjectByName('CookResident');
  const stir = new THREE.AnimationMixer(cook);
  stir.clipAction(asset.animations.find(clip=>clip.name==='CookStir')).play();
  for(let i=0;i<60;i++){
    stir.setTime(i/10);cook.updateMatrixWorld(true);
    const tip=cook.getObjectByName('Cook_SpoonTip').getWorldPosition(new THREE.Vector3());
    assert.ok(Math.hypot(tip.x+.65,tip.z-1.05)<.59,'the spoon stays inside the original cauldron rim');
    assert.ok(tip.y>1.15&&tip.y<1.77,'the spoon stirs below the rim and above the cauldron base');
  }
  assert.equal(asset.scene.getObjectByName('Hatter_Cup').parent.name,'Hatter_HandL');
  assert.equal(asset.scene.getObjectByName('Queen_Scepter').parent.name,'Queen_HandL');
});

test('installing resident bodies preserves original puzzle props and hotspot coordinates', async () => {
  const garden=(await parse('garden')).scene;
  const court=(await parse('court')).scene;
  const root=new THREE.Group();root.add(garden,court);
  const hotspots={};root.traverse(o=>{if(o.userData.hotspot)hotspots[o.userData.hotspot]=o;});
  const retained = Object.fromEntries(['kitchen','tea','trial','gardeners','guard_original','guard_impostor'].map(id=>[id,hotspots[id].children.map(o=>({object:o,position:o.position.clone(),quaternion:o.quaternion.clone(),visible:o.visible}))]));
  const world={root,hotspots,boxes:{},overworld:true,residentAsset:await parse('wonderland-residents'),camera:new THREE.PerspectiveCamera(),actorParts:[]};
  await installResidents(world);
  assert.equal(world.residentActors.length,3);
  for(const [id,children] of Object.entries(retained))for(const {object,position,quaternion,visible} of children){
    assert.equal(object.parent,hotspots[id]);
    assert.ok(object.position.equals(position));assert.ok(object.quaternion.equals(quaternion));
    if(!object.name.startsWith('actor_'))assert.equal(object.visible,visible);
  }
  for(const actor of world.residentActors){
    const original=actor.model.parent.getObjectByName(`actor_${actor.role}`);
    assert.equal(original.visible,false);
    assert.ok(actor.model.position.equals(original.position));
  }
  updateResidents(world,.1);
  assert.ok(world.residentActors.every(actor=>actor.mixer.time>0));
});

test('the cook keeps her face and stirring hand above the pot and visible from its examination camera', async () => {
  const root=(await parse('garden')).scene,hotspots={};
  root.traverse(object=>{if(object.userData.hotspot)hotspots[object.userData.hotspot]=object;});
  const world={root,hotspots,boxes:{},overworld:true,residentAsset:await parse('wonderland-residents'),camera:new THREE.PerspectiveCamera(),actorParts:[]};
  await installResidents(world);
  const cook=world.residentActors.find(actor=>actor.role==='cook');
  const center=world.boxes.kitchen.getCenter(new THREE.Vector3());
  const size=world.boxes.kitchen.getSize(new THREE.Vector3());
  const camera=center.clone().add(new THREE.Vector3(.8,Math.max(.2,size.y*.15),Math.max(2.8,size.y*1.2)));
  const props=[];
  for(const child of hotspots.kitchen.children){
    if(child===cook.model||!child.visible)continue;
    child.traverse(object=>{if(object.isMesh)props.push(object);});
  }
  const head=cook.model.getObjectByName('Cook_Head');
  const hand=cook.model.getObjectByName('Cook_HandL');
  const grip=new THREE.Vector3(),armMeshes=[];
  cook.model.getObjectByName('Cook_ShoulderL').traverse(object=>{if(object.isMesh)armMeshes.push(object);});
  for(let i=0;i<120;i++){
    cook.mixer.setTime(i/20);root.updateMatrixWorld(true);
    hand.getWorldPosition(grip);
    assert.ok(grip.y>1.83,`stirring hand remains above the rim at ${i/20}s: ${grip.y}`);
    const points={leftEye:head.localToWorld(new THREE.Vector3(-.09,.058,.225)),rightEye:head.localToWorld(new THREE.Vector3(.09,.058,.225)),mouth:head.localToWorld(new THREE.Vector3(0,-.14,.215)),grip};
    for(const [name,point] of Object.entries(points)){
      const ray=new THREE.Raycaster(camera,point.clone().sub(camera).normalize(),0,camera.distanceTo(point)-.035);
      const blocked=ray.intersectObjects(name==='grip'?props:[...props,...armMeshes],true);
      assert.equal(blocked.length,0,`${name} is blocked by ${blocked[0]?.object.name} at ${i/20}s`);
    }
  }
});
