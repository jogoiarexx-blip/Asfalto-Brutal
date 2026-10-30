import {clamp,curveAt,headingAt} from './config.js';
import {roadCenter,roadHeading} from './road-network.js';
import {HULLS,sweptVehicleHit} from './collision.js';

/** Find a committed passing lane when an obstacle ahead is genuinely slower.
 * Inputs/outputs are road-local offsets, not screen coordinates.
 */
export function chooseOvertake(rider,others,route='coast'){
 if(rider.fallen>0||rider.stunTimer>0)return null;
 const here=rider.laneOffset??rider.x-roadCenter(route,rider.z,rider.pathId||'main');
 const ahead=others.filter(o=>o!==rider&&(o.pathId||'main')===(rider.pathId||'main')&&!(o.fallen>0)
   &&o.z-rider.z>2.7&&o.z-rider.z<Math.max(19,rider.speed*.88)
   &&(o.speed??0)<rider.speed-3
   &&Math.abs((o.laneOffset??o.x-roadCenter(route,o.z,o.pathId||'main'))-here)<1.75);
 if(!ahead.length)return null;
 ahead.sort((a,b)=>a.z-b.z);
 const leader=ahead[0],leaderOffset=leader.laneOffset??leader.x-roadCenter(route,leader.z,leader.pathId||'main');
 const possible=[clamp(leaderOffset-2.7,-4.9,4.9),clamp(leaderOffset+2.7,-4.9,4.9)];
 let best=null,bestScore=Infinity;
 for(const offset of possible){
  if(Math.abs(offset-leaderOffset)<2.0)continue;
  let score=Math.abs(offset-here)*.16+Math.abs(offset)*.045;
  for(const o of others){if(o===rider||(o.pathId||'main')!==(rider.pathId||'main'))continue;const oz=o.z-rider.z;
   if(oz < -10||oz>40)continue;
   const otherOffset=o.laneOffset??o.x-roadCenter(route,o.z,o.pathId||'main');
   const lateral=Math.abs(otherOffset-offset);
   if(lateral<1.65)score+=10+(1.65-lateral)*8;
  }
  if(score<bestScore){best=offset;bestScore=score}
 }
 return bestScore<8?best:null;
}

/** Symmetric rival/rival contact solver, with swept SAT to prevent tunnelling.
 * Called at most once for a given pair each frame; never changes player state.
 */
