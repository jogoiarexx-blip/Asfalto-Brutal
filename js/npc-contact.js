import {clamp,curveAt} from './config.js';
import {HULLS,sweptVehicleHit} from './collision.js';
/** Continuous npc contact response for traffic cars vs each other or motorbikes.
 * The player's collision remains exclusively owned by contact-response.js.
 */
export function separateNpcPair(a,b,route='coast'){
 if(a.fallen>0||b.fallen>0)return null;
 const ah=['car','police'].includes(a.vehicle?.kind)?HULLS.car:HULLS.bike;
 const bh=['car','police'].includes(b.vehicle?.kind)?HULLS.car:HULLS.bike;
 const a0={...(a.old||a),...ah},b0={...(b.old||b),...bh},a1={...a,...ah},b1={...b,...bh};
 if(Math.max(a0.z,a1.z)+ah.halfLength<Math.min(b0.z,b1.z)-bh.halfLength||Math.max(b0.z,b1.z)+bh.halfLength<Math.min(a0.z,a1.z)-ah.halfLength)return null;
 if(Math.max(a0.x,a1.x)+ah.halfWidth<Math.min(b0.x,b1.x)-bh.halfWidth||Math.max(b0.x,b1.x)+bh.halfWidth<Math.min(a0.x,a1.x)-ah.halfWidth)return null;
 const t=sweptVehicleHit(a0,a1,b0,b1);if(t===null)return null;
 const cx=(a0.x+(a1.x-a0.x)*t)-(b0.x+(b1.x-b0.x)*t);
 const cz=(a0.z+(a1.z-a0.z)*t)-(b0.z+(b1.z-b0.z)*t);
 const sideGap=ah.halfWidth+bh.halfWidth+.13,depthGap=ah.halfLength+bh.halfLength+.15;
 const side=Math.abs(cx)>.65&&Math.abs(cx)/sideGap>Math.abs(cz)/depthGap;
 const difference=Math.abs((a.speed||0)-(b.speed||0));
 if(side){
  const dir=Math.sign(cx)||1,middle=(a.x+b.x)*.5,center=curveAt((a.z+b.z)*.5,route);
  a.x=clamp(middle+dir*sideGap/2,center-5.48,center+5.48);
  b.x=clamp(a.x-dir*sideGap,center-5.48,center+5.48);
  a.x=clamp(b.x+dir*sideGap,center-5.48,center+5.48);
 }else{
  // Position the follower behind the leader, even if it crossed them during a long frame.
  const forwardA=(a0.z>=b0.z)?1:-1;
  const mid=(a.z+b.z)*.5;
  a.z=mid+forwardA*depthGap*.5;
  b.z=mid-forwardA*depthGap*.5;
  const leadSpeed=forwardA>0?a.speed:b.speed;
  if(forwardA>0)b.speed=Math.min(b.speed,Math.max(0,leadSpeed));
  else a.speed=Math.min(a.speed,Math.max(0,leadSpeed));
 }
 for(const e of [a,b]){
  e.laneOffset=clamp(e.x-curveAt(e.z,route),-5.5,5.5);
  e.contactRoll=Math.max(e.contactRoll||0,.15);
  e.hurtAnim=Math.max(e.hurtAnim||0,.14);
 }
 return {side,intensity:clamp(.25+difference/45,0,1),time:t};
}
