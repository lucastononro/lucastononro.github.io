import * as THREE from 'three';
import {SIGN_TRAILS,HOUSE_ORDER,HOUSE_SLOTS,CROQUET_POINTS} from './mechanics.js';

export function installSpatialPuzzles(World){Object.assign(World.prototype,{
 prepareSpatialPuzzles(){
  this.createSignTable();this.createEffigyPaint();this.createCheshire();this.actorParts=[];
  this.root.traverse(o=>{if(o.userData.motion)this.actorParts.push({object:o,role:o.parent.userData.actor,base:o.rotation.clone()})});
 },
 createCheshire(){
  this.cheshire=new THREE.Group();this.cheshire.position.set(0,3.4,-28.6);this.scene.add(this.cheshire);this.catEyes=[];
  const smile=new THREE.CatmullRomCurve3([new THREE.Vector3(-.58,0,0),new THREE.Vector3(-.3,-.22,.02),new THREE.Vector3(0,-.29,.05),new THREE.Vector3(.3,-.22,.02),new THREE.Vector3(.58,0,0)]);
  this.cheshire.add(new THREE.Mesh(new THREE.TubeGeometry(smile,32,.035,8,false),new THREE.MeshBasicMaterial({color:'#efdfb3'})));
  for(const x of [-.3,.3]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.13,16,8),new THREE.MeshStandardMaterial({color:'#e6b25b',emissive:'#9d651c',emissiveIntensity:.8}));eye.scale.set(1,.7,.5);eye.position.set(x,.22,0);this.cheshire.add(eye);this.catEyes.push(eye);const pupil=new THREE.Mesh(new THREE.SphereGeometry(.045,10,8),new THREE.MeshBasicMaterial({color:'#12291f'}));pupil.scale.set(.5,1,.35);pupil.position.set(0,0,.13);eye.add(pupil)}
 },
 createSignTable(){
  const parent=this.hotspots.signs;if(!parent)return;
  for(const o of parent.children)if(o.name.startsWith('exit_'))o.position.z-=1.45;
  this.signTable=new THREE.Group();this.signTable.position.set(0,1.235,-11);parent.add(this.signTable);this.signNodes=[];this.signLines=[];
  for(const trail of SIGN_TRAILS){
   const closed=trail.points[0].join()===trail.points.at(-1).join();
   trail.points.slice(0,closed?-1:undefined).forEach(([x,z],i)=>{
    const next=trail.points[i+1],canvas=document.createElement('canvas');canvas.width=256;canvas.height=160;const ctx=canvas.getContext('2d');
    ctx.fillStyle='#122820';ctx.fillRect(0,0,256,160);ctx.strokeStyle=trail.color;ctx.lineWidth=8;ctx.strokeRect(4,4,248,152);
    ctx.fillStyle=trail.color;ctx.font='bold 75px Georgia';ctx.textAlign='center';ctx.fillText(next?'➜':'●',128,96);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(.34,.23),new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide}));sign.rotation.x=-Math.PI/2;
    if(next)sign.rotation.z=-Math.atan2(next[1]-z,next[0]-x);
    sign.position.set(x*.82,.015,z*.58);sign.userData={trail:trail.id,index:i};this.signNodes.push(sign);this.signTable.add(sign);
    if(i===0){const start=new THREE.Mesh(new THREE.RingGeometry(.2,.22,24),new THREE.MeshBasicMaterial({color:trail.color,side:THREE.DoubleSide}));start.rotation.x=-Math.PI/2;start.scale.z=.7;start.position.copy(sign.position);start.position.y=.01;start.userData.trail=trail.id;this.signTable.add(start)}
   });
  }
 },
 selectSignColor(id){this.signTable.traverse(o=>{if(o.material)o.material.opacity=o.userData.trail&&o.userData.trail!==id?.18:1});this.signLines.forEach(o=>o.visible=o.userData.trail===id)},
 traceSignLine(trailId,indices){
  const trail=SIGN_TRAILS.find(t=>t.id===trailId);if(indices.length<2)return;
  const [a,b]=indices.slice(-2).map(i=>trail.points[i]);
  const line=new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(a[0]*.82,.035,a[1]*.58),new THREE.Vector3(b[0]*.82,.035,b[1]*.58)),1,.012,5,false),new THREE.MeshBasicMaterial({color:trail.color}));line.userData.trail=trailId;this.signTable.add(line);this.signLines.push(line);
 },
 clearSignLines(){for(const line of this.signLines){this.signTable.remove(line);line.geometry.dispose();line.material.dispose()}this.signLines=[]},
 signAt(event){const r=this.canvas.getBoundingClientRect();this.ray.setFromCamera(new THREE.Vector2((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1),this.camera);return this.ray.intersectObjects(this.signNodes)[0]?.object.userData},
 createEffigyPaint(){
  const bodies=[];this.hotspots.effigies?.traverse(o=>{if(o.name.startsWith('effigy_body'))bodies.push(o)});bodies.sort((a,b)=>a.name.localeCompare(b.name));
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=1152;const ctx=canvas.getContext('2d');ctx.fillStyle='#1c3b30';ctx.font='bold 360px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('5',128,385,248);ctx.fillText('4',128,765,248);
  bodies.forEach((body,i)=>{const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.repeat.set(1,1/3);texture.offset.y=1-(i+1)/3;const paint=new THREE.Mesh(new THREE.PlaneGeometry(.49,.75),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));paint.name='permanent_figure_paint';paint.position.set(0,0,.087);body.add(paint)});
 },
 previewAssembly(order,faces={}){
  const structure=this.hotspots.structure;if(!structure)return;if(typeof order==='number')order=HOUSE_ORDER.slice(0,order);order??=[];
  structure.visible=order.length>0;
  for(const piece of structure.children){const pieceIndex=piece.userData.pieceIndex;if(pieceIndex===undefined)continue;const label=HOUSE_ORDER[pieceIndex],slot=order.indexOf(label);piece.visible=slot>=0;if(slot<0)continue;piece.position.fromArray(HOUSE_SLOTS[slot]);piece.rotation.x=faces[label]?Math.PI:0;}
 },
 resetCroquet(){this.ballPath=null;this.ball.position.set(82,.3,-24.7);this.ball.rotation.set(0,0,0)},
 rollCroquet(from,to,stop,done){const a=CROQUET_POINTS[from],b=stop||CROQUET_POINTS[to];this.ballPath={elapsed:0,duration:.75,from:new THREE.Vector3(a[0]+72,.3,a[1]-22),to:new THREE.Vector3(b[0]+72,.3,b[1]-22),done}},
 updateSpatial(dt,time){
  if(this.cheshire){this.cheshire.visible=this.overworld&&this.state.solved.includes('minutes');this.cheshire.position.y=3.4+Math.sin(time*.8)*.05;const blink=time%7>6.85;for(const eye of this.catEyes)eye.scale.y=blink?.08:.7;}

  for(const {object,role,base} of this.actorParts||[]){
   if(object.userData.motion==='head'){const pos=object.getWorldPosition(new THREE.Vector3());const near=pos.distanceTo(this.camera.position)<10;object.rotation.y=THREE.MathUtils.damp(object.rotation.y,near?THREE.MathUtils.clamp(Math.atan2(this.camera.position.x-pos.x,this.camera.position.z-pos.z),-.6,.6):Math.sin(time*.5)*.07,3,dt);object.rotation.x=base.x+Math.sin(time*1.1)*.025;}
   else if(role==='cook'){object.rotation.x=-.5+Math.sin(time*1.7)*.12;object.rotation.z=Math.cos(time*1.7)*.14;}
   else{object.rotation.x=base.x+Math.sin(time*.8+object.userData.side)*.07;}
  }
  if(this.ballPath){const p=this.ballPath;p.elapsed+=dt;const t=Math.min(p.elapsed/p.duration,1);this.ball.position.lerpVectors(p.from,p.to,t);this.ball.rotation.z-=dt*7;if(t===1){this.ballPath=null;p.done?.()}}
 },
});}
