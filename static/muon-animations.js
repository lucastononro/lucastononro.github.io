// Pure scene functions also generate the static SVGs shipped with the article.
const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
const mix = (a, b, t) => a + (b - a) * t;
const fmt = (x, n = 2) => (Math.abs(x) < .5 * 10 ** -n ? 0 : x).toFixed(n).replace('-', '−');
const pt = a => a.map(v => v.toFixed(2)).join(',');
const line = (a, b, cls = 'mf-axis', more = '') => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" class="${cls}" ${more}/>`;
const text = (x, y, value, cls = '', anchor = 'start') => `<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${value}</text>`;
const dot = (p, cls = 'mf-dot', r = 5) => `<circle cx="${p[0]}" cy="${p[1]}" r="${r}" class="${cls}"/>`;
const path = (points, cls) => `<polyline fill="none" points="${points.map(pt).join(' ')}" class="${cls}"/>`;
const arrow = (a, b, cls = 'mf-orange') => {
  const dx = b[0] - a[0], dy = b[1] - a[1], norm = Math.hypot(dx, dy);
  if (norm < 1) return '';
  const ux = dx / norm, uy = dy / norm, size = Math.min(8, norm * .4);
  const c = [b[0] - size * ux, b[1] - size * uy];
  return line(a, b, cls) + `<path d="M${pt([c[0]-size*.5*uy,c[1]+size*.5*ux])} L${pt(b)} L${pt([c[0]+size*.5*uy,c[1]-size*.5*ux])}" class="${cls}"/>`;
};
const desc = s => `<desc>${s}</desc>`;
let mathRenderer;
const equationCache=new Map();
export function configureMathRenderer(katex) {
  mathRenderer=tex=>katex.renderToString(tex,{throwOnError:true,strict:'error',trust:false,output:'htmlAndMathml'});
  equationCache.clear();
}
function math(tex,cls='',opacity=1) {
  if(!mathRenderer)throw new Error('Animated formulas require the bundled math renderer.');
  if(!equationCache.has(tex))equationCache.set(tex,mathRenderer(tex));
  return `<span class="${cls}" style="opacity:${opacity}">${equationCache.get(tex)}</span>`;
}
const mathRow=(x,y,width,content,cls='')=>`<foreignObject x="${x}" y="${y}" width="${width}" height="58"><div xmlns="http://www.w3.org/1999/xhtml" class="mf-equation ${cls}">${content}</div></foreignObject>`;
const phase = (time, seconds, steps) => {
  const t = clamp(time / seconds, 0, steps);
  return { k: Math.min(steps - 1, Math.floor(t)), f: t >= steps ? 1 : clamp((t % 1 - .22) / .65), done: t >= steps };
};

export const descentLoss = ([x,y]) => (x*x-1)**2+.3*(x-1)**2+8*y*y;
export const descentGradient = ([x,y]) => [4*x*(x*x-1)+.6*(x-1),16*y];
export function gradientStates(start=[-1.4,.65], alpha=.09, maxSteps=48) {
  const states=[start.slice()];
  for(let i=0;i<maxSteps;i++){
    const w=states.at(-1),g=descentGradient(w);
    if(Math.hypot(...g)<.0001)break;
    states.push(w.map((v,j)=>v-alpha*g[j]));
  }
  return states;
}
export function newGradientStart(random=Math.random,side=1) {
  return [side*(1.05+.35*random()),(.45+.25*random())*(random()<.5?-1:1)];
}
export function taylorState(time) {
  const h=time<6?1.2*ease((time-3)/3):time<9?1.2:time<12?mix(1.2,.6,ease((time-9)/3)):time<15?mix(.6,.3,ease((time-12)/3)):mix(.3,.15,ease((time-15)/2));
  const x=1+h;
  return {h,x,actual:x*x,predicted:1+2*h,error:h*h,tangent:ease(time/3),reveal:ease((time-6)/2)};
}
export function derivativeState(time) {
  const h=time<4?mix(1,.5,ease(time/4)):time<8?mix(.5,.1,ease((time-4)/4)):mix(.1,.02,ease((time-8)/4));
  return {h,slope:2+h};
}
export function spectralState(time) {
  const theta=time<=12?2*Math.PI*clamp(time/12):2*Math.PI+Math.PI/4*ease((time-12)/3);
  const x=[Math.cos(theta),Math.sin(theta)],dx=[1.5*x[0]+.5*x[1],.5*x[0]+1.5*x[1]];
  return {theta,x,dx,length:Math.hypot(...dx),settled:time>=15};
}
export function budgetState(time) {
  const example=Math.min(2,Math.floor(time/12)),g=[[2,1],[1,2],[2,-1]][example],p=clamp((time-example*12)/12);
  const norm=Math.hypot(...g),slide=ease((p-.35)/.45);
  return {g,example,slide,p,arrow:ease((p-.15)/.15),frobenius:g.map(v=>-v/norm),spectral:g.map(v=>-Math.sign(v)),
    stage:p<.15?'1. Shading shows the allowed updates':p<.35?'2. The blue arrow points toward lower scores':p<.8?'3. Slide the equal-score line in that direction':'4. Last contact: this is the best allowed update'};
}
export function momentumStates() {
  const gradients = [[1,1.25],[.8,-1.05],[1.2,.95],[.9,-1.3],[1.1,1.15],[1.25,-.9],[.85,.7],[1.05,-1.1],[.95,1.3],[1.15,-.75],[.9,.8],[1,-.9]];
  const means = [[0,0]];
  for (const g of gradients) means.push(g.map((v,i) => .8 * means.at(-1)[i] + .2 * v));
  return {gradients, means};
}
export const momentumBatchSeconds=4.8;
export function momentumFrame(time) {
  const {gradients,means}=momentumStates();
  const position=clamp(time/momentumBatchSeconds,0,gradients.length);
  const k=Math.min(gradients.length-1,Math.floor(position)),p=position>=gradients.length?1:position-k;
  const prev=means[k],g=gradients[k],retained=prev.map(v=>.8*v),added=g.map(v=>.2*v),next=means[k+1];
  const smooth=t=>{const u=clamp(t);return u*u*(3-2*u);};
  return {k,p,prev,g,retained,added,next,gradients,means,
    keep:smooth((p-.06)/.22),take:smooth((p-.3)/.22),move:smooth((p-.54)/.18),sum:smooth((p-.74)/.12),
    stage:p<.3?'Keep 80% of the previous estimate':p<.54?'Take 20% of the incoming gradient':p<.86?'Add the two weighted vectors':'Use the result as the next memory'};
}
export const cubic = s => 1.5*s - .5*s**3;
export const quintic = s => 3.4445*s - 4.775*s**3 + 2.0315*s**5;
export function polynomialStates(start) {
  const p=[start], q=[start];
  for(let i=0;i<12;i++){p.push(cubic(p.at(-1)));q.push(quintic(q.at(-1)));}
  return {p,q};
}

const ease=t=>{const u=clamp(t);return u*u*(3-2*u);};
export function fixedPointFrame(time) {
  const repelling=time>=22,slope=repelling?2:.5,start=repelling?24:2;
  const elapsed=clamp((time-start)/6,0,3),completed=Math.floor(elapsed);
  const k=Math.min(2,completed),progress=elapsed>=3?1:elapsed-k;
  const values=[.9];
  for(let i=0;i<3;i++)values.push(1+slope*(values.at(-1)-1));
  const points=[[values[0],0]];
  for(let i=0;i<completed;i++)points.push([values[i],values[i+1]],[values[i+1],values[i+1]]);
  if(completed<3){
    const previous=points.at(-1),corner=[values[k],values[k+1]];
    if(progress<.58)points.push(previous.map((v,i)=>mix(v,corner[i],ease((progress-.25)/.28))));
    else points.push(corner,[mix(values[k],values[k+1],ease((progress-.58)/.28)),values[k+1]]);
  }
  const stage=time<start?'One stays one. What happens to a nearby value?':elapsed>=3?`The error ${repelling?'doubles':'halves'} at every step`:progress<.25?'Carry the current input into the formula':progress<.58?'Substitute, calculate, and go up to the curve':progress<.86?'Carry the output back: it is the next input':'Reuse that number. Repeat the same operation.';
  return {repelling,slope,k,progress,completed,values,points,stage,started:time>=start};
}

