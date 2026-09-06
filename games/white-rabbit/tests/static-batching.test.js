import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {addValley} from '../src/overworld.js';
import {batchStaticMeshes,installStaticBatching,disposeStaticBatching} from '../src/static-batching.js';

const box=(parent,material,x,z=0)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,2,1),material);mesh.position.set(x,1,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh};
const close=(a,b)=>assert.ok(a.distanceTo(b)<.00001,`${a.toArray()} vs ${b.toArray()}`);

test('static batches preserve world geometry, shadows and opaque ray occlusion under transformed parents',()=>{
 const root=new THREE.Group();root.position.set(8,3,-5);root.rotation.y=.4;root.scale.set(1.2,.9,.8);
 const material=new THREE.MeshStandardMaterial({color:'#547342',roughness:.9});
 const meshes=[box(root,material,1),box(root,material,3),box(root,material,5)];
 root.updateMatrixWorld(true);const before=new THREE.Box3().setFromObject(root);
 const target=meshes[1].getWorldPosition(new THREE.Vector3());const direction=new THREE.Vector3(0,0,-1).transformDirection(root.matrixWorld);
 const origin=target.clone().addScaledVector(direction,-5);const ray=new THREE.Raycaster(origin,direction);
 const hitBefore=ray.intersectObject(root,true)[0];assert.ok(hitBefore);
 const result=batchStaticMeshes(root,meshes);root.updateMatrixWorld(true);
 assert.equal(result.reducedBy,2);assert.equal(root.children.length,1);
 const after=new THREE.Box3().setFromObject(root);close(before.min,after.min);close(before.max,after.max);
 const hitAfter=ray.intersectObject(root,true)[0];close(hitBefore.point,hitAfter.point);
 assert.equal(root.children[0].material,material);assert.equal(root.children[0].castShadow,true);assert.equal(root.children[0].receiveShadow,true);
 let disposed=0;root.children[0].geometry.addEventListener('dispose',()=>disposed++);
 result.dispose();result.dispose();assert.equal(disposed,1);assert.equal(root.children.length,3);meshes.forEach(mesh=>assert.equal(mesh.parent,root));
});

test('hotspot, animated, transparent and custom shader meshes retain their objects and material state',()=>{
 const root=new THREE.Group(),material=new THREE.MeshStandardMaterial();
 const hotspot=new THREE.Group();hotspot.userData.hotspot='door';root.add(hotspot);
 const clue=box(hotspot,material,1),animated=box(root,material,2);animated.userData.animatedAnimal='frog';
 const alpha=box(root,new THREE.MeshStandardMaterial({transparent:true,opacity:.5}),3);
 const shader=box(root,new THREE.MeshStandardMaterial(),4);shader.material.onBeforeCompile=()=>{};
 const differentState=box(root,material,6);differentState.castShadow=false;
 const plain=[box(root,material,8),box(root,material,10)];
 const result=batchStaticMeshes(root,[clue,animated,alpha,shader,differentState,...plain]);
 assert.equal(result.reducedBy,1);for(const mesh of [clue,animated,alpha,shader,differentState])assert.ok(mesh.parent,mesh.name+' stays in place');
 assert.equal(clue.parent,hotspot);assert.equal(alpha.material.opacity,.5);assert.equal(differentState.castShadow,false);result.dispose();
});

test('the actual valley loses at least 130 static draws while moving gates and butterflies remain attached',()=>{
 const scene=new THREE.Scene(),valley=addValley(scene),world={scene,valley,overworld:true};
 const original=[...valley.group.children],nested=original.filter(object=>object.isGroup);
 const animatedMeshes=[];for(const group of nested)group.traverse(object=>{if(object.isMesh)animatedMeshes.push(object)});
 const meshCount=()=>{let count=0;valley.group.traverse(object=>{if(object.isMesh)count++});return count};
 const before=meshCount();const result=installStaticBatching(world);const after=meshCount();
 assert.ok(before-after>=130,`${before} to ${after} draws`);assert.equal(before-after,result.reducedBy);
 for(const object of animatedMeshes)assert.ok(object.parent);
 valley.sync({solved:['signs','decree']});valley.update(2);
 assert.ok(nested.some(group=>group.position.y===-3));assert.ok(nested.some(group=>group.position.y===-4));
 disposeStaticBatching(world);assert.equal(meshCount(),before);for(const object of original)assert.equal(object.parent,valley.group);
});
