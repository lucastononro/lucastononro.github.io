export function usesTouchControls(preference='auto', {points=0,coarse=false}={}) {
  return preference==='touch'||preference!=='desktop'&&points>0&&coarse;
}

export function joystickVector(dx,dy,radius=44) {
  const distance=Math.hypot(dx,dy);
  if(distance<radius*.12)return {x:0,y:0};
  const scale=Math.min(distance/radius,1)/distance;
  return {x:dx*scale,y:-dy*scale};
}

// Each thumb owns its pointer until release. Opening a puzzle, rotating, or
// switching tabs releases both, including cancelled gestures on mobile Safari.
export class TouchControls {
  constructor({getWorld,getState,onAction,onExplore,onMessage}) {
    Object.assign(this,{getWorld,getState,onAction,onExplore,onMessage});
    this.moveId=null;this.lookId=null;
    this.pad=document.querySelector('#move-pad');this.knob=document.querySelector('#move-knob');
    this.look=document.querySelector('#look-pad');this.rotate=document.querySelector('#rotate-device');
    this.pad.addEventListener('pointerdown',e=>{
      if(this.moveId!==null||!this.canMove())return;e.preventDefault();
      this.moveId=e.pointerId;this.pad.setPointerCapture(e.pointerId);
      const r=this.pad.getBoundingClientRect();this.origin={x:r.left+r.width/2,y:r.top+r.height/2};this.move(e);
    });
    this.pad.addEventListener('pointermove',e=>{if(e.pointerId===this.moveId)this.move(e)});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])this.pad.addEventListener(type,e=>{if(e.pointerId===this.moveId)this.releaseMove()});
    this.look.addEventListener('pointerdown',e=>{
      if(this.lookId!==null||!this.canMove())return;e.preventDefault();this.lookId=e.pointerId;
      this.look.setPointerCapture(e.pointerId);this.last={x:e.clientX,y:e.clientY};this.look.classList.add('held');
    });
    this.look.addEventListener('pointermove',e=>{
      if(e.pointerId!==this.lookId||!this.canMove())return;
      const w=this.getWorld();w.yaw-=(e.clientX-this.last.x)*.005*w.sensitivity;
      w.pitch=Math.max(-1.5,Math.min(1.5,w.pitch-(e.clientY-this.last.y)*.005*w.sensitivity));
      this.last={x:e.clientX,y:e.clientY};
    });
    for(const type of ['pointerup','pointercancel','lostpointercapture'])this.look.addEventListener(type,e=>{if(e.pointerId===this.lookId)this.releaseLook()});
    document.querySelector('#touch-action').onclick=()=>{this.reset();onAction()};
    document.querySelector('#touch-explore').onclick=()=>{this.reset();onExplore()};
    document.querySelector('#touch-fullscreen').onclick=()=>this.fullscreen();
    document.querySelector('#rotate-fullscreen').onclick=()=>this.fullscreen();
    window.addEventListener('blur',()=>this.reset());
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.reset()});
    window.addEventListener('resize',()=>{this.reset();this.update()});
    matchMedia('(pointer: coarse)').addEventListener('change',()=>this.update());
    this.update();
  }
  canMove(){const w=this.getWorld();return w?.active&&!w.title&&!w.blocked&&!w.suspended;}
  move(e){
    if(!this.canMove())return this.releaseMove();
    const v=joystickVector(e.clientX-this.origin.x,e.clientY-this.origin.y);
    this.getWorld().touchMove=v;this.knob.style.transform=`translate(${v.x*38}px,${-v.y*38}px)`;
  }
  releaseMove(){this.moveId=null;const w=this.getWorld();if(w)w.touchMove={x:0,y:0};this.knob.style.transform='';}
  releaseLook(){this.lookId=null;this.look.classList.remove('held');}
  reset(){this.releaseMove();this.releaseLook();}
  update(){
    this.enabled=usesTouchControls(this.getState().settings.controls,{points:navigator.maxTouchPoints,coarse:matchMedia('(pointer: coarse)').matches});
    document.body.classList.toggle('touch',this.enabled);
    const w=this.getWorld();const portrait=this.enabled&&innerHeight>innerWidth&&w?.active&&!w.title;
    this.rotate.classList.toggle('hidden',!portrait);
    if(w){w.suspended=!!portrait;w.updateComposition?.();}
  }
  async fullscreen(){
    try {if(!document.fullscreenElement)await document.documentElement.requestFullscreen();}
    catch {this.onMessage('Turn your phone sideways. Full screen is optional on this browser.');}
    try {if(document.fullscreenElement)await screen.orientation?.lock?.('landscape');}catch {/* The rotate prompt remains the fallback. */}
    this.update();
  }
}
