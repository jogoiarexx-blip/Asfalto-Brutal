/** Physics footprints in metres, measured against the procedural meshes.
 * Angles are yaw around the Y axis: a positive yaw turns the bike toward +X.
 * The camera follows the bikes from -Z, so SCREEN right is WORLD -X.
 */
export const HULLS=Object.freeze({bike:Object.freeze({halfWidth:.57,halfLength:1.43}),car:Object.freeze({halfWidth:1.08,halfLength:1.98})});
const EPS=1e-9;
export const worldSteer=screenSteer=>-screenSteer;
export const worldSide=screenSide=>-screenSide;
function axes(yaw){const s=Math.sin(yaw||0),c=Math.cos(yaw||0);return [[c,-s],[s,c]];}
function dot(a,b){return a[0]*b[0]+a[1]*b[1]}
function radius(axis,obj){const [side,front]=axes(obj.yaw);return Math.abs(dot(axis,side))*obj.halfWidth+Math.abs(dot(axis,front))*obj.halfLength}
/** Swept SAT for two 2D oriented rectangular footprints.
 * Returns earliest contact fraction in the frame [0,1], or null.
 * Translational movement is continuous, preventing tunnelling during frame spikes.
 */
export function sweptVehicleHit(a0,a1,b0,b1){
 const axesA=axes(a1.yaw),axesB=axes(b1.yaw);let enter=0,leave=1;
 const start=[b0.x-a0.x,b0.z-a0.z],motion=[(b1.x-b0.x)-(a1.x-a0.x),(b1.z-b0.z)-(a1.z-a0.z)];
 for(const axis of [...axesA,...axesB]){
  const distance=dot(start,axis),speed=dot(motion,axis),extent=radius(axis,a1)+radius(axis,b1);
  if(Math.abs(speed)<EPS){if(Math.abs(distance)>extent)return null;continue}
  const t0=(-extent-distance)/speed,t1=(extent-distance)/speed;
  enter=Math.max(enter,Math.min(t0,t1));leave=Math.min(leave,Math.max(t0,t1));
  if(enter>leave)return null;
 }
 return leave>=0&&enter<=1?Math.max(0,enter):null;
}
export function footprintOverlap(a,b){return sweptVehicleHit(a,a,b,b)!==null}
/** Pick a side-specific opponent for an animated kick.
 * screenSide -1 is left on screen, +1 is right on screen.
 * Opponent is evaluated relative to rider heading, not raw world X.
 */
export function strikeCandidate(player,target,screenSide,kind='bike',weapon=null){
 const s=Math.sin(player.yaw||0),c=Math.cos(player.yaw||0);
 const dx=target.x-player.x,dz=target.z-player.z;
 const lateral=dx*c-dz*s,forward=dx*s+dz*c;
 const sideways=lateral*worldSide(screenSide);
 const reach=kind==='car'?(weapon?.reachCar??2.35):(weapon?.reachBike??2.5);
 const foreReach=weapon?.forward??(kind==='car'?2.9:2.38);
 if(sideways<.53||sideways>reach||Math.abs(forward)>(foreReach))return null;
 return Math.abs(forward)*.62+Math.abs(sideways-1.5);
}
/** World-space point after moving along a swept segment. */
export function atTime(previous,current,t){return {x:previous.x+(current.x-previous.x)*t,z:previous.z+(current.z-previous.z)*t};}