// Smooth numeric tokens use a curved path and merge into the graph dot.
export function tokenMotion(progress,source,dest,arriving=false) {
  const u=ease(progress),bend=Math.min(60,Math.hypot(dest[0]-source[0],dest[1]-source[1])*.16);
  const center=[mix(source[0],dest[0],u)+Math.sin(Math.PI*u)*bend,mix(source[1],dest[1],u)-Math.sin(Math.PI*u)*bend];
  const scale=arriving?mix(1,.08,ease((progress-.62)/.38)):mix(.16,1,ease(progress/.45));
  const opacity=arriving?1-ease((progress-.88)/.12):ease(progress/.12);
  return {center,scale,opacity};
}
function movingNumber(value,source,dest,progress,cls='mf-accent-text',arriving=false) {
  const {center,scale,opacity}=tokenMotion(clamp(progress),source,dest,arriving);
  return `<g class="mf-token" transform="translate(${center[0]} ${center[1]}) scale(${scale})" opacity="${opacity}">${text(0,7,value,`${cls} mf-flying-number`,'middle')}</g>`;
}
export function polynomialFrame(time,start=.1) {
  const position=clamp(time/4,0,12),k=Math.min(11,Math.floor(position)),progress=position>=12?1:position-k;
  const {p,q}=polynomialStates(start);
  return {k,progress,p,q,start,advance:ease((progress-.62)/.28),input:ease(progress/.24),calculation:ease((progress-.27)/.15)};
}
export const multiply2=(a,b)=>[a[0]*b[0]+a[1]*b[2],a[0]*b[1]+a[1]*b[3],a[2]*b[0]+a[3]*b[2],a[2]*b[1]+a[3]*b[3]];
const transpose2=a=>[a[0],a[2],a[1],a[3]];
const apply2=(a,v)=>[a[0]*v[0]+a[1]*v[1],a[2]*v[0]+a[3]*v[1]];
export function singularValues2(a) {
  const trace=a.reduce((sum,v)=>sum+v*v,0),det=a[0]*a[3]-a[1]*a[2];
  const gap=Math.sqrt(Math.max(0,trace*trace-4*det*det));
  return [Math.sqrt(Math.max(0,(trace+gap)/2)),Math.sqrt(Math.max(0,(trace-gap)/2))];
}
export function muonMatrixSequence(m,eps=1e-7) {
  const norm=Math.hypot(...m),states=[m.map(v=>v/(norm+eps))];
  for(let k=0;k<5;k++){
    const x=states.at(-1),a=multiply2(x,transpose2(x)),aa=multiply2(a,a);
    const b=a.map((v,i)=>-4.775*v+2.0315*aa[i]),bx=multiply2(b,x);
    states.push(x.map((v,i)=>3.4445*v+bx[i]));
  }
  return states;
}
export function muonStepStates() {
  const q=[Math.sqrt(3)/2,-.5,.5,Math.sqrt(3)/2];
  const g=multiply2(q,[2,.4,.4,.6]),previous=multiply2(q,[.8,.1,.1,.3]),m=g.map((v,i)=>.8*previous[i]+.2*v);
  const angle=.5*Math.atan2(.32,.68),basis=[[Math.cos(angle),Math.sin(angle)],[-Math.sin(angle),Math.cos(angle)]];
  const xs=muonMatrixSequence(m),d=xs[5].map(v=>-.1*v),w=[1,.5,-.25,1],next=w.map((v,i)=>v+d[i]);
  return {g,previous,m,xs,d,w,next,q,basis,matrices:[g,m,...xs,d,next]};
}
export function muonStepFrame(time) {
  const state=muonStepStates(),position=clamp(time/3.2,0,10),k=Math.min(9,Math.floor(position)),p=position>=10?1:position-k;
  const current=state.matrices[k],previous=state.matrices[Math.max(0,k-1)],u=ease(p/.68);
  const referenceAt=index=>index<8?state.q:index===8?state.q.map(v=>-.1*v):state.w.map((v,i)=>v-.1*state.q[i]);
  const previousReference=referenceAt(Math.max(0,k-1)),nextReference=referenceAt(k);
  const reference=previousReference.map((v,i)=>mix(v,nextReference[i],u));
  const matrix=previous.map((v,i)=>mix(v,current[i],u));
  return {...state,k,p,matrix,reference,error:Math.hypot(...matrix.map((v,i)=>v-reference[i]))};
}
export function optimizerReplay() {
  const gradients=[[4,1,1,1],[3,.6,1.2,.8],[5,-.4,.8,1.4],[-2,-.7,.2,1.1],[-3,-1,-.5,.8],[1,.4,-.2,1.3]];
  let m=[0,0,0,0],v=[0,0,0,0],weights=Array.from({length:3},()=>[1,.5,-.25,1]);
  return gradients.map((g,index)=>{
    const t=index+1;
    m=m.map((x,i)=>.8*x+.2*g[i]);v=v.map((x,i)=>.9*x+.1*g[i]**2);
    const mhat=m.map(x=>x/(1-.8**t)),vhat=v.map(x=>x/(1-.9**t));
    const r=[g.slice(),mhat.map((x,i)=>x/(Math.sqrt(vhat[i])+1e-8)),muonMatrixSequence(m).at(-1)];
    const before=weights.map(x=>x.slice()),d=r.map((a,j)=>a.map((x,i)=>-.1*x-(j===0?0:.01*before[j][i])));
    weights=before.map((a,j)=>a.map((x,i)=>x+d[j][i]));
    return {g,t,m:m.slice(),v:v.slice(),mhat,vhat,r,before,d,after:weights.map(x=>x.slice())};
  });
}
export function optimizerFrame(time) {
  const position=clamp(time/6,0,6),k=Math.min(5,Math.floor(position)),p=position>=6?1:position-k;
  const replay=optimizerReplay(),state=replay[k],reshape=ease((p-.12)/.4),decay=ease((p-.66)/.2);
  const matrices=state.r.map((r,j)=>r.map((x,i)=>-.1*mix(state.g[i],x,reshape)-(j===0?0:.01*state.before[j][i]*decay)));
  if(k>0&&p<.12){
    const incoming=ease(p/.12);
    for(let j=0;j<3;j++)matrices[j]=replay[k-1].d[j].map((v,i)=>mix(v,-.1*state.g[i],incoming));
  }
  return {...state,k,p,matrices,stage:p<.12?'Receive the same gradient':p<.66?'Build each gradient-driven update':p<.86?'Add decoupled weight decay':'Three computed steps. Different shapes.'};
}
// An actual quadratic matrix loss. The invariant two-dimensional slice is
// W = B diag(a,b) Bᵀ; B is either the identity or a 45-degree rotation.
export function valleyModel(rotated=true) {
  const c=Math.SQRT1_2,basis=rotated?[c,-c,c,c]:[1,0,0,1];
  const h=multiply2(multiply2(basis,[40,0,0,1]),transpose2(basis));
  const gradient=w=>multiply2(h,w);
  const loss=w=>{const g=gradient(w);return w.reduce((sum,v,i)=>sum+.5*v*g[i],0);};
  const coordinates=w=>{const z=multiply2(multiply2(transpose2(basis),w),basis);return [z[0],z[3]];};
  return {basis,h,gradient,loss,coordinates};
}
const valleyCache=new Map();
export function valleyTrajectories(rotated=true,adamRate=.08) {
  const key=`${rotated}:${adamRate}`;
  if(valleyCache.has(key))return valleyCache.get(key);
  const model=valleyModel(rotated),rates=[.04,adamRate,.08],steps=80;
  const runs=rates.map((rate,j)=>{
    let w=[1.5,0,0,1.5],m=[0,0,0,0],v=[0,0,0,0];
    const states=[];
    for(let t=0;t<=steps;t++){
      const g=model.gradient(w);
      states.push({w:w.slice(),g,point:model.coordinates(w),loss:model.loss(w)});
      if(t===steps)break;
      m=m.map((x,i)=>.8*x+.2*g[i]);v=v.map((x,i)=>.9*x+.1*g[i]*g[i]);
      const direction=j===0?g:j===1?m.map((x,i)=>(x/(1-.8**(t+1)))/(Math.sqrt(v[i]/(1-.9**(t+1)))+1e-8)):muonMatrixSequence(m).at(-1);
      const eta=rate*(.1+.45*(1+Math.cos(Math.PI*t/steps)));
      w=w.map((x,i)=>x-eta*direction[i]);
    }
    return {rate,states};
  });
  const result={model,runs,rotated,adamRate,steps};valleyCache.set(key,result);return result;
}
export function valleyFrame(time,context={}) {
  const data=valleyTrajectories(context.rotated??true,context.adamRate??.08),position=clamp(time/32,0,1)*80;
  const k=Math.min(80,Math.floor(position)),fraction=k===80?0:ease(position-k);
  const current=data.runs.map(run=>{
    const a=run.states[k],b=run.states[Math.min(k+1,80)],w=a.w.map((v,i)=>mix(v,b.w[i],fraction));
    return {w,point:data.model.coordinates(w),loss:data.model.loss(w)};
  });
  return {...data,k,fraction,current};
}
export function polynomialMilestones(start=.1) {
  const states=polynomialStates(start);
  const first=values=>{const i=values.findIndex(v=>v>=.7&&v<=1.3);return i<0?null:i;};
  return {cubic:first(states.p),quintic:first(states.q)};
}
function matrixNumbers(matrix,x,y,scale=1,cls='') {
  let out=`<g transform="translate(${x} ${y}) scale(${scale})">`;
  out+=path([[-77,-35],[-84,-35],[-84,35],[-77,35]],'mf-ink')+path([[77,-35],[84,-35],[84,35],[77,35]],'mf-ink');
  matrix.forEach((v,i)=>out+=text(i%2?43:-43,i<2?-8:27,fmt(v,3),`mf-matrix-number ${cls}`,'middle'));
  return out+'</g>';
}
const rotate=([x,y],angle)=>[Math.cos(angle)*x-Math.sin(angle)*y,Math.sin(angle)*x+Math.cos(angle)*y];
export function svdFrame(time) {
  const turnInput=ease((time-2)/4),stretch=ease((time-8)/4),turnOutput=ease((time-14)/4),flatten=ease((time-20)/5);
  const singular=[mix(1+stretch,1,flatten),mix(1-.5*stretch,1,flatten)];
  const transform=v=>rotate(rotate(v,-Math.PI/4*turnInput).map((x,i)=>x*singular[i]),Math.PI/6*turnOutput);
  const inputBasis=[rotate([1,0],Math.PI/4),rotate([0,1],Math.PI/4)];
  const stage=time<2?0:time<8?1:time<14?2:time<20?3:4;
  const instructions=['Start with a circle of unit-length inputs','Apply Vᵀ: align the input directions','Apply Σ: stretch the two directions','Apply U: rotate into the output directions','Replace both singular values with ones'];
  return {stage,singular,transform,inputBasis,outputBasis:inputBasis.map(transform),instruction:instructions[stage],flatten};
}

export const defaultCamera=()=>({yaw:.52,elevation:.58,zoom:1});
export function projectLoss([x,y],z=descentLoss([x,y]),camera=defaultCamera()) {
  const {yaw,elevation,zoom}=camera,c=Math.cos(yaw),sn=Math.sin(yaw);
  return [320+zoom*108*(c*x-sn*y),335+zoom*(108*Math.sin(elevation)*(sn*x+c*y)-25*Math.cos(elevation)*z)];
}
let gradientSurface,gradientSurfaceKey;
function drawGradientSurface(camera=defaultCamera()) {
  const key=JSON.stringify(camera);
  if(key===gradientSurfaceKey)return gradientSurface;
  const map=(p,z)=>projectLoss(p,z,camera);
  let out='<g class="mf-floor">';
  for(let x=-1.5;x<=1.5;x+=.3)out+=line(map([x,-.8],0),map([x,.8],0));
  for(let y=-.8;y<=.8;y+=.2)out+=line(map([-1.65,y],0),map([1.65,y],0));
  out+='</g>';
  const faces=[],nx=36,ny=24,dx=3.3/nx,dy=1.6/ny;
  for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){
    const x=-1.65+i*dx,y=-.8+j*dy,c=[x+dx/2,y+dy/2],g=descentGradient(c);
    const light=clamp((-.35*g[0]-.5*g[1]+1)/Math.hypot(...g,1));
    const depth=108*Math.cos(camera.elevation)*(Math.sin(camera.yaw)*c[0]+Math.cos(camera.yaw)*c[1])+25*Math.sin(camera.elevation)*descentLoss(c);
    const corners=[[x,y],[x+dx,y],[x+dx,y+dy],[x,y+dy]];
    faces.push({depth,markup:`<polygon points="${corners.map(p=>pt(map(p))).join(' ')}" class="mf-surface-face" fill-opacity="${(.07+.16*light).toFixed(3)}"/>`});
  }
  out+=faces.sort((a,b)=>a.depth-b.depth).map(f=>f.markup).join('');
  const origin=map([0,0],0),xEnd=map([1.8,0],0),yEnd=map([0,1],0);
  out+=arrow(origin,xEnd,'mf-ink')+arrow(origin,yEnd,'mf-ink');
  out+=text(xEnd[0]+12,xEnd[1]+8,'w₁','mf-small')+text(yEnd[0]-12,yEnd[1]+18,'w₂','mf-small');
  for(const [x,label]of [[(-1-Math.sqrt(.4))/2,'local'],[1,'global']]){
    const p=map([x,0]);out+=dot(p,'mf-open',5)+text(p[0],p[1]+25,label,'mf-small','middle');
  }
  out+='<defs><radialGradient id="muon-gd-sphere" cx="30%" cy="25%" r="75%"><stop offset="0" stop-color="var(--paper-lift)"/><stop offset=".4" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--ink)"/></radialGradient><clipPath id="muon-surface-clip"><rect x="8" y="65" width="624" height="365"/></clipPath></defs>';
  gradientSurfaceKey=key;gradientSurface=out;return out;
}

