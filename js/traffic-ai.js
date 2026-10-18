import {clamp} from './config.js';

const LANES=[-3.95,0,3.95];
export const trafficLaneOffset=lane=>LANES[clamp(Math.round(lane),-1,1)+1];
/** Cars respect surrounding traffic and motorcycles instead of teleporting into a passing lane. */
export function planTraffic(car,others,dt,{allowChange=true}={}){
 const speed=Math.max(0,car.speed||0),desired=car.cruiseSpeed??25,offset=car.laneOffset??trafficLaneOffset(car.lane??0);
 const live=others.filter(o=>o!==car&&!(o.fallen>0));
 const laneHazards=lane=>{
  const target=trafficLaneOffset(lane);let ahead=Infinity,behind=Infinity,leader=null;
  for(const o of live){const ox=o.laneOffset??o.offset??0;
   if(Math.abs(ox-target)>2.15)continue;
   const dz=o.z-car.z;
   if(dz>=0&&dz<ahead){ahead=dz;leader=o}
   else if(dz<0)behind=Math.min(behind,-dz);
  }
  return {ahead,behind,leader};
 };
 let lane=car.targetLane??car.lane??0;
 const current=laneHazards(lane);
 const caution=8+speed*.55;
 if(allowChange&&current.ahead<caution){
  let best=lane,bestScore=current.ahead;
  for(const candidate of LANES.map((_,i)=>i-1)){
   if(candidate===lane)continue;
   const gap=laneHazards(candidate);
   // A lane-change requires a safe rear gap, especially from fast-moving bikes.
   if(gap.behind<Math.max(12,speed*.43)||gap.ahead<Math.max(14,speed*.55))continue;
   const score=Math.min(gap.ahead,90)-Math.abs(candidate-lane)*4;
   if(score>bestScore+7){bestScore=score;best=candidate}
  }
  lane=best;
 }
 const hazard=laneHazards(lane);
 let targetSpeed=desired;
 if(hazard.ahead<Math.max(16,speed*.9)){
  const leadSpeed=Math.max(0,hazard.leader?.speed??0);
  targetSpeed=Math.min(desired,leadSpeed+clamp((hazard.ahead-6)*.45,-9,9));
 }
 const nextSpeed=clamp(speed+clamp(targetSpeed-speed,-22*dt,8*dt),0,Math.max(12,desired));
 const nextOffset=offset+clamp(trafficLaneOffset(lane)-offset,-dt*2.0,dt*2.0);
 return {targetLane:lane,offset:nextOffset,speed:nextSpeed,braking:targetSpeed<speed-1.3};
}
