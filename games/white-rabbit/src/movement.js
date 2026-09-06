// Keep travel tied to elapsed time. Check short segments so a slow frame
// cannot carry the player through a thin wall or across a river bank.
export function moveWithCollision(position,dx,dz,valid){
 const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.08));
 for(let i=0;i<steps;i++){
  const x=position.x+dx/steps;if(valid(x,position.z))position.x=x;
  const z=position.z+dz/steps;if(valid(position.x,z))position.z=z;
 }
}

export function advancePath(position,navigation,distance){
 let heading=null;
 while(navigation.index<navigation.path.length){
  const goal=navigation.path[navigation.index];
  const dx=goal.x-position.x,dz=goal.z-position.z,length=Math.hypot(dx,dz);
  if(length<.0001){navigation.index++;continue}
  if(distance<=0)break;
  const travel=Math.min(length,distance);heading=Math.atan2(-dx,-dz);
  position.x+=dx/length*travel;position.z+=dz/length*travel;distance-=travel;
  if(travel===length)navigation.index++;
 }
 return {done:navigation.index===navigation.path.length,heading};
}

export function inKitchenEntrance(box,position){
 const centerX=(box.min.x+box.max.x)/2;
 return Math.abs(position.x-centerX)<1 && position.z>=box.max.z+.2 && position.z<=box.max.z+3;
}
