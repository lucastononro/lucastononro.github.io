// Puzzle rules shared by the interface and the 3D mechanisms.
export const SIZE_MARKS=[11,22,33,44,55];
export const LITTLE_DOOR={x:-2.4,z:-11.48,width:.7,height:.82};
export function canResize(item,current,target){return SIZE_MARKS.includes(target)&&(item==='biscuit'?target>current:item==='bottle'&&target<current)}
export function canPassLittleDoor(size){return SIZE_MARKS.includes(size)&&size/33*1.85<LITTLE_DOOR.height&&size/33*.48<LITTLE_DOOR.width}
export const APPOINTMENTS = [
 {id:'mushroom',h:3,m:10,title:'The mushroom',clue:'The hours follow each other…'},
 {id:'messenger',h:4,m:25,title:'The invitation',clue:'…but only the numeral on the clock…'},
 {id:'kitchen',h:5,m:40,title:'The cook’s testimony',clue:'…where the minute hand points…'},
 {id:'tea',h:6,m:0,title:'The tea service',clue:'…at each appointment, counts.'},
];
export const SIGN_TRAILS = [
 {id:'green',name:'Green · E',color:'#58bd89',points:[[1.7,-1.35],[-1.7,-1.35],[-1.7,0],[1.7,0],[1.7,1.35],[-1.7,1.35]]},
 {id:'brown',name:'Brown · X',color:'#b58655',points:[[-1.4,-1.1],[1.4,-1.1],[1.4,.2],[-1.4,.2],[-1.4,1.1],[1.4,1.1]]},
 {id:'amber',name:'Amber · I',color:'#efb34f',points:[[.3,-1.7],[.3,1.7]]},
 {id:'pink',name:'Pink · T',color:'#e875b2',points:[[-.95,-.75],[.95,-.75],[.95,.85],[-.95,.85],[-.95,-.75]]},
];
export function traceSign(progress,trail,index){
 const data=SIGN_TRAILS.find(t=>t.id===trail);const next=progress[trail]?.length||0;
 if(data&&index===0&&next===data.points.length-1&&data.points[0].join()===data.points.at(-1).join())index=next;
 if(!data||index!==next||index>=data.points.length)return false;
 (progress[trail]??=[]).push(index);return true;
}
export const HOUSE_ORDER=['♠ 6','♠ 4','Black bridge','♥ 6','♥ 4','♥ 2','Red bridge','♥ 5','♥ 7'];
export const HOUSE_SLOTS=[[-1.65,1.25,-2],[0,1.25,-2],[-.8,2.25,-2],[1.65,1.25,-2],[-.85,3.1,-2],[.85,3.1,-2],[0,4.15,-2],[-.38,4.95,-2],[.38,4.95,-2]];
export function validateHouse(order,faces={}){
 if(order.length!==9)return {ok:false,reason:'The house needs nine pieces. There are still gaps.'};
 if(order.some((piece,i)=>piece!==HOUSE_ORDER[i]))return {ok:false,reason:'The supports do not match the kings’ instructions. Check the sequence from the ground up.'};
 if(!faces['Black bridge']||!faces['Red bridge'])return {ok:false,reason:'A king is looking at the sky. Both engraved faces must point toward the matching marks beneath them.'};
 return {ok:true};
}
export const CROQUET_POINTS={start:[10,-2.7],4:[6,-3],7:[10,-6],6:[6,-9],1:[10,-10]};
export const CROQUET_OBSTACLES=[{x:9,z:-3.7,w:2.4,d:.4},{x:8,z:-8.5,w:.5,d:.8},{x:10,z:-8,w:.55,d:.5}];
export function shotSegment(from,to){
 const a=CROQUET_POINTS[from],b=CROQUET_POINTS[to];if(!a||!b||from===to)return {ok:false,reason:'Choose a different target.'};
 // Swept-circle collision against the actual lawn geometry, rather than a code-only check.
 for(let i=1;i<=100;i++){const t=i/100,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;
  if(CROQUET_OBSTACLES.some(o=>Math.abs(x-o.x)<o.w/2+.14&&Math.abs(z-o.z)<o.d/2+.14))return {ok:false,reason:'The hedgehog runs into an orange obstacle.',stop:[x,z]};
 }
 return {ok:true};
}
export function validateCroquet(route){return route.join(',')==='4,7,6,1'}