export function resolveRivalPair(a,b,route='coast'){
 if(a.fallen>0||b.fallen>0)return null;
 const oa={...(a.old||a),...HULLS.bike},ob={...(b.old||b),...HULLS.bike};
 const na={...a,...HULLS.bike},nb={...b,...HULLS.bike};
 const aMinZ=Math.min(a.old?.z??a.z,a.z),aMaxZ=Math.max(a.old?.z??a.z,a.z);
 const bMinZ=Math.min(b.old?.z??b.z,b.z),bMaxZ=Math.max(b.old?.z??b.z,b.z);
 if(aMinZ>bMaxZ+4||bMinZ>aMaxZ+4)return null;
 const aMinX=Math.min(a.old?.x??a.x,a.x),aMaxX=Math.max(a.old?.x??a.x,a.x);
 const bMinX=Math.min(b.old?.x??b.x,b.x),bMaxX=Math.max(b.old?.x??b.x,b.x);
 if(aMinX>bMaxX+3||bMinX>aMaxX+3)return null;
 const contactTime=sweptVehicleHit(oa,na,ob,nb);
 if(contactTime===null)return null;
 const minSide=HULLS.bike.halfWidth*2+.12,minDepth=HULLS.bike.halfLength*2+.12;
 const ax=(a.old?.x??a.x)+(a.x-(a.old?.x??a.x))*contactTime;
 const bx=(b.old?.x??b.x)+(b.x-(b.old?.x??b.x))*contactTime;
 const az=(a.old?.z??a.z)+(a.z-(a.old?.z??a.z))*contactTime;
 const bz=(b.old?.z??b.z)+(b.z-(b.old?.z??b.z))*contactTime;
 const dx=ax-bx,dz=az-bz;
 // Prefer side separation on glancing contacts; otherwise ensure the trailing bike stays behind.
 const lateral=Math.abs(dx)>.50 && (Math.abs(dx)>.85||Math.abs(dz)<.45);
 const collisionSpeed=Math.abs(a.speed-b.speed);
 if(lateral){
  const sign=Math.sign(dx)||((a.laneOffset||0)>=(b.laneOffset||0)?1:-1);
  const mid=(a.x+b.x)/2, half=minSide/2+.035;
  const center=roadCenter(route,(a.z+b.z)*.5,(a.pathId||'main')===(b.pathId||'main')?a.pathId:'main');
  const leftBound=center-5.6,rightBound=center+5.6;
  // Keep both bikes on the road; shift the pair together if one hits the bound.
  const targetA=clamp(mid+sign*half,leftBound,rightBound);
  const targetB=clamp(mid-sign*half,leftBound,rightBound);
  if(Math.abs(targetA-targetB)<minSide){
   if(sign>0){a.x=targetA;b.x=clamp(a.x-minSide,leftBound,rightBound);a.x=clamp(b.x+minSide,leftBound,rightBound)}
   else{b.x=targetB;a.x=clamp(b.x-minSide,leftBound,rightBound);b.x=clamp(a.x+minSide,leftBound,rightBound)}
  }else{a.x=targetA;b.x=targetB}
 }else{
  const sign=Math.sign(dz)||((a.old?.z??a.z)>(b.old?.z??b.z)?1:-1);
  const mid=(a.z+b.z)*.5;
  a.z=mid+sign*minDepth*.5;b.z=mid-sign*minDepth*.5;
  const slow=Math.min(a.speed,b.speed);
  a.speed=Math.min(a.speed,slow+Math.max(1.3,collisionSpeed*.3));
  b.speed=Math.min(b.speed,slow+Math.max(1.3,collisionSpeed*.3));
 }
 a.laneOffset=clamp(a.x-roadCenter(route,a.z,a.pathId||'main'),-5.6,5.6);
 b.laneOffset=clamp(b.x-roadCenter(route,b.z,b.pathId||'main'),-5.6,5.6);
 a.hurtAnim=Math.max(a.hurtAnim||0,.16);b.hurtAnim=Math.max(b.hurtAnim||0,.16);
 a.contactRoll=Math.max(a.contactRoll||0,.23);
 b.contactRoll=Math.max(b.contactRoll||0,.23);
 return {time:contactTime,side:lateral,intensity:clamp(.24+collisionSpeed/37,0,1)};
}

/** Curvature-sensitive pursuit, with preview and a hard bounded acceleration.
 * Does not teleport police or move it outside the road limits.
 */
export function policeCurveTarget(police,player,route='coast'){
 const z=police.z,lookahead=clamp(police.speed*.68+14,18,65);
 const path=police.pathId||'main';
 const angle=Math.abs(Math.atan2(Math.sin(roadHeading(route,z+lookahead,path)-roadHeading(route,z,path)),Math.cos(roadHeading(route,z+lookahead,path)-roadHeading(route,z,path))));
 const severity=clamp(angle/.38,0,1);
 const curveLimit=64-severity*17;
 const futurePlayerOffset=(player.pathId||'main')===path?player.x-roadCenter(route,player.z,path):0;
 const lead=clamp((player.z-z)/110,0,.8);
 const desiredOffset=clamp(futurePlayerOffset*(.7+lead*.3)+(police.laneOffset||0)*(.3-lead*.3),-5.05,5.05);
 return {severity,curveLimit,desiredOffset};
}

/** Visual skid measure; stays deterministic and bounded. */
export function skidIntensity({speed=0,steer=0,slip=0,brake=false,offRoad=false}={}){
 if(speed<13)return 0;
 const steering=Math.abs(steer)*clamp(speed/50,0,1);
 return clamp((brake?steering*.90:steering*.43)+slip*.7+(offRoad?.16:0)-.16,0,1);
}
