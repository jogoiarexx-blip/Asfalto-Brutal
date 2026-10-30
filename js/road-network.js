import {curveAt,headingAt,ROAD_HALF,RACE_LENGTH} from './config.js';

/** Pistas secundarias reais, sempre reconectadas antes do proximo checkpoint.
 * O sinal e o deslocamento sao WORLD X (direita da tela = X negativo).
 */
const RAW={
 coast:[
  {id:'enseada',name:'ATALHO DA ENSEADA',start:255,end:790,side:-1,amplitude:19},
  {id:'mirante',name:'VIA DO MIRANTE',start:1120,end:1770,side:-1,amplitude:21},
  {id:'cais',name:'ESTRADA DO CAIS',start:2070,end:2680,side:1,amplitude:19}
 ],
 desert:[
  {id:'oasis',name:'PISTA DO OÁSIS',start:255,end:790,side:-1,amplitude:21},
  {id:'canion',name:'DESVIO DO CÂNION',start:1120,end:1770,side:1,amplitude:22},
  {id:'salinas',name:'TRILHA DAS SALINAS',start:2070,end:2680,side:-1,amplitude:20}
 ],
 highlands:[
  {id:'pinheiros',name:'TRILHA DOS PINHEIROS',start:255,end:790,side:-1,amplitude:20},
  {id:'pedreira',name:'CORTE DA PEDREIRA',start:1120,end:1770,side:-1,amplitude:20},
  {id:'colina',name:'ESTRADA DA COLINA',start:2070,end:2680,side:1,amplitude:21}
 ]
};
export const ROAD_FORKS=Object.freeze(Object.fromEntries(Object.entries(RAW).map(([route,forks])=>[
 route,Object.freeze(forks.map(f=>Object.freeze({...f,route})))
])));
export const forksFor=route=>ROAD_FORKS[route]||[];
export const activeFork=(route,z)=>forksFor(route).find(f=>z>f.start&&z<f.end)||null;
export function forkOffset(fork,z){
 if(!fork||!Number.isFinite(z)||z<=fork.start||z>=fork.end)return 0;
 const u=(z-fork.start)/(fork.end-fork.start);
 const wave=Math.sin(Math.PI*u);
 return fork.side*fork.amplitude*wave*wave;
}
export function roadCenter(route,z,pathId='main'){
 const center=curveAt(z,route);
 const fork=forksFor(route).find(f=>f.id===pathId);
 return center+(fork?forkOffset(fork,z):0);
}
export function roadHeading(route,z,pathId='main'){
 if(pathId==='main')return headingAt(z,route);
 return Math.atan2(roadCenter(route,z+2,pathId)-roadCenter(route,z-2,pathId),4);
}
/** Hysteresis prevents route-chattering where the two asphalt surfaces overlap. */
export function nearestRoad(x,z,route,previous='main'){
 const main=curveAt(z,route);
 let best={pathId:'main',center:main,offset:x-main};
 let cost=Math.abs(best.offset)+(previous==='main'?0:.85);
 const fork=activeFork(route,z);
 if(fork){
  const center=roadCenter(route,z,fork.id),diff=x-center;
  const altCost=Math.abs(diff)+(previous===fork.id?0:.85);
  if(altCost<cost){best={pathId:fork.id,center,offset:diff};cost=altCost}
 }
 return best;
}
/** Keep both entrances free of the primary road's physical guardrail meshes. */
export function isForkMouth(route,z,side){
 const fork=activeFork(route,z);
 return !!fork&&fork.side===side&&Math.abs(forkOffset(fork,z))<ROAD_HALF*2+2;
}
/** Trees, signposts and buildings must stay outside either roadway. */
export function roadsideClearance(route,z,side,minOffset=18){
 const fork=activeFork(route,z);
 if(!fork||fork.side!==side)return minOffset;
 return Math.max(minOffset,Math.abs(forkOffset(fork,z))+ROAD_HALF+6);
}
export function graphValid(route){
 const forks=forksFor(route);
 return forks.every((f,i)=>f.start>0&&f.end<RACE_LENGTH&&f.start<f.end&&f.amplitude>ROAD_HALF*2&&
  (i===0||forks[i-1].end<f.start));
}
