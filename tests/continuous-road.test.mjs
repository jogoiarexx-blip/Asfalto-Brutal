// Direção automática CONTÍNUA: nove provas completas (3 pistas x 3 ramais).
// Não há teleportes, reposicionamento de checkpoints ou manipulação de caminho/posição.
// Isola física+rede+eventos (sem tráfego, combate ou polícia); NÃO representa 9 playtests humanos.
import assert from 'node:assert/strict';
import {RACE_LENGTH,ROAD_HALF,curveAt,clamp} from '../js/config.js';
import {moveBike} from '../js/physics.js';
import {forksFor,roadCenter} from '../js/road-network.js';
import {createCheckpoints,advanceCheckpoints,allCheckpointsPassed} from '../js/checkpoints.js';
import {missionById} from '../js/jailbreak-campaign.js';
import {initialMissionRun,advanceMissionRun} from '../js/mission-events.js';

const step=1/60,results=[];
for(const route of ['coast','desert','highlands']){
 for(const targetFork of forksFor(route)){
  const mission=route==='coast'&&targetFork.id==='enseada'?missionById('correio-enseada'):null;
  const progress=mission?initialMissionRun(mission):null;
  let run=progress;
  const player={x:curveAt(0,route),z:0,pathId:'main',speed:0,nitro:100,steer:0,lateralVelocity:0,slideVelocity:0};
  let gates=createCheckpoints(),alternativeFrames=0,collisions=0,largeJump=0,maxDeviation=0,frames=0;
  for(;frames<11000&&player.z<RACE_LENGTH;frames++){
   const oldZ=player.z;
   const targetZ=Math.min(RACE_LENGTH,player.z+65);
   const desiredPath=player.z>=targetFork.start-70&&player.z<targetFork.end-35?targetFork.id:'main';
   const targetX=roadCenter(route,targetZ,desiredPath);
   const steer=clamp((player.x-targetX)*.24,-1,1);
   const move=moveBike(player,{steer,accel:true},step,route);
   assert.ok(player.z>=oldZ&&player.z-oldZ<=2,'progresso contínuo, sem teleporte');
   largeJump=Math.max(largeJump,player.z-oldZ);
   collisions+=Number(move.railImpact);
   if(player.pathId===targetFork.id)alternativeFrames++;
   maxDeviation=Math.max(maxDeviation,Math.abs(player.x-roadCenter(route,player.z,player.pathId)));
   gates=advanceCheckpoints(gates,oldZ,player.z,player.x-curveAt(player.z,route),ROAD_HALF);
   if(mission)run=advanceMissionRun(mission,run,player,oldZ).run;
  }
  const report={route,fork:targetFork.id,z:Math.round(player.z),frames,seconds:Math.round(frames/60),alternativeFrames,railImpacts:collisions,checkpoints:gates.passed,largeJump:Number(largeJump.toFixed(2)),maxDeviation:Number(maxDeviation.toFixed(2)),picked:run?.cargoPicked??null,delivered:run?.cargoDelivered??null};
  results.push(report);
  assert.ok(player.z>=RACE_LENGTH,route+'/'+targetFork.id+' não concluiu os 3800 metros');
  assert.ok(alternativeFrames>=75,route+'/'+targetFork.id+' não tomou a via lateral fisicamente');
  assert.equal(allCheckpointsPassed(gates),true,route+'/'+targetFork.id+' perdeu checkpoint');
  assert.equal(collisions,0,route+'/'+targetFork.id+' bateu em barreira invisível');
  if(mission){
   assert.equal(run.visitedForks.enseada,true,'mission 7 fork reached by continuous steering');
   assert.equal(run.cargoPicked,true,'mission 7 pickup reached by continuous steering');
   assert.equal(run.cargoDelivered,true,'mission 7 delivery reached by continuous steering');
  }
 }
}
assert.equal(results.length,9);
console.log('NOVE TRAJETOS CONTÍNUOS (sem NPC, combate ou polícia):',JSON.stringify(results));
