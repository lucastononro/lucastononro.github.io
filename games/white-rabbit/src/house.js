import * as THREE from 'three';
import {HOUSE_ORDER,HOUSE_SLOTS} from './mechanics.js';

export const HOUSE_CENTER=new THREE.Vector3(0,2.45,-2);
export function houseProjector(side){
 const camera=new THREE.PerspectiveCamera(39,.65,.1,30);
 camera.position.set(side==='amber'?-6:6,1.7,-2);camera.lookAt(HOUSE_CENTER);camera.updateMatrixWorld();return camera;
}
// UVs are baked in the correctly assembled pose, then stay on each physical
// surface when the player moves a piece. Normal depth testing remains enabled.
export function projectHouseUV(geometry,matrix,side){
 const camera=houseProjector(side),p=geometry.attributes.position,uv=new Float32Array(p.count*2),v=new THREE.Vector3();
 for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(matrix).project(camera);uv[i*2]=v.x*.5+.5;uv[i*2+1]=v.y*.5+.5;}
 geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));return geometry;
}
export function installHouse(world){
 const structure=world.hotspots.structure;if(!structure)return;
 world.housePieces=structure.children.filter(o=>o.userData.pieceIndex!==undefined);
 const textures={};
 for(const [side,digits,color] of [['amber','78','#ffb331'],['ivory','32','#fff3d2']]){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=1024;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#245548';ctx.fillRect(0,0,512,1024);ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 480px Georgia';
  ctx.fillText(digits[0],256,273,400);ctx.fillText(digits[1],256,750,400);
  textures[side]=new THREE.CanvasTexture(canvas);textures[side].colorSpace=THREE.SRGBColorSpace;
 }
 structure.updateWorldMatrix(true,true);
 const local=new THREE.Matrix4().makeTranslation(-72,0,75);
 for(const piece of world.housePieces)piece.traverse(mesh=>{
  const side=mesh.userData.houseSurface;if(!side)return;
  mesh.geometry=projectHouseUV(mesh.geometry.clone(),local.clone().multiply(mesh.matrixWorld),side);
  mesh.material=new THREE.MeshStandardMaterial({map:textures[side],side:THREE.FrontSide,roughness:.82,metalness:.05});
 });
 // The underside is unpainted, so the other reading cannot show through a fold.
 const wings=[];structure.traverse(mesh=>{if(mesh.userData.houseSurface)wings.push(mesh)});
 for(const mesh of wings){const back=new THREE.Mesh(mesh.geometry,new THREE.MeshStandardMaterial({color:'#245548',side:THREE.BackSide,roughness:.82}));mesh.add(back)}
 world.houseSlots=new THREE.Group();world.houseSlots.position.set(72,0,-75);world.scene.add(world.houseSlots);
 HOUSE_SLOTS.forEach((p,i)=>{
  const socket=new THREE.Mesh(new THREE.SphereGeometry(.12,12,8),new THREE.MeshBasicMaterial({color:'#e4c07b',transparent:true,opacity:.75}));
  socket.position.fromArray(p);socket.position.z+=1.65;socket.userData.houseSlot=i;world.houseSlots.add(socket);
 });
 world.houseSlots.visible=false;
 world.houseBench=new THREE.Group();world.houseBench.position.set(72,0,-75);world.scene.add(world.houseBench);
 const wood=new THREE.MeshStandardMaterial({color:'#543823',roughness:.8});
 const top=new THREE.Mesh(new THREE.BoxGeometry(9,.12,3.5),wood);top.position.set(0,.43,.55);world.houseBench.add(top);
 for(const x of [-4,4])for(const z of [-.8,1.9]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.12,.4,.12),wood);leg.position.set(x,.2,z);world.houseBench.add(leg)}
 world.houseBench.visible=false;
}
export function arrangeHouse(world,order,faces={}){
 const structure=world.hotspots.structure;if(!structure)return;
 const editing=world.focusMode==='assembly';structure.visible=editing||order.some(Boolean);
 for(const piece of world.housePieces||[]){
  const i=piece.userData.pieceIndex,label=HOUSE_ORDER[i],slot=order.indexOf(label);
  piece.visible=editing||slot>=0;piece.scale.setScalar(slot>=0?1:.36);
  piece.position.fromArray(slot>=0?HOUSE_SLOTS[slot]:[-3.6+(i%5)*1.8,.75,-.1+Math.floor(i/5)*1.55]);
  piece.rotation.x=faces[label]?Math.PI:0;
  piece.traverse(mesh=>{if(mesh.material?.emissive){mesh.material.emissive.set(label===world.selectedHousePiece?'#35552b':'#000000');}});
 }
 if(world.houseSlots)world.houseSlots.visible=editing;
 if(world.houseBench)world.houseBench.visible=editing;
}
export function houseHit(world,event){
 const r=world.canvas.getBoundingClientRect();world.ray.setFromCamera(new THREE.Vector2((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1),world.camera);
 const hits=world.ray.intersectObjects([world.hotspots.structure,world.houseSlots],true);
 for(const hit of hits){let o=hit.object;while(o){if(o.userData.houseSlot!==undefined)return {slot:o.userData.houseSlot};if(o.userData.pieceIndex!==undefined)return {piece:HOUSE_ORDER[o.userData.pieceIndex]};o=o.parent;}}
 return null;
}