function gradientFrame(time,context={}) {
  const all=context.trajectory||gradientStates(),steps=Math.max(1,all.length-1);
  const {k,f,done}=phase(time,24/steps,steps);
  const w=all[Math.min(k,all.length-1)],next=all[Math.min(k+1,all.length-1)];
  const current=w.map((v,i)=>mix(v,next[i],f));
  // Sample each straight parameter step on the curved surface, so the trail
  // and moving marker always have height L(w), including between iterates.
  const trail=[];
  for(let i=0;i<=k;i++){
    const from=all[Math.min(i,all.length-1)],to=all[Math.min(i+1,all.length-1)],end=i===k?f:1;
    for(let s=0;s<=8;s++)trail.push(from.map((v,j)=>mix(v,to[j],end*s/8)));
  }
  return {all,steps,k,f,done,w,next,current,trail};
}
function gradientDescription(time,context) {
  const {steps,k,done,current}=gradientFrame(time,context);
  return `Step ${done?steps:k}. Weights ${current.map(v=>fmt(v,3)).join(', ')}. Loss ${fmt(descentLoss(current),4)}. A computed gradient path descends a three-dimensional surface with two basins. The floor trail shows parameter positions.`;
}
function drawGradientMotion(time,context={}) {
  const project=(p,z)=>projectLoss(p,z,context.camera);
  const {steps,k,done,w,next,current,trail}=gradientFrame(time,context), point=project(current),floor=project(current,0);
  let out='<g clip-path="url(#muon-surface-clip)">'+path(trail.map(p=>project(p,0)),'mf-floor-trail');
  out+=line(floor,point,'mf-objective', 'opacity=".4"');
  out+=`<ellipse cx="${floor[0]}" cy="${floor[1]}" rx="8" ry="3" class="mf-shadow"/>`;
  out+=path(trail.map(p=>project(p)),'mf-trail-halo')+path(trail.map(p=>project(p)),'mf-trail');
  if(!done)out+=arrow(project(w),project(next),'mf-orange');
  out+=`<circle cx="${point[0]}" cy="${point[1]}" r="7" fill="url(#muon-gd-sphere)" stroke="var(--paper)" stroke-width="1.3"/>`;
  out+='</g>';
  out+=text(24,28,`Step ${done?steps:k} / ${steps}   ·   loss ${fmt(descentLoss(current),4)}`,'mf-strong');
  out+=text(24,466,`w = (${fmt(current[0],3)}, ${fmt(current[1],3)})`);
  out+=text(616,466,'D = −0.09 G','mf-small','end');
  return out;
}
function drawGradient(time,narrow=false,context={}) {
  return desc(gradientDescription(time,context))+`<g clip-path="url(#muon-surface-clip)">${drawGradientSurface(context.camera)}</g>`+`<g data-muon-moving>${drawGradientMotion(time,context)}</g>`;
}
function drawTaylor(time,narrow=false) {
  const {h,x,actual,predicted,error,tangent,reveal}=taylorState(time);
  const map=([x,y])=>[70+125*x,345-43*y];
  const fx=narrow?18:382,fy=narrow?425:115,fw=narrow?484:314;
  let out=desc(`At x=${fmt(x)}, the actual value is ${fmt(actual,3)}, the tangent predicts ${fmt(predicted,3)}, and their gap is ${fmt(error,4)}. Halving h quarters the gap.`);
  out+=text(24,28,'Value, slope, then the missing piece','mf-strong');
  out+=text(24,54,time<3?'Build the tangent from the slope at 1':time<6?'Move h away from the starting point':time<9?'Reveal the gap between tangent and curve':'Halve h. The error drops to one quarter.','mf-small');
  out+=line(map([-.3,0]),map([2.4,0]))+line(map([0,-.5]),map([0,6]));
  out+=path(Array.from({length:71},(_,i)=>{const u=-.3+i*2.7/70;return map([u,u*u]);}),'mf-curve');
  out+=`<g opacity="${tangent}">`+line(map([-.2,-1.4]),map([2.4,3.8]),'mf-memory-arrow mf-dashed')+'</g>';
  out+=dot(map([1,1]),'mf-muted-dot',5)+text(map([1,0])[0],370,'1','mf-small','middle');
  out+=line(map([x,0]),map([x,actual]),'mf-objective', 'opacity=".35"');
  out+=dot(map([x,predicted]),'mf-blue-dot',5);
  out+=`<g opacity="${reveal}">`+line(map([x,predicted]),map([x,actual]),'mf-orange')+dot(map([x,actual]))+'</g>';
  out+=line([map([1,0])[0],389],[map([x,0])[0],389],'mf-orange');
  out+=text(map([1+h/2,0])[0],415,'h','mf-small','middle')+text(371,365,'x','mf-small');
  out+=mathRow(fx,fy,fw,math('f(1+h)=')+math('1')+math('+2h','mf-memory-math',tangent)+math('+h^2','mf-result-math',reveal));
  out+=text(fx+fw/2,fy+91,`h = ${fmt(h,3)}`,'mf-small','middle');
  out+=text(fx+fw/2,fy+130,`tangent = ${fmt(predicted,3)}`,'mf-blue-text','middle');
  out+=`<g opacity="${reveal}">`+text(fx+fw/2,fy+169,`actual = ${fmt(actual,3)}`,'','middle')+text(fx+fw/2,fy+208,`gap h² = ${fmt(error,4)}`,'mf-accent-text','middle')+'</g>';
  out+=line([28,narrow?666:453],[52,narrow?666:453],'mf-curve')+text(62,narrow?672:459,'curve','mf-small');
  out+=line([164,narrow?666:453],[188,narrow?666:453],'mf-memory-arrow mf-dashed')+text(198,narrow?672:459,'tangent','mf-small');
  out+=line([314,narrow?666:453],[338,narrow?666:453],'mf-orange')+text(348,narrow?672:459,'error','mf-small');
  return out;
}
function drawDerivatives(time,narrow=false) {
  const {h,slope}=derivativeState(time),map=([x,y])=>[70+133*x,338-58*y];
  const fy=narrow?425:124,fx=narrow?18:385,fw=narrow?484:311;
  let out=desc(`Secant slope ${fmt(slope,3)} for h=${fmt(h,3)} approaches the tangent slope 2.`);
  out+=text(24,28,'A derivative is a limiting slope','mf-strong')+text(24,54,'Shrink the interval; keep the starting point fixed.','mf-small');
  out+=line(map([-.1,0]),map([2.25,0]))+line(map([0,-.3]),map([0,4.4]));
  out+=path(Array.from({length:61},(_,i)=>{const x=i*2.1/60;return map([x,x*x]);}),'mf-curve');
  out+=line(map([.5,0]),map([2,3]),'mf-ink mf-dashed');
  const lo=.65,hi=2.05;
  out+=line(map([lo,1+slope*(lo-1)]),map([hi,1+slope*(hi-1)]),'mf-memory-arrow');
  out+=line(map([1,1]),map([1+h,1]),'mf-objective')+line(map([1+h,1]),map([1+h,(1+h)**2]),'mf-objective');
  out+=dot(map([1,1]),'mf-open',5)+dot(map([1+h,(1+h)**2]),'mf-blue-dot',6);
  out+=text(map([1,0])[0],366,'1','mf-small','middle')+text(map([1+h,0])[0],392,'1 + h','mf-small','middle')+text(374,358,'w','mf-small');
  out+=mathRow(fx,fy,fw,math(String.raw`\frac{f(1+h)-f(1)}h=2+h`,'mf-memory-math'));
  out+=text(fx+fw/2,fy+98,`h = ${fmt(h,3)}`,'mf-small','middle')+text(fx+fw/2,fy+136,`secant slope = ${fmt(slope,3)}`,'mf-blue-text','middle');
  out+=mathRow(fx,fy+158,fw,math(String.raw`f'(1)=\lim_{h\to0}(2+h)=2`));
  out+=text(24,narrow?682:453,'Blue: secant · dashed: tangent · curve: f(w) = w²','mf-small');
  return out;
}
function drawTrace(time,narrow=false) {
  const phase=time<4?0:time<8?1:2,move=ease((time-phase*4)/2.5);
  const left=narrow?154:98,top=110,tx=narrow?260:518,ty=narrow?340:170;
  const cells=[[left,top,3],[left+90,top,0],[left,top+80,2],[left+90,top+80,-2]];
  let out=desc('The diagonal of C equals 3 and minus 2. Moving those two entries into the sum gives trace C equals 1. The other entries are ignored.');
  out+=text(24,28,'Trace: collect the diagonal','mf-strong')+text(24,54,phase===0?'Take the first diagonal entry':phase===1?'Add the next diagonal entry':'The trace is one number','mf-small');
  out+=text(left-45,top+43,'C =','','end');
  out+=path([[left-28,top-25],[left-38,top-25],[left-38,top+105],[left-28,top+105]],'mf-ink');
  out+=path([[left+118,top-25],[left+128,top-25],[left+128,top+105],[left+118,top+105]],'mf-ink');
  cells.forEach(([x,y,value],i)=>out+=text(x,y+8,String(value).replace('-','−'),i===0||i===3?'mf-accent-text mf-number':'mf-small mf-faded','middle'));
  out+=mathRow(tx-150,ty-84,300,math(String.raw`\operatorname{tr}(C)`));
  const slots=[[tx-60,ty],[tx+30,ty]],source=phase===0?cells[0]:cells[3];
  if(phase<2){
    const dest=slots[phase],pos=source.slice(0,2).map((v,i)=>mix(v,dest[i],move));
    out+=`<g class="mf-token">${dot(pos,'mf-token-bg',33)}${text(pos[0],pos[1]+8,phase===0?'3':'−2','mf-accent-text mf-number','middle')}</g>`;
  }
  if(phase>0)out+=text(...[slots[0][0],slots[0][1]+8],'3','mf-accent-text mf-number','middle');
  out+=text(tx-14,ty+8,'+','','middle');
  if(phase===2)out+=text(slots[1][0],ty+8,'(−2)','mf-accent-text mf-number','middle')+mathRow(tx-110,ty+30,220,math('=1','mf-result-math',move));
  out+=text(narrow?260:360,narrow?490:323,'The off-diagonal entries stay out of this sum.','mf-small','middle');
  return out;
}
function drawSpectral(time,narrow=false) {
  const {x,dx,length,settled}=spectralState(time),width=narrow?520:720;
  const centers=narrow?[[135,205],[385,205]]:[[132,232],[401,232]],scale=narrow?42:54;
  const map=(v,j)=>[centers[j][0]+scale*v[0],centers[j][1]-scale*v[1]];
  let out=desc(`Unit input (${fmt(x[0],3)},${fmt(x[1],3)}) maps to (${fmt(dx[0],3)},${fmt(dx[1],3)}), with output length ${fmt(length,3)}. The maximum is 2.`);
  out+=text(24,28,'Which unit input gets stretched the most?','mf-strong');
  out+=text(24,54,settled?'The longest output has length 2.':time<12?'Sweep the input direction around the circle.':'Return to a direction with the longest output.','mf-small');
  for(let j=0;j<2;j++){
    out+=line(map([-2.1,0],j),map([2.1,0],j))+line(map([0,-2.1],j),map([0,2.1],j));
    const curve=Array.from({length:97},(_,i)=>{const a=i*Math.PI/48,c=Math.cos(a),s=Math.sin(a);return map(j===0?[c,s]:[1.5*c+.5*s,.5*c+1.5*s],j);});
    out+=path(curve,j===0?'mf-ink mf-dashed':'mf-shape');
    const v=j===0?x:dx;out+=arrow(map([0,0],j),map(v,j),j===0?'mf-memory-arrow':'mf-orange')+dot(map(v,j),j===0?'mf-blue-dot':'mf-dot',5);
    out+=text(centers[j][0],narrow?330:374,j===0?'input x · length 1':'output Dx','mf-small','middle');
  }
  out+=arrow([narrow?205:221,narrow?205:232],[narrow?272:290,narrow?205:232],'mf-ink');
  out+=text(narrow?240:256,narrow?189:216,'D','mf-small','middle');
  const fx=narrow?18:532,fy=narrow?351:118,fw=narrow?484:164;
  out+=mathRow(fx,fy,fw,math(String.raw`D=\begin{bmatrix}1.5&0.5\\0.5&1.5\end{bmatrix}`));
  out+=text(fx+fw/2,fy+104,`‖Dx‖₂ = ${fmt(length,3)}`,'mf-accent-text','middle');
  out+=line([fx+12,fy+137],[fx+fw-12,fy+137]);
  out+=line([fx+12,fy+137],[fx+12+(fw-24)*length/2,fy+137],'mf-orange');
  out+=text(fx+fw-12,fy+161,'2','mf-small','end');
  if(settled)out+=mathRow(narrow?18:128,narrow?542:406,narrow?484:464,math(String.raw`x_*={1\over\sqrt2}\begin{bmatrix}1\\1\end{bmatrix},\quad\|D\|_{\rm op}=2`,'mf-result-math'));
  return out;
}
function drawBudgets(time,narrow=false) {
  const {g,example,slide,arrow:reveal,stage,frobenius,spectral}=budgetState(time),w=narrow?360:720;
  let out=desc(`Example ${example+1}. ${stage}. The blue arrow is minus the gradient: a direction of decreasing predicted loss, with arbitrary drawn length. The orange dot is the candidate update; its matrix and score change as it moves. The dashed line joins equal scores.`);
  out+=text(w/2,27,`Example ${example+1} · budget η = 1`,'mf-strong','middle');
  out+=mathRow(0,34,w,math(String.raw`G=\begin{bmatrix}${g[0]}&0\\0&${g[1]}\end{bmatrix}`));
  out+=text(w/2,112,narrow?['1. Allowed updates','2. Blue arrow: lower scores','3. Move toward lower scores','4. Last allowed contact'][budgetState(time).p<.15?0:budgetState(time).p<.35?1:budgetState(time).p<.8?2:3]:stage,'mf-small','middle');
  [['Frobenius',frobenius],['Spectral',spectral]].forEach(([label,d],j)=>{
    const ox=narrow?0:j*360,oy=narrow?132+j*407:132,map=([x,y])=>[180+85*x,188-85*y];
    out+=`<g transform="translate(${ox},${oy})">`+text(180,22,label,'mf-strong','middle');
    out+=mathRow(0,29,360,math(j===0?String.raw`\sqrt{d_1^2+d_2^2}\leq1`:String.raw`\max(|d_1|,|d_2|)\leq1`));
    out+=j===0?'<circle cx="180" cy="188" r="85" class="mf-budget"/>':'<rect x="95" y="103" width="170" height="170" class="mf-budget"/>';
    out+=line([50,188],[310,188])+line([180,92],[180,285]);
    out+=text(310,209,'d₁','mf-small')+text(191,100,'d₂','mf-small');
    const norm=Math.hypot(...g),tangent=[-g[1]/norm,g[0]/norm],center=d.map(v=>v*slide),end=g.map(v=>-.55*v/norm);
    out+=`<defs><clipPath id="muon-budget-clip-${j}"><rect x="45" y="88" width="270" height="195"/></clipPath></defs><g opacity="${reveal}" clip-path="url(#muon-budget-clip-${j})">`+line(map(center.map((v,i)=>v-1.8*tangent[i])),map(center.map((v,i)=>v+1.8*tangent[i])),'mf-objective')+'</g>';
    out+=`<g opacity="${reveal}">`+arrow(map([0,0]),map(end),'mf-memory-arrow')+text(map(end)[0]+4,map(end)[1]-13,'−g','mf-small mf-blue-text')+'</g>';
    out+=dot(map(center));
    out+=text(180,314,slide===1?'Best update D*':'Candidate update D','mf-small','middle');
    out+=matrixNumbers([center[0],0,0,center[1]],180,352,.66,'mf-accent-text');
    out+=text(180,401,`score = ${fmt(g.reduce((sum,v,i)=>sum+v*center[i],0))}`,'mf-small','middle');
    out+='</g>';
  });
  const y=narrow?982:580;
  out+=arrow([24,y-6],[46,y-6],'mf-memory-arrow')+text(58,y,'−g: direction, not step length','mf-small');
  out+=dot([35,y+28])+text(58,y+34,'D: the update being considered','mf-small');
  out+=line([24,y+63],[46,y+63],'mf-objective')+text(58,y+69,'dashed: same predicted change','mf-small');
  return out;
}
function drawMomentum(time,narrow=false) {
  const {k,prev,g,retained,added,next,gradients,means,keep,take,move,sum,stage}=momentumFrame(time);
  const vector=v=>String.raw`\begin{bmatrix}${v.map(x=>fmt(x,3).replace('−','-')).join(String.raw`\\`)}\end{bmatrix}`;
  const origin=narrow?126:95,scale=narrow?118:145,axisEnd=narrow?485:336;
  const map=([x,y])=>[origin+x*scale,187-y*76],zero=map([0,0]);
  const formulaX=narrow?18:358,formulaY=narrow?336:70,formulaWidth=narrow?484:338;
  const row=(dy,content,cls='')=>mathRow(formulaX,formulaY+dy,formulaWidth,content,cls);
  let out=desc(`Batch ${k+1}. ${stage}. Previous estimate ${prev.map(v=>fmt(v,3)).join(', ')} times 0.8, plus incoming gradient ${g.map(v=>fmt(v,3)).join(', ')} times 0.2, gives ${next.map(v=>fmt(v,3)).join(', ')}. Formula values are rounded to three decimals.`);
  out+=text(24,28,`Batch ${k+1}   ·   β = 0.8`,'mf-strong');
  out+=text(24,54,stage,'mf-small');
  out+=row(0,math(String.raw`M_t`,'mf-result-math')+math('=')+math(String.raw`\beta M_{t-1}`,'mf-memory-math',1-.35*take)+math('+')+math(String.raw`(1-\beta)G_t`,'mf-incoming-math',.65+.35*take),'mf-symbolic');
  out+=row(54,math(String.raw`\approx`)+math(`0.8${vector(prev)}`,'mf-memory-math')+math('+')+math(`0.2${vector(g)}`,'mf-incoming-math'));
  const contributions=math(String.raw`\approx`,'',keep)+math(vector(retained),'mf-memory-math',keep)+math('+','',take)+math(vector(added),'mf-incoming-math',take);
  const result=math(String.raw`\approx`,'',sum)+math(vector(next),'mf-result-math',sum);
  out+=row(110,contributions+(narrow?result:''));
  if(!narrow)out+=row(166,math(String.raw`M_t`,'mf-result-math',sum)+result);
  out+=line([24,187],[axisEnd,187])+line([origin,74],[origin,292]);
  out+=text(axisEnd-4,213,'entry 1','mf-small','end')+text(origin+14,84,'entry 2','mf-small');
  for(let i=0;i<k;i++)out+=arrow(map([0,0]),map(gradients[i]),'mf-history');
  out+=line(map(prev),map(g),'mf-objective');
  out+=arrow(zero,map(g),'mf-history');
  out+=dot(map(prev),'mf-open',4);
  const memory=prev.map(v=>v*mix(1,.8,keep)),tail=retained.map(v=>v*move);
  const tip=tail.map((v,i)=>v+g[i]*mix(1,.2,take));
  out+=arrow(zero,map(memory),'mf-memory-arrow');
  out+=arrow(map(tail),map(tip),'mf-ink');
  if(sum>0)out+=`<g opacity="${sum}">`+arrow(zero,map(next))+dot(map(next))+'</g>';
  out+=line([24,318],[47,318],'mf-memory-arrow')+text(56,324,'memory','mf-small');
  out+=line([160,318],[183,318],'mf-ink')+text(192,324,'this batch','mf-small');
  out+=line([310,318],[333,318],'mf-orange')+text(342,324,'new estimate','mf-small');
  const chartTitle=narrow?528:354,baseline=narrow?575:404,chartEnd=narrow?470:674;
  out+=text(24,chartTitle,'Second entry over successive batches','mf-small');
  const chart=(i,v)=>[50+i*(chartEnd-50)/12,baseline-v*27];
  out+=line([50,baseline],[chartEnd,baseline]);
  out+=path([[0,0],...gradients.slice(0,k+1).map((v,i)=>[i+1,v[1]])].map(([i,v])=>chart(i,v)),'mf-noise');
  out+=path(means.slice(0,k+1).map((v,i)=>chart(i,v[1])),'mf-trail');
  if(sum>0)out+=`<g opacity="${sum}">`+path([chart(k,prev[1]),chart(k+1,next[1])],'mf-trail')+'</g>';
  out+=text(50,baseline+48,'0','mf-small','middle')+text(chartEnd,baseline+48,'12 batches','mf-small','end');
  return out;
}
function drawFixedPoints(time,narrow=false) {
  const f=fixedPointFrame(time),{repelling,slope,k,values,points,stage,started,progress}=f;
  const w=narrow?520:720,map=([x,y])=>narrow?[92+260*x,557-260*y]:[55+233*x,498-233*y];
  const current=values[k].toFixed(4),next=values[k+1].toFixed(4),slot=[w/2,138];
  let out=desc(`${repelling?'Repelling':'Attracting'} fixed point at 1. ${stage}. Input ${current} moves into the fixed formula, which produces ${next}. The output moves to the diagonal and is reused as the next input.`);
  out+=text(24,28,repelling?'Same fixed point, opposite behavior':'Plug in a number. Feed the answer back.','mf-strong');
  out+=text(24,54,stage,'mf-small');
  out+=mathRow(0,65,w,math(repelling?String.raw`p(s)=2s-1`:String.raw`p(s)=\tfrac12s+\tfrac12`,'mf-memory-math'));
  // A fixed substitution slot: the same numerical token travels from the
  // current graph position into this slot, then the result returns to y=s.
  out+=mathRow(slot[0]-153,109,93,math(repelling?'2\\times':String.raw`\tfrac12\times`));
  out+=mathRow(slot[0]+60,109,110,math(repelling?'-1':String.raw`+\tfrac12`));
  out+=line([slot[0]-50,slot[1]+15],[slot[0]+50,slot[1]+15],'mf-axis');
  const life=f.completed>=2?1:1-ease((progress-.94)/.06);
  const resultOpacity=started?ease((progress-.34)/.14)*life:0;
  out+=mathRow(w/2-173,164,213,math(`p(${current})=`,'mf-result-math',resultOpacity));
  out+=`<g opacity="${resultOpacity}">`+text(w/2+80,200,next,'mf-accent-text','middle')+'</g>';
  out+=line([24,228],[w-24,228]);
  out+=line(map([0,0]),map([1.2,0]))+line(map([0,0]),map([0,1.2]));
  for(const tick of [0,.5,1]){
    const a=map([tick,0]),b=map([0,tick]);
    out+=text(a[0],a[1]+23,String(tick),'mf-small','middle');
    if(tick)out+=text(b[0]-13,b[1]+5,String(tick),'mf-small','end');
  }
  out+=line(map([0,0]),map([1.2,1.2]),'mf-ink mf-dashed');
  const from=repelling?.5:0,to=repelling?1.1:1.2;
  out+=line(map([from,1+slope*(from-1)]),map([to,1+slope*(to-1)]),'mf-memory-arrow');
  out+=dot(map([1,1]),'mf-fixed-ring',11)+dot(map([1,1]),'mf-open',4);
  out+=path(points.map(map),'mf-orange')+dot(map(points.at(-1)));
  out+=line(map([1,0]),map([1,1]),'mf-target');
  const lx=narrow?92:55,ly=narrow?612:555;
  out+=line([lx,ly],[lx+24,ly],'mf-memory-arrow')+text(lx+32,ly+6,'p(s)','mf-small');
  out+=line([lx+132,ly],[lx+156,ly],'mf-ink mf-dashed')+text(lx+166,ly+6,'y = s','mf-small');
  const fx=narrow?18:365,fy=narrow?632:270,fw=narrow?484:330;
  out+=mathRow(fx,fy,fw,math(String.raw`p(1)=1\quad\text{always}`));
  out+=mathRow(fx,fy+58,fw,math(`s_${k}=${current}`));
  out+=mathRow(fx,fy+116,fw,math(`s_{${k+1}}=${next}`,'mf-result-math',resultOpacity));
  out+=mathRow(fx,fy+174,fw,math(repelling?String.raw`|e_{k+1}|=2|e_k|`:String.raw`|e_{k+1}|=\tfrac12|e_k|`,'mf-result-math'));
  out+=text(fx+fw/2,fy+258,'Error: eₖ = sₖ − 1','mf-small','middle');
  if(started){
    const inputSource=map([values[k],k===0?0:values[k]]),outputDest=map([values[k+1],values[k+1]]);
    if(progress<.28)out+=movingNumber(current,inputSource,slot,progress/.28,'mf-blue-text');
    else out+=`<g opacity="${life}">`+text(slot[0],slot[1]+7,current,'mf-blue-text','middle')+'</g>';
    if(progress>=.58&&progress<=.92)out+=movingNumber(next,[w/2+80,193],outputDest,(progress-.58)/.34,'mf-accent-text',true);
  }
  return out;
}
function drawSVD(time,narrow=false) {
  const {stage,singular,transform,outputBasis,instruction,flatten}=svdFrame(time);
  const center=narrow?[260,242]:[184,229],scale=narrow?83:69;
  const map=v=>[center[0]+scale*v[0],center[1]-scale*v[1]];
  const circle=Array.from({length:97},(_,i)=>[Math.cos(i*Math.PI/48),Math.sin(i*Math.PI/48)]);
  const formulaX=narrow?18:358,formulaY=narrow?421:87,formulaWidth=narrow?484:338;
  const row=(dy,content)=>mathRow(formulaX,formulaY+dy,formulaWidth,content,narrow?'mf-phone-equation':'');
  let out=desc(`${instruction}. A two-dimensional SVD with U a 30 degree rotation, singular values 2 and one half, and V transpose a minus 45 degree rotation. The current lengths of the two marked directions are ${singular.map(v=>fmt(v,3)).join(' and ')}. At the end both lengths are one and the polar factor preserves lengths.`);
  out+=text(24,28,'From a circle to an ellipse, and back','mf-strong');
  out+=text(24,54,instruction,'mf-small');
  for(const tick of [-2,-1,0,1,2]){
    out+=line(map([tick,-2]),map([tick,2]))+line(map([-2,tick]),map([2,tick]));
  }
  out+=path(circle.map(map),'mf-ink mf-dashed mf-reference');
  out+=path(circle.map(v=>map(transform(v))),'mf-shape');
  for(let i=0;i<24;i++)out+=dot(map(transform(circle[i*4])),'mf-shape-point',2.3);
  for(let i=0;i<2;i++){
    out+=arrow(map([0,0]),map(outputBasis[i]),i===0?'mf-memory-arrow':'mf-orange');
    out+=dot(map(outputBasis[i]),i===0?'mf-blue-dot':'mf-dot',5);
    if(stage===0||flatten===1){
      const tip=map(outputBasis[i]);
      out+=text(tip[0]+(i? -18:13),tip[1]-10,`${stage===0?'v':'u'}${i?'₂':'₁'}`,i===0?'mf-blue-text':'mf-accent-text');
    }
  }
  const factor=(tex,active)=>math(tex,active?'mf-result-math':'',active?1:.6);
  out+=row(0,stage<4?math('G=')+factor('U',stage===3)+factor(String.raw`\Sigma`,stage===2)+factor(String.raw`V^\top`,stage===1):math(String.raw`G=U\Sigma V^\top\ \longrightarrow\ Q=UV^\top`));
  const explanations=[String.raw`\|v_1\|_2=\|v_2\|_2=1`,String.raw`V^\top v_i=e_i`,String.raw`\Sigma e_i=\sigma_i e_i`,String.raw`Gv_i=\sigma_i u_i`,String.raw`Qv_i=u_i`];
  out+=row(58,math(explanations[stage]));
  out+=row(116,math(stage<4?String.raw`\Sigma=\begin{bmatrix}2&0\\0&\tfrac12\end{bmatrix}`:String.raw`\Sigma\longrightarrow I`));
  const bx=narrow?137:420,by=narrow?626:292,barWidth=112;
  out+=text(narrow?260:527,by-14,'Lengths of the marked directions','mf-small','middle');
  for(let i=0;i<2;i++){
    const y=by+20+36*i;
    out+=line([bx,y],[bx+2*barWidth,y],'mf-axis');
    out+=line([bx+barWidth,y-8],[bx+barWidth,y+8],'mf-target');
    out+=line([bx,y],[bx+singular[i]*barWidth,y],i===0?'mf-memory-arrow':'mf-orange');
    out+=text(bx-12,y+6,fmt(singular[i],2),i===0?'mf-small mf-blue-text':'mf-small mf-accent-text','end');
  }
  out+=text(bx+barWidth,by+84,'1','mf-small','middle')+text(bx+2*barWidth,by+84,'2','mf-small','middle');
  out+=text(narrow?260:184,narrow?405:407,'Dashed circle: length 1','mf-small','middle');
  return out;
}

