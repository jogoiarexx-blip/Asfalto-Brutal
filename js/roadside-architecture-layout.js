import {RACE_LENGTH} from './config.js';
/** Deterministic architecture layout; track collision area is [-8.4,+8.4]. */
export function architectureLayout(route,quality='high') {
 const low=quality==='low',medium=quality==='medium';
 const density=low?0:medium?1:quality==='ultra'?3:2;
 const landmarks=[];
 if(density>0){
  const count=density===1?12:density===2?24:42;
  for(let i=0;i<count;i++){
   const z=125+i*(RACE_LENGTH-270)/count + (i%3)*13;
   const side=i%2===0?-1:1;
   const inset=(i%5)*3;
   landmarks.push({kind:route==='desert'?'station':route==='highlands'?'cabin':'coast',z,side,offset:18+inset,width:6+(i%3)*2,height:route==='highlands'?3.5+(i%4)*.9:4+(i%5)*1.05});
  }
 }
 // Arches do not block the road: pillars at +/- 10.8m; crossbeam above 7m.
 const portals=route==='highlands'?[{start:980,count:low?2:4,step:26},{start:2970,count:low?2:4,step:27}]
   :low?[]:[{start:route==='desert'?920:890,count:1,step:35},{start:route==='desert'?2990:3030,count:1,step:35}];
 return {landmarks,portals,density};
}
