import {activeFork,forksFor,roadCenter,roadHeading} from './road-network.js';

/** Reproducible route choice, independent of FPS and mutable random numbers. */
export function npcPrefersFork(route,forkId,role='traffic',index=0){
 const forkIndex=forksFor(route).findIndex(f=>f.id===forkId);
 if(forkIndex<0)return false;
 const n=Math.max(0,Math.floor(index));
 if(role==='rival')return (n+forkIndex)%3!==1; // 4/6 rivals per branch
 if(role==='traffic')return (n+2*forkIndex)%4===0; // 3/11 vehicles
 return false;
}
/** Latch at the fork entrance. Never switch an existing NPC to a far-off road mid-split. */
export function npcRoadChoice({route,z,oldZ=z,pathId='main',role='traffic',index=0,playerPath='main',playerZ=-Infinity}){
 const fork=activeFork(route,z);
 if(!fork)return 'main';
 if(pathId===fork.id)return pathId;
 const closeToMouth=oldZ<=fork.start+10;
 if(!closeToMouth)return 'main';
 if(role==='police')return playerPath===fork.id&&playerZ>=fork.start-50&&playerZ<=fork.end+85?fork.id:'main';
 return npcPrefersFork(route,fork.id,role,index)?fork.id:'main';
}
/** Placement on a freshly created NPC; no visual pop during the first frame. */
export function spawnNpcPath({route,z,role,index,playerPath='main',playerZ=z}){
 const fork=activeFork(route,z);
 return fork?npcRoadChoice({route,z,oldZ:fork.start,pathId:'main',role,index,playerPath,playerZ}):'main';
}
export function npcRoadPose(route,z,pathId='main',laneOffset=0){
 return {x:roadCenter(route,z,pathId)+laneOffset,yaw:roadHeading(route,z,pathId)};
}
/** An adversary may only plan lane changes around vehicles on the same asphalt. */
export function sameNpcRoad(a,b){return (a?.pathId||'main')===(b?.pathId||'main')}