function drawPolynomials(time,narrow=false,context={}) {
  const f=polynomialFrame(time,context.start??.1),{k,progress,p,q,start,advance,calculation}=f;
  const w=narrow?520:720,graphWidth=narrow?440:650,map=(i,v)=>[54+i*(graphWidth-30)/12,350-v*175];
  const fx=narrow?20:24,fy=594,fw=narrow?480:326;
  let out=desc(`Starting at ${start}, iteration ${k+1}. The cubic receives ${p[k].toFixed(6)} and returns ${p[k+1].toFixed(6)}. The quintic receives ${q[k].toFixed(6)} and returns ${q[k+1].toFixed(6)}. Both substitutions and their numerical terms are shown beside the trace.`);
  out+=text(24,28,`Start ${start} · iteration ${k+1} of 12`,'mf-strong');
  out+=text(24,54,progress<.27?'Bring each current value into its polynomial':progress<.62?'Compute the powers, then add the terms':'Return each result to the graph','mf-small');
  out+=line(map(0,0),map(12,0))+line(map(0,0),map(0,1.45));
  out+=`<rect x="${map(0,0)[0]}" y="${map(0,1.3)[1]}" width="${map(12,0)[0]-map(0,0)[0]}" height="${175*.6}" class="mf-tolerance-band"/>`;
  out+=line(map(0,1),map(12,1),'mf-target')+text(40,map(0,1)[1]+6,'1','mf-small','end');
  out+=line(map(5,0),map(5,1.4),'mf-five');
  out+=text(54,83,'value sₖ','mf-small');
  for(const i of [0,5,12])out+=text(map(i,0)[0],376,i===12?'12 · k':String(i),'mf-small',i===12?'end':'middle');
  out+=text(map(5,0)[0],100,'5-step budget','mf-small','middle');
  for(const [values,cls]of [[p,'mf-trail'],[q,'mf-memory-arrow mf-dashed']]){
    const pts=values.slice(0,k+1).map((v,i)=>map(i,v));
    pts.push(map(k+advance,mix(values[k],values[k+1],advance)));
    out+=path(pts,cls)+dot(pts.at(-1),values===p?'mf-dot':'mf-blue-dot',4.5);
  }
  out+=line([54,401],[78,401],'mf-orange')+text(87,407,'cubic','mf-small');
  out+=line([183,401],[207,401],'mf-memory-arrow mf-dashed')+text(216,407,'quintic','mf-small');
  const reached=k+(advance===1?1:0),milestones=polynomialMilestones(start);
  out+=text(54,447,'Band: 0.7 ≤ s ≤ 1.3','mf-small');
  for(const [name,values,hit,color] of [['quintic',q,milestones.quintic,'mf-blue-text'],['cubic',p,milestones.cubic,'mf-accent-text']]){
    const y=name==='quintic'?480:512,visible=hit!==null&&reached>=hit;
    out+=text(54,y,`${name}: ${visible?hit===0?'in band at start':`in band at step ${hit}`:'outside band so far'}`,`mf-small ${color}`);
    if(visible)out+=dot(map(hit,values[hit]),'mf-open',7)+dot(map(hit,values[hit]),name==='quintic'?'mf-blue-dot':'mf-dot',3);
  }
  out+=text(54,548,start===0?'Zero stays zero.':reached>5?'Past 5: the quintic oscillates.':'Watch the first few steps.','mf-small');
  const rows=[{values:p,tex:String.raw`p(s)=1.5s-0.5s^3`,name:'p',coeff:[1.5,-.5],powers:[1,3],color:'mf-result-math',svgColor:'mf-accent-text'},
    {values:q,tex:String.raw`q(s)=3.4445s-4.775s^3+2.0315s^5`,name:'q',coeff:[3.4445,-4.775,2.0315],powers:[1,3,5],color:'mf-memory-math',svgColor:'mf-blue-text'}];
  rows.forEach((row,j)=>{
    const fx=narrow?20:24+j*350,y=fy+(narrow?j*285:0),current=row.values[k],next=row.values[k+1],input=[fx+fw*.72,y+75],result=[fx+fw*.72,y+(j===1?246:208)];
    const num=current.toFixed(4),terms=row.coeff.map((c,i)=>c*current**row.powers[i]);
    out+=mathRow(fx,y,fw,math(row.tex,row.color),'mf-polynomial-equation');
    out+=mathRow(fx+fw*.18,y+46,fw*.3,math(`s_{${k}}=`));
    out+=line([input[0]-47,input[1]+14],[input[0]+47,input[1]+14],'mf-axis');
    if(progress<.24)out+=movingNumber(num,map(k,current),input,progress/.24,row.svgColor);
    else out+=text(input[0],input[1]+7,num,row.svgColor,'middle');
    const expression=row.coeff.map((c,i)=>`${i&&c>0?'+':''}${c}(${num})${row.powers[i]===1?'':`^{${row.powers[i]}}`}`);
    // The quintic is split across two lines, leaving the substituted value readable.
    out+=mathRow(fx,y+92,fw,math(String.raw`\approx`+expression.slice(0,2).join(''),row.color,calculation),'mf-polynomial-equation');
    if(j===1)out+=mathRow(fx,y+130,fw,math(expression[2],row.color,calculation),'mf-polynomial-equation');
    const sum=terms.map((v,i)=>(i&&v>=0?'+':'')+v.toFixed(5)).join('');
    out+=mathRow(fx,y+(j===1?164:126),fw,math(String.raw`\approx`+sum,row.color,calculation),'mf-polynomial-equation');
    out+=mathRow(fx+fw*.08,y+(j===1?220:182),fw*.42,math(`s_{${k+1}}\\approx`,row.color,calculation));
    out+=`<g opacity="${calculation}">`+text(result[0],result[1]+7,next.toFixed(4),row.svgColor,'middle')+'</g>';
    if(progress>=.62&&progress<.94)out+=movingNumber(next.toFixed(4),result,map(k+1,next),(progress-.62)/.32,row.svgColor,true);
  });
  out+=text(24,narrow?1182:900,'Substitutions are rounded; the recurrence uses full precision.','mf-small');
  return out;
}
function drawMuonStep(time,narrow=false) {
  const f=muonStepFrame(time),{k,matrix}=f,w=narrow?520:720,center=narrow?[260,228]:[180,248],scale=70;
  const map=v=>[center[0]+scale*v[0],center[1]-scale*v[1]],fx=narrow?18:364,fy=narrow?465:89,fw=narrow?484:332;
  const names=['Receive the gradient','Blend it with the previous memory','Normalize the momentum','Quintic step 1','Quintic step 2','Quintic step 3','Quintic step 4','Quintic step 5','Scale and subtract','Add the step to the weights'];
  const labels=['G_t','M_t','X_0','X_1','X_2','X_3','X_4','X_5','D','W_{t+1}'];
  let out=desc(`Operation ${k+1}: ${names[k]}. Displayed matrix ${matrix.map(v=>fmt(v,4)).join(', ')}. The unit circle is mapped by exactly this matrix. Dotted arrows show the exact SVD target, with its scale or weight addition applied at the final operations.`);
  out+=text(24,28,`${k+1} / 10 · ${names[k]}`,'mf-strong');
  out+=text(24,54,'One matrix through the complete Muon step','mf-small');
  for(let i=-2;i<=2;i++)out+=line(map([i,-2]),map([i,2]))+line(map([-2,i]),map([2,i]));
  const circle=Array.from({length:97},(_,i)=>[Math.cos(i*Math.PI/48),Math.sin(i*Math.PI/48)]);
  out+=path(circle.map(map),'mf-ink mf-dashed mf-reference')+path(circle.map(v=>map(apply2(matrix,v))),'mf-shape');
  for(let i=0;i<2;i++){
    const v=f.basis[i],actual=apply2(matrix,v),exact=apply2(f.reference,v),color=i?'mf-orange':'mf-memory-arrow';
    if(k>=1)out+=arrow(map([0,0]),map(exact),`${color} mf-exact-arrow`)+dot(map(exact),'mf-open',4);
    out+=arrow(map([0,0]),map(actual),color)+dot(map(actual),i?'mf-dot':'mf-blue-dot',3);
  }
  const legendY=narrow?409:427;
  out+=text(center[0],legendY,'Solid: images of v₁ and v₂','mf-small','middle');
  out+=text(center[0],legendY+27,k===0?'Next: compare with exact Q.':k<8?'Dotted: Qvᵢ = uᵢ':k===8?'Dotted: the ideal step −0.1Q':'Dotted: W − 0.1Q','mf-small','middle');
  let formula=k===0?String.raw`G_t=\nabla_WL`:k===1?String.raw`M_t=0.8M_{t-1}+0.2G_t`:k===2?String.raw`X_0=M_t/(\|M_t\|_F+\varepsilon)`:k<8?String.raw`A_k=X_kX_k^\top`:k===8?String.raw`D=-0.1X_5`:String.raw`W_{t+1}=W_t+D`;
  out+=mathRow(fx,fy,fw,math(formula),'mf-compact-equation');
  if(k>=3&&k<8){
    out+=mathRow(fx,fy+48,fw,math(String.raw`X_{k+1}=3.4445X_k-4.775A_kX_k`),'mf-compact-equation');
    out+=mathRow(fx,fy+86,fw,math(String.raw`{}+2.0315A_k^2X_k`),'mf-compact-equation');
  }else{
    const input=k===0?f.g:k===1?f.previous:k===2?f.m:k===8?f.xs[5]:f.w;
    const inputLabel=k===0?'G_t':k===1?'M_{t-1}':k===2?'M_t':k===8?'X_5':'W_t';
    out+=mathRow(fx,fy+54,fw,math(`${inputLabel}=`));out+=matrixNumbers(input,fx+fw/2,fy+136,.7);
  }
  out+=mathRow(fx,fy+172,fw,math(`${labels[k]}=`,'mf-result-math'));
  out+=matrixNumbers(matrix,fx+fw/2,fy+265,1,'mf-accent-text');
  const singular=singularValues2(matrix);
  out+=text(fx+fw/2,fy+334,`stretches: ${fmt(singular[0],3)}, ${fmt(singular[1],3)}`,'mf-small','middle');
  if(k>=1)out+=text(fx+fw/2,fy+370,`gap to dotted target: ${fmt(f.error,4)}`,'mf-small','middle');
  out+=mathRow(12,narrow?872:495,w-24,math(String.raw`Q=UV^\top=\begin{bmatrix}\sqrt3/2&-1/2\\1/2&\sqrt3/2\end{bmatrix}`),'mf-compact-equation');
  out+=text(w/2,narrow?950:575,'Exact SVD reference · gap measured with the Frobenius norm','mf-small','middle');
  out+=text(24,narrow?990:615,k===9?'Updated weights need not be orthogonal.':'β = 0.8 · η = 0.1 · λ = 0 · no Nesterov blend','mf-small');
  return out;
}
function drawOptimizers(time,narrow=false) {
  const f=optimizerFrame(time),{g,t,matrices,stage}=f,w=narrow?520:720;
  let out=desc(`Supplied gradient ${t} of 6. ${stage}. SGD, AdamW and Muon compute different updates from the same gradient sequence. Ellipses use unit Frobenius norm for display; raw norms and matrix entries are shown.`);
  out+=text(24,27,`Gradient ${t} / 6`,'mf-strong');
  out+=text(24,53,stage,'mf-small');
  out+=mathRow(0,65,w*.42,math('G_t='));out+=matrixNumbers(g,w*.44,108,.66);
  out+=text(w-20,92,'η = 0.1','mf-small','end')+text(w-20,119,'same inputs','mf-small','end');
  out+=line([24,151],[w-24,151]);
  const names=['SGD','AdamW','Muon'],formulas=[String.raw`R_t=G_t`,String.raw`R_t={\widehat m_t\over\sqrt{\widehat v_t}+\varepsilon}`,String.raw`R_t=X_5`];
  matrices.forEach((d,j)=>{
    const ox=narrow?0:j*240,oy=narrow?166+j*276:166,pw=narrow?520:240;
    const norm=Math.hypot(...d),normalized=d.map(v=>v/(norm||1)),center=narrow?[132,149]:[120,171],scale=narrow?77:75;
    const map=v=>[center[0]+scale*v[0],center[1]-scale*v[1]];
    out+=`<g transform="translate(${ox},${oy})">`+text(pw/2,23,names[j],'mf-strong','middle');
    out+=mathRow(0,34,pw,math(formulas[j]),'mf-compact-equation');
    out+=line(map([-1.1,0]),map([1.1,0]))+line(map([0,-1.1]),map([0,1.1]));
    const circle=Array.from({length:81},(_,i)=>[Math.cos(i*Math.PI/40),Math.sin(i*Math.PI/40)]);
    out+=path(circle.map(map),'mf-ink mf-dashed mf-reference')+path(circle.map(v=>map(apply2(normalized,v))),'mf-shape');
    out+=arrow(map([0,0]),map(apply2(normalized,[1,0])),'mf-memory-arrow')+arrow(map([0,0]),map(apply2(normalized,[0,1])),'mf-orange');
    const mx=narrow?366:120,my=narrow?153:310;
    out+=text(mx,my-44,'D =','mf-small','middle')+matrixNumbers(d,mx,my,.74);
    out+=text(mx,my+53,`‖D‖F = ${fmt(norm,3)}`,'mf-small','middle');
    out+=text(pw/2,narrow?257:393,j===0?'No momentum · no decay':'Momentum + decay λ = 0.1','mf-small','middle');
    out+='</g>';
  });
  const foot=narrow?1020:604;
  out+=text(24,foot,'Shapes show D / ‖D‖F; the numbers show the actual step.','mf-small');
  out+=text(24,foot+28,'Blue: image of (1, 0) · orange: image of (0, 1)','mf-small');
  return out;
}

