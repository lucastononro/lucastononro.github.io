import test from 'node:test';
import assert from 'node:assert/strict';
import katex from 'katex';
import {momentumLoss,momentumGradient,momentumLandscapeStates,momentumLandscapeFrame,valleyModel,valleyTrajectories,valleyFrame,polynomialMilestones,tokenMotion,polynomialFrame,multiply2,singularValues2,muonMatrixSequence,muonStepStates,muonStepFrame,optimizerReplay,optimizerFrame,gradientStates,descentLoss,descentGradient,newGradientStart,defaultCamera,projectLoss,derivativeState,spectralState,taylorState,budgetState,momentumStates,momentumFrame,momentumBatchSeconds,configureMathRenderer,polynomialStates,cubic,quintic,fixedPointFrame,svdFrame,scenes,svgMarkup,mountAnimations} from '../static/muon-animations.js';
configureMathRenderer(katex);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} ≈ ${b}`);

test('surface gradients match finite differences and computed steps decrease loss across starting points',()=>{
  const starts=Array.from({length:25},(_,i)=>[-1.4+.7*(i%5),-.7+.35*Math.floor(i/5)]);
  for(const start of starts){
    const states=gradientStates(start);
    for(let i=0;i<states.length;i++){
      const w=states[i],g=descentGradient(w),eps=1e-5;
      for(let j=0;j<2;j++){
        const plus=w.slice(),minus=w.slice();plus[j]+=eps;minus[j]-=eps;
        const slope=(descentLoss(plus)-descentLoss(minus))/(2*eps);
        assert.ok(Math.abs(g[j]-slope)<1e-8);
        if(i+1<states.length)near(states[i+1][j]-w[j],-.09*g[j]);
      }
      if(i+1<states.length)assert.ok(descentLoss(states[i+1])<descentLoss(w));
    }
  }
  assert.deepEqual(gradientStates([1,0]),[[1,0]]);
  assert.notDeepEqual(gradientStates([1.4,.65]),gradientStates([-1.4,-.65]));
  const start=newGradientStart(()=>.25);
  assert.deepEqual(start,[1.1375,-.5125]);
});
test('Taylor plot shows the actual vertical error and the quadratic error law',()=>{
  for(const time of [0,1,2,3,4,5,6,9,12]){
    const {h,x,actual,predicted,error}=taylorState(time);
    near(actual,x*x);near(predicted,2*x-1);near(error,actual-predicted);
    const halfStepError=(1+h/2)**2-(1+h);
    near(halfStepError,error/4);
  }
});
test('budget contacts attain both dual bounds for each fixed gradient',()=>{
  for(const time of Array.from({length:361},(_,i)=>i/10)){
    const {g,frobenius:f,spectral:s}=budgetState(time), score=d=>g.reduce((v,a,i)=>v+a*d[i],0);
    near(Math.hypot(...f),1);assert.ok(Math.max(...s.map(Math.abs))<=1);
    near(score(f),-Math.hypot(...g));near(score(s),-g.reduce((v,x)=>v+Math.abs(x),0));
  }
  for(const t of [11,23,35])near(budgetState(t).slide,1);
});
test('momentum equals an independently expanded geometrically weighted history',()=>{
  const {gradients,means}=momentumStates();
  for(let t=1;t<means.length;t++)for(let j=0;j<2;j++){
    near(means[t][j],gradients.slice(0,t).reduce((sum,g,i)=>sum+.2*.8**(t-1-i)*g[j],0));
  }
});
test('momentum formulas and head-to-tail geometry agree for every batch and phase',()=>{
  for(let batch=0;batch<12;batch++)for(const p of [0,.16,.4,.63,.8,.95]){
    const frame=momentumFrame((batch+p)*momentumBatchSeconds);
    const {prev,g,retained,added,next,k}=frame;
    assert.equal(k,batch);
    for(let j=0;j<2;j++){
      near(retained[j]+added[j],next[j]);
      near(next[j]-prev[j],.2*(g[j]-prev[j]));
      near(retained[j],.8*prev[j]);near(added[j],.2*g[j]);
    }
    const svg=svgMarkup('momentum',(batch+p)*momentumBatchSeconds);
    assert.ok(svg.includes('katex-mathml'));assert.ok(!svg.includes('katex-error'));
    assert.ok(svg.includes('Values')||svg.includes('values are rounded'));
  }
  const last=momentumFrame(scenes.momentum.duration);
  assert.equal(last.k,11);assert.equal(last.sum,1);assert.equal(last.move,1);
});
test('polynomial traces preserve zeros, distinguish fixed points and retain the five-step values',()=>{
  assert.deepEqual(polynomialStates(0),{p:Array(13).fill(0),q:Array(13).fill(0)});
  assert.deepEqual(polynomialStates(1).p,Array(13).fill(1));near(quintic(1),.701);
  const {p,q}=polynomialStates(.1);
  assert.ok(Math.abs(p[5]-.6587189737)<1e-9);assert.equal(q[5].toFixed(4),'0.7121');
  assert.ok(Math.abs(p[12]-1)<1e-10);assert.ok(Math.abs(q[12]-1)>.1);
  for(let s=0;s<=1;s+=.001){assert.ok(cubic(s)>=s-1e-14);assert.ok(cubic(s)<=1+1e-14);}
});
test('fixed-point staircase computes the two recurrences and their opposite error behavior',()=>{
  for(const [time,expected,ratio] of [[20,[.9,.95,.975,.9875],.5],[42,[.9,.8,.6,.2],2]]){
    const frame=fixedPointFrame(time);
    expected.forEach((value,i)=>near(frame.values[i],value));
    assert.equal(frame.completed,3);
    for(let i=0;i<3;i++){
      near((frame.values[i+1]-1)/(frame.values[i]-1),ratio);
      const corner=frame.points[2*i+1],diagonal=frame.points[2*i+2];
      near(corner[0],frame.values[i]);near(corner[1],frame.values[i+1]);
      near(diagonal[0],diagonal[1]);near(diagonal[0],frame.values[i+1]);
    }
  }
  for(let t=0;t<=44;t+=.1){
    const {points}=fixedPointFrame(t);
    for(let i=1;i<points.length;i++)assert.ok(Math.abs(points[i][0]-points[i-1][0])<1e-10||Math.abs(points[i][1]-points[i-1][1])<1e-10,'each leg evaluates vertically or feeds back horizontally');
  }
});
test('SVD animation applies the stated factors and its polar endpoint preserves all lengths',()=>{
  const initial=svdFrame(0),full=svdFrame(18),polar=svdFrame(28);
  initial.inputBasis.forEach((v,i)=>v.forEach((x,j)=>near(initial.outputBasis[i][j],x)));
  const expected=[[Math.sqrt(3),1],[-.25,Math.sqrt(3)/4]];
  expected.forEach((v,i)=>v.forEach((x,j)=>near(full.outputBasis[i][j],x)));
  for(let t=0;t<=28;t+=.125){
    const {outputBasis:b,singular}=svdFrame(t);
    b.forEach((v,i)=>near(Math.hypot(...v),singular[i]));
    near(b[0][0]*b[1][0]+b[0][1]*b[1][1],0);
  }
  for(let i=0;i<36;i++){
    const a=i*Math.PI/18,v=[3*Math.cos(a),3*Math.sin(a)],qv=polar.transform(v);
    near(Math.hypot(...qv),3);
    near(qv[0],3*Math.cos(a-Math.PI/12));near(qv[1],3*Math.sin(a-Math.PI/12));
  }
});
test('all scenes produce finite static, intermediate and narrow SVG frames',()=>{
  for(const [kind,scene]of Object.entries(scenes))for(const t of [0,.5,scene.duration/2,scene.duration])for(const narrow of [false,true]){
    const html=svgMarkup(kind,t,narrow);assert.ok(!/NaN|undefined|Infinity/.test(html));assert.ok(html.includes('<desc>'));
  }
});

function environment(reduced=false){
  const events=()=>({listeners:{},addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);},fire(k,event={}){this.listeners[k]?.forEach(fn=>fn(event));}});
  const element=()=>({...events(),dataset:{},attrs:{},textContent:'',setAttribute(k,v){this.attrs[k]=v;}});
  const nodes={},controls=Object.keys(scenes).map(kind=>{
    const c=element();c.dataset.animation=kind;
    c.play=element();c.restart=element();c.status=element();c.status.textContent='Ready';
    c.newStart=kind==='gd'?element():null;
    c.cycleStart=kind==='polynomials'?element():null;
    c.extras=Object.fromEntries((kind==='momentumlandscape'?['toggle-noise','longer-memory']:kind==='polynomials'?['five-steps']:kind==='valley'?['toggle-basis','adam-rate']:[]).map(k=>[k,element()]));
    c.previousStep=element();c.nextStep=element();
    c.cameraButtons=(kind==='gd'||kind==='momentumlandscape'||kind==='valley')?Object.fromEntries(['zoom-in','zoom-out','reset-view'].map(k=>[k,element()])):{};
    c.querySelector=s=>s==='[data-action="play"]'?c.play:s==='[data-action="restart"]'?c.restart:s==='[data-action="new-start"]'?c.newStart:s==='[data-action="previous-step"]'?c.previousStep:s==='[data-action="next-step"]'?c.nextStep:s==='[data-action="cycle-start"]'?c.cycleStart:s==='[data-status]'?c.status:c.cameraButtons[s.match(/data-action="([^"]+)/)?.[1]]||c.extras[s.match(/data-action="([^"]+)/)?.[1]]||null;
    nodes[`muon-${kind}`]={...element(),setPointerCapture(){},parentElement:{insertBefore(){}}};return c;
  });
  const doc={...events(),hidden:false,querySelectorAll:()=>controls,getElementById:id=>nodes[id]};
  const media={...events(),matches:reduced},queue=new Map();let id=0;
  const intersections=[];
  globalThis.window={matchMedia:()=>media};globalThis.document=doc;
  globalThis.requestAnimationFrame=fn=>{queue.set(++id,fn);return id;};
  globalThis.cancelAnimationFrame=id=>queue.delete(id);
  globalThis.IntersectionObserver=class{constructor(fn){intersections.push(fn);}observe(){}};
  mountAnimations(doc);
  return {controls,nodes,queue,doc,media,intersections,tick(now){const jobs=[...queue.values()];queue.clear();jobs.forEach(fn=>fn(now));}};
}
test('the play hint ends on first use and respects changes to reduced motion',()=>{
  const e=environment(),a=e.controls[0],b=e.controls.find(c=>c.nextStep);
  assert.equal(a.dataset.unplayed,'true');
  a.play.fire('click');assert.equal(a.dataset.unplayed,'false');
  a.restart.fire('click');assert.equal(a.dataset.unplayed,'false');
  b.nextStep.fire('click');b.restart.fire('click');assert.equal(b.dataset.unplayed,'false');
  const quiet=environment(true),q=quiet.controls[0];
  assert.equal(q.dataset.unplayed,'false');assert.equal(quiet.queue.size,0);
  quiet.media.matches=false;quiet.media.fire('change');
  assert.ok(quiet.controls.every(c=>c.dataset.unplayed==='true'));
  quiet.media.matches=true;quiet.media.fire('change');
  assert.ok(quiet.controls.every(c=>c.dataset.unplayed==='false'));
});
test('playback starts on demand, freezes on Stop, restarts, and pauses when hidden or offscreen',()=>{
  const e=environment(), [a,b]=e.controls, svg=e.nodes['muon-gd'];
  assert.equal(e.queue.size,0);a.play.fire('click');e.tick(0);e.tick(1000);assert.equal(svg.dataset.time,'1.000');
  a.play.fire('click');e.tick(5000);assert.equal(svg.dataset.time,'1.000');assert.equal(e.queue.size,0);
  a.play.fire('click');b.play.fire('click');assert.equal(a.dataset.playing,'false');assert.equal(e.queue.size,1);
  e.intersections[1]([{isIntersecting:false}]);assert.equal(e.queue.size,0);
  a.restart.fire('click');assert.equal(svg.dataset.time,'0.000');
  a.play.fire('click');e.tick(0);e.tick(25000);assert.equal(svg.dataset.time,'24.000');assert.equal(a.play.textContent,'Replay');
  a.play.fire('click');assert.equal(a.dataset.playing,'true');
  e.doc.hidden=true;e.doc.fire('visibilitychange');assert.equal(e.queue.size,0);
});
test('Play runs reduced-motion scenes as timed still frames and Stop freezes them',()=>{
  const e=environment(true),a=e.controls[0],svg=e.nodes['muon-gd'];
  assert.equal(a.play.textContent,'Play animation');a.play.fire('click');
  assert.equal(a.dataset.playing,'true');e.tick(0);e.tick(1000);
  assert.equal(svg.dataset.time,'0.000');e.tick(1500);
  assert.equal(svg.dataset.time,'1.000');e.tick(2000);
  assert.equal(svg.dataset.time,'1.000');a.play.fire('click');
  assert.equal(e.queue.size,0);e.tick(4000);assert.equal(svg.dataset.time,'1.000');
  const momentum=e.controls.find(c=>c.dataset.animation==='momentum');
  momentum.play.fire('click');e.tick(5000);e.tick(6500);
  const frame=momentumFrame(Number(e.nodes['muon-momentum'].dataset.time));
  assert.equal(frame.k,0);assert.equal(frame.sum,1);
  momentum.previousStep.fire('click');assert.equal(e.queue.size,0);
  assert.equal(e.nodes['muon-momentum'].dataset.time,'0.000');
});
test('another start stops playback and computes a fresh route',()=>{
  const e=environment(),a=e.controls[0],svg=e.nodes['muon-gd'];
  const initial=svg.innerHTML;
  a.play.fire('click');e.tick(0);e.tick(1000);
  a.newStart.fire('click');
  assert.equal(e.queue.size,0);assert.equal(a.dataset.playing,'false');
  assert.equal(svg.dataset.time,'0.000');assert.notEqual(svg.innerHTML,initial);
  assert.match(a.status.textContent,/New starting weights/);
});
test('batch stepping pauses on a complete numerical result and stops at the last batch',()=>{
  const e=environment(),c=e.controls.find(c=>c.dataset.animation==='momentum'),svg=e.nodes['muon-momentum'];
  for(let k=0;k<12;k++){
    c.nextStep.fire('click');
    const frame=momentumFrame(Number(svg.dataset.time));
    assert.equal(frame.k,k);assert.equal(frame.sum,1);
    assert.equal(e.queue.size,0);
  }
  c.nextStep.fire('click');near(Number(svg.dataset.time),scenes.momentum.duration);
  assert.equal(c.play.textContent,'Replay');
});
test('new scenes advance through meaningful checkpoints and honor reduced motion',()=>{
  for(const reduced of [false,true]){
    const e=environment(reduced);
    for(const kind of ['svd','fixedpoints','taylor','derivatives','spectral','trace','budgets','polynomials','step','optimizers','valley']){
      const c=e.controls.find(c=>c.dataset.animation===kind),svg=e.nodes[`muon-${kind}`];
      for(const expected of scenes[kind].checkpoints){
        c.nextStep.fire('click');
        near(Number(svg.dataset.time),expected);assert.equal(e.queue.size,0);
      }
      c.restart.fire('click');near(Number(svg.dataset.time),0);
    }
  }
});

test('the first basin is a strict local minimum and the second is the zero-loss global minimum',()=>{
  const local=gradientStates().at(-1),global=gradientStates([1.4,.65]).at(-1),critical=(-1-Math.sqrt(.4))/2;
  assert.ok(Math.abs(local[0]-critical)<.0001);assert.ok(descentLoss(local)>1);
  assert.ok(12*local[0]**2-3.4>0);
  assert.ok(Math.hypot(global[0]-1,global[1])<.0001);assert.ok(descentLoss(global)<1e-8);
  for(const w of [local,global])assert.ok(Math.hypot(...descentGradient(w))<.0001);
});
test('secant slopes converge and the unit-input sweep attains the spectral bound',()=>{
  const slopes=[0,4,8,12].map(t=>derivativeState(t).slope);
  assert.ok(slopes.every((v,i)=>!i||v<slopes[i-1]));
  for(let t=0;t<=18;t+=.1){
    const {h,slope}=derivativeState(t);near(slope,((1+h)**2-1)/h);
    const {x,dx,length}=spectralState(t);near(Math.hypot(...x),1);
    near(dx[0],1.5*x[0]+.5*x[1]);near(dx[1],.5*x[0]+1.5*x[1]);
    assert.ok(length>=1-1e-12&&length<=2+1e-12);
  }
  near(spectralState(1.5).length,2);near(spectralState(4.5).length,1);near(spectralState(18).length,2);
});
test('orbit and zoom change the projection while preserving the loss and route',()=>{
  const e=environment(),c=e.controls[0],svg=e.nodes['muon-gd'],initial=svg.innerHTML;
  c.cameraButtons['zoom-in'].fire('click');assert.notEqual(svg.innerHTML,initial);
  near(JSON.parse(svg.dataset.camera).zoom,1.15);assert.equal(svg.dataset.time,'0.000');
  svg.fire('keydown',{key:'ArrowLeft',preventDefault(){}});near(JSON.parse(svg.dataset.camera).yaw,.4);
  svg.fire('pointerdown',{button:0,clientX:100,clientY:100,pointerId:1});
  svg.fire('pointermove',{clientX:150,clientY:120,pointerId:1});
  near(JSON.parse(svg.dataset.camera).yaw,.8);
  svg.fire('pointerup');c.cameraButtons['reset-view'].fire('click');
  assert.equal(svg.innerHTML,initial);
  const p=projectLoss([1,0],0),z=projectLoss([1,0],0,{...defaultCamera(),zoom:1.5});
  near(z[0]-320,1.5*(p[0]-320));near(z[1]-335,1.5*(p[1]-335));
});

test('flying values grow from their source and smoothly shrink into the destination',()=>{
  const a=[20,60],b=[310,140];
  for(const arriving of [false,true]){
    const start=tokenMotion(0,a,b,arriving),end=tokenMotion(1,a,b,arriving);
    start.center.forEach((v,i)=>near(v,a[i]));end.center.forEach((v,i)=>near(v,b[i]));
    near(arriving?end.opacity:start.opacity,0);
    for(let t=.001;t<=1;t+=.001){
      const x=tokenMotion(t,a,b,arriving),y=tokenMotion(t-.001,a,b,arriving);
      assert.ok(Math.hypot(...x.center.map((v,i)=>v-y.center[i]))<1);
      assert.ok(Math.abs(x.scale-y.scale)<.008);
    }
  }
  near(tokenMotion(1,a,b,true).scale,.08);
});
test('matrix quintic agrees with independent scalar iteration on diagonal matrices',()=>{
  assert.deepEqual(muonMatrixSequence([0,0,0,0]),Array.from({length:6},()=>[0,0,0,0]));
  for(const values of [[3,1],[1,.001],[-2,.4],[0,1]]){
    const norm=Math.hypot(...values)+1e-7;
    let expected=values.map(v=>v/norm);
    for(const actual of muonMatrixSequence([values[0],0,0,values[1]])){
      near(actual[0],expected[0]);near(actual[3],expected[1]);near(actual[1],0);near(actual[2],0);
      expected=expected.map(quintic);
    }
  }
  const full=[2,.5,-1,3],singular=singularValues2(full);
  near(singular[0]**2+singular[1]**2,full.reduce((sum,x)=>sum+x*x,0));
  near(singular[0]*singular[1],6.5);
});
test('the complete Muon walkthrough ends at the computed weights',()=>{
  const f=muonStepStates();
  multiply2(f.q,[1.04,.16,.16,.36]).forEach((v,i)=>near(f.m[i],v));
  const endpoint=muonStepFrame(32);
  f.w.forEach((w,i)=>near(endpoint.matrix[i],w-.1*f.xs[5][i]));
  for(const t of scenes.step.checkpoints)assert.ok(muonStepFrame(t).matrix.every(Number.isFinite));
});
test('optimizer replay uses weighted histories, bias correction and each optimizer’s own decay',()=>{
  const states=optimizerReplay();
  for(let n=0;n<states.length;n++){
    const f=states[n];
    for(let i=0;i<4;i++){
      const m=states.slice(0,n+1).reduce((sum,s,j)=>sum+.2*.8**(n-j)*s.g[i],0);
      const v=states.slice(0,n+1).reduce((sum,s,j)=>sum+.1*.9**(n-j)*s.g[i]**2,0);
      near(f.m[i],m);near(f.v[i],v);
      near(f.r[1][i],(m/(1-.8**(n+1)))/(Math.sqrt(v/(1-.9**(n+1)))+1e-8));
      for(let j=0;j<3;j++){
        near(f.d[j][i],-.1*f.r[j][i]-(j===0?0:.01*f.before[j][i]));
        near(f.after[j][i],f.before[j][i]+f.d[j][i]);
        if(n)near(f.before[j][i],states[n-1].after[j][i]);
        near(optimizerFrame(n*6+5.5).matrices[j][i],f.d[j][i]);
      }
    }
  }
  assert.ok(singularValues2(states[0].r[1])[1]<1e-7);
  assert.ok(singularValues2(states[0].r[2])[1]>.5);
});
test('polynomial iteration controls stop on a computed result and cycle through all starts',()=>{
  const e=environment(),c=e.controls.find(c=>c.dataset.animation==='polynomials'),svg=e.nodes['muon-polynomials'];
  c.nextStep.fire('click');const f=polynomialFrame(Number(svg.dataset.time));
  assert.equal(f.k,0);near(f.calculation,1);near(f.advance,1);
  for(const start of [1,0,.1]){
    c.cycleStart.fire('click');assert.match(svg.innerHTML,new RegExp(`Starting at ${start}`));
    near(Number(svg.dataset.time),0);assert.equal(e.queue.size,0);
  }
});

test('optimizer geometry carries the previous result continuously into the next gradient',()=>{
  for(let k=1;k<6;k++){
    const before=optimizerFrame(k*6-1e-7),after=optimizerFrame(k*6+1e-7);
    for(let j=0;j<3;j++)for(let i=0;i<4;i++)assert.ok(Math.abs(before.matrices[j][i]-after.matrices[j][i])<1e-10);
  }
});


test('exact polar reference preserves lengths and the overlay compares the right objects',()=>{
  const f=muonStepStates(),qt=[f.q[0],f.q[2],f.q[1],f.q[3]],s=multiply2(qt,f.m);
  multiply2(qt,f.q).forEach((v,i)=>near(v,[1,0,0,1][i]));
  near(s[1],s[2]);assert.ok(s[0]>0&&s[0]*s[3]-s[1]*s[2]>0);
  const apply=(a,v)=>[a[0]*v[0]+a[1]*v[1],a[2]*v[0]+a[3]*v[1]];
  for(const x of f.xs)for(const v of f.basis){
    const actual=apply(x,v),target=apply(f.q,v);
    near(actual[0]*target[1]-actual[1]*target[0],0);
    assert.ok(actual[0]*target[0]+actual[1]*target[1]>0);
  }
  const x5=muonStepFrame(25.5),d=muonStepFrame(28.7),w=muonStepFrame(32);
  f.q.forEach((v,i)=>{near(x5.reference[i],v);near(d.reference[i],-.1*v);near(w.reference[i],f.w[i]-.1*v);});
  near(w.error,.1*x5.error);
});
test('matrix valley gradient agrees with finite differences and plotted coordinates',()=>{
  for(const rotated of [false,true]){
    const model=valleyModel(rotated),w=[.7,-.2,.4,1.2],g=model.gradient(w),eps=1e-5;
    for(let i=0;i<4;i++){
      const a=w.slice(),b=w.slice();a[i]+=eps;b[i]-=eps;
      assert.ok(Math.abs((model.loss(a)-model.loss(b))/(2*eps)-g[i])<1e-8);
    }
    const B=model.basis,Bt=[B[0],B[2],B[1],B[3]];
    for(const rate of [.08,.32])for(const run of valleyTrajectories(rotated,rate).runs)for(const state of run.states){
      const [a,b]=state.point,reconstructed=multiply2(multiply2(B,[a,0,0,b]),Bt);
      reconstructed.forEach((v,i)=>near(v,state.w[i]));
      near(state.loss,.5*(40*a*a+b*b));assert.ok(state.loss>=0&&Number.isFinite(state.loss));
      state.g.forEach((v,i)=>near(v,model.gradient(state.w)[i]));
    }
  }
});
test('valley trajectories use each method’s own gradient, moments and decaying learning rate',()=>{
  for(const rotated of [false,true])for(const rate of [.08,.32]){
    const {runs}=valleyTrajectories(rotated,rate);
    runs.forEach((run,j)=>{
      for(let t=0;t<80;t++){
        const state=run.states[t],history=run.states.slice(0,t+1);
        const m=state.w.map((_,i)=>history.reduce((sum,v,k)=>sum+.2*.8**(t-k)*v.g[i],0));
        const v=state.w.map((_,i)=>history.reduce((sum,v,k)=>sum+.1*.9**(t-k)*v.g[i]**2,0));
        const direction=j===0?state.g:j===1?m.map((x,i)=>x/(1-.8**(t+1))/(Math.sqrt(v[i]/(1-.9**(t+1)))+1e-8)):muonMatrixSequence(m)[5];
        const eta=run.rate*(.1+.45*(1+Math.cos(Math.PI*t/80)));
        state.w.forEach((w,i)=>near(run.states[t+1].w[i],w-eta*direction[i]));
      }
    });
    assert.notDeepEqual(runs[0].states[1].g,runs[1].states[1].g);
  }
});
test('basis rotation preserves SGD and Muon paths but changes AdamW; tuning can reverse the ranking',()=>{
  const mixed=valleyTrajectories(true),aligned=valleyTrajectories(false),tuned=valleyTrajectories(true,.32);
  for(const j of [0,2])for(let t=0;t<=80;t++)mixed.runs[j].states[t].point.forEach((v,i)=>assert.ok(Math.abs(v-aligned.runs[j].states[t].point[i])<1e-7));
  assert.ok(mixed.runs[2].states[80].loss<mixed.runs[1].states[80].loss);
  assert.ok(aligned.runs[1].states[80].loss<aligned.runs[2].states[80].loss);
  assert.ok(tuned.runs[1].states[80].loss<tuned.runs[2].states[80].loss);
  const frame=valleyFrame(3.7);frame.current.forEach(s=>near(s.loss,frame.model.loss(s.w)));
});
test('early-progress milestones and budget control distinguish proximity from convergence',()=>{
  assert.deepEqual(polynomialMilestones(.1),{cubic:6,quintic:2});
  assert.deepEqual(polynomialMilestones(1),{cubic:0,quintic:0});
  assert.deepEqual(polynomialMilestones(0),{cubic:null,quintic:null});
  const e=environment(),c=e.controls.find(c=>c.dataset.animation==='polynomials');
  c.extras['five-steps'].fire('click');
  const frame=polynomialFrame(Number(e.nodes['muon-polynomials'].dataset.time));
  assert.equal(frame.k,4);near(frame.advance,1);assert.equal(e.queue.size,0);
});
test('loss experiment controls recompute paths and stop playback',()=>{
  const e=environment(),c=e.controls.find(c=>c.dataset.animation==='valley'),svg=e.nodes['muon-valley'];
  c.play.fire('click');e.tick(0);e.tick(5000);assert.ok(Number(svg.dataset.time)>0);
  c.extras['toggle-basis'].fire('click');near(Number(svg.dataset.time),0);assert.equal(e.queue.size,0);
  assert.match(svg.innerHTML,/entries align/);
  c.extras['adam-rate'].fire('click');assert.match(svg.innerHTML,/initial η = 0.32/);
  c.extras['toggle-basis'].fire('click');assert.match(svg.innerHTML,/mixes the two directions/);
  c.extras['adam-rate'].fire('click');assert.doesNotMatch(svg.innerHTML,/initial η = 0.32/);
});


test('all scenes step forward and backward through the same frames, without autoplay or wraparound',()=>{
  for(const reduced of [false,true]){
    const e=environment(reduced);
    for(const c of e.controls){
      const svg=e.nodes[`muon-${c.dataset.animation}`], frames=[{time:svg.dataset.time,html:svg.innerHTML}];
      assert.equal(c.previousStep.disabled,true);assert.equal(c.nextStep.disabled,false);
      for(let i=0;!c.nextStep.disabled&&i<60;i++){
        c.nextStep.fire('click');frames.push({time:svg.dataset.time,html:svg.innerHTML});
        assert.equal(e.queue.size,0);assert.equal(c.previousStep.disabled,false);
      }
      near(Number(svg.dataset.time),scenes[c.dataset.animation].duration);
      assert.equal(c.nextStep.disabled,true);assert.equal(c.play.textContent,'Replay');
      for(let i=frames.length-2;i>=0;i--){
        c.previousStep.fire('click');assert.equal(svg.dataset.time,frames[i].time);
        assert.equal(svg.innerHTML,frames[i].html);assert.equal(e.queue.size,0);
      }
      assert.equal(c.previousStep.disabled,true);assert.equal(c.nextStep.disabled,false);
      c.previousStep.fire('click');assert.equal(svg.dataset.time,'0.000');
    }
  }
});
test('back pauses mid-playback at the preceding checkpoint, then Play resumes',()=>{
  const e=environment(),c=e.controls.find(c=>c.dataset.animation==='svd'),svg=e.nodes['muon-svd'];
  c.play.fire('click');e.tick(0);e.tick(9000);near(Number(svg.dataset.time),9);
  c.previousStep.fire('click');near(Number(svg.dataset.time),6);assert.equal(e.queue.size,0);
  c.play.fire('click');e.tick(10000);e.tick(11000);near(Number(svg.dataset.time),7);
  c.nextStep.fire('click');near(Number(svg.dataset.time),12);assert.equal(e.queue.size,0);
});


test('momentum landscape uses the actual gradient, seeded noise and EMA update at each position',()=>{
  for(const noise of [false,true])for(const beta of [.8,.95]){
    const runs=momentumLandscapeStates({noise,beta});
    assert.deepEqual(runs,momentumLandscapeStates({noise,beta}));
    for(let r=0;r<2;r++)for(let k=1;k<=48;k++){
      const a=runs[r][k-1],b=runs[r][k],memory=r?beta:0;
      for(let j=0;j<2;j++){
        near(b.m[j],memory*a.m[j]+(1-memory)*b.g[j]);
        near(b.w[j],a.w[j]-.14*b.m[j]);
        const eps=1e-5,plus=a.w.slice(),minus=a.w.slice();plus[j]+=eps;minus[j]-=eps;
        assert.ok(Math.abs((momentumLoss(plus)-momentumLoss(minus))/(2*eps)-momentumGradient(a.w)[j])<1e-8);
        const other=runs[1-r];
        near(b.g[j]-momentumGradient(a.w)[j],other[k].g[j]-momentumGradient(other[k-1].w)[j]);
      }
      near(b.loss,momentumLoss(b.w));
    }
  }
  const noisy=momentumLandscapeStates();
  assert.ok(noisy[1].at(-1).sideways<noisy[0].at(-1).sideways/2);
  const long=momentumLandscapeStates({noise:false,beta:.95});
  assert.ok(Math.min(...long[1].map(s=>s.w[0]))<-.5);
  assert.ok(long[0].every(s=>s.w[0]>0));
  assert.deepEqual(momentumLandscapeFrame(60).points,noisy.map(r=>r.at(-1).w));
});
test('momentum experiment toggles reset playback and change the computed paths',()=>{
  const e=environment(),c=e.controls.find(c=>c.dataset.animation==='momentumlandscape'),svg=e.nodes['muon-momentumlandscape'];
  c.play.fire('click');e.tick(0);e.tick(5000);c.extras['toggle-noise'].fire('click');
  assert.equal(e.queue.size,0);assert.equal(svg.dataset.time,'0.000');assert.match(svg.innerHTML,/noise off/);
  c.extras['longer-memory'].fire('click');assert.match(svg.innerHTML,/0.95/);
});


test('momentum surface rotates and zooms without changing the computed trajectory',()=>{
  const e=environment(),c=e.controls.find(c=>c.dataset.animation==='momentumlandscape'),svg=e.nodes['muon-momentumlandscape'];
  c.nextStep.fire('click');const time=svg.dataset.time,initial=svg.innerHTML;
  svg.fire('keydown',{key:'ArrowRight',preventDefault(){}});
  assert.notEqual(svg.innerHTML,initial);assert.equal(svg.dataset.time,time);
  const before=JSON.parse(svg.dataset.camera);c.cameraButtons['zoom-in'].fire('click');
  assert.ok(JSON.parse(svg.dataset.camera).zoom>before.zoom);
  c.cameraButtons['reset-view'].fire('click');assert.equal(svg.innerHTML,initial);
  svg.fire('pointerdown',{button:0,clientX:100,clientY:100,pointerId:1});
  svg.fire('pointermove',{clientX:125,clientY:110,pointerId:1});
  assert.notEqual(svg.innerHTML,initial);assert.equal(svg.dataset.time,time);
});
test('optimizer comparison surface rotates and zooms without changing the computed trajectory',()=>{
  const e=environment(),c=e.controls.find(c=>c.dataset.animation==='valley'),svg=e.nodes['muon-valley'];
  c.nextStep.fire('click');const time=svg.dataset.time,initial=svg.innerHTML;
  svg.fire('keydown',{key:'ArrowRight',preventDefault(){}});
  assert.notEqual(svg.innerHTML,initial);assert.equal(svg.dataset.time,time);
  const before=JSON.parse(svg.dataset.camera);c.cameraButtons['zoom-in'].fire('click');
  assert.ok(JSON.parse(svg.dataset.camera).zoom>before.zoom);
  c.cameraButtons['reset-view'].fire('click');assert.equal(svg.innerHTML,initial);
  svg.fire('pointerdown',{button:0,clientX:100,clientY:100,pointerId:1});
  svg.fire('pointermove',{clientX:125,clientY:110,pointerId:1});
  assert.notEqual(svg.innerHTML,initial);assert.equal(svg.dataset.time,time);
});
