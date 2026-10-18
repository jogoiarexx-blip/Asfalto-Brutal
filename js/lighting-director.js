/** Route-sensitive light temperatures and progressive day cycle without postprocessing. */
import {clamp} from './config.js';
export const LIGHT_MODES=Object.freeze({auto:'DINÂMICA',soft:'SUAVE',cinematic:'CINEMATOGRÁFICA'});
const ROUTE_LIGHTS=Object.freeze({
 coast:{sun:[1.0,.89,.74],sky:[.70,.85,1.0],ground:[.40,.52,.50],fill:[.46,.73,.91],fog:[.60,.72,.72],exposure:1.18},
 desert:{sun:[1.0,.76,.50],sky:[.98,.80,.62],ground:[.65,.41,.26],fill:[.71,.73,.96],fog:[.94,.70,.51],exposure:1.12},
 highlands:{sun:[.80,.90,1.0],sky:[.69,.83,1.0],ground:[.36,.48,.54],fill:[.84,.80,.97],fog:[.50,.62,.72],exposure:1.25}
});
const lerp=(a,b,t)=>a+(b-a)*t;
/** Values are restrained to prevent rapid brightness shifts while riding. */
export function lightingFrame({route='coast',mode='auto',progress=0,quality='high',reducedMotion=false}={}){
 const base=ROUTE_LIGHTS[route]||ROUTE_LIGHTS.coast,p=clamp(progress,0,1);
 const active=mode==='auto'&&!reducedMotion&&quality!=='low';
 const evening=active?clamp((p-.42)/.58,0,1):0;
 const cinematic=mode==='cinematic';
 const soft=mode==='soft'||quality==='low'||reducedMotion;
 const golden=cinematic?.62:evening*.40;
 const color=base.sun.map((c,i)=>clamp(i===0?c:i===1?c*(1-.08*golden):c*(1-.20*golden),0,1));
 const sunIntensity=(soft?1.65:cinematic?2.4:2.12)*(1-.13*evening);
 const hemisphereIntensity=soft?1.56:cinematic?1.30:1.48;
 const fillIntensity=(quality==='high'||quality==='ultra')&&!soft?(cinematic?.52:.30):0;
 const exposure=clamp(base.exposure+(cinematic?-.05:soft?.03:0)-evening*.035,.90,1.45);
 return Object.freeze({sunColor:color,skyColor:base.sky,groundColor:base.ground,fillColor:base.fill,fogColor:base.fog,sunIntensity,hemisphereIntensity,fillIntensity,exposure,evening,shadowSoftness:golden});
}
export function lightBlend(previous,target,dt){return previous+(target-previous)*(1-Math.exp(-clamp(dt,0,.07)*2.8))}
