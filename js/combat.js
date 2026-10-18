/** Shared, deterministic arcade combat rules. No DOM or Three.js dependencies. */
export const WEAPONS = Object.freeze({
 chain:Object.freeze({id:'chain',name:'CORRENTE',hud:'CORRENTE',reachBike:3.25,reachCar:2.95,forward:2.70,damage:1.2,cooldown:.58,stun:1.30,knock:2.9,fall:1.9,color:'#ffd37c'}),
 club:Object.freeze({id:'club',name:'PORRETE',hud:'PORRETE',reachBike:2.60,reachCar:2.45,forward:2.45,damage:1.6,cooldown:.64,stun:1.65,knock:3.3,fall:1.15,color:'#ffad78'}),
 pipe:Object.freeze({id:'pipe',name:'CANO',hud:'CANO',reachBike:2.88,reachCar:2.60,forward:2.55,damage:1.35,cooldown:.48,stun:1.25,knock:2.7,fall:1.35,color:'#cfe6ff'}),
 machete:Object.freeze({id:'machete',name:'FACÃO',hud:'FACÃO',reachBike:2.92,reachCar:2.65,forward:2.65,damage:1.45,cooldown:.63,stun:1.35,knock:2.9,fall:1.35,color:'#dfedff'}),
 baton:Object.freeze({id:'baton',name:'CASSETETE',hud:'CASSETETE',reachBike:2.53,reachCar:2.28,forward:2.35,damage:1.15,cooldown:.43,stun:1.15,knock:2.40,fall:1.15,color:'#ddc3ab'})
});
export const WEAPON_IDS=Object.freeze(Object.keys(WEAPONS));
export function weaponById(id){return WEAPONS[id]||WEAPONS.chain}
export function nextWeapon(id,step=1){const ix=WEAPON_IDS.indexOf(id);return WEAPON_IDS[(Math.max(0,ix)+step+WEAPON_IDS.length)%WEAPON_IDS.length]}
export function weaponForRival(index){return ['club','chain','pipe','baton','machete','chain'][Math.abs(Math.trunc(index))%6]}
/** Attack lasts 0.4 s. A wind-up followed by a quick outward peak, then recovery. */
export function attackEnvelope(age=Infinity,duration=.40){
 if(!(age>=0&&age<=duration))return 0;
 const t=age/duration;
 if(t<.24)return -.26*Math.sin(t/.24*Math.PI*.5);
 if(t<.53)return -.26+1.26*Math.sin((t-.24)/.29*Math.PI*.5);
 return Math.max(0,Math.cos((t-.53)/.47*Math.PI*.5));
}
/** Fixed active attack interval; only one hit allowed per swing. */
export function strikeIsActive(age){return age>=.11&&age<=.28}
/** Side returned in CAMERA space: -1 for screen-left, +1 for screen-right. */
export function sideTowardPlayer(enemyX,playerX){return enemyX>playerX?1:-1}
export function canEnemyStrike(enemy,player,weapon,{playerDown=false}={}){
 if(playerDown||enemy.fallen>0||enemy.stunTimer>0||enemy.attackCD>0)return false;
 const lat=Math.abs(enemy.x-player.x),front=Math.abs(enemy.z-player.z);
 return lat>=.98&&lat<=weapon.reachBike-.05&&front<=Math.min(2.45,weapon.forward);
}
export function enemyDamage(weapon,aggression=0){return Math.round((5+aggression*5)*weapon.damage)}
