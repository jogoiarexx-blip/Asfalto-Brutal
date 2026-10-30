import {activeFork,forkOffset,roadCenter} from './road-network.js';

export const PICKUP_RADIUS=4.3;
export const DELIVERY_RADIUS=5.2;
export function initialMissionRun(mission){
 return {visitedForks:{},cargoPicked:false,cargoDelivered:false};
}
export function missionTargets(mission){
 if(!mission?.cargo)return [];
 return [
  {id:'pickup',name:'COLETAR ENCOMENDA',z:mission.cargo.pickup.z,pathId:mission.cargo.pickup.pathId},
  {id:'delivery',name:'ENTREGAR ENCOMENDA',z:mission.cargo.delivery.z,pathId:mission.cargo.delivery.pathId}
 ];
}
function reachesTarget(target,p,previousZ,radius){
 if(p.pathId!==target.pathId||!Number.isFinite(p.x)||!Number.isFinite(p.z)||!Number.isFinite(previousZ))return false;
 if(p.z<previousZ||p.z-previousZ>8||p.z<target.z-radius||p.z>target.z+radius||previousZ>target.z+radius)return false;
 const center=roadCenter(target.route,p.z,target.pathId);
 return Math.abs(p.x-center)<=radius;
}
/** Independent of Three.js. Only genuine forward movement along the correct road counts. */
export function advanceMissionRun(mission,run,player,previousZ){
 const result={visitedForks:{...(run?.visitedForks||{})},cargoPicked:!!run?.cargoPicked,cargoDelivered:!!run?.cargoDelivered};
 const events=[],route=mission?.route;
 if(!mission||!route)return {run:result,events};
 const fork=activeFork(route,player.z);
 if(fork&&player.pathId===fork.id&&Number.isFinite(previousZ)&&player.z>=previousZ&&player.z-previousZ<=8&&Math.abs(forkOffset(fork,player.z))>12&&!result.visitedForks[fork.id]){
  result.visitedForks[fork.id]=true;events.push('ROTA VISITADA · '+fork.name);
 }
 if(mission.cargo){
  const pickup={...mission.cargo.pickup,route},delivery={...mission.cargo.delivery,route};
  if(!result.cargoPicked&&reachesTarget(pickup,player,previousZ,PICKUP_RADIUS)){
   result.cargoPicked=true;events.push('ENCOMENDA COLETADA · SIGA ATÉ A ENTREGA');
  }
  if(result.cargoPicked&&!result.cargoDelivered&&reachesTarget(delivery,player,previousZ,DELIVERY_RADIUS)){
   result.cargoDelivered=true;events.push('ENTREGA CONCLUÍDA · COMPLETE A CORRIDA');
  }
 }
 return {run:result,events};
}
export function missionRunStatus(mission,run){
 if(!mission)return [];
 const messages=[];
 if(mission.requiredForks)for(const id of mission.requiredForks)
  messages.push('DESVIO '+id.toUpperCase()+' '+(run?.visitedForks?.[id]?'OK':'PENDENTE'));
 if(mission.cargo)messages.push(run?.cargoDelivered?'ENTREGA OK':run?.cargoPicked?'CARGA A BORDO':'ENCOMENDA PENDENTE');
 return messages;
}