function drawValley(time,narrow=false,context={}) {
  const f=valleyFrame(time,context),w=narrow?520:720,{k,fraction,rotated,current,runs}=f;
  const left=40,top=142,width=narrow?440:330,low=-1.1,high=1.7;
  const map=([a,b])=>[left+width*(a-low)/(high-low),top+width*(high-b)/(high-low)];
  const styles=['mf-sgd','mf-memory-arrow mf-dashed','mf-orange'],dotStyles=['mf-sgd-dot','mf-blue-dot','mf-dot'],names=['SGD','AdamW','Muon'];
  const number=v=>v>=1?fmt(v,3):v>=.001?fmt(v,5):v.toExponential(2).replace('-', '−');
  let out=desc(`Actual matrix-loss optimization, step ${k} of 80. ${rotated?'The matrix basis mixes the two directions by 45 degrees.':'The matrix entries align with the two directions.'} Current losses: ${current.map((v,i)=>names[i]+' '+v.loss.toPrecision(6)).join('; ')}. Every method recomputes its gradient from its own current weights.`);
  out+=text(24,28,`Training step ${k}${fraction>0?' → '+(k+1):''} / 80`,'mf-strong');
  out+=text(24,55,rotated?'Mixed matrix entries · basis rotated 45°':'Aligned matrix entries · same valley','mf-small');
  out+=text(24,85,'How valley coordinates become matrix entries','mf-strong');
  out+=mathRow(12,102,w-24,math(rotated?String.raw`W=\frac12\begin{bmatrix}a+b&a-b\\a-b&a+b\end{bmatrix}`:String.raw`W=\begin{bmatrix}a&0\\0&b\end{bmatrix}`));
  out+=text(24,197,'Same example point: a = 1, b = 0','mf-small');
  out+=matrixNumbers(rotated?[.5,.5,.5,.5]:[1,0,0,0],w-125,217,.75);
  out+=text(24,270,'The switch changes this map, not the valley axes.','mf-small');
  out+='<g transform="translate(0 230)">';
  out+=mathRow(24,72,narrow?472:365,math(String.raw`L(a,b)=\tfrac12(40a^2+b^2)`));
  out+=`<defs><clipPath id="muon-valley-clip"><rect x="${left}" y="${top}" width="${width}" height="${width}"/></clipPath></defs><g clip-path="url(#muon-valley-clip)">`;
  for(const level of [.02,.1,.5,2,10,40]){
    const ellipse=Array.from({length:181},(_,i)=>{const a=i*Math.PI/90;return map([Math.sqrt(2*level/40)*Math.cos(a),Math.sqrt(2*level)*Math.sin(a)]);});
    out+=path(ellipse,'mf-loss-contour');
  }
  out+=line(map([low,0]),map([high,0]))+line(map([0,low]),map([0,high]));
  runs.forEach((run,j)=>{
    const points=run.states.slice(0,k+1).map(s=>map(s.point));if(fraction>0)points.push(map(current[j].point));
    out+=path(points,styles[j])+dot(map(current[j].point),dotStyles[j],5);
  });
  out+='</g>';
  for(const tick of [-1,0,1]){
    out+=text(map([tick,low])[0],top+width+24,String(tick),'mf-small','middle');
    out+=text(left-12,map([low,tick])[1]+5,String(tick),'mf-small','end');
  }
  out+=text(left+width,top+width+24,'a','mf-small','end')+text(left-13,top-12,'b','mf-small');
  out+=dot(map([1.5,1.5]),'mf-open',4)+text(map([1.5,1.5])[0]-10,map([1.5,1.5])[1]-13,'start','mf-small','end');
  const zero=map([0,0]);out+=line([zero[0]-6,zero[1]-6],[zero[0]+6,zero[1]+6],'mf-ink')+line([zero[0]-6,zero[1]+6],[zero[0]+6,zero[1]-6],'mf-ink');
  out+=text(zero[0]+12,zero[1]+23,'minimum: L = 0','mf-small');
  out+=text(left,top+width+57,'Contours join points with equal loss.','mf-small');
  const cx=narrow?74:435,cy=narrow?690:155,cw=narrow?402:252,ch=narrow?175:186;
  const chart=(i,loss)=>[cx+i*cw/80,cy+ch*(2-Math.log10(Math.max(loss,1e-8)))/10];
  out+=text(cx,cy-23,'Loss · logarithmic scale','mf-strong');
  for(const [level,label] of [[100,'10²'],[1,'1'],[.0001,'10⁻⁴'],[1e-8,'10⁻⁸']]){
    const y=chart(0,level)[1];out+=line([cx,y],[cx+cw,y])+text(cx-10,y+5,label,'mf-small','end');
  }
  for(const i of [0,40,80])out+=text(chart(i,1)[0],cy+ch+25,String(i),'mf-small','middle');
  out+=text(cx+cw,cy+ch+49,'training steps','mf-small','end');
  runs.forEach((run,j)=>{
    const pts=run.states.slice(0,k+1).map((s,i)=>chart(i,s.loss));if(fraction>0)pts.push(chart(k+fraction,current[j].loss));
    out+=path(pts,styles[j])+dot(pts.at(-1),dotStyles[j],4);
    const y=(narrow?939:422)+j*60;
    out+=line([cx,y-6],[cx+22,y-6],styles[j])+text(cx+31,y,names[j],'mf-strong')+text(cx+cw,y,number(current[j].loss),'mf-small','end');
    out+=text(cx+31,y+24,`initial η = ${runs[j].rate}`,'mf-small');
  });
  if(!narrow){
    out+=text(40,558,'Fresh gradients at every point.','mf-small');
    out+=text(40,585,'Try the basis and rate controls.','mf-small');
  }
  out+=text(24,narrow?1130:628,'λ = 0 · same rate schedule · different cost per step','mf-small');
  const sy=narrow?1180:680,camera=context.camera??defaultCamera(),c=Math.cos(camera.yaw),sn=Math.sin(camera.yaw);
  const project=([a,b])=>{const x=70*a,y=70*b,z=.5*(40*a*a+b*b);return [w/2+camera.zoom*(c*x-sn*y),sy+250+camera.zoom*(Math.sin(camera.elevation)*(sn*x+c*y)-2.5*Math.cos(camera.elevation)*z)];};
  out+=text(24,sy,'The same paths on the loss surface','mf-strong');
  out+=text(24,sy+26,'Height = loss · drag to rotate · arrows also rotate','mf-small');
  out+=`<defs><clipPath id="valley-surface-clip"><rect x="12" y="${sy+40}" width="${w-24}" height="325"/></clipPath></defs><g clip-path="url(#valley-surface-clip)">`;
  const faces=[];
  for(let i=0;i<24;i++)for(let j=0;j<24;j++){
    const a=-1.7+i*3.4/24,b=-1.7+j*3.4/24,d=3.4/24;
    const points=[[a,b],[a+d,b],[a+d,b+d],[a,b+d]];
    faces.push({depth:sn*a+c*b,markup:`<polygon points="${points.map(p=>pt(project(p))).join(' ')}" class="mf-surface-face" fill-opacity=".08"/>`});
  }
  out+=faces.sort((a,b)=>a.depth-b.depth).map(v=>v.markup).join('');
  runs.forEach((run,j)=>{
    const points=[];for(let i=0;i<k;i++)for(let n=0;n<8;n++)points.push(project(run.states[i].point.map((v,d)=>mix(v,run.states[i+1].point[d],n/8))));points.push(project(run.states[k].point));if(fraction>0)for(let n=1;n<=8;n++)points.push(project(run.states[k].point.map((v,d)=>mix(v,current[j].point[d],n/8))));
    out+=path(points,styles[j])+dot(project(current[j].point),dotStyles[j],5);
  });
  out+=dot(project([0,0]),'mf-open',5)+text(project([0,0])[0]+9,project([0,0])[1]+18,'minimum','mf-small');
  out+='</g>';
  names.forEach((name,j)=>{const x=24+j*(w-48)/3;out+=line([x,sy+390],[x+22,sy+390],styles[j])+text(x+30,sy+396,name,'mf-small');});
  out+=text(24,sy+444,`Actual weight matrices at step ${k}`,'mf-strong');
  current.forEach((state,j)=>{
    const x=narrow?w/2:120+j*240,y=sy+480+(narrow?j*128:0);
    out+=text(x,y,names[j],'mf-small','middle');
    out+=matrixNumbers(state.w,x,y+53,.85);
  });
  out+='</g>';


  return out;
}

