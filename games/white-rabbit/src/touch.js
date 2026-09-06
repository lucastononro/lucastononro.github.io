export function usesTouchControls(preference='auto', {points=0,coarse=false}={}) {
  return preference==='touch'||preference!=='desktop'&&points>0&&coarse;
}

export function joystickVector(dx,dy,radius=44) {
  const distance=Math.hypot(dx,dy),deadZone=radius*.1;
  if(distance<=deadZone)return {x:0,y:0};
  // Start from zero at the edge of the rest zone, instead of jumping to 12%.
  const amount=Math.min((distance-deadZone)/(radius-deadZone),1);
  const speed=amount*amount*(3-2*amount);
  return {x:dx/distance*speed,y:-dy/distance*speed};
}

export function smoothJoystick(current,target,dt) {
  const blend=1-Math.exp(-20*Math.max(0,Math.min(dt,.05)));
  return {x:current.x+(target.x-current.x)*blend,y:current.y+(target.y-current.y)*blend};
}

// Each thumb owns its pointer until release. Opening a puzzle, rotating, or
// switching tabs releases both, including cancelled gestures on mobile Safari.
export class TouchControls {
  constructor({getWorld,getState,onAction,onExplore,onMessage}) {
    Object.assign(this,{getWorld,getState,onAction,onExplore,onMessage});
    this.moveId=null;this.lookId=null;this.moveFrame=null;this.running=false;
    this.targetMove={x:0,y:0};
    this.pad=document.querySelector('#move-pad');this.knob=document.querySelector('#move-knob');
    this.look=document.querySelector('#look-pad');this.rotate=document.querySelector('#rotate-device');
    this.run=document.querySelector('#touch-run');
    const panel=document.querySelector('#manipulation');
    if(panel){
      const content=document.createElement('div');content.id='manipulation-content';
      content.append(panel.firstElementChild,document.querySelector('#manipulation-actions'));panel.prepend(content);
      const guide=document.createElement('button');guide.id='tool-guide';guide.type='button';guide.textContent='Hide instructions';guide.setAttribute('aria-expanded','true');
      guide.onclick=()=>{const collapsed=panel.classList.toggle('tool-collapsed');guide.textContent=collapsed?'Show instructions':'Hide instructions';guide.setAttribute('aria-expanded',String(!collapsed));};
      panel.prepend(guide);
    }
    this.pad.addEventListener('pointerdown',e=>{
      if(this.moveId!==null||!this.canMove())return;e.preventDefault();
      this.moveId=e.pointerId;this.pad.setPointerCapture(e.pointerId);
      const r=this.pad.getBoundingClientRect();this.radius=Math.min(r.width,r.height)*.35;
      this.origin={x:r.left+r.width/2,y:r.top+r.height/2};this.move(e);
      this.lastMoveTime=performance.now();this.moveFrame=requestAnimationFrame(time=>this.advanceMove(time));
    });
    this.pad.addEventListener('pointermove',e=>{if(e.pointerId===this.moveId)this.move(e)});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])this.pad.addEventListener(type,e=>{if(e.pointerId===this.moveId)this.releaseMove()});
    this.look.addEventListener('pointerdown',e=>{
      if(this.lookId!==null||!this.canMove())return;e.preventDefault();this.lookId=e.pointerId;
      this.look.setPointerCapture(e.pointerId);this.last={x:e.clientX,y:e.clientY};this.look.classList.add('held');
    });
    this.look.addEventListener('pointermove',e=>{
      if(e.pointerId!==this.lookId||!this.canMove())return;
      const w=this.getWorld();w.yaw-=(e.clientX-this.last.x)*.0035*w.sensitivity;
      w.pitch=Math.max(-1.5,Math.min(1.5,w.pitch-(e.clientY-this.last.y)*.0035*w.sensitivity));
      this.last={x:e.clientX,y:e.clientY};
    });
    for(const type of ['pointerup','pointercancel','lostpointercapture'])this.look.addEventListener(type,e=>{if(e.pointerId===this.lookId)this.releaseLook()});
    if(this.run)this.run.onclick=()=>{
      if(!this.canMove())return;
      this.running=!this.running;this.syncRun();
    };
    document.querySelector('#touch-action').onclick=()=>{this.reset();onAction()};
    document.querySelector('#touch-explore').onclick=()=>{this.reset();onExplore()};
    document.querySelector('#touch-fullscreen').onclick=()=>this.fullscreen();
    document.querySelector('#rotate-fullscreen').onclick=()=>this.fullscreen();
    window.addEventListener('blur',()=>this.reset());
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.reset()});
    window.addEventListener('resize',()=>{this.reset();this.update()});
    window.addEventListener('orientationchange',()=>{this.reset();this.update()});
    matchMedia('(pointer: coarse)').addEventListener('change',()=>this.update());
    this.update();
  }
  canMove(){const w=this.getWorld();return w?.active&&!w.title&&!w.blocked&&!w.suspended;}
  move(e){
    if(!this.canMove())return this.releaseMove();
    const v=joystickVector(e.clientX-this.origin.x,e.clientY-this.origin.y,this.radius);
    this.targetMove=v;this.knob.style.transform=`translate(${v.x*this.radius*.85}px,${-v.y*this.radius*.85}px)`;
  }
  advanceMove(time){
    this.moveFrame=null;
    if(this.moveId===null||!this.canMove())return this.releaseMove();
    const w=this.getWorld();
    w.touchMove=smoothJoystick(w.touchMove||{x:0,y:0},this.targetMove,(time-this.lastMoveTime)/1000);
    this.lastMoveTime=time;this.moveFrame=requestAnimationFrame(next=>this.advanceMove(next));
  }
  releaseMove(){
    this.moveId=null;if(this.moveFrame!==null)cancelAnimationFrame(this.moveFrame);this.moveFrame=null;
    this.targetMove={x:0,y:0};const w=this.getWorld();if(w)w.touchMove={x:0,y:0};this.knob.style.transform='';
  }
  releaseLook(){this.lookId=null;this.look.classList.remove('held');}
  reset(){this.releaseMove();this.releaseLook();}
  syncRun(){
    const w=this.getWorld();if(w)w.touchRun=!!this.enabled&&this.running;
    if(this.run){this.run.textContent=this.running?'Run on':'Run off';this.run.setAttribute('aria-pressed',String(this.running));}
    this.pad.querySelector('small').textContent=this.running?'RUN':'WALK';
  }
  update(){
    const enabled=usesTouchControls(this.getState().settings.controls,{points:navigator.maxTouchPoints,coarse:matchMedia('(pointer: coarse)').matches});
    if(enabled!==this.enabled)this.reset();this.enabled=enabled;
    document.body.classList.toggle('touch',this.enabled);
    const w=this.getWorld();const portrait=this.enabled&&innerHeight>innerWidth&&w?.active&&!w.title;
    this.rotate.classList.toggle('hidden',!portrait);
    if(portrait)this.reset();
    if(w){w.suspended=!!portrait;w.updateComposition?.();}
    this.syncRun();
  }
  async fullscreen(){
    try {if(!document.fullscreenElement)await document.documentElement.requestFullscreen();}
    catch {this.onMessage('Turn your phone sideways. Full screen is optional on this browser.');}
    try {if(document.fullscreenElement)await screen.orientation?.lock?.('landscape');}catch {/* The rotate prompt remains the fallback. */}
    this.update();
  }
}
