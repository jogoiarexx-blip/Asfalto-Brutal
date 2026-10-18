import {attackEnvelope} from './combat.js';
const mix=(a,b,k)=>a+(b-a)*k;
/** The camera trails along -Z: screen-left arm is the model's RIGHT (+X). */
export function animateRider(vehicle,{dt=.016,time=0,attackAge=Infinity,attackSide=0,speed=0,steer=0,hurt=0,guard=0}={}){
 if(!vehicle?.armLeft||!vehicle?.armRight||!vehicle.rider)return;
 const factor=Math.min(1,dt*18);
 const power=attackEnvelope(attackAge),bounce=Math.sin(time*12)*Math.min(.025,speed*.00045);
 const attackedArm=attackSide===-1?'armRight':'armLeft';
 for(const key of ['armLeft','armRight']){
  const rig=vehicle[key],p=key===attackedArm?power:0;
  const dir=key==='armLeft'?-1:1;
  const visibleHand=attackSide!==0&&attackAge<=.42?attackedArm:'armRight';
  for(const [id,weapon] of Object.entries(rig.weaponSets))weapon.group.visible=(id===vehicle.weaponType&&key===visibleHand);
  rig.shoulder.rotation.x=mix(rig.shoulder.rotation.x,-.18+p*.56+hurt*.17+guard*.35,factor);
  rig.shoulder.rotation.z=mix(rig.shoulder.rotation.z,dir*(.16+p*1.72+guard*.80),factor);
  rig.forearmPivot.rotation.x=mix(rig.forearmPivot.rotation.x,.14+p*.85+guard*.45,factor);
  rig.forearmPivot.rotation.z=mix(rig.forearmPivot.rotation.z,dir*(.15+p*.52),factor);
  rig.weaponPivot.rotation.z=mix(rig.weaponPivot.rotation.z,dir*p*.76,factor);
  if(typeof rig.updateChain==='function')rig.updateChain(dt,p);
 }
 vehicle.rider.rotation.z=mix(vehicle.rider.rotation.z,steer*.11-(attackSide||0)*power*.12+hurt*.13,factor*.55);
 vehicle.rider.rotation.x=mix(vehicle.rider.rotation.x,-.03+bounce-power*.16+hurt*.10,factor*.5);
 vehicle.rider.rotation.y=mix(vehicle.rider.rotation.y,-(attackSide||0)*power*.15+guard*.05,factor*.66);
 // Legs brace during braking and turns; helmet looks into the corner before the torso.
 if(vehicle.headRig){
  vehicle.headRig.rotation.y=mix(vehicle.headRig.rotation.y,-steer*.22+(attackSide||0)*power*.09,factor*.38);
  vehicle.headRig.rotation.z=mix(vehicle.headRig.rotation.z,steer*.13-hurt*.08,factor*.55);
  vehicle.headRig.rotation.x=mix(vehicle.headRig.rotation.x,-.04+guard*.12+power*.06,factor*.48);
 }
 if(vehicle.kickLeft&&vehicle.kickRight){
  const bracing=Math.min(.23,Math.abs(steer)*.18+Math.abs(hurt)*.18);
  vehicle.kickLeft.rotation.z=mix(vehicle.kickLeft.rotation.z,-steer*.16-bracing*.4,factor*.66);
  vehicle.kickRight.rotation.z=mix(vehicle.kickRight.rotation.z,-steer*.16+bracing*.4,factor*.66);
  vehicle.kickLeft.rotation.x=mix(vehicle.kickLeft.rotation.x,bounce*1.6+guard*.11,factor*.55);
  vehicle.kickRight.rotation.x=mix(vehicle.kickRight.rotation.x,-bounce*1.6+guard*.11,factor*.55);
 }
}
/** Fighter reacts to a hit without altering driving physics. */
export function reactionAmount(timer){return Math.min(1,Math.max(0,timer)*3)}