// A seeded, shared perturbation sequence makes comparisons reproducible.
export const momentumLoss=([x,y])=>.5*x*x+6*y*y;
export const momentumGradient=([x,y])=>[x,12*y];
export function momentumLandscapeStates({noise=true,beta=.8}={}){
  let seed=137;
  const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const perturbations=Array.from({length:48},()=>[.25*(2*random()-1),1.8*(2*random()-1)]);
  return [0,beta].map(memory=>{
    let w=[1.8,.55],m=[0,0],sideways=0;
    const states=[{w:w.slice(),m:m.slice(),g:[0,0],loss:momentumLoss(w),sideways}];
    for(const n of perturbations){
      const g=momentumGradient(w).map((v,i)=>v+(noise?n[i]:0));
      m=m.map((v,i)=>memory*v+(1-memory)*g[i]);
      const next=w.map((v,i)=>v-.14*m[i]);
      sideways+=Math.abs(next[1]-w[1]);w=next;
      states.push({w:w.slice(),m:m.slice(),g,loss:momentumLoss(w),sideways});
    }
    return states;
  });
}
export function momentumLandscapeFrame(time,context={}){
  const runs=momentumLandscapeStates(context),t=clamp(time/1.25,0,48),k=Math.min(47,Math.floor(t));
  const f=t>=48?1:clamp((t-k-.15)/.7),blend=f*f*(3-2*f);
  return {runs,k,f:blend,step:t>=48?48:k,points:runs.map(states=>states[k].w.map((v,i)=>mix(v,states[k+1].w[i],blend)))};
}
function drawMomentumLandscape(time,narrow=false,context={}){
  const {runs,k,f,step,points}=momentumLandscapeFrame(time,context),beta=context.beta??.8,noise=context.noise!==false;
  const width=narrow?520:720,scale=narrow?.85:1.1,cx=width/2;
  const camera=context.camera??defaultCamera(),c=Math.cos(camera.yaw),sn=Math.sin(camera.yaw);
  const project=([x,y],z=momentumLoss([x,y]))=>{
    const a=105*(x-.5),b=145*y,zoom=scale*camera.zoom;
    return [cx+zoom*(c*a-sn*b),310+zoom*(Math.sin(camera.elevation)*(sn*a+c*b)-30*Math.cos(camera.elevation)*(z-1))];
  };
  let out=desc(`Step ${step} of 48. Raw gradients and momentum on the same quadratic loss. Noise ${noise?'on':'off'}, momentum beta ${beta}. Both use learning rate 0.14. Current losses ${points.map(p=>fmt(momentumLoss(p),3)).join(' and ')}.`);
  out+=text(24,28,'Same valley. Different memory.','mf-strong');
  out+=text(24,54,`Step ${step} / 48 · α = 0.14 · β = ${beta} · noise ${noise?'on':'off'}`,'mf-small');
  out+=mathRow(0,64,width,math(String.raw`L(w_1,w_2)=\tfrac12w_1^2+6w_2^2`));
  out+=text(24,136,'Height = loss','mf-small');
  out+=`<defs><clipPath id="momentum-landscape-clip"><rect x="12" y="145" width="${width-24}" height="262"/></clipPath></defs><g clip-path="url(#momentum-landscape-clip)">`;
  const faces=[];
  for(let i=0;i<28;i++)for(let j=0;j<18;j++){
    const x=-1+i*3/28,y=-.7+j*1.4/18,dx=3/28,dy=1.4/18;
    const corners=[[x,y],[x+dx,y],[x+dx,y+dy],[x,y+dy]];
    faces.push({depth:Math.cos(camera.elevation)*(sn*105*x+c*145*y)+30*Math.sin(camera.elevation)*momentumLoss([x,y]),markup:`<polygon points="${corners.map(p=>pt(project(p))).join(' ')}" class="mf-surface-face" fill-opacity=".09"/>`});
  }
  out+=faces.sort((a,b)=>a.depth-b.depth).map(v=>v.markup).join('');
  out+=path(Array.from({length:31},(_,i)=>project([-1+i*.1,0])),'mf-objective');
  const minimum=project([0,0]);out+=dot(minimum,'mf-open',5)+text(minimum[0]-8,minimum[1]+22,'minimum','mf-small','end');
  out+=text(project([2,0])[0]+8,project([2,0])[1]+10,'w₁','mf-small');
  out+=text(project([0,.7],0)[0],project([0,.7],0)[1]+23,'w₂','mf-small');
  for(let r=0;r<2;r++){
    const states=runs[r],trail=[];
    for(let i=0;i<=k;i++)for(let j=0;j<=6;j++){
      const amount=(i===k?f:1)*j/6;
      trail.push(project(states[i].w.map((v,d)=>mix(v,states[i+1].w[d],amount))));
    }
    out+=path(trail,'mf-trail-halo')+path(trail,r?'mf-memory-arrow':'mf-noise');
    out+=dot(project(points[r]),r?'mf-blue-dot':'mf-open',6);
  }
  out+='</g>';
  const legendY=418;
  out+=line([24,legendY],[48,legendY],'mf-noise')+text(58,legendY+5,'raw gradient','mf-small');
  out+=line([width/2,legendY],[width/2+24,legendY],'mf-memory-arrow')+text(width/2+34,legendY+5,'momentum','mf-small');
  const cross=points[1][0]<0;
  out+=text(24,454,cross?'Memory carries the path past w₁ = 0.':noise?'Batch noise pushes across the valley.':'No noise: watch the effect of memory.','mf-small');
  out+=text(24,479,cross?'Smoothing does not remove overshoot.':'Blue averages the changing directions.','mf-small');
  const chartY=578,chartLeft=50,chartRight=width-30,chartHeight=27;
  out+=text(24,515,'Position along the valley, w₁','mf-small');
  const chart=(i,v)=>[chartLeft+i*(chartRight-chartLeft)/48,chartY-v*chartHeight];
  out+=line(chart(0,0),chart(48,0),'mf-objective')+text(28,chartY+5,'0','mf-small');
  for(let r=0;r<2;r++)out+=path([...runs[r].slice(0,k+1).map((s,i)=>chart(i,s.w[0])),chart(k+f,points[r][0])],r?'mf-memory-arrow':'mf-noise');
  out+=text(chartLeft,614,'0','mf-small')+text(chartRight,614,'48 steps','mf-small','end');
  out+=text(24,646,`Loss: raw ${fmt(momentumLoss(points[0]),3)} · memory ${fmt(momentumLoss(points[1]),3)}`,'mf-small');
  out+=text(24,671,`Sideways travel: ${fmt(runs[0][step].sideways,2)} vs ${fmt(runs[1][step].sideways,2)}`,'mf-small');
  return out;
}

