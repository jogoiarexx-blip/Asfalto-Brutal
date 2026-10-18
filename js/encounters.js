import {clamp, approach} from './config.js';

/** Deterministic game rules, independent of Three.js and the browser. */
export const FALL_TIME = 2.15;
export const RECOVERY_GRACE = 2.4;
export const POLICE_TRIGGER_TIME = 42;

export function dangerousImpact(speed, relativeSpeed, damage) {
 return speed >= 33 && damage >= 15 && (Math.abs(relativeSpeed) >= 9 || damage >= 20);
}
export function nextFall(fall, dt) {
 return fall ? {...fall, remaining:Math.max(0,fall.remaining-dt)} : null;
}
export function pursuitTrigger({elapsed, heat, alreadyDeployed=false, nextAllowed=0, playerZ=0}) {
 return !alreadyDeployed && elapsed >= nextAllowed && (heat >= 28 || (elapsed >= POLICE_TRIGGER_TIME && playerZ > 650));
}
export function updateHeat(heat, dt, {policeNear=false, offense=false}={}) {
 return clamp(heat+(offense?27:0)-dt*(policeNear?0.6:1.55),0,100);
}
export function pursuitStep(police, player, dt, roadX, playerRoadX, wanted) {
 const separation=player.z-police.z;
 const targetSpeed=clamp(player.speed+((separation>15)?11:(separation<-15?-7:3))+(wanted>60?3:0),Math.max(8,player.speed*.4),63);
 const speed=approach(police.speed,targetSpeed,dt*11);
 // Police intercepts the player's current lane with inertia and a safe shoulder margin.
 const targetOffset=clamp(player.x-playerRoadX,-5.15,5.15);
 const laneOffset=approach(police.laneOffset,targetOffset,dt*(separation<35?3.5:2.6));
 return {speed,laneOffset,z:police.z+speed*dt};
}
