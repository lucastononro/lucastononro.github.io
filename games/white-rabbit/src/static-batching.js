import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const defaultBeforeRender=THREE.Object3D.prototype.onBeforeRender;
const defaultCompile=THREE.Material.prototype.onBeforeCompile;

function isStaticCandidate(mesh,root){
 if(!mesh.isMesh||mesh.isInstancedMesh||mesh.isSkinnedMesh||mesh.children.length||!mesh.visible)return false;
 if(Array.isArray(mesh.material)||mesh.material.transparent||mesh.material.opacity!==1||mesh.material.onBeforeCompile!==defaultCompile)return false;
 if(mesh.onBeforeRender!==defaultBeforeRender||mesh.geometry.morphAttributes&&Object.keys(mesh.geometry.morphAttributes).length)return false;
 if(mesh.geometry.drawRange.start!==0||Number.isFinite(mesh.geometry.drawRange.count))return false;
 if(mesh.geometry.attributes.position?.itemSize!==3||Object.values(mesh.geometry.attributes).some(attribute=>attribute.isInterleavedBufferAttribute))return false;
 for(let object=mesh;object;object=object.parent){
  const data=object.userData;
  if(!object.visible||object.animations?.length||data.hotspot||data.actor||data.motion||data.animatedActor||data.animatedAnimal||data.doorLeaf||data.effect||data.clue)return false;
  if(object===root)return true;
 }
 return false;
}

function signature(mesh){
 const attributes=Object.entries(mesh.geometry.attributes).sort(([a],[b])=>a.localeCompare(b)).map(([name,attribute])=>[name,attribute.itemSize,attribute.normalized,attribute.array.constructor.name]);
 return JSON.stringify([mesh.material.uuid,attributes,!!mesh.geometry.index,mesh.castShadow,mesh.receiveShadow,mesh.renderOrder,mesh.layers.mask,mesh.frustumCulled,mesh.customDepthMaterial?.uuid,mesh.customDistanceMaterial?.uuid]);
}

/** Batch an explicit list of static meshes. Callers decide which objects move. */
export function batchStaticMeshes(root,candidates,{cellSize=24}={}){
 root.updateWorldMatrix(true,true);
 const inverse=root.matrixWorld.clone().invert(),groups=new Map(),owned=[],replaced=[];
 for(const mesh of candidates){
  if(!isStaticCandidate(mesh,root))continue;
  const matrix=new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld);
  // Mirrored meshes need reversed triangle winding. Leave those unchanged.
  if(matrix.determinant()<=0)continue;
  const geometry=mesh.geometry;geometry.computeBoundingBox();
  const center=geometry.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(matrix);
  // Spatial chunks retain useful frustum culling along the long outdoor route.
  const key=signature(mesh)+':'+Math.floor((center.x+1e-7)/cellSize)+','+Math.floor((center.z+1e-7)/cellSize);
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push({mesh,matrix});
 }
 let reducedBy=0;
 for(const entries of groups.values()){
  if(entries.length<2)continue;
  const pieces=entries.map(({mesh,matrix})=>mesh.geometry.clone().applyMatrix4(matrix));
  const geometry=mergeGeometries(pieces,false);pieces.forEach(piece=>piece.dispose());
  if(!geometry)continue;
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const source=entries[0].mesh,batch=new THREE.Mesh(geometry,source.material);
  batch.name='Static valley decoration';batch.userData.staticBatch=true;
  for(const flag of ['castShadow','receiveShadow','renderOrder','frustumCulled','customDepthMaterial','customDistanceMaterial'])batch[flag]=source[flag];
  batch.layers.mask=source.layers.mask;root.add(batch);owned.push(batch);
  for(const {mesh} of entries){replaced.push({mesh,parent:mesh.parent});mesh.removeFromParent()}
  reducedBy+=entries.length-1;
 }
 let disposed=false;
 return {
  inputMeshes:candidates.length,batches:owned.length,replacedMeshes:replaced.length,reducedBy,
  dispose(){
   if(disposed)return;disposed=true;
   for(const mesh of owned){mesh.removeFromParent();mesh.geometry.dispose()}
   for(const {mesh,parent} of replaced)parent.add(mesh);
  },
 };
}

/** The valley's direct meshes are static terrain, bridge planks and rocks.
 * Moving gates and butterflies are nested groups. Water and grass are excluded
 * by their shader/instancing state. GLB architecture is already merged in Blender.
 */
export function installStaticBatching(world){
 disposeStaticBatching(world);
 const root=world.valley?.group;if(!world.overworld||!root)return null;
 world.staticBatching=batchStaticMeshes(root,[...root.children]);
 return world.staticBatching;
}

export function disposeStaticBatching(world){world.staticBatching?.dispose();world.staticBatching=null}