export const scenes = {
  gd: {duration:24, step:1, title:'Rotate a loss surface with two basins and follow computed gradient descent', size:()=>[640,490], draw:drawGradient},
  taylor: {duration:18, step:3, checkpoints:[3,6,9,12,15,18], requiresMath:true, title:'A parabola, its tangent line and the Taylor approximation error', size:n=>n?[520,695]:[720,480], draw:drawTaylor},
  budgets: {duration:36, step:3, checkpoints:[1.7,4.1,9.8,11.5,13.7,16.1,21.8,23.5,25.7,28.1,33.8,36], requiresMath:true, title:'Find the best allowed step by sliding an equal-score line to the budget boundary', size:n=>n?[360,1080]:[720,680], draw:drawBudgets},
  momentum: {duration:12*momentumBatchSeconds, step:momentumBatchSeconds, requiresMath:true, title:'Momentum builds a weighted sum, with formulas synchronized to the arrows', size:n=>n?[520,638]:[720,464], draw:drawMomentum},
  momentumlandscape: {duration:60,step:1.25,requiresMath:true,title:"Compare noisy gradient descent and momentum on a three-dimensional loss surface",size:n=>n?[520,700]:[720,700],draw:drawMomentumLandscape},
  svd: {duration:28, step:4, checkpoints:[2,6,12,18,25,28], requiresMath:true, title:'SVD rotates and stretches a circle; the polar factor removes the stretch', size:n=>n?[520,736]:[720,440], draw:drawSVD},
  fixedpoints: {duration:44, step:6, checkpoints:[2,5.3,7.4,11.3,13.4,17.3,20,24,27.3,29.4,33.3,35.4,39.3,42,44], requiresMath:true, title:'An animated staircase compares attracting and repelling fixed points', size:n=>n?[520,916]:[720,590], draw:drawFixedPoints},
  derivatives: {duration:12,step:4,checkpoints:[4,8,12],requiresMath:true,title:'A shrinking secant interval reveals the derivative',size:n=>n?[520,705]:[720,480],draw:drawDerivatives},
  trace: {duration:12,step:4,checkpoints:[3,7,12],requiresMath:true,title:'Diagonal matrix entries move into the trace sum',size:n=>n?[520,515]:[720,350],draw:drawTrace},
  spectral: {duration:18,step:3,checkpoints:[1.5,4.5,7.5,10.5,12,15,18],requiresMath:true,title:'Sweep unit inputs to find the spectral norm',size:n=>n?[520,615]:[720,480],draw:drawSpectral},
  polynomials: {duration:48, step:4, checkpoints:Array.from({length:12},(_,i)=>Number(((i+1)*4-.1).toFixed(1))).concat(48), requiresMath:true, title:'Substitute each value into the cubic and quintic, then return the result to the graph', size:n=>n?[520,1210]:[720,930], draw:drawPolynomials},
  step: {duration:32,step:3.2,checkpoints:Array.from({length:10},(_,i)=>Number(((i+.9)*3.2).toFixed(2))).concat(32),requiresMath:true,title:'Follow one complete Muon matrix update from gradient to new weights',size:n=>n?[520,1020]:[720,650],draw:drawMuonStep},
  valley: {duration:32,step:4,checkpoints:[4,8,12,16,20,24,28,32],requiresMath:true,title:'Follow SGD, AdamW and Muon down a computed quadratic matrix loss',size:n=>n?[520,2250]:[720,1490],draw:drawValley},
  optimizers: {duration:36,step:6,checkpoints:[5.5,11.5,17.5,23.5,29.5,35.5,36],requiresMath:true,title:'Compute SGD, AdamW and Muon updates from six identical gradients',size:n=>n?[520,1080]:[720,656],draw:drawOptimizers}
};

