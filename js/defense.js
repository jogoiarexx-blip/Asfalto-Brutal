/** Visible player wind-up can trigger rival defense. All calculations are deterministic.
 * Each opponent may respond ONCE to each attack serial (prevents infinite dodge).
 */
export function chooseRivalDefense(rival,player,attack){
 if(!attack||rival.fallen>0||rival.stunTimer>0||rival.defenseCD>0)return 'none';
 if(rival.defenseAttackId===attack.id||attack.age<.06||attack.age>.20)return 'none';
 const dx=rival.x-player.x,dz=rival.z-player.z;
 if(Math.abs(dz)>3.0||Math.abs(dx)<.75||Math.abs(dx)>3.35)return 'none';
 // Screen-left is positive world X, so a left swing threatens a positive-X rival.
 const threatened=attack.side===-1?dx>0:dx<0;
 if(!threatened)return 'none';
 const reflex=Math.min(1,Math.max(0,rival.aggression||0));
 if(reflex<.44)return 'none';
 const openRoad=Math.abs(rival.laneOffset||0)<3.0;
 if(reflex>.82&&openRoad)return 'dodge';
 return 'guard';
}
export function guardDamage(damage,guarding=false){return guarding?Math.max(.15,damage*.28):damage}
export function dodgeOffset(laneOffset,relativeX,room=4.95){
 // Push AWAY from attacker, never jump/teleport or exit drivable track.
 const dir=Math.sign(relativeX)||1;
 return Math.max(-room,Math.min(room,laneOffset+dir*2.45));
}
