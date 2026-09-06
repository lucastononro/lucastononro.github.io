import * as THREE from 'three';
export const REGION_OFFSETS={hall:[0,0],garden:[0,0],court:[72,-22],tower:[72,-75]};
// Leave the full east road open at the west court entrance. These same wall
// rectangles drive the decoration and movement boundary.
export const COURT_WALLS=[[58,-31,.75,5],[86,-29,.75,7]];
export const COURT_OUTER_HEDGES=[[58,-31.55,.4,5.95],[58,-12.45,.4,5.95],[86,-31,.4,6.5],[86,-13,.4,6.5]];
const COURT_BOUNDARIES=[...COURT_WALLS,...COURT_OUTER_HEDGES];
export const GARDEN_SHIFTS={schedule:[0,15],caterpillar:[-11,3],messenger:[10,9],kitchen:[-12,-14],tea:[12,-10],fan:[-17,10],minutes:[0,-5],signs:[0,-15]};
export const ROOM_IDS={hall:['story','shadow','arithmetic','letter','biscuit','bottle','key','small_door','door_2','door_9','door_4','door_7','ceiling','rabbit'],garden:['schedule','mushroom','caterpillar','messenger','kitchen','tea','fan','minutes','signs','garden_exit','forest_map','bridge_note','fan_note'],court:['maze','roses','brush','gardeners','trial','tart','guard_original','guard_impostor','croquet','effigies','decree','court_exit'],tower:['assembly','structure','amber_view','ivory_view','final_lock','cat_eyes']};
export function hotspotRoom(id){return Object.keys(ROOM_IDS).find(r=>ROOM_IDS[r].includes(id))||'garden'}
export function worldOffset(id){const room=hotspotRoom(id);const base=REGION_OFFSETS[room];const shift=GARDEN_SHIFTS[id]||[0,0];return [base[0]+shift[0],base[1]+shift[1]]}
export function shiftPoint(p,id){const [x,z]=worldOffset(id);return [p[0]+x,p[1],p[2]+z]}
export function regionAt(x,z){if(x>49&&z<-52)return 'tower';if(x>48)return 'court';return 'garden'}
export function insideValley(x,z,state){
 const garden=x>=-31&&x<=32&&z>=-34&&z<=34;
 const court=x>=57&&x<=87&&z>=-37.1&&z<=-7;
 const eastRoad=x>=30&&x<=59&&z>=-25&&z<=-19;
 const tower=x>=62.8&&x<=81.2&&z>=-85.4&&z<=-64;
 const towerRoad=x>=68.5&&x<=76&&z>=-66&&z<=-34;
 if(!(garden||court||eastRoad||tower||towerRoad))return false;
 if(x>33.5&&x<37&&!state.solved.includes('signs'))return false;
 if(z<-48&&x>50&&!state.solved.includes('decree'))return false;
 // The stream is crossed by three actual timber bridges.
 if(garden&&z>-6.8&&z<-2.1&&Math.min(Math.abs(x),Math.abs(x-18),Math.abs(x+18))>1.75)return false;
 if(COURT_BOUNDARIES.some(([cx,cz,rx,rz])=>Math.abs(x-cx)<rx+.24&&Math.abs(z-cz)<rz+.24))return false;
 return true;
}
export function addValley(scene){
 const group=new THREE.Group();group.name='Wonderland valley';scene.add(group);const mats={stone:new THREE.MeshStandardMaterial({color:'#6c7b69',roughness:.93}),path:new THREE.MeshStandardMaterial({color:'#958e67',roughness:1}),ground:new THREE.MeshStandardMaterial({color:'#344d32',roughness:1}),wood:new THREE.MeshStandardMaterial({color:'#563b25',roughness:.84}),gold:new THREE.MeshStandardMaterial({color:'#bca06b',roughness:.45,metalness:.4}),leaf:new THREE.MeshStandardMaterial({color:'#385830',roughness:1})};
 const box=(p,s,m)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(...s),mats[m]);o.position.set(...p);o.castShadow=true;o.receiveShadow=true;group.add(o);return o};
 const ribbon=(points,width,mat='path')=>{const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const pts=curve.getPoints(100);const vertices=[],indices=[];for(let i=0;i<pts.length;i++){const tang=curve.getTangent(i/100);const n=new THREE.Vector3(-tang.z,0,tang.x).normalize().multiplyScalar((typeof width==='function'?width(pts[i]):width)/2);for(const dir of [-1,1]){const p=pts[i].clone().addScaledVector(n,dir);vertices.push(p.x,p.y,p.z)}if(i<100){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2)}}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();const o=new THREE.Mesh(geo,mats[mat]);o.receiveShadow=true;group.add(o);return curve};
 // Branching routes connect recognizable places. No menu transition between the outdoor regions.
 ribbon([[0,.04,25],[-5,.04,20],[-14,.04,16],[-22,.04,16]],2.4);
 ribbon([[0,.04,15],[7,.04,12],[16,.04,10]],2.6);
 ribbon([[0,.04,6],[-9,.04,7],[-17,.04,3],[-18,.04,-8],[-18,.04,-18]],2.5);
 ribbon([[0,.04,-9],[9,.04,-10],[18,.04,-10],[18,.04,-18]],2.7);
 // One continuous path narrows at the court entrance and leads around the
 // low maze's west side. Separate overlapping ribbons looked like loose boards.
 const entrancePath=ribbon([[0,.04,-26],[11,.04,-29],[23,.04,-25],[32,.04,-22],[48,.04,-22],[56,.04,-22],[59.4,.04,-21.5],[59.4,.04,-18],[59.4,.04,-15.8],[62,.04,-14.6],[66,.04,-14.4],[72,.04,-14.4]],p=>3.8-THREE.MathUtils.clamp((p.x-53)/6,0,1)*2.1);
 box([44,-.28,-22],[29,.5,6],'ground');
 ribbon([[72,.04,-35],[73,.04,-43],[71,.04,-53],[72,.04,-65]],3.6);
 box([72,-.3,-50],[7.5,.5,33],'ground');
 // Animated stream and lagoon.
 const waterUniform={value:0};const waterMat=new THREE.MeshStandardMaterial({color:'#377f80',roughness:.2,metalness:.5,transparent:true,opacity:.91});waterMat.onBeforeCompile=shader=>{shader.uniforms.uTime=waterUniform;shader.vertexShader='uniform float uTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.z += sin(position.x * 2.8 + uTime * 1.2) * 0.022 + sin(position.y * 3.0 + uTime) * 0.018;')};
 const water=new THREE.Mesh(new THREE.PlaneGeometry(66,5.3,90,16),waterMat);water.rotation.x=-Math.PI/2;water.position.set(0,.075,-4.45);group.add(water);
 const ocean=new THREE.Mesh(new THREE.PlaneGeometry(440,440,30,30),waterMat);ocean.rotation.x=-Math.PI/2;ocean.position.set(35,-2.5,-30);group.add(ocean);
 for(const x of [-18,0,18]){
  for(let i=0;i<19;i++)box([x,.2,-8+i*.43],[3.45,.18,.36],'wood');
  for(const dx of [-1.7,1.7]){
   for(const z of [-7.8,-4.2,-.4])box([x+dx,.85,z],[.13,1.7,.13],'wood');box([x+dx,1.35,-4.1],[.08,.07,7.4],'gold');box([x+dx,.85,-4.1],[.08,.07,7.4],'gold');
  }
 }
 // These gates physically mark the two progression boundaries.
 const eastGate=new THREE.Group();eastGate.position.set(35,0,-22);group.add(eastGate);
 for(const z of [-2.6,2.6])box([35,1.8,-22+z],[.5,3.6,.5],'stone');
 for(let i=-5;i<=5;i++){const bar=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,2.8,7),mats.gold);bar.position.set(0,1.4,i*.45);eastGate.add(bar)}
 const towerGate=new THREE.Group();towerGate.position.set(72,0,-48);group.add(towerGate);
 for(const x of [-2.6,2.6])box([72+x,2,-48],[.5,4,.5],'stone');box([72,4,-48],[5.7,.35,.5],'stone');
 for(let i=-5;i<=5;i++){const bar=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,3.7,7),mats.gold);bar.position.set(i*.45,1.85,0);towerGate.add(bar)}
 // Rocks, ferns, reeds, hills and ruined walls make the route more than a flat lawn.
 const rockGeo=new THREE.IcosahedronGeometry(1,1);let seed=832;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 for(let i=0;i<90;i++){const x=-31+random()*63;const z=-4.4+(random()>.5?-3.5:3.5);if(Math.min(Math.abs(x),Math.abs(x-18),Math.abs(x+18))<2.4)continue;const o=new THREE.Mesh(rockGeo,mats.stone);o.position.set(x,.22,z);o.scale.set(.3+random()*.7,.2+random()*.5,.3+random()*.5);o.rotation.y=random()*6;o.castShadow=true;group.add(o)}
 for(const [x,z,s] of [[-38,3,8],[-35,-26,7],[6,-40,10],[30,25,9],[43,-38,10],[94,-16,8],[92,-62,12],[55,-89,10]]){
  const hill=new THREE.Mesh(new THREE.IcosahedronGeometry(1,2),mats.ground);hill.position.set(x,-1,z);hill.scale.set(s,s*.65,s*.8);group.add(hill)
 }
 for(const [x,z,rx,rz] of COURT_WALLS){box([x,3,z],[rx*2,6,rz*2],'stone').name='Court boundary wall';for(let at=z-rz+1;at<=z+rz-1;at+=2)box([x,6.3,at],[1.7,.85,.95],'stone').name='Court battlement'}
 for(const x of [62,82]){const tower=new THREE.Mesh(new THREE.CylinderGeometry(1.9,2.3,12,14),mats.stone);tower.position.set(x,5.8,-79);tower.castShadow=true;group.add(tower);const roof=new THREE.Mesh(new THREE.ConeGeometry(2.8,6,14),mats.wood);roof.position.set(x,14.8,-79);group.add(roof)}
 // Hundreds of grass clusters are one draw call, with a breeze in the vertex shader.
 const gv=[];for(let blade=0;blade<3;blade++){const a=blade*Math.PI/3;const verts=[[-.028,0],[.028,0],[-.018,.23],[.018,.23],[.09,.48]];const points=verts.map(([x,y])=>[Math.cos(a)*x,y,Math.sin(a)*x]);for(const tri of [[0,1,2],[1,3,2],[2,3,4]])for(const i of tri)gv.push(...points[i])}const grassGeo=new THREE.BufferGeometry();grassGeo.setAttribute('position',new THREE.Float32BufferAttribute(gv,3));grassGeo.computeVertexNormals();const grassMat=new THREE.MeshStandardMaterial({color:'#58713e',roughness:1,side:THREE.DoubleSide});const grassTime={value:0};grassMat.onBeforeCompile=shader=>{shader.uniforms.uTime=grassTime;shader.vertexShader='uniform float uTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x += sin(uTime * 1.6 + instanceMatrix[3].x * .5 + instanceMatrix[3].z * .8) * .11 * position.y;')};
 const grass=new THREE.InstancedMesh(grassGeo,grassMat,1800);const dummy=new THREE.Object3D();for(let i=0;i<1800;i++){let x=-30+random()*60,z=-33+random()*66;if(Math.abs(x)<2.1||z>-7&&z<-1){x+=x>0?3:-3;z+=6}dummy.position.set(x,.04,z);dummy.rotation.y=random()*Math.PI;dummy.scale.setScalar(.55+random()*.8);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix)}group.add(grass);
 const butterflies=new THREE.Group();group.add(butterflies);for(let i=0;i<12;i++){const wingMat=new THREE.MeshBasicMaterial({color:i%2?'#e6ae77':'#85c6d9',side:THREE.DoubleSide});const bug=new THREE.Group();for(const side of [-1,1]){const wing=new THREE.Mesh(new THREE.CircleGeometry(.1,5),wingMat);wing.position.x=.08*side;bug.add(wing)}bug.userData.base=new THREE.Vector3(-20+random()*43,1.5+random()*1.2,-27+random()*49);butterflies.add(bug)}
 return {group,entrancePath,sync(state){eastGate.position.y=state.solved.includes('signs')?-3:0;towerGate.position.y=state.solved.includes('decree')?-4:0},update(t){waterUniform.value=t;grassTime.value=t;butterflies.children.forEach((bug,i)=>{bug.position.copy(bug.userData.base);bug.position.x+=Math.sin(t*.4+i)*1.4;bug.position.z+=Math.cos(t*.35+i)*1.3;bug.position.y+=Math.sin(t+i)*.25;bug.children.forEach((wing,j)=>wing.rotation.y=Math.sin(t*13+i)*(j?1:-1))})}};
}
