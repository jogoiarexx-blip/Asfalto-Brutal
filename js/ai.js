import {clamp} from './config.js';

/** Decisions in track-local coordinates, independent from frame rate and scene graph. */
export function pickRivalLane({currentOffset=0,preferredOffset=0,z=0,speed=30,playerZ=-1000,playerOffset=0,aggression=.5,obstacles=[]}={}){
 const approachPlayer=aggression>.40&&Math.abs(playerZ-z)<28;
 const candidates=[clamp(preferredOffset,-4.75,4.75),-4.65,-2.15,0,2.15,4.65];
 if(approachPlayer){
  // The AI tries to flank rather than occupy exactly the player's hitbox.
  const flank=currentOffset<playerOffset?-1.75:1.75;
  candidates.unshift(clamp(playerOffset+flank,-4.75,4.75));
 }
 let best=candidates[0],score=Infinity;
 for(const lane of candidates){
  let cost=Math.abs(lane-currentOffset)*.11+Math.abs(lane-preferredOffset)*.12;
  if(approachPlayer){
   const delta=Math.abs(lane-playerOffset);
   cost+=(delta>=1.1&&delta<=2.5?-3.6:delta<.95?4:0)*aggression;
  }
  for(const other of obstacles){
   const gap=other.z-z;
   if(gap < -5||gap>Math.max(24,speed*1.9))continue;
   const dx=Math.abs(lane-other.offset);
   if(dx<2.4){cost+=23*(1-gap/Math.max(32,speed*2))*(1-dx/3)}
  }
  if(cost<score){score=cost;best=lane}
 }
 return clamp(best,-4.8,4.8);
}
export function rivalShouldAttack(rival,player,playerFallen=false){
 if(playerFallen||rival.fallen>0||rival.stunTimer>0||rival.attackCD>0)return false;
 const lateral=Math.abs(rival.x-player.x),depth=Math.abs(rival.z-player.z);
 return depth<2.5&&lateral>=.90&&lateral<=2.65;
}
export const aggressionOf=(index)=>[.33,.66,.88,.46,.92,.72][index%6];
