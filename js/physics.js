import {clamp,curveAt,ROAD_HALF} from './config.js';
import {worldSteer} from './collision.js';
export const ROAD_RAIL=7.72;
/** Road-relative, frame-rate stable arcade motorcycle physics.
 * Tire grip and body roll respond to speed, brake and shoulder terrain.
 */
export function moveBike(p,{steer=0,accel=false,brake=false,boost=false},dt,route,tuning={}){
 dt=clamp(dt,0,.045);
 const old={x:p.x,z:p.z,yaw:p.yaw||0,speed:p.speed,lateralVelocity:p.lateralVelocity||0};
 const offset=p.x-curveAt(p.z,route);
 const onRoad=Math.abs(offset)<ROAD_HALF-.25;
 const speedRatio=clamp(p.speed/70,0,1);
 const grip=onRoad?1:.48;
 const acceleration=tuning.accel||1,maxSpeed=tuning.topSpeed||1,handling=tuning.handling||1;
 const boosted=accel&&boost&&p.nitro>1&&!brake;
 if(accel)p.speed+=dt*(24+(boosted?35:0))*acceleration;else p.speed-=dt*(8+p.speed*.08);
 if(brake)p.speed-=dt*(38+speedRatio*8);
 p.speed-=dt*(1.8+p.speed*.057);
 p.speed=clamp(p.speed,0,(boosted?86:65)*maxSpeed);
 p.nitro=clamp(p.nitro+(boosted?-28:7.7)*dt,0,100);
 // Mild steering lock reduction at top speed: prevents instantaneous lane snapping.
 const response=1-Math.exp(-dt*(8.5+2.0*(1-speedRatio)));
 p.steer=(p.steer||0)+(clamp(steer,-1,1)-(p.steer||0))*response;
 const steeringReach=(7.3+p.speed*.12)*handling*(1-.19*speedRatio)*(brake?.70:1);
 const targetVelocity=worldSteer(p.steer)*steeringReach*grip;
 const rate=onRoad?8.5:3.5;
 p.lateralVelocity=(p.lateralVelocity||0)+(targetVelocity-(p.lateralVelocity||0))*(1-Math.exp(-dt*rate));
 const oldVel=p.lateralVelocity;
 p.z+=p.speed*dt;
 p.x+=curveAt(p.z,route)-curveAt(old.z,route)+p.lateralVelocity*dt;
 let railImpact=false,offRoad=false;
 const nextOffset=p.x-curveAt(p.z,route);
 if(Math.abs(nextOffset)>ROAD_HALF-.25){offRoad=true;p.speed=Math.max(0,p.speed-dt*(14+speedRatio*8))}
 if(Math.abs(nextOffset)>ROAD_RAIL){
  p.x=curveAt(p.z,route)+Math.sign(nextOffset)*ROAD_RAIL;
  p.lateralVelocity=-p.lateralVelocity*.22;
  p.speed*=.87;
  p.contactJolt=Math.max(p.contactJolt||0,.65);
  railImpact=true;
 }
 const lateralAccel=(p.lateralVelocity-(p.lastLateral||0))/Math.max(dt,.001);
 p.lastLateral=p.lateralVelocity;
 p.bank=clamp(-(p.steer||0)*(.12+.20*speedRatio)-lateralAccel*.002,-.38,.38);
 p.suspension=(p.suspension||0)*Math.exp(-dt*7);
 p.contactJolt=(p.contactJolt||0)*Math.exp(-dt*5.5);
 if(offRoad)p.suspension=Math.min(.15,p.suspension+.020);
 p.slip=clamp(Math.abs(targetVelocity-oldVel)/Math.max(3,p.speed)*.16,0,.35);
 return {old,boosted,railImpact,offRoad,grip,bank:p.bank,slip:p.slip};
}
