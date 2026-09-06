import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {HOUSE_ORDER,placeHousePiece,validateHouse} from '../src/mechanics.js';
import {houseProjector,projectHouseUV,arrangeHouse} from '../src/house.js';
async function house(){const b=readFileSync(new URL('../public/models/tower.glb',import.meta.url));const gltf=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');let root;gltf.scene.traverse(o=>{if(o.userData.hotspot==='structure')root=o});root.updateWorldMatrix(true,true);return root;}
test('spatial construction can begin at the roof, swap occupied slots, and recover without losing pieces',()=>{
 let slots=[];for(const i of [8,7,4,1,0,6,2,5,3])slots=placeHousePiece(slots,HOUSE_ORDER[i],i);
 const faces={'Black bridge':true,'Red bridge':true};assert.ok(validateHouse(slots,faces).ok);
 slots=placeHousePiece(slots,'♠ 6',1);assert.equal(slots[0],'♠ 4');assert.equal(slots[1],'♠ 6');assert.equal(new Set(slots).size,9);assert.equal(validateHouse(slots,faces).ok,false);
 slots=placeHousePiece(slots,'♠ 6',0);assert.ok(validateHouse(slots,faces).ok);assert.equal(validateHouse(slots,{}).ok,false);slots[7]=null;assert.equal(validateHouse(slots,faces).ok,false);
});
test('numbers lie on the exported folded surfaces and separate when a physical piece moves',async()=>{
 const root=await house(),surfaces=[];root.traverse(o=>{if(o.userData.houseSurface)surfaces.push(o)});assert.equal(surfaces.length,14);
 let movedError=0;
 for(const mesh of surfaces){
  assert.ok(mesh.geometry.attributes.position.count>500,'surface subdivision supports perspective');
  const camera=houseProjector(mesh.userData.houseSurface),geometry=projectHouseUV(mesh.geometry.clone(),mesh.matrixWorld,mesh.userData.houseSurface),pos=geometry.attributes.position,uv=geometry.attributes.uv;
  for(let i=0;i<pos.count;i+=30){const v=new THREE.Vector3().fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld),projected=v.clone().project(camera);assert.ok(Math.abs(uv.getX(i)-(projected.x*.5+.5))<1e-5);assert.ok(Math.abs(uv.getY(i)-(projected.y*.5+.5))<1e-5);v.z+=.7;v.project(camera);movedError=Math.max(movedError,Math.abs(uv.getX(i)-(v.x*.5+.5)));}
 }
 assert.ok(movedError>.1,'moving a piece breaks the projected image');
});
test('the same painted pieces travel between the bench and construction slots',async()=>{
 const structure=await house(),pieces=structure.children.filter(o=>o.userData.pieceIndex!==undefined),world={hotspots:{structure},housePieces:pieces,focusMode:'assembly'};
 const first=pieces.find(p=>p.userData.pieceIndex===0);const surfaces=[];first.traverse(o=>{if(o.userData.houseSurface)surfaces.push(o)});arrangeHouse(world,[],{});const bench=first.position.clone();assert.equal(first.visible,true);
 arrangeHouse(world,placeHousePiece([],'♠ 6',0),{});assert.ok(first.position.distanceTo(bench)>1);assert.ok(surfaces.every(o=>o.parent===first));world.focusMode=null;arrangeHouse(world,[],{});assert.equal(structure.visible,false);
});
