export const RACE_LENGTH = 3800;
export const ROAD_HALF = 6.7;
export const ROUTES = {
  coast:{name:'COSTA FANTASMA', sky:0x7ba7b9, fog:0x9ab0b2, fogNear:160, fogFar:420, ground:0x4c776a, mountain:0x5a7b7e, road:0x25323d, shoulder:0xb7a281, edge:0x66ede4, trees:0x2e7157, accent:0xddff50, curve:1, light:0xffedca},
  desert:{name:'ROTA DO DESERTO', sky:0xe7a677, fog:0xefb67e, fogNear:145, fogFar:360, ground:0xc48c56, mountain:0x975e4b, road:0x41404b, shoulder:0xefc790, edge:0xffbd7c, trees:0x65764b, accent:0xffd575, curve:.68, light:0xffe2bc},
  highlands:{name:'SERRA DA FÚRIA', sky:0x6e93ae, fog:0x7893aa, fogNear:115, fogFar:340, ground:0x45616a, mountain:0x465b72, road:0x25313d, shoulder:0x77888f, edge:0x71bcff, trees:0x2d5555, accent:0x71bcff, curve:1.62, light:0xd9e9ff}
};
export const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const approach=(value,target,step)=>Math.abs(value-target)<=step?target:value+Math.sign(target-value)*step;
export function curveAt(z,route='coast'){
 const strength=ROUTES[route]?.curve??1;
 return strength*(Math.sin(z*.0046)*16+Math.sin(z*.0105+.3)*6+Math.sin(z*.0019+1.9)*8);
}
export function headingAt(z,route='coast'){return Math.atan2(curveAt(z+2,route)-curveAt(z-2,route),4);}
export function formatTime(seconds){const s=Math.max(0,Math.floor(seconds));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
export function rankOf(playerZ,rivals){return 1+rivals.filter(r=>r.z>playerZ).length;}
export function kmh(metersPerSecond){return Math.round(metersPerSecond*3.6);}
export function collisionOverlap(a,b,lateral,longitudinal){return Math.abs(a.x-b.x)<lateral&&Math.abs(a.z-b.z)<longitudinal;}
export function nextRacerSpeed(i,route){return 37+(i*2.0)+(route==='desert'?3:route==='highlands'?-3:0);}
