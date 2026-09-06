import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const DEFINITIONS = {
 messenger: {root:'FrogRig', idle:'FrogIdle', speak:'FrogSpeak'},
 caterpillar: {root:'CaterpillarRig', idle:'CaterpillarIdle', speak:'CaterpillarSpeak'},
 hedgehog: {root:'HedgehogRig', idle:'HedgehogIdle', curl:'HedgehogCurl'},
};

export class AnimalActor {
 constructor(asset,id){
  const definition=DEFINITIONS[id];
  this.id=id;this.definition=definition;
  this.model=asset.scene.getObjectByName(definition.root).clone(true);
  this.model.userData.animatedAnimal=id;
  this.model.traverse(object=>{
   if(!object.isMesh)return;
   object.castShadow=true;object.receiveShadow=true;
   object.material=object.material.clone();object.material.envMapIntensity=.18;
  });
  this.mixer=new THREE.AnimationMixer(this.model);
  const nodes=new Set();this.model.traverse(object=>nodes.add(object.name));
  this.actions=Object.fromEntries(asset.animations.filter(clip=>clip.name.startsWith(id==='messenger'?'Frog':id==='caterpillar'?'Caterpillar':'Hedgehog')).map(clip=>[clip.name,this.mixer.clipAction(new THREE.AnimationClip(clip.name,clip.duration,clip.tracks.filter(track=>nodes.has(track.name.split('.')[0]))))]));
  this.speaking=0;this.lookYaw=0;this.playerLocal=new THREE.Vector3();
  this.head=this.model.getObjectByName(id==='messenger'?'FrogHead':id==='caterpillar'?'CaterpillarHead':'HedgehogHead');
  this.play(definition.idle);
 }
 play(name){
  if(this.current===name||!this.actions[name])return;
  this.actions[this.current]?.fadeOut(.2);
  this.actions[name].reset().fadeIn(.2).play();this.current=name;
 }
 speak(seconds=9){this.speaking=Math.max(this.speaking,seconds)}
 update(dt,world){
  this.speaking=Math.max(0,this.speaking-dt);
  this.play(this.definition.curl&&world.ballPath?this.definition.curl:this.speaking>0?this.definition.speak:this.definition.idle);
  this.mixer.update(dt);
  if(this.id==='messenger'&&world.camera){
   this.model.updateWorldMatrix(true,false);
   this.playerLocal.copy(world.camera.position);this.model.worldToLocal(this.playerLocal);
   const desired=this.playerLocal.length()<7&&this.playerLocal.z>0?THREE.MathUtils.clamp(Math.atan2(this.playerLocal.x,this.playerLocal.z),-.3,.3):0;
   this.lookYaw=THREE.MathUtils.damp(this.lookYaw,desired,3,dt);this.head.rotation.y+=this.lookYaw;
  }
 }
 dispose(){this.mixer.stopAllAction();this.mixer.uncacheRoot(this.model)}
}

const originalFrog=object=>object.isMesh&&/^frog[ _](body|head|eye|pupil)([._]?\d+)?$/.test(object.name);
const originalCaterpillar=object=>object.isMesh&&/^caterpillar(?:[ _]eye)?(?:[._]?\d+)?$/.test(object.name);
const originalHedgehog=object=>object.isMesh&&/^hedgehog(?:[ _]spine)?(?:[._]?\d+)?$/.test(object.name);

function matching(root,predicate){const parts=[];root?.traverse(object=>{if(predicate(object))parts.push(object)});return parts}

/** Install after createCroquetBall(), with the original hotspot roots intact. */
export async function installAnimals(world,providedAsset){
 world.animalActors?.forEach(actor=>actor.dispose());world.animalActors=[];
 if(!world.overworld)return;
 const asset=providedAsset||(world.animalAsset??=await new GLTFLoader().loadAsync(`${(import.meta.env?.BASE_URL||'./')}models/woodland-animals.glb`));
 for(const id of ['messenger','caterpillar']){
  const hotspot=world.hotspots[id];if(!hotspot)continue;
  const parts=matching(hotspot,id==='messenger'?originalFrog:originalCaterpillar);
  const anchor=id==='messenger'?parts.find(object=>/^frog[ _]body$/.test(object.name)):parts.filter(object=>!object.name.includes('eye')).sort((a,b)=>a.position.y-b.position.y)[0];
  if(!anchor)continue;
  const actor=new AnimalActor(asset,id);
  // The old geometry is in the hotspot's local space, including its clearing offset.
  actor.model.position.copy(anchor.position).add(id==='messenger'?new THREE.Vector3(0,-.65,0):new THREE.Vector3(-.85,.27,.38));
  hotspot.add(actor.model);parts.forEach(object=>{object.visible=false});
  if(id==='messenger'){
   const props=matching(hotspot,object=>object.isMesh&&/^(invitation|wax[ _]seal)([._]\d+)?$/.test(object.name));
   const grip=actor.model.getObjectByName('FrogLetterGrip');
   hotspot.updateWorldMatrix(true,true);props.forEach(object=>grip.attach(object));
  }
  world.animalActors.push(actor);
 }
 if(world.ball){
  const parts=matching(world.ball,originalHedgehog);
  if(parts.length){
   const actor=new AnimalActor(asset,'hedgehog');world.ball.add(actor.model);
   parts.forEach(object=>{object.visible=false});world.animalActors.push(actor);
  }
 }
 world.root?.updateMatrixWorld(true);
 return world.animalActors;
}

/** Call when dialogue starts; it does not require browser speech synthesis. */
export function speakAnimal(world,id,seconds=9){world.animalActors?.find(actor=>actor.id===id)?.speak(seconds)}

export function updateAnimals(world,dt){
 for(const actor of world.animalActors||[])actor.update(dt,world);
 // Rolling rotates the existing ball root. Settle upright after the shot so its
 // face and feet make sense again, without changing any shot endpoints.
 if(world.ball&&!world.ballPath&&world.animalActors?.some(actor=>actor.id==='hedgehog')){
  world.ball.rotation.x=THREE.MathUtils.damp(world.ball.rotation.x,0,6,dt);
  world.ball.rotation.y=THREE.MathUtils.damp(world.ball.rotation.y,0,6,dt);
  world.ball.rotation.z=THREE.MathUtils.damp(THREE.MathUtils.euclideanModulo(world.ball.rotation.z+Math.PI,Math.PI*2)-Math.PI,0,6,dt);
 }
}
