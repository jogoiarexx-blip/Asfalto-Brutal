import {clamp} from './config.js';

/** Stable rival personalities. Numbers are gameplay parameters, not random values per frame. */
export const RIVAL_STYLES=Object.freeze([
 Object.freeze({id:'cauteloso',name:'CAUTELOSO',pace:.87,bravery:.30,agility:.88,passing:.45,preferredLane:-3.4}),
 Object.freeze({id:'velocista',name:'VELOCISTA',pace:1.10,bravery:.67,agility:.78,passing:1.30,preferredLane:0}),
 Object.freeze({id:'briguento',name:'BRIGUENTO',pace:.99,bravery:1.0,agility:.70,passing:.85,preferredLane:3.4}),
 Object.freeze({id:'tecnico',name:'TÉCNICO',pace:1.02,bravery:.50,agility:1.30,passing:1.18,preferredLane:-3.4}),
 Object.freeze({id:'imprudente',name:'IMPRUDENTE',pace:1.13,bravery:.98,agility:.67,passing:1.16,preferredLane:0}),
 Object.freeze({id:'estrategista',name:'ESTRATEGISTA',pace:1.0,bravery:.72,agility:1.15,passing:1.06,preferredLane:3.4})
]);
export const rivalStyle=index=>RIVAL_STYLES[((index%RIVAL_STYLES.length)+RIVAL_STYLES.length)%RIVAL_STYLES.length];
export function rivalPace(style,baseSpeed,cornerSeverity=0){
 return Math.max(16,baseSpeed*style.pace*(1-clamp(cornerSeverity,0,1)*(1.2-style.agility)*.18));
}
export function rivalAttackCooldown(style,aggression=0.5){
 return clamp((5.5-style.bravery*2.1)/(0.82+aggression*.36),1.7,7);
}
export function rivalLaneRate(style,{stunned=false,dodging=false}={}){
 return (dodging?9.5:stunned?5.8:3.2)*style.agility;
}