export function svgMarkup(kind, time, narrow=false) {
  const scene=scenes[kind], [width,height]=scene.size(narrow);
  return `<svg xmlns="http://www.w3.org/2000/svg" class="muon-film" id="muon-${kind}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="muon-${kind}-title"><title id="muon-${kind}-title">${scene.title}</title>${scene.draw(time,narrow)}</svg>`;
}

// No autoplay. Stop freezes the exact frame; scrolling away stops playback.
export function mountAnimations(root=document) {
  const controllers=[];
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  for(const controls of root.querySelectorAll('[data-animation]')){
    const kind=controls.dataset.animation, scene=scenes[kind], svg=root.getElementById(`muon-${kind}`);
    if(!scene || !svg || (scene.requiresMath && !mathRenderer))continue;
    const play=controls.querySelector('[data-action="play"]'), restart=controls.querySelector('[data-action="restart"]'), status=controls.querySelector('[data-status]');
    const initialStatus=status.textContent;
    const context=kind==='momentumlandscape'?{noise:true,beta:.8,camera:defaultCamera()}:kind==='gd'?{trajectory:gradientStates(),camera:defaultCamera()}:kind==='polynomials'?{start:.1}:kind==='valley'?{rotated:true,adamRate:.08,camera:defaultCamera()}:{};
    const newStart=controls.querySelector('[data-action="new-start"]');
    const previousStep=controls.querySelector('[data-action="previous-step"]');
    const nextStep=controls.querySelector('[data-action="next-step"]');
    svg.parentElement.insertBefore(controls,svg);
    const checkpoints=[...new Set([0,...(kind==='momentum'
      ?Array.from({length:12},(_,i)=>(i+.95)*momentumBatchSeconds)
      :scene.checkpoints??Array.from({length:Math.floor(scene.duration/scene.step)},(_,i)=>(i+1)*scene.step)),scene.duration])].sort((a,b)=>a-b);
    let time=0, last=null, raf=null, running=false, narrow=false, interacted=false, stillElapsed=0;
    function draw(full=false){
      const [width,height]=scene.size(narrow);
      svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
      const moving=kind==='gd'&&!full?svg.querySelector?.('[data-muon-moving]'):null;
      if(moving){
        moving.innerHTML=drawGradientMotion(time,context);
        svg.querySelector('desc').textContent=gradientDescription(time,context);
      } else {
        svg.innerHTML=`<title id="muon-${kind}-title">${scene.title}</title>${scene.draw(time,narrow,context)}`;
      }
      svg.dataset.time=time.toFixed(3);
    }
    function labels(){
      interacted=interacted||time>0;
      play.textContent=running?'Stop':time>=scene.duration?'Replay':'Play animation';
      play.setAttribute('aria-label',`${play.textContent}: ${scene.title}`);
      play.setAttribute('aria-pressed',String(running));
      controls.dataset.playing=String(running);
      controls.dataset.unplayed=String(!interacted&&!reduced.matches);
      if(previousStep)previousStep.disabled=time<=0;
      if(nextStep)nextStep.disabled=time>=scene.duration;
    }
    function nextCheckpoint(){
      return checkpoints.find(t=>t>time+.001)??scene.duration;
    }
    function previousCheckpoint(){
      return checkpoints.findLast(t=>t<time-.001)??0;
    }
    function stop(){
      running=false;
      if(raf!==null)cancelAnimationFrame(raf);
      raf=null;last=null;stillElapsed=0;labels();
      status.textContent=time>=scene.duration?'Complete. Go back a step, or Replay.':time>0?`Stopped at ${time.toFixed(1)} seconds.`:initialStatus;
    }
    function tick(now){
      if(!running)return;
      const elapsed=last===null?0:(now-last)/1000;
      last=now;
      if(reduced.matches){
        stillElapsed+=elapsed;
        if(stillElapsed>=1.5){time=nextCheckpoint();stillElapsed=0;draw();labels();}
      }else{
        time=Math.min(scene.duration,time+elapsed);draw();labels();
      }
      if(time>=scene.duration){stop();return;}
      raf=requestAnimationFrame(tick);
    }
    play.disabled=restart.disabled=false;
    status.setAttribute('role','status');
    labels();draw();
    play.addEventListener('click',()=>{
      interacted=true;
      if(running){stop();return;}
      for(const c of controllers)c.stop();
      if(time>=scene.duration)time=0;
      running=true;last=null;stillElapsed=0;labels();
      status.textContent=reduced.matches?'Playing as still frames. Stop pauses this step.':'Playing. Stop pauses this frame.';
      raf=requestAnimationFrame(tick);
    });
    restart.addEventListener('click',()=>{stop();time=0;draw();stop();});
    for(const [button,seek,label]of [[previousStep,previousCheckpoint,'Previous step'],[nextStep,nextCheckpoint,'Next step']]){
      if(!button)continue;
      button.setAttribute('aria-label',`${label}: ${scene.title}`);
      button.setAttribute('title',label);
      button.addEventListener('click',()=>{interacted=true;stop();time=seek();draw();stop();});
    }
    const fiveSteps=controls.querySelector('[data-action="five-steps"]');
    if(fiveSteps){fiveSteps.disabled=false;fiveSteps.addEventListener('click',()=>{stop();time=19.9;draw();stop();});}
    for(const action of ['toggle-basis','adam-rate']){
      const button=controls.querySelector(`[data-action="${action}"]`);
      if(!button)continue;
      button.disabled=false;button.addEventListener('click',()=>{
        stop();time=0;
        if(action==='toggle-basis'){
          context.rotated=!context.rotated;button.textContent=context.rotated?'Use separate entries for a and b':'Mix a and b across entries';
        }else{
          context.adamRate=context.adamRate===.08?.32:.08;button.textContent=`Try AdamW η = ${context.adamRate===.08?.32:.08}`;
        }
        draw();stop();status.textContent='Changed the experiment. Play to recompute all three paths.';
      });
    }
    for(const action of ['toggle-noise','longer-memory']){
      const button=controls.querySelector(`[data-action="${action}"]`);
      if(!button)continue;
      button.disabled=false;button.addEventListener('click',()=>{
        stop();time=0;
        if(action==='toggle-noise'){
          context.noise=!context.noise;button.textContent=context.noise?'Remove batch noise':'Add batch noise';
        }else{
          context.beta=context.beta===.8?.95:.8;button.textContent=context.beta===.8?'Longer memory: β = 0.95':'Shorter memory: β = 0.8';
        }
        draw();stop();status.textContent='Experiment reset. Play to compare the computed paths.';
      });
    }
    const cycleStart=controls.querySelector('[data-action="cycle-start"]');
    if(cycleStart){
      cycleStart.disabled=false;
      cycleStart.addEventListener('click',()=>{
        stop();context.start=context.start===.1?1:context.start===1?0:.1;time=0;draw();stop();
        cycleStart.textContent=`Try start at ${context.start===.1?1:context.start===1?0:.1}`;
        status.textContent=`Starting at ${context.start}. Play or advance one iteration.`;
      });
    }
    if(newStart){
      newStart.disabled=false;
      newStart.addEventListener('click',()=>{
        stop();context.trajectory=gradientStates(newGradientStart(Math.random,-Math.sign(context.trajectory[0][0])));time=0;draw();stop();
        status.textContent='New starting weights. Play to follow the descent.';
      });
    }
    if(kind==='gd'||kind==='momentumlandscape'||kind==='valley'){
      svg.setAttribute('tabindex','0');
      svg.setAttribute('aria-description','Drag to rotate. Arrow keys rotate. Plus and minus zoom. Home resets the view.');
      function cameraChange(yaw=0,elevation=0,zoom=1){
        context.camera.yaw+=yaw;
        context.camera.elevation=clamp(context.camera.elevation+elevation,.18,1.28);
        context.camera.zoom=clamp(context.camera.zoom*zoom,.65,1.6);
        svg.dataset.camera=JSON.stringify(context.camera);draw(true);
      }
      for(const [action,zoom]of [['zoom-in',1.15],['zoom-out',1/1.15],['reset-view',0]]){
        const button=controls.querySelector(`[data-action="${action}"]`);
        if(button){button.disabled=false;button.addEventListener('click',()=>{if(!zoom)context.camera=defaultCamera();cameraChange(0,0,zoom||1);});}
      }
      let drag;
      svg.addEventListener('pointerdown',event=>{
        if(event.button!==0)return;
        drag={x:event.clientX,y:event.clientY,id:event.pointerId};svg.setPointerCapture(event.pointerId);
      });
      svg.addEventListener('pointermove',event=>{
        if(!drag||drag.id!==event.pointerId)return;
        cameraChange((event.clientX-drag.x)*.008,-(event.clientY-drag.y)*.006);
        drag.x=event.clientX;drag.y=event.clientY;
      });
      for(const event of ['pointerup','pointercancel','lostpointercapture'])svg.addEventListener(event,()=>{drag=null;});
      svg.addEventListener('keydown',event=>{
        const change={ArrowLeft:[-.12,0],ArrowRight:[.12,0],ArrowUp:[0,.1],ArrowDown:[0,-.1],'+':[0,0,1.15],'=':[0,0,1.15],'-':[0,0,1/1.15],Home:[0,0]};
        if(!change[event.key])return;
        event.preventDefault();if(event.key==='Home')context.camera=defaultCamera();cameraChange(...change[event.key]);
      });
    }
    for(let parent=svg.parentElement;parent;parent=parent.parentElement){
      if(parent.tagName==='DETAILS')parent.addEventListener('toggle',()=>{if(!parent.open)stop();});
    }
    const controller={stop};controllers.push(controller);
    if(typeof IntersectionObserver!=='undefined')new IntersectionObserver(entries=>{
      if(!entries[0].isIntersecting && running)stop();
    }).observe(svg);
    if(typeof ResizeObserver!=='undefined')new ResizeObserver(entries=>{
      const next=entries[0].contentRect.width<480;
      if(next!==narrow){narrow=next;draw();}
    }).observe(svg);
    reduced.addEventListener('change',()=>{stop();});
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden)controllers.forEach(c=>c.stop());});
  return controllers;
}
if(typeof globalThis.katex!=='undefined')configureMathRenderer(globalThis.katex);
if(typeof document!=='undefined')mountAnimations();
