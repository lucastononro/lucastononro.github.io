import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {has} from './puzzles.js';
import {installSpatialPuzzles} from './spatial-puzzles.js';
import {HOUSE_ORDER} from './mechanics.js';
import {RabbitActor} from './rabbit.js';
import {REGION_OFFSETS,GARDEN_SHIFTS,ROOM_IDS,hotspotRoom,worldOffset,shiftPoint,regionAt,insideValley,addValley} from './overworld.js';

export const LABELS={story:'The open storybook',shadow:'The brass letter',arithmetic:'The cat’s blackboard',letter:'The incomplete name',biscuit:'The biscuit',bottle:'The blue bottle',key:'The high table’s key',small_door:'Door 6 · triangular lock',door_2:'Door 2 · round lock',door_9:'Door 9 · square lock',door_4:'Door 4 · star lock',door_7:'Door 7 · oval lock',ceiling:'The opening above',rabbit:'The white rabbit',schedule:'The rabbit’s appointments',mushroom:'A solitary spotted mushroom',caterpillar:'3:10 · The caterpillar',messenger:'4:25 · The messenger',kitchen:'5:40 · The pepper kitchen',tea:'6:00 · The tea party',fan:'A blue silk fan',minutes:'The rabbit’s lost minutes',signs:'The Cheshire crossing',garden_exit:'The Queen’s garden gate',maze:'The three hedge paths',roses:'The white roses',brush:'A brush and red paint',gardeners:'The three gardeners',trial:'The Queen’s tribunal',tart:'A pepper tart',guard_original:'The guard on duty',guard_impostor:'The suspicious guard',croquet:'The croquet lawn',effigies:'The wooden witnesses',decree:'The Queen’s decree',court_exit:'The impossible house',assembly:'The kings’ instructions',structure:'The folded house',amber_view:'The amber viewing ring',ivory_view:'The ivory viewing ring',final_lock:'The way home',cat_eyes:'The Cheshire cat’s eyes',forest_map:'A map of the lost woods',bridge_note:'An inscription by the river',fan_note:'A note near the ruins'};
const SPAWNS={hall:[0,1.7,7.4],garden:[0,1.7,27],court:[0,1.7,11],tower:[0,1.7,8]};
export class World{
 constructor(container,callbacks){
  this.callbacks=callbacks;this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.06,240);this.camera.rotation.order='YXZ';
  this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.setSize(innerWidth,innerHeight);this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFShadowMap;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.83;container.append(this.renderer.domElement);
  const pmrem=new THREE.PMREMGenerator(this.renderer);this.env=pmrem.fromScene(new RoomEnvironment(),.03).texture;pmrem.dispose();
  this.composer=new EffectComposer(this.renderer);this.composer.addPass(new RenderPass(this.scene,this.camera));this.bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.065,.35,1.4);this.composer.addPass(this.bloom);this.composer.addPass(new OutputPass());
  this.cache={};this.hotspots={};this.boxes={};this.ray=new THREE.Raycaster();this.keys=new Set();this.touchMove={x:0,y:0};this.pointer=new THREE.Vector2();this.previousTime=performance.now();this.elapsed=0;this.active=false;this.blocked=false;this.title=true;this.drag=false;this.yaw=0;this.pitch=0;this.sensitivity=1;this.height=1.7;this.targetHeight=1.7;this.effects=[];this.focusMode=null;this.highlight=null;this.stepTime=0;this.canvas=this.renderer.domElement;this.camera.position.set(6.8,3,9.5);this.camera.lookAt(0,2,-6);
  this.canvas.addEventListener('pointerdown',e=>{if(this.focusMode==='signs'){this.dragDistance=0;return}if(e.button!==0||this.blocked||this.suspended||this.title)return;this.drag=true;this.dragDistance=0;this.canvas.setPointerCapture(e.pointerId);this.lastPointer={x:e.clientX,y:e.clientY};});
  this.canvas.addEventListener('pointermove',e=>{
    if(this.blocked||this.suspended||this.title||this.focusMode&&!['paint','fan'].includes(this.focusMode))return;
    if(document.pointerLockElement===this.canvas||this.drag){const dx=document.pointerLockElement?e.movementX:e.clientX-this.lastPointer.x;const dy=document.pointerLockElement?e.movementY:e.clientY-this.lastPointer.y;this.yaw-=dx*.003*this.sensitivity;this.pitch=THREE.MathUtils.clamp(this.pitch-dy*.003*this.sensitivity,-1.5,1.5);this.dragDistance+=Math.abs(dx)+Math.abs(dy);this.lastPointer={x:e.clientX,y:e.clientY};}
  });
  this.canvas.addEventListener('pointerup',e=>{const wasClick=(this.dragDistance||0)<7;this.drag=false;if(wasClick&&this.active&&(!this.blocked||this.focusMode==='signs')){if(this.focusMode)this.clickMode(e);else this.interactAt(e)}});
  this.canvas.addEventListener('contextmenu',e=>e.preventDefault());
  document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea,select'))return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft'].includes(e.code)){this.keys.add(e.code);e.preventDefault()}});
  document.addEventListener('keyup',e=>this.keys.delete(e.code));window.addEventListener('blur',()=>{this.keys.clear();this.drag=false});
  window.addEventListener('resize',()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);this.composer.setSize(innerWidth,innerHeight);this.updateComposition()});
  document.addEventListener('pointerlockchange',()=>{this.drag=false;this.callbacks.onLock?.(document.pointerLockElement===this.canvas)});
  this.animate=this.animate.bind(this);requestAnimationFrame(this.animate);
 }
 async load(room,state){
  this.navigation=null;this.room=room;this.state=state;this.effects=[];this.focusMode=null;this.focusBackup=null;this.equip(null);this.scene.clear();this.scene.add(this.camera);this.hotspots={};this.boxes={};
  this.overworld=room!=='hall';const rooms=this.overworld?['garden','court','tower']:['hall'];
  await Promise.all(rooms.map(async name=>{if(!this.cache[name])this.cache[name]=(await new GLTFLoader().loadAsync(`${(import.meta.env?.BASE_URL||'./')}models/${name}.glb`)).scene}));
  this.root=new THREE.Group();this.regionRoots={};for(const name of rooms){const model=this.cache[name].clone(true);const off=REGION_OFFSETS[name];model.position.set(off[0],0,off[1]);this.regionRoots[name]=model;this.root.add(model)}this.scene.add(this.root);
  this.root.traverse(o=>{if(o.userData.hotspot){this.hotspots[o.userData.hotspot]=o;o.visible=true}if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material){o.material=o.material.clone();o.material.envMapIntensity=.25;if(!o.material.userData.corrected){o.material.color.convertSRGBToLinear();o.material.userData.corrected=true}}}});
  this.root.updateMatrixWorld(true);for(const [id,o] of Object.entries(this.hotspots))this.boxes[id]=new THREE.Box3().setFromObject(o);
  const outside=this.overworld;this.scene.background=new THREE.Color(outside?'#759b95':'#19322e');this.scene.fog=new THREE.FogExp2(outside?'#718e81':'#253c34',outside?.004:.009);this.scene.environment=this.env;this.scene.environmentIntensity=.18;
  this.scene.add(new THREE.HemisphereLight(outside?0xc7e2e3:0xc2d9d0,outside?0x344628:0x233025,outside?1.15:.7));
  const sun=new THREE.DirectionalLight(outside?0xffe2b6:0xfde5bb,outside?2.2:1.35);sun.position.set(outside?-9:7,12,5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-18,right:18,top:18,bottom:-18,near:.5,far:48});sun.shadow.bias=-.0003;sun.shadow.normalBias=.03;sun.target.position.set(0,0,-5);this.scene.add(sun,sun.target);
  if(!outside){for(const z of [-7,4]){const light=new THREE.PointLight(0xffc677,25,18,2);light.position.set(0,5.4,z);this.scene.add(light)}const cool=new THREE.PointLight(0x84c9e8,30,25,2);cool.position.set(-7,4,2);this.scene.add(cool);/* window glass provides the luminous recesses */}
  this.createMotes(outside?240:100);if(this.overworld){this.valley=addValley(this.scene);this.createSmoke();this.createSmokeDigits();this.createCroquetBall();this.createAnamorph();this.prepareRoses();this.prepareSpatialPuzzles()}else{this.valley=null;this.makeBrassGlyph()}
  if(!this.rabbitAsset)this.rabbitAsset=await new GLTFLoader().loadAsync(`${(import.meta.env?.BASE_URL||'./')}models/white-rabbit.glb`);
  const rabbitContainer=this.hotspots[this.overworld?'schedule':'rabbit'];if(rabbitContainer){rabbitContainer.children.forEach(o=>{if(!this.overworld||!o.name.startsWith('schedule'))o.visible=false});this.rabbitActor=new RabbitActor(this.rabbitAsset,!this.overworld);rabbitContainer.add(this.rabbitActor.model)}
  this.colliders=this.overworld?['garden','court','tower'].flatMap(r=>this.roomColliders(r).map(([x,z,rx,rz])=>[x+REGION_OFFSETS[r][0],z+REGION_OFFSETS[r][1],rx,rz])):this.roomColliders(room);this.camera.position.fromArray(SPAWNS[room]);if(this.overworld){const off=REGION_OFFSETS[room];this.camera.position.x+=off[0];this.camera.position.z+=off[1]}this.yaw=0;this.pitch=0;this.height=state.size/33*1.7;this.targetHeight=this.height;this.camera.position.y=this.height;this.sync(state);
  if(this.title){this.camera.position.set(6.8,3,9.5);this.camera.lookAt(0,2,-6)}
 }
 addWindowLight(){
  // Translucent shafts give the tall windows volume without an external texture.
  const mat=new THREE.MeshBasicMaterial({color:0xb0d8c1,transparent:true,opacity:.023,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
  for(const z of [-8,-2,4]){const geo=new THREE.CylinderGeometry(.55,2.7,9,4,1,true);const shaft=new THREE.Mesh(geo,mat);shaft.position.set(4.6,3.4,z+1);shaft.rotation.z=-.62;this.scene.add(shaft)}
 }
 createMotes(count){const p=new Float32Array(count*3);for(let i=0;i<count;i++){p[i*3]=(Math.random()-.5)*24;p[i*3+1]=Math.random()*7;p[i*3+2]=(Math.random()-.5)*28}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));const m=new THREE.PointsMaterial({color:0xf4d68b,size:.035,transparent:true,opacity:.55,depthWrite:false});this.motes=new THREE.Points(g,m);this.scene.add(this.motes)}
 createSmoke(){this.smoke=new THREE.Group();const mat=new THREE.MeshStandardMaterial({color:0xb2b4a0,transparent:true,opacity:.36,depthWrite:false,roughness:1});for(let i=0;i<13;i++){const p=new THREE.Mesh(new THREE.SphereGeometry(.55+Math.random()*.3,12,8),mat);p.position.set(-6+(Math.random()-.5)*2.5,1.8+Math.random()*1.8,-8+(Math.random()-.5)*1.5);p.userData.origin=p.position.clone();this.smoke.add(p)}this.smoke.position.set(-12,0,-14);this.scene.add(this.smoke)}
 createSmokeDigits(){this.smokeDigits=new THREE.Group();const mat=new THREE.MeshBasicMaterial({color:0xd3c9b1,transparent:true,opacity:.65});for(const x of [-6.35,-5.75])for(const y of [3.45,3.9]){const ring=new THREE.Mesh(new THREE.TorusGeometry(.23,.024,8,32),mat);ring.position.set(x,y,.04);this.smokeDigits.add(ring)}this.smokeDigits.position.set(-11,0,3);this.scene.add(this.smokeDigits)}
 createCroquetBall(){
  this.ball=new THREE.Group();this.ball.position.set(82,.3,-24.7);this.scene.add(this.ball);
  const originalParts=[];this.hotspots.croquet.traverse(o=>{if(o.isMesh&&o.name.startsWith('hedgehog'))originalParts.push(o);if(o.name.startsWith('bumper_number'))o.visible=false});
  for(const part of originalParts){this.ball.attach(part);part.visible=true}this.ballPath=null;
  for(const [x,z,n] of [[78,-25,4],[82,-28,7],[78,-31,6]]){
   const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#f5e6b9';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 94px Georgia';ctx.fillText(String(n),64,69);
   const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const label=new THREE.Mesh(new THREE.PlaneGeometry(.45,.45),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));label.rotation.x=-Math.PI/2;label.position.set(x,.615,z);this.scene.add(label);
  }
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(81.7,.17,-24.72),new THREE.Vector3(80,.17,-24.85)]),new THREE.LineDashedMaterial({color:0xddd7a2,dashSize:.13,gapSize:.12}));line.computeLineDistances();this.scene.add(line);
 }
 resetEffigies(){
  this.effigyTweens=[];if(this.effigyNumber)this.effigyNumber.visible=false;
  const bodies=[],heads=[];this.hotspots.effigies.traverse(o=>{if(o.name.startsWith('effigy_body'))bodies.push(o);if(o.name.startsWith('effigy_head'))heads.push(o)});
  bodies.sort((a,b)=>a.name.localeCompare(b.name));heads.sort((a,b)=>a.name.localeCompare(b.name));this.effigyParts=bodies.map((body,i)=>({body,head:heads[i]}));
  this.effigyParts.forEach(({body,head},i)=>{body.position.set(7+i,1.64,1.5);head.position.set(7+i,2.25,1.5);head.visible=true});
 }
 placeEffigy(name,index){const part=this.effigyParts[['you','knave','gardener'].indexOf(name)];const y=3.14-index*.75;part.targetHeight=y;for(const [object,height] of [[part.body,y],[part.head,y+.61]])this.effigyTweens.push({object,target:new THREE.Vector3(8,height,1.5+index*.012)})}
 lowerEffigyHeads(){const heads=this.effigyParts.map(p=>p.head);this.effigyTweens=this.effigyTweens.filter(t=>!heads.includes(t.object));for(const {head,targetHeight} of this.effigyParts)this.effigyTweens.push({object:head,target:new THREE.Vector3(8,targetHeight-.04,1.32),hide:true})}

 createAnamorph(){
  this.anamorph=new THREE.Group();this.anamorph.position.set(72,0,-75);this.scene.add(this.anamorph);
  // Each slice is at a different depth. Projecting from the ring aligns the original image.
  for(const [side,eye,color,content] of [['amber',new THREE.Vector3(-6,1.7,-2),'#ffb234','78'],['ivory',new THREE.Vector3(6,1.7,-2),'#fff3cd','32']]){
   const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,512,512);ctx.fillStyle=color;ctx.font='bold 310px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(content,256,270,490);
   const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
   for(let row=0;row<8;row++){
    const scale=.83+(row%3)*.12;const center=new THREE.Vector3(0,2.7,-2);const pos=eye.clone().lerp(center,scale);const width=3.3*scale;const height=3.3/8*scale;pos.y+=(3.3/2-(row+.5)*3.3/8)*scale;
    const tex=texture.clone();tex.repeat.set(1,1/8);tex.offset.set(0,1-(row+1)/8);tex.needsUpdate=true;
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.FrontSide,depthTest:false,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));mesh.position.copy(pos);mesh.rotation.y=side==='amber'?-Math.PI/2:Math.PI/2;mesh.renderOrder=8;this.anamorph.add(mesh);
   }
  }
 }
 sync(state){
  this.state=state;this.valley?.sync(state);this.targetHeight=state.size/33*1.7;this.sensitivity=state.settings.sensitivity;
  if(this.hotspots.key)this.hotspots.key.visible=!state.inventory.includes('key');if(this.hotspots.fan)this.hotspots.fan.visible=!state.inventory.includes('fan');if(this.hotspots.brush)this.hotspots.brush.visible=!state.inventory.includes('brush');
  if(this.smoke)this.smoke.visible=!has(state,'kitchen');
  if(this.hotspots.roses&&has(state,'roses'))this.paintRoses(5);
  if(this.anamorph)this.anamorph.visible=has(state,'assembly');
  if(this.hotspots.structure){this.hotspots.structure.visible=has(state,'assembly')||state.assembly.length>0;this.previewAssembly(has(state,'assembly')?HOUSE_ORDER:state.assembly,has(state,'assembly')?{'Black bridge':true,'Red bridge':true}:state.bridgeFaces)}
  if(this.hotspots.small_door&&has(state,'door_unlock'))this.hotspots.small_door.traverse(o=>{if(o.isMesh&&o.name.startsWith('door_panel'))o.material.emissive?.setHex(0x143522)});
 }
 paintRoses(count){let i=0;this.hotspots.roses?.traverse(o=>{if(o.isMesh&&o.material?.name==='white'){if(i<count*5){o.material=o.material.clone();o.material.name='painted_rose';o.material.color.set('#bd2546')}i++}})}
 updateComposition(){if(this.examining&&document.body.classList.contains('touch')&&innerWidth>innerHeight)this.camera.setViewOffset(innerWidth,innerHeight,innerWidth*.22,0,innerWidth,innerHeight);else this.camera.clearViewOffset();}
 setQuality(q){const ratio=q==='high'?Math.min(devicePixelRatio,1.6):1;this.renderer.setPixelRatio(ratio);this.composer.setPixelRatio(ratio);this.bloom.enabled=q==='high';this.renderer.shadowMap.enabled=q!=='low'}
 roomColliders(r){
  if(r==='hall')return [[-4.8,4,1.65,1],[4.8,4,.7,.7],[-5.1,-6.6,1.7,.3],[-5.5,-1.6,1.1,.7],[5.5,-1.6,1.1,.7],[5.3,-7,1.7,1.05]];
  if(r==='garden')return [[-17,3,1.2,1.2],[16,10,.65,.65],[-18,-22,1.65,1],[18,-18,2.1,1.1],[-22,16,.7,.7],[0,-10,.65,.65],[0,-26,2.15,1.35],[-20.4,-22.5,.2,2.2],[-15.6,-22.5,.2,2.2],[-18,-24.5,2.5,.2]];
  if(r==='court')return [[-10.65, 5, 1.35, 0.3], [-5.35, 5, 1.35, 0.3], [-11, 2, 0.3, 3.0], [-10.15, -1, 0.85, 0.3], [-4.85, -1, 1.85, 0.3], [-4, 2, 0.3, 3.0], [5.35, 5, 1.35, 0.3], [10.65, 5, 1.35, 0.3], [11, 2, 0.3, 3.0], [4.85, -1, 1.85, 0.3], [10.15, -1, 0.85, 0.3], [4, 2, 0.3, 3.0],[-8,-5,1.85,1.85],[0,-7,.65,.65],[-5.5,-9,1.1,.8],[8,1.5,1.85,1]];
  return [[0,-2,2.8,1.5],[0,4,.7,.7]];
 }
 valid(x,z){const r=this.room;const xMax=r==='hall'?8.35:r==='tower'?9.2:13.2;const zMin=r==='hall'?-10.65:r==='tower'?-10:-14.1;const zMax=r==='hall'?11.2:r==='tower'?10:14;
  if(this.overworld){if(!insideValley(x,z,this.state))return false}else if(Math.abs(x)>xMax||z<zMin||z>zMax)return false;
  return !this.colliders.some(([cx,cz,rx,rz])=>Math.abs(x-cx)<rx+.24&&Math.abs(z-cz)<rz+.24)
 }
 start(){this.title=false;this.active=true;this.blocked=false;this.camera.position.fromArray(SPAWNS[this.room]);if(this.overworld){const off=REGION_OFFSETS[this.room];this.camera.position.x+=off[0];this.camera.position.z+=off[1]}this.yaw=0;this.pitch=0;this.camera.rotation.set(0,0,0);this.camera.position.y=this.height}
 pause(v){this.blocked=v;this.touchMove={x:0,y:0};this.keys.clear();this.drag=false;if(v)this.navigation=null;if(v&&document.pointerLockElement)document.exitPointerLock()}
 lock(){if(!this.active)return;try{const p=this.canvas.requestPointerLock();p?.catch(()=>this.callbacks.onMessage?.('Mouse capture is unavailable here. Hold and drag to look around.'))}catch{this.callbacks.onMessage?.('Hold and drag to look around.')}}
 targetAt(pointer=new THREE.Vector2()){this.ray.setFromCamera(pointer,this.camera);const hits=this.ray.intersectObjects(this.root.children,true);for(const hit of hits){if(hit.distance>5.3)return null;let o=hit.object;while(o&&o!==this.root){if(o.userData.hotspot){if(!o.visible)return null;return {id:o.userData.hotspot,distance:hit.distance,point:hit.point}}o=o.parent}if(hit.object.material?.transparent&&hit.object.material.opacity<.5)continue;return null}return null}
 interactAt(e){if(document.pointerLockElement===this.canvas){if(this.highlight)this.callbacks.onInteract?.(this.highlight.id);return}const rect=this.canvas.getBoundingClientRect();const pointer=new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);const hit=this.targetAt(pointer);if(hit)this.callbacks.onInteract?.(hit.id)}
 interact(){if(this.highlight&&!this.blocked)this.callbacks.onInteract?.(this.highlight.id)}
 nearby(){return Object.entries(this.hotspots).filter(([id,o])=>o.visible&&LABELS[id]&&this.boxes[id]?.distanceToPoint(this.camera.position)<5.8).map(([id])=>({id,label:LABELS[id],distance:this.boxes[id].distanceToPoint(this.camera.position)})).sort((a,b)=>a.distance-b.distance)}
 navigate(id,done){
  const b=this.boxes[id];if(!b)return;const center=b.getCenter(new THREE.Vector3());const step=.5;const start=[Math.round(this.camera.position.x/step),Math.round(this.camera.position.z/step)];
  const key=(x,z)=>x+','+z;const score=(x,z)=>Math.hypot(x*step-center.x,z*step-center.z)/step;const queue=[{p:start,g:0,f:score(...start)}];const visited=new Map([[key(...start),null]]);let goal=null;
  for(let qi=0;queue.length&&qi<18000;qi++){queue.sort((a,b)=>a.f-b.f);const node=queue.shift();const [x,z]=node.p;const wp=new THREE.Vector3(x*step,this.height,z*step);if(b.distanceToPoint(wp)<(id==='roses'?.75:2.5)&&z*step>center.z+.55){goal=[x,z];break}
   for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,k=key(nx,nz);if(!visited.has(k)&&this.valid(nx*step,nz*step)){visited.set(k,[x,z]);queue.push({p:[nx,nz],g:node.g+1,f:node.g+1+score(nx,nz)})}}
  }
  if(!goal){this.callbacks.onMessage?.('A locked route or the river is in the way. Explore for another crossing.');return}
  const path=[];for(let p=goal;p;p=visited.get(key(...p)))path.unshift(new THREE.Vector3(p[0]*step,this.height,p[1]*step));
  this.navigation={path,index:0,id,done,center};this.callbacks.onMessage?.('Walking to '+(LABELS[id]||'the object')+'. Use the movement controls to stop.');
 }
 examine(id,custom){
  if(!this.hotspots[id]&&!custom)return;
  if(this.overworld&&custom)custom={position:custom.position?shiftPoint(custom.position,id):undefined,target:custom.target?shiftPoint(custom.target,id):undefined};
  if(!this.focusBackup)this.focusBackup={position:this.camera.position.clone(),yaw:this.yaw,pitch:this.pitch};
  this.pause(true);this.examining=true;this.updateComposition();const box=this.boxes[id];const target=custom?.target?new THREE.Vector3(...custom.target):box.getCenter(new THREE.Vector3());const size=box?.getSize(new THREE.Vector3())||new THREE.Vector3(2,2,2);
  const pos=custom?.position?new THREE.Vector3(...custom.position):target.clone().add(new THREE.Vector3(.8,Math.max(.2,size.y*.15),Math.max(2.8,size.y*1.2)));
  this.cameraTween={from:this.camera.position.clone(),to:pos,target,elapsed:0};
 }
 endExamine(){this.examining=false;this.updateComposition();if(this.focusBackup){this.camera.position.copy(this.focusBackup.position);this.yaw=this.focusBackup.yaw;this.pitch=this.focusBackup.pitch;this.focusBackup=null}this.cameraTween=null;this.focusMode=null;this.pause(false)}
 beginMode(mode,id,custom){this.examine(id,custom);this.focusMode=mode}
 clickMode(e){this.callbacks.onModeClick?.(this.focusMode,e)}
 rotateLetter(turns){if(this.brassGlyph){this.brassGlyph.rotation.z=Math.PI/2-turns*Math.PI/2;this.glyphShadow.rotation.z=this.brassGlyph.rotation.z}}
 previewAssembly(count){const o=this.hotspots.structure;if(o){o.visible=count>0;o.scale.setScalar(1);o.children.forEach((child,i)=>{child.visible=i<Math.ceil(o.children.length*count/9)})}}
 animateCroquet(){this.ballPath={t:0,points:[[82,.3,-24.7],[78,.3,-25],[82,.3,-28],[78,.3,-31],[82,.3,-32]].map(p=>new THREE.Vector3(...p))}}
 prepareRoses(){const petals=[];this.hotspots.roses?.traverse(o=>{if(o.isMesh&&o.name.startsWith('rose_petal')&&o.material.name==='white')petals.push(o)});petals.sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));this.roseGroups=[];for(let i=0;i<petals.length;i+=5)this.roseGroups.push(petals.slice(i,i+5));for(const index of this.state.paintedRoses||[])for(const o of this.roseGroups[index]||[]){o.material.color.set('#c32b49');o.material.name='painted_rose'}}
 whiteRoseCount(){return (this.roseGroups||[]).filter(g=>g.some(o=>o.material.name==='white')).length}
 paintNearestRose(event){let group=null;if(event){const rect=this.canvas.getBoundingClientRect();const p=new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);this.ray.setFromCamera(p,this.camera);const hit=this.ray.intersectObjects(this.hotspots.roses.children,true).find(h=>h.distance<5);if(hit)group=this.roseGroups.find(g=>g.includes(hit.object)&&g.some(o=>o.material.name==='white'))}else{group=(this.roseGroups||[]).filter(g=>g.some(o=>o.material.name==='white')).sort((a,b)=>a[0].getWorldPosition(new THREE.Vector3()).distanceTo(this.camera.position)-b[0].getWorldPosition(new THREE.Vector3()).distanceTo(this.camera.position))[0];if(group&&group[0].getWorldPosition(new THREE.Vector3()).distanceTo(this.camera.position)>5)group=null}if(!group)return false;for(const o of group){o.material.color.set('#c32b49');o.material.name='painted_rose'}const index=this.roseGroups.indexOf(group);this.state.paintedRoses??=[];if(!this.state.paintedRoses.includes(index))this.state.paintedRoses.push(index);this.swingTool();return true}
 equip(kind){if(this.heldTool){this.camera.remove(this.heldTool);this.heldTool=null}if(!kind)return;const g=new THREE.Group();const wood=new THREE.MeshStandardMaterial({color:'#754929',roughness:.7});const gold=new THREE.MeshStandardMaterial({color:'#be985d',metalness:.6,roughness:.3});const handle=new THREE.Mesh(new THREE.CylinderGeometry(.025,.018,.55,10),wood);g.add(handle);
  if(kind==='brush'){const cuff=new THREE.Mesh(new THREE.CylinderGeometry(.05,.03,.13,10),gold);cuff.position.y=.3;g.add(cuff);const brush=new THREE.Mesh(new THREE.BoxGeometry(.08,.12,.035),new THREE.MeshStandardMaterial({color:'#b51f3d'}));brush.position.y=.42;g.add(brush)}else{const cloth=new THREE.Mesh(new THREE.CircleGeometry(.3,24,0,Math.PI),new THREE.MeshStandardMaterial({color:'#2a6c92',side:THREE.DoubleSide,roughness:.7}));cloth.position.y=.13;g.add(cloth);for(let i=0;i<9;i++){const rib=new THREE.Mesh(new THREE.CylinderGeometry(.006,.006,.3,5),gold);const a=i/8*Math.PI;rib.position.set(Math.cos(a)*.15,.13+Math.sin(a)*.15,.009);rib.rotation.z=a-Math.PI/2;g.add(rib)}}
  const hand=new THREE.Mesh(new THREE.SphereGeometry(.085,12,8),new THREE.MeshStandardMaterial({color:'#d7ba8d',roughness:.8}));hand.scale.set(.6,1,.6);hand.position.y=-.1;g.add(hand);g.position.set(.32,-.32,-.65);g.rotation.z=-.4;this.camera.add(g);this.heldTool=g;
 }
 swingTool(){this.toolSwing=0}
 makeBrassGlyph(){const original=this.hotspots.shadow?.children.find(c=>c.name.startsWith('rotating_letter'));if(original)original.visible=false;
  const upper=new THREE.CubicBezierCurve3(new THREE.Vector3(-.28,.5,0),new THREE.Vector3(.55,.64,0),new THREE.Vector3(.55,.03,0),new THREE.Vector3(-.1,0,0));
  const lower=new THREE.CubicBezierCurve3(new THREE.Vector3(-.1,0,0),new THREE.Vector3(.6,-.03,0),new THREE.Vector3(.55,-.64,0),new THREE.Vector3(-.28,-.5,0));const path=new THREE.CurvePath();path.add(upper);path.add(lower);const geometry=new THREE.TubeGeometry(path,60,.065,12,false);
  this.brassGlyph=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0xbe9850,metalness:.6,roughness:.36}));this.brassGlyph.position.set(4.55,1.95,4.03);this.brassGlyph.rotation.z=Math.PI/2;this.hotspots.shadow.add(this.brassGlyph);
  this.glyphShadow=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:0x263f32}));this.glyphShadow.position.set(5.18,1.95,3.98);this.glyphShadow.rotation.z=Math.PI/2;this.hotspots.shadow.add(this.glyphShadow);
 }
 viewRing(side){const x=side==='amber'?-6:6;this.examine(side+'_view',{position:[x,1.7,-2],target:[0,2.7,-2]})}
 animate(){
  requestAnimationFrame(this.animate);const now=performance.now();const dt=Math.min((now-this.previousTime)/1000,.05);this.previousTime=now;this.elapsed+=dt;
  if(this.title&&!this.blocked){this.camera.position.set(6.8+Math.sin(this.elapsed*.055)*.35,3+Math.sin(this.elapsed*.09)*.08,9.5);this.camera.lookAt(0,2,-6)}
  if(this.cameraTween){const t=this.cameraTween;t.elapsed+=dt;const a=Math.min(t.elapsed/ .65,1);this.camera.position.lerpVectors(t.from,t.to,a*a*(3-2*a));this.camera.lookAt(t.target);if(a===1)this.cameraTween=null}
  if(this.active&&!this.blocked&&!this.suspended&&!this.title){
   this.height=THREE.MathUtils.damp(this.height,this.targetHeight,3,dt);
   if(this.navigation){if(this.keys.size||this.touchMove.x||this.touchMove.y){this.navigation=null}else{const n=this.navigation;const goal=n.path[n.index];goal.y=this.height;const delta=goal.clone().sub(this.camera.position);delta.y=0;const distance=delta.length();if(distance<.12){n.index++;if(n.index>=n.path.length){this.yaw=Math.atan2(this.camera.position.x-n.center.x,this.camera.position.z-n.center.z);this.navigation=null;n.done?.()}}else{delta.normalize();this.camera.position.addScaledVector(delta,Math.min(distance,dt*3.4));this.yaw=THREE.MathUtils.damp(this.yaw,Math.atan2(-delta.x,-delta.z),6,dt)}}}
   let forward=Number(this.keys.has('KeyW')||this.keys.has('ArrowUp'))-Number(this.keys.has('KeyS')||this.keys.has('ArrowDown'))+this.touchMove.y;let strafe=Number(this.keys.has('KeyD'))-Number(this.keys.has('KeyA'))+this.touchMove.x;
   if(this.keys.has('ArrowLeft'))this.yaw+=dt*1.3;if(this.keys.has('ArrowRight'))this.yaw-=dt*1.3;
   if(forward||strafe){const len=Math.max(1,Math.hypot(forward,strafe));forward/=len;strafe/=len;const speed=(this.keys.has('ShiftLeft')?4.3:2.6)*dt*(this.state.size===11?.72:1);const dx=(-Math.sin(this.yaw)*forward+Math.cos(this.yaw)*strafe)*speed;const dz=(-Math.cos(this.yaw)*forward-Math.sin(this.yaw)*strafe)*speed;const p=this.camera.position;if(this.valid(p.x+dx,p.z))p.x+=dx;if(this.valid(p.x,p.z+dz))p.z+=dz;this.stepTime+=dt;if(this.stepTime>.48){this.callbacks.onStep?.();this.stepTime=0}}
   this.camera.position.y=this.height+((forward||strafe)?Math.sin(this.elapsed*11)*.018:0);this.camera.rotation.set(this.pitch,this.yaw,0,'YXZ');
   const target=this.targetAt();if(target?.id!==this.highlight?.id){this.highlight=target;this.callbacks.onTarget?.(target)}
   if(this.room==='hall'&&has(this.state,'feet')&&this.pitch>1.1)this.callbacks.onLookUp?.();
   if(this.overworld&&has(this.state,'assembly'))for(const side of ['amber','ivory']){const x=side==='amber'?66:78;if(Math.hypot(this.camera.position.x-x,this.camera.position.z+77)<.8){const dir=new THREE.Vector3();this.camera.getWorldDirection(dir);if(dir.dot(new THREE.Vector3(72-x,1,0).normalize())>.8)this.callbacks.onView?.(side)}}
  }
  if(this.valley)this.valley.update(this.elapsed);if(this.heldTool&&this.toolSwing!==undefined){this.toolSwing+=dt*4;this.heldTool.rotation.z=-.4-Math.sin(Math.min(this.toolSwing,Math.PI))*.6;if(this.toolSwing>=Math.PI)this.toolSwing=undefined}
  if(this.overworld&&this.active&&!this.blocked&&!this.suspended&&!this.title){const region=regionAt(this.camera.position.x,this.camera.position.z);if(region!==this.room){this.room=region;this.callbacks.onRegion?.(region)}
   if(Math.floor(this.elapsed*2)!==this.discoveryTick){this.discoveryTick=Math.floor(this.elapsed*2);for(const [id,box] of Object.entries(this.boxes))if(box.distanceToPoint(this.camera.position)<10)this.callbacks.onDiscover?.(id)}
  }
  if(this.rabbitActor)this.rabbitActor.update(dt,this.state,this.camera.position,this.blocked||this.title)
  if(this.motes){this.motes.rotation.y=Math.sin(this.elapsed*.02)*.07;this.motes.position.y=Math.sin(this.elapsed*.2)*.1}
  if(this.smoke?.visible)this.smoke.children.forEach((p,i)=>{p.position.y=p.userData.origin.y+Math.sin(this.elapsed*.7+i)*.23;p.position.x=p.userData.origin.x+Math.sin(this.elapsed*.4+i)*.15});
  if(this.smokeDigits)this.smokeDigits.position.y=Math.sin(this.elapsed*.6)*.05;
  if(this.effigyTweens?.length){this.effigyTweens=this.effigyTweens.filter(t=>{t.object.position.lerp(t.target,1-Math.exp(-dt*10));if(t.object.position.distanceTo(t.target)<.015){t.object.position.copy(t.target);if(t.hide)t.object.visible=false;return false}return true})}
  this.updateSpatial(dt,this.elapsed);

  if(!document.hidden&&!this.suspended){if(this.bloom.enabled)this.composer.render();else this.renderer.render(this.scene,this.camera);}
 }
}

installSpatialPuzzles(World);
