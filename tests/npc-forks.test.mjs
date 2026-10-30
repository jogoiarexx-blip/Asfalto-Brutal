import assert from 'node:assert/strict';
import {curveAt,ROAD_HALF} from '../js/config.js';
import {forksFor,roadCenter} from '../js/road-network.js';
import {npcPrefersFork,npcRoadChoice,spawnNpcPath,npcRoadPose,sameNpcRoad} from '../js/npc-routing.js';
import {chooseOvertake,resolveRivalPair,policeCurveTarget} from '../js/race-dynamics.js';
import {separateNpcPair} from '../js/npc-contact.js';
import {HULLS,footprintOverlap} from '../js/collision.js';
for(const route of ['coast','desert','highlands']){
 const forks=forksFor(route);assert.equal(forks.length,3);
 for(const fork of forks){
  const start=fork.start+.5,mid=(fork.start+fork.end)/2;
  const riders=Array.from({length:6},(_,index)=>npcPrefersFork(route,fork.id,'rival',index));
  const cars=Array.from({length:11},(_,index)=>npcPrefersFork(route,fork.id,'traffic',index));
  assert.ok(riders.filter(Boolean).length>=3&&riders.filter(Boolean).length<=5,'multiple rival bikes choose each branch');
  assert.ok(cars.filter(Boolean).length>=2,'cars actually use alternatives');
  const candidate=riders.findIndex(Boolean);
  assert.equal(npcRoadChoice({route,z:start,oldZ:fork.start-.5,role:'rival',index:candidate}),fork.id,'decision at mouth');
  assert.equal(npcRoadChoice({route,z:mid,oldZ:mid-2,role:'rival',index:candidate}), 'main','no mid-branch teleport from main');
  assert.equal(npcRoadChoice({route,z:mid,oldZ:mid-2,pathId:fork.id,role:'rival',index:1}),fork.id,'sticky route through split');
  assert.equal(npcRoadChoice({route,z:fork.end+1,oldZ:fork.end-.5,pathId:fork.id,role:'rival',index:0}),'main','forced merge');
  assert.equal(spawnNpcPath({route,z:mid,role:'rival',index:candidate}),fork.id,'recycled NPC spawns on actual road');
  assert.equal(npcRoadChoice({route,z:start,oldZ:fork.start-.5,pathId:'main',role:'police',playerPath:fork.id,playerZ:mid}),fork.id,'police follows rider into branch');
  assert.equal(npcRoadChoice({route,z:start,oldZ:fork.start-.5,role:'police',playerPath:'main',playerZ:mid}),'main','police stays on main when rider stays on main');
  assert.equal(npcRoadChoice({route,z:mid,oldZ:mid-1,role:'police',playerPath:fork.id,playerZ:mid}),'main','cop cannot jump across separated roads mid pursuit');
  assert.equal(spawnNpcPath({route,z:mid,role:'police',playerPath:fork.id,playerZ:mid}),fork.id,'spawn cop behind player on active side route');
  assert.ok(Math.abs(roadCenter(route,mid,fork.id)-curveAt(mid,route))>ROAD_HALF*2);
  const pose=npcRoadPose(route,mid,fork.id,2);assert.equal(pose.x,roadCenter(route,mid,fork.id)+2);assert.ok(Number.isFinite(pose.yaw));
  const cop={z:mid-30,speed:50,pathId:fork.id,laneOffset:0};
  const player={z:mid,x:roadCenter(route,mid,fork.id)+2,pathId:fork.id,speed:50};
  const curve=policeCurveTarget(cop,player,route);
  assert.ok(curve.desiredOffset>0,'cop pursues lane on side road');
  assert.ok(curve.curveLimit<=64&&curve.curveLimit>=47);
 }
}
assert.equal(sameNpcRoad({pathId:'mirante'},{pathId:'main'}),false);
assert.equal(sameNpcRoad({},{pathId:'main'}),true);
const fork=forksFor('coast')[0],z=(fork.start+fork.end)/2;
const main={z,x:roadCenter('coast',z),laneOffset:0,speed:35,pathId:'main'};
const side={z:z+9,x:roadCenter('coast',z+9,fork.id),laneOffset:0,speed:18,pathId:fork.id};
assert.equal(chooseOvertake(main,[main,side],'coast'),null,'do not overtake an obstacle on a different road');
const sideFollower={z:z,x:roadCenter('coast',z,fork.id),laneOffset:0,speed:42,pathId:fork.id};
const sideLeader={z:z+11,x:roadCenter('coast',z+11,fork.id),laneOffset:0,speed:13,pathId:fork.id};
assert.notEqual(chooseOvertake(sideFollower,[sideFollower,sideLeader],'coast'),null,'side-road passing still works');
const box=(path,z,offset=0,speed=37,kind='bike')=>({
 z,x:roadCenter('coast',z,path)+offset,yaw:0,speed,laneOffset:offset,pathId:path,
 old:{z,x:roadCenter('coast',z,path)+offset,yaw:0},vehicle:{kind}
});
const a=box(fork.id,z,0,40),b=box(fork.id,z+1,.4,22);
assert.ok(resolveRivalPair(a,b,'coast'),'rival to rival collision occurs on side road');
for(const e of [a,b])assert.ok(Math.abs(e.laneOffset)<5.7,'collision remains relative to side road, not main');
assert.equal(footprintOverlap({...a,...HULLS.bike},{...b,...HULLS.bike}),false);
const car1=box(fork.id,z,-.35,30,'car'),car2=box(fork.id,z+1,.35,18,'car');
assert.ok(separateNpcPair(car1,car2,'coast'),'vehicle contact happens on the side road');
for(const e of [car1,car2])assert.ok(Math.abs(e.laneOffset)<5.6);
console.log('NPC forks v2.0.9: traffic, rivals, police, lane separation and connected-road collisions OK');
