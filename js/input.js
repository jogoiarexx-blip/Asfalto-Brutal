import {nextWeapon} from './combat.js';

/** Standard Gamepad mapping: LT brake, RT gas, X/LB left hit, B/RB right hit,
 * Y nitro, A nitro/accelerate backup, D-pad up/down weapon switch, Start pause.
 */
export class Input {
 constructor(){
  this.keys=new Set();this.touch=new Set();this.leftQueued=false;this.rightQueued=false;this.pauseQueued=false;this.debugQueued=false;this.cameraQueued=false;
  this.weaponQueued=null;this.weaponStep=0;this.cameraQueued=false;this.lastButtons={};this.padConnected=false;this.gamepad={};this.padId='';
  addEventListener('blur',()=>this.reset());document.addEventListener('visibilitychange',()=>{if(document.hidden)this.reset()});
  addEventListener('keydown',e=>{
   if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code))e.preventDefault();
   if(!e.repeat){
    if(e.code==='KeyJ')this.leftQueued=true;if(e.code==='KeyK')this.rightQueued=true;
    if(['KeyP','Escape'].includes(e.code))this.pauseQueued=true;if(e.code==='KeyH')this.debugQueued=true;if(e.code==='KeyC')this.cameraQueued=true;
    const bind={Digit1:'chain',Digit2:'club',Digit3:'pipe',Digit4:'machete',Digit5:'baton'};
    if(bind[e.code])this.weaponQueued=bind[e.code];
    if(e.code==='KeyQ')this.weaponStep=-1;if(e.code==='KeyE')this.weaponStep=1;
   }
   this.keys.add(e.code);
  });
  addEventListener('keyup',e=>this.keys.delete(e.code));
  document.querySelectorAll('[data-control]').forEach(btn=>{
   const action=btn.dataset.control;
   const clear=e=>{e.preventDefault();this.touch.delete(action);btn.classList.remove('active');try{btn.releasePointerCapture(e.pointerId)}catch{}};
   btn.addEventListener('pointerdown',e=>{e.preventDefault();try{btn.setPointerCapture(e.pointerId)}catch{}this.touch.add(action);btn.classList.add('active');if(action==='hitLeft')this.leftQueued=true;if(action==='hitRight')this.rightQueued=true;if(action==='weaponNext')this.weaponStep=1});
   btn.addEventListener('pointerup',clear);btn.addEventListener('pointercancel',clear);
   btn.addEventListener('lostpointercapture',()=>{this.touch.delete(action);btn.classList.remove('active')});
  });
 }
 reset(){this.keys.clear();this.touch.clear();this.gamepad={};this.leftQueued=false;this.rightQueued=false;this.pauseQueued=false;this.debugQueued=false;this.cameraQueued=false;this.weaponQueued=null;this.weaponStep=0;this.cameraQueued=false;this.lastButtons={};document.querySelectorAll('[data-control]').forEach(b=>b.classList.remove('active'))}
 pressed(...codes){return codes.some(k=>this.keys.has(k))}
 update(){
  const gp=[...(navigator.getGamepads?.()||[])].find(Boolean);this.padConnected=!!gp;this.padId=gp?.id||'';
  if(!gp){this.lastButtons={};this.gamepad={};return}
  const b=n=>!!gp.buttons?.[n]?.pressed;
  const rising={};for(const n of [0,1,2,4,5,8,9,11,12,13,14,15]){const current=b(n);rising[n]=current&&!this.lastButtons[n];this.lastButtons[n]=current}
  const axis=gp.axes?.[0]||0;
  this.gamepad={steer:Math.abs(axis)>.16?axis:0,accelerate:b(7)||b(0),brake:b(6),nitro:b(3),left:rising[2]||rising[4],right:rising[1]||rising[5],pause:rising[9]||rising[8],camera:rising[11],menuConfirm:rising[0]||rising[9],menuBack:rising[1],menuLeft:rising[14],menuRight:rising[15],menuUp:rising[12],menuDown:rising[13],weaponStep:(rising[13]||rising[15]?1:0)-(rising[12]||rising[14]?1:0)};
 }
 get steer(){return Math.max(-1,Math.min(1,(this.pressed('KeyD','ArrowRight')||this.touch.has('right')?1:0)-(this.pressed('KeyA','ArrowLeft')||this.touch.has('left')?1:0)+(this.gamepad.steer||0)))}
 get accelerating(){return !!(this.pressed('KeyW','ArrowUp')||this.touch.has('accelerate')||this.gamepad.accelerate)}
 get braking(){return !!(this.pressed('Space','KeyS','ArrowDown')||this.touch.has('brake')||this.gamepad.brake)}
 get boosting(){return !!(this.pressed('ShiftLeft','ShiftRight')||this.touch.has('nitro')||this.gamepad.nitro)}
 consumeHits(){const v={left:!!(this.leftQueued||this.gamepad.left),right:!!(this.rightQueued||this.gamepad.right)};this.leftQueued=false;this.rightQueued=false;this.gamepad.left=false;this.gamepad.right=false;return v}
 consumeWeapon(current='chain'){
  const result=this.weaponQueued||(this.weaponStep||this.gamepad.weaponStep?nextWeapon(current,(this.weaponStep||this.gamepad.weaponStep)):null);
  this.weaponQueued=null;this.weaponStep=0;this.gamepad.weaponStep=0;return result;
 }
 consumeMenu(){const g=this.gamepad;const value={confirm:!!g.menuConfirm,back:!!g.menuBack,left:!!g.menuLeft,right:!!g.menuRight,up:!!g.menuUp,down:!!g.menuDown};g.menuConfirm=g.menuBack=g.menuLeft=g.menuRight=g.menuUp=g.menuDown=false;return value}
 consumeCamera(){const triggered=!!(this.cameraQueued||this.gamepad.camera);this.cameraQueued=false;this.gamepad.camera=false;return triggered}
 consumeDebug(){const v=this.debugQueued;this.debugQueued=false;return v}
 consumePause(){const v=!!(this.pauseQueued||this.gamepad.pause);this.pauseQueued=false;this.gamepad.pause=false;return v}
 /** Best-effort; unsupported controllers never cause an exception. */
 rumble(strength=.35,duration=115){
  try{const pad=[...(navigator.getGamepads?.()||[])].find(Boolean),motor=pad?.vibrationActuator||pad?.hapticActuators?.[0];const result=motor?.playEffect?.('dual-rumble',{duration,startDelay:0,weakMagnitude:strength,strongMagnitude:strength*.8});result?.catch?.(()=>{})}catch{}
 }
}
