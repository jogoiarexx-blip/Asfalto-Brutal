import assert from 'node:assert/strict';
import {ROAD_HALF,ROUTES,curveAt,RACE_LENGTH} from '../js/config.js';
import {moveBike,ROAD_RAIL} from '../js/physics.js';
import {CHECKPOINT_DISTANCES,createCheckpoints,advanceCheckpoints,allCheckpointsPassed} from '../js/checkpoints.js';
import {ROAD_FORKS,forksFor,activeFork,forkOffset,roadCenter,roadHeading,nearestRoad,isForkMouth,roadsideClearance,graphValid} from '../js/road-network.js';
assert.equal(Object.keys(ROAD_FORKS).length,Object.keys(ROUTES).length);
for(const route of Object.keys(ROUTES)){
 const forks=forksFor(route);assert.equal(forks.length,3,route+' has three connected roads');
 assert.equal(graphValid(route),true);
 for(const fork of forks){
  assert.ok(fork.start<fork.end);
  assert.ok(!CHECKPOINT_DISTANCES.some(z=>z>=fork.start&&z<=fork.end),'checkpoints on common road');
  assert.equal(forkOffset(fork,fork.start),0);
  assert.equal(forkOffset(fork,fork.end),0);
  const middle=(fork.start+fork.end)/2,midX=roadCenter(route,middle,fork.id);
  assert.ok(Math.abs(midX-curveAt(middle,route))>ROAD_HALF*2);
  assert.equal(Math.sign(midX-curveAt(middle,route)),fork.side);
  assert.equal(roadCenter(route,fork.start,fork.id),curveAt(fork.start,route));
  assert.equal(roadCenter(route,fork.end,fork.id),curveAt(fork.end,route));
  assert.ok(Number.isFinite(roadHeading(route,middle,fork.id)));
  assert.equal(nearestRoad(curveAt(middle,route),middle,route,'main').pathId,'main');
  assert.equal(nearestRoad(midX,middle,route,'main').pathId,fork.id);
  assert.equal(nearestRoad(midX+.15,middle,route,fork.id).pathId,fork.id);
  assert.equal(activeFork(route,middle)?.id,fork.id);
  assert.equal(isForkMouth(route,fork.start+2,fork.side),true);
  assert.equal(isForkMouth(route,middle,fork.side),false);
  assert.ok(roadsideClearance(route,middle,fork.side,18)>Math.abs(forkOffset(fork,middle))+ROAD_HALF);
  assert.equal(roadsideClearance(route,middle,-fork.side,18),18);
  const close=(fork.start+fork.end)/2;
  const p={x:roadCenter(route,close,fork.id),z:close,pathId:fork.id,speed:40,nitro:100,steer:0,lateralVelocity:0};
  let impacts=0;
  for(let i=0;i<60;i++){const result=moveBike(p,{accel:true},1/60,route);if(result.railImpact)impacts++}
  assert.equal(p.pathId,fork.id,'alternate road persists under forward movement');
  assert.ok(Math.abs(p.x-roadCenter(route,p.z,p.pathId))<ROAD_RAIL,'bike stays on alternate pavement');
  assert.equal(impacts,0,'alternative road should not collide with invisible main rail');
 }
}
assert.deepEqual(forksFor('unknown'),[]);
assert.equal(graphValid('unknown'),true);
const demoRoute='coast',first=forksFor(demoRoute)[0];
let p={x:curveAt(first.start-20,demoRoute),z:first.start-20,pathId:'main',speed:45,nitro:100,steer:0,lateralVelocity:0};
let altFrames=0,middleAlt=false,finishReached=false;
for(let i=0;i<1150;i++){
 const ahead=Math.min(first.end,p.z+65),target=roadCenter(demoRoute,ahead,first.id);
 // Reproduz uma direção humana contínua; não altera posição nem força pathId.
 const steer=Math.max(-1,Math.min(1,(p.x-target)*.24));
 moveBike(p,{steer,accel:true},1/60,demoRoute);
 if(p.pathId===first.id){altFrames++;if(p.z>(first.start+first.end)/2-60&&p.z<(first.start+first.end)/2+60)middleAlt=true}
 if(p.z>first.end+12){finishReached=true;break}
}
assert.ok(finishReached,'simulation should pass the fork');
assert.ok(altFrames>120,'steering needs to actually take the alternate path');
assert.equal(middleAlt,true,'motorcycle must take the separated branch in the middle');
assert.equal(p.pathId,'main','must merge back after alternative road');
let checkpoints=createCheckpoints();
for(const z of CHECKPOINT_DISTANCES)checkpoints=advanceCheckpoints(checkpoints,z-.4,z+.5,0);
assert.equal(allCheckpointsPassed(checkpoints),true,'branched route retains all mandatory gates');
assert.ok(RACE_LENGTH>first.end);
console.log('Forks v2.0.8: seis ramais, entrada fisica pelo guidão, retorno e checkpoint validados.');
