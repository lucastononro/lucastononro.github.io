import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialState,restoreState,solve,collect,checkAnswer,canVisit,PUZZLES,objective,ASSEMBLY_ORDER} from '../src/puzzles.js';
test('all source-derived locks accept their intended answers and reject wrong ones',()=>{
 const answers={story:'2135',shadow:'33',arithmetic:'13',letter:'A',biscuit:'55',bottle:'11',feet:'77',caterpillar:'88',messenger:'1',tea:'T',minutes:'2580',signs:'5210',maze_garden:'29',maze_court:'99',maze_croquet:'49',croquet:'4761',effigies:'54',decree:'RKZ',final_lock:'7832'};
 for(const [id,answer] of Object.entries(answers)){assert.ok(checkAnswer(id,answer),id);assert.equal(checkAnswer(id,'wrong'),false,id)}
});
test('chapter gates remain closed until their preceding spatial puzzle is complete',()=>{
 const s=initialState();assert.ok(canVisit(s,'hall'));for(const r of ['garden','court','tower'])assert.equal(canVisit(s,r),false);
 solve(s,'ceiling');assert.ok(canVisit(s,'garden'));assert.equal(canVisit(s,'court'),false);
 solve(s,'signs');assert.ok(canVisit(s,'court'));assert.equal(canVisit(s,'tower'),false);
 solve(s,'decree');assert.ok(canVisit(s,'tower'));
});
test('full adventure state round-trips without losing inventory or its ending',()=>{
 const s=initialState();for(const id of Object.keys(PUZZLES))solve(s,id,PUZZLES[id].note);for(const id of ['key','fan','brush','rose_token','guard_token','alice_token','amber','ivory'])collect(s,id);
 s.room='tower';s.assembly=[...ASSEMBLY_ORDER];s.completed=true;s.minutes=42;const copy=restoreState(JSON.stringify(s));assert.deepEqual(copy,s);assert.equal(objective(copy),'You found your way home.');
});
test('save corruption starts a playable clean game',()=>{for(const raw of [null,'{broken','{}','{"version":9}','{"version":1,"room":"moon","solved":[]}'])assert.deepEqual(restoreState(raw),initialState())});
test('solving twice never duplicates a journal entry or collectible',()=>{const s=initialState();assert.equal(solve(s,'story','a'),true);assert.equal(solve(s,'story','b'),false);collect(s,'key');collect(s,'key');assert.equal(s.notes.length,1);assert.equal(s.inventory.length,1)});
test('English decree has exactly the three intended absent letters',()=>{const sentence=PUZZLES.decree.description.split('“')[1].split('”')[0].toLowerCase();const missing=[...'abcdefghijklmnopqrstuvwxyz'].filter(c=>!sentence.includes(c));assert.deepEqual(missing,['k','r','z'])});
test('every Blender room has geometry and all required gameplay hotspots',()=>{
 const requiredByRoom={hall:['story','shadow','key','small_door','ceiling'],garden:['caterpillar','messenger','kitchen','tea','fan','signs'],court:['maze','roses','brush','trial','tart','croquet','effigies','decree'],tower:['assembly','structure','amber_view','ivory_view','final_lock']};
 for(const [room,required] of Object.entries(requiredByRoom)){
  const b=readFileSync(new URL('../public/models/'+room+'.glb',import.meta.url));assert.equal(b.toString('utf8',0,4),'glTF');const length=b.readUInt32LE(12);const doc=JSON.parse(b.toString('utf8',20,20+length));const ids=doc.nodes.map(n=>n.extras?.hotspot).filter(Boolean);for(const id of required)assert.ok(ids.includes(id),room+': '+id);assert.ok(doc.meshes.length>10);assert.ok(b.length<12000000,room+' stays within the asset budget');
 }
});

