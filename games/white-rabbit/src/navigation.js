// Plan with the same short collision samples used by manual movement. In open
// space a diagonal should be one line, not a staircase of half-metre turns.
export function clearWalkingSegment(a,b,valid){
 const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.08));
 for(let i=1;i<=n;i++)if(!valid(a.x+(b.x-a.x)*i/n,a.z+(b.z-a.z)*i/n))return false;
 return true;
}

export function smoothWalkingPath(path,valid){
 if(path.length<3)return path;
 const result=[path[0]];let from=0;
 while(from<path.length-1){
  let next=path.length-1;
  while(next>from+1&&!clearWalkingSegment(path[from],path[next],valid))next--;
  result.push(path[next]);from=next;
 }
 return result;
}

class Frontier{
 constructor(){this.nodes=[]}
 push(node){const a=this.nodes;let i=a.length;a.push(node);while(i){const p=(i-1)>>1;if(a[p].f<=node.f)break;a[i]=a[p];i=p}a[i]=node}
 pop(){const a=this.nodes,first=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&a[c+1].f<a[c].f)c++;if(a[c].f>=last.f)break;a[i]=a[c];i=c}a[i]=last}return first}
}

export function findWalkingPath({start,target,valid,isGoal,step=.5,maxNodes=18000}){
 const key=(x,z)=>x+','+z;
 const point=(x,z)=>({x:start.x+x*step,z:start.z+z*step});
 const estimate=p=>Math.max(0,Math.hypot(p.x-target.x,p.z-target.z)-2.5)/step;
 const frontier=new Frontier(),best=new Map([['0,0',0]]),parents=new Map([['0,0',null]]);
 frontier.push({x:0,z:0,g:0,f:estimate(start)});let goal=null,expanded=0;
 while(frontier.nodes.length&&expanded<maxNodes){
  const node=frontier.pop(),id=key(node.x,node.z);if(node.g!==best.get(id))continue;
  expanded++;const from=point(node.x,node.z);
  if(isGoal(from)){goal=id;break}
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
   const x=node.x+dx,z=node.z+dz,id=key(x,z),g=node.g+Math.hypot(dx,dz);
   if(g>=(best.get(id)??Infinity))continue;
   // No diagonal corner cuts past blocked cardinal neighbours.
   if(dx&&dz&&(!valid(from.x+dx*step,from.z)||!valid(from.x,from.z+dz*step)))continue;
   const to=point(x,z);if(!clearWalkingSegment(from,to,valid))continue;
   best.set(id,g);parents.set(id,key(node.x,node.z));frontier.push({x,z,g,f:g+estimate(to)});
  }
 }
 if(goal===null)return null;
 const path=[];for(let id=goal;id!==null;id=parents.get(id)){const [x,z]=id.split(',').map(Number);path.unshift(point(x,z))}
 return smoothWalkingPath(path,valid);
}

export function dampHeading(current,target,smoothing,dt){
 const delta=Math.atan2(Math.sin(target-current),Math.cos(target-current));
 return current+delta*(1-Math.exp(-smoothing*dt));
}
