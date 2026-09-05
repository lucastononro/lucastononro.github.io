import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
export class RabbitActor {
 constructor(asset,indoors=false){
  this.model=clone(asset.scene);this.model.name='Animated_White_Rabbit';this.model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.material=o.material.clone();o.material.envMapIntensity=.12;o.material.color.convertSRGBToLinear()}});
  this.mixer=new THREE.AnimationMixer(this.model);this.actions=Object.fromEntries(asset.animations.map(clip=>[clip.name,this.mixer.clipAction(clip)]));this.indoors=indoors;this.model.position.set(1.8,0,indoors?3:21);this.play('Idle');this.time=0;this.pause=3;this.stage='';this.path=[];
 }
 play(name){if(this.current===name||!this.actions[name])return;this.actions[this.current]?.fadeOut(.22);this.actions[name].reset().fadeIn(.22).play();this.current=name}
 update(dt,state,player,blocked){
  this.time+=dt;this.mixer.update(dt);
  if(this.indoors){this.play(this.time%13>8?'CheckWatch':'Idle');return}
  const solved=id=>state.solved.includes(id);const stage=!solved('caterpillar')?'grove':!solved('mushroom')?'roots':!solved('messenger')?'messenger':!solved('kitchen')?'kitchen':!solved('tea')?'tea':'watch';
  if(stage!==this.stage){this.stage=stage;this.path=({grove:[[-3,17],[-10,11],[-14,6]],roots:[[-18,5],[-22,7]],messenger:[[-10,8],[0,8],[10,10],[14,11]],kitchen:[[18,4],[18,-8],[8,-10],[0,-10],[-10,-12],[-18,-18]],tea:[[-18,-9],[-8,-10],[8,-10],[16,-14]],watch:[[9,-11],[3,-8]]})[stage].map(([x,z])=>new THREE.Vector3(x,0,z));this.pause=2}
  const distant=player.distanceTo(this.model.position)>19;
  if(blocked||distant||!this.path.length||this.pause>0){this.pause=Math.max(0,this.pause-dt);this.play(this.time%12>6?'CheckWatch':'Idle');return}
  const target=this.path[0],delta=target.clone().sub(this.model.position);delta.y=0;const distance=delta.length();
  if(distance<.15){this.path.shift();this.pause=this.path.length?.5:5;this.play('CheckWatch');return}
  this.play('Hop');delta.normalize();this.model.position.addScaledVector(delta,Math.min(distance,dt*1.8));const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.atan2(delta.x,delta.z));this.model.quaternion.slerp(q,1-Math.exp(-dt*5));
 }
}