test('the valley opens its gates only after the corresponding puzzles',async()=>{
 const {insideValley}=await import('../src/overworld.js');const s=initialState();
 assert.equal(insideValley(35,-22,s),false);solve(s,'signs');assert.equal(insideValley(35,-22,s),true);
 assert.equal(insideValley(72,-50,s),false);solve(s,'decree');assert.equal(insideValley(72,-50,s),true);
 assert.equal(insideValley(10,-4,s),false);assert.equal(insideValley(0,-4,s),true);assert.equal(insideValley(-18,-4,s),true);assert.equal(insideValley(18,-4,s),true);
 assert.equal(insideValley(120,100,s),false);
});
test('connected outdoor regions share reachable corridors',async()=>{
 const {insideValley,regionAt}=await import('../src/overworld.js');const s=initialState();solve(s,'signs');solve(s,'decree');
 for(let x=30;x<=59;x++)assert.equal(insideValley(x,-22,s),true,'east road '+x);
 for(let z=-36;z>=-65;z--)assert.equal(insideValley(72,z,s),true,'tower road '+z);
 assert.equal(regionAt(0,20),'garden');assert.equal(regionAt(72,-22),'court');assert.equal(regionAt(72,-75),'tower');
});
test('interactive Blender props keep their own geometry and reasonable bounds',async()=>{
 const THREE=await import('three');const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
 for(const room of ['hall','garden','court','tower']){
  const b=readFileSync(new URL('../public/models/'+room+'.glb',import.meta.url));const gltf=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');gltf.scene.traverse(o=>{if(o.userData.hotspot){const size=new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());assert.ok(Math.max(size.x,size.y,size.z)<12,room+' '+o.name+' has an oversized interaction volume: '+size.toArray());}})
 }
});
test('the White Rabbit exports three articulated animation clips',async()=>{
 const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');const b=readFileSync(new URL('../public/models/white-rabbit.glb',import.meta.url));const gltf=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');assert.deepEqual(gltf.animations.map(a=>a.name),['Idle','Hop','CheckWatch']);for(const clip of gltf.animations){assert.ok(clip.tracks.length>=4,clip.name);assert.ok(clip.duration>.8,clip.name)}assert.ok(gltf.scene.getObjectByName('Ear_L'));assert.ok(gltf.scene.getObjectByName('PocketWatch'));
});
test('the rabbit follows its route while its watch stays attached to its paw',async()=>{
 const THREE=await import('three');const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');const {RabbitActor}=await import('../src/rabbit.js');const b=readFileSync(new URL('../public/models/white-rabbit.glb',import.meta.url));const asset=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');const actor=new RabbitActor(asset);const state=initialState();const original=actor.model.position.clone();for(let i=0;i<360;i++)actor.update(1/60,state,new THREE.Vector3(0,1.7,20),false);actor.model.updateMatrixWorld(true);assert.ok(actor.model.position.distanceTo(original)>1);assert.equal(actor.current,'Hop');const watch=actor.model.getObjectByName('PocketWatch');assert.equal(watch.parent.name,'Arm_R');assert.ok(watch.getWorldPosition(new THREE.Vector3()).distanceTo(actor.model.position)<2);assert.equal(actor.model.getObjectByName('Ear_L').parent.name,'Head');
});

test('every courtyard interaction is reachable through the hedge openings',async()=>{
 const THREE=await import('three');const {World}=await import('../src/world.js');const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
 const world=Object.create(World.prototype);world.room='court';world.overworld=true;world.state=initialState();world.state.solved=['signs','decree'];world.colliders=world.roomColliders('court').map(([x,z,rx,rz])=>[x+72,z-22,rx,rz]);
 const step=.5,queue=[[144,-18]],seen=new Set(['144,-18']);
 for(let i=0;i<queue.length;i++){const [x,z]=queue[i];for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,key=nx+','+nz;if(nx<114||nx>174||nz< -74||nz> -14||seen.has(key)||!world.valid(nx*step,nz*step))continue;seen.add(key);queue.push([nx,nz]);}}
 const b=readFileSync(new URL('../public/models/court.glb',import.meta.url));const asset=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');asset.scene.position.set(72,0,-22);asset.scene.updateMatrixWorld(true);
 asset.scene.traverse(o=>{if(!o.userData.hotspot)return;const box=new THREE.Box3().setFromObject(o);const center=box.getCenter(new THREE.Vector3());assert.ok(queue.some(([x,z])=>z*step>center.z+.55&&box.distanceToPoint(new THREE.Vector3(x*step,1.7,z*step))<2.5),'No walkable approach to '+o.userData.hotspot);});
});

test('the croquet geometry admits exactly the source route in three distinct rebounds',async()=>{
 const {shotSegment,validateCroquet}=await import('../src/mechanics.js');const routes=[[4,7,6,1],[4,6,7,1],[6,4,7,1],[6,7,4,1],[7,4,6,1],[7,6,4,1]];
 const clear=routes.filter(route=>route.every((n,i)=>shotSegment(i?route[i-1]:'start',n).ok));assert.deepEqual(clear,[[4,7,6,1]]);assert.ok(validateCroquet(clear[0]));assert.equal(validateCroquet([4,6,7,1]),false);assert.ok(shotSegment('start',7).stop);
});
test('the kings require the correct pieces and both matching bridge faces downward',async()=>{
 const {HOUSE_ORDER,validateHouse}=await import('../src/mechanics.js');assert.equal(validateHouse(HOUSE_ORDER).ok,false);assert.equal(validateHouse(HOUSE_ORDER,{'Black bridge':true}).ok,false);assert.equal(validateHouse(HOUSE_ORDER,{'Black bridge':true,'Red bridge':true}).ok,true);
 const wrong=[...HOUSE_ORDER];[wrong[0],wrong[1]]=[wrong[1],wrong[0]];assert.equal(validateHouse(wrong,{'Black bridge':true,'Red bridge':true}).ok,false);assert.equal(validateHouse(HOUSE_ORDER.slice(0,8)).ok,false);
});
test('sign trails reject skipped arrows and allow returning to a closed loop’s start',async()=>{
 const {traceSign,SIGN_TRAILS}=await import('../src/mechanics.js');const progress={};assert.equal(traceSign(progress,'green',3),false);assert.deepEqual(progress,{});
 for(const trail of SIGN_TRAILS)for(let i=0;i<trail.points.length;i++)assert.ok(traceSign(progress,trail.id,trail.id==='pink'&&i===4?0:i));assert.equal(traceSign(progress,'green',0),false);assert.equal(progress.pink.length,5);
});
test('the new clues preserve source discoveries without leaking later answers',async()=>{
 for(const id of ['mushroom','messenger','kitchen','tea'])assert.doesNotMatch(PUZZLES[id].note,/hand points at [0258]/);assert.doesNotMatch(PUZZLES.minutes.description,/2580|long hands|minute hand/);assert.doesNotMatch(PUZZLES.signs.description,/5210/);assert.doesNotMatch(PUZZLES.effigies.description,/above the knave|54/);
 assert.ok(checkAnswer('gardeners_match','257'));assert.equal(checkAnswer('gardeners_match','123'),false);
});
test('Blender exports the solitary mushroom with 33 spots and nine individual house pieces',async()=>{
 const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');const parse=async room=>{const b=readFileSync(new URL('../public/models/'+room+'.glb',import.meta.url));return (await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene};
 const garden=await parse('garden');let mushroom;garden.traverse(o=>{if(o.userData.hotspot==='mushroom')mushroom=o});assert.ok(mushroom);let spots=0;mushroom.traverse(o=>{if(o.name.startsWith('cap_spot'))spots++});assert.equal(spots,33);
 const tower=await parse('tower');const pieces=[];tower.traverse(o=>{if(o.userData.pieceIndex!==undefined)pieces.push(o.userData.pieceIndex)});assert.deepEqual(pieces.sort((a,b)=>a-b),[0,1,2,3,4,5,6,7,8]);
});

test('guard comparison preserves the same sash and the seven intended differing details',async()=>{
 const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');const b=readFileSync(new URL('../public/models/court.glb',import.meta.url));const scene=(await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;
 const roots={};scene.traverse(o=>{if(['guard_original','guard_impostor'].includes(o.userData.hotspot))roots[o.userData.hotspot]=o});
 const a=roots.guard_original,b2=roots.guard_impostor;const part=(root,prefix)=>root.children.find(o=>o.name.startsWith(prefix));
 assert.deepEqual(part(a,'sash').rotation.toArray(),part(b2,'sash').rotation.toArray());assert.equal(part(a,'sash').material.name,part(b2,'sash').material.name);
 for(const prefix of ['hat_band','glove','heart_emblem','jacket_border'])assert.notEqual(part(a,prefix).material.name,part(b2,prefix).material.name,prefix);
 assert.equal(part(a,'moustache'),undefined);assert.ok(part(b2,'moustache'));
 assert.notDeepEqual(part(a,'heart_emblem').quaternion.toArray(),part(b2,'heart_emblem').quaternion.toArray());
 const bladeA=part(a,'halberd_blade').geometry.attributes.position.array,bladeB=part(b2,'halberd_blade').geometry.attributes.position.array;
 const shape=positions=>Array.from(positions).map((v,i)=>i%3===0?+(v-positions[0]).toFixed(4):+v.toFixed(4));assert.notDeepEqual(shape(bladeA),shape(bladeB));
});
