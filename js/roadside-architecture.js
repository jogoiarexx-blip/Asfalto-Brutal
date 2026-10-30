import * as THREE from 'three';
import {curveAt,headingAt} from './config.js';
import {architectureLayout} from './roadside-architecture-layout.js';
import {roadsideClearance} from './road-network.js';

function staticInstanced(scene,geo,mat,count){
 const o=new THREE.InstancedMesh(geo,mat,count);o.instanceMatrix.setUsage(THREE.StaticDrawUsage);o.frustumCulled=false;scene.add(o);return o;
}
/** Architecture is built in batches to keep frame cost modest, even at Ultra. */
export function buildRoadsideArchitecture(world){
 const {scene,route,quality}=world;
 const plan=architectureLayout(route,quality); const objects=[];
 const matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),pos=new THREE.Vector3(),scale=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
 const set=(mesh,index,x,y,z,sx,sy,sz,yaw=0)=>{q.setFromAxisAngle(up,yaw);pos.set(x,y,z);scale.set(sx,sy,sz);matrix.compose(pos,q,scale);mesh.setMatrixAt(index,matrix)};
 const baseColors=route==='desert'?[0xcaa070,0x99775b]:route==='highlands'?[0x546e74,0x89929a]:[0xa6cfcc,0x7099a5];
 const walls=new THREE.MeshLambertMaterial({color:baseColors[0]});const roofs=new THREE.MeshLambertMaterial({color:baseColors[1]});
 const windowMat=new THREE.MeshBasicMaterial({color:0xffe8aa});const dark=new THREE.MeshLambertMaterial({color:0x253039});
 if(plan.landmarks.length){
  const n=plan.landmarks.length;
  const buildings=staticInstanced(scene,new THREE.BoxGeometry(1,1,1),walls,n);
  const roof=staticInstanced(scene,route==='highlands'?new THREE.ConeGeometry(1,1,4):new THREE.BoxGeometry(1,1,1),roofs,n);
  const windows=staticInstanced(scene,new THREE.BoxGeometry(1,1,1),windowMat,n*4);
  for(let i=0;i<n;i++){
   const l=plan.landmarks[i],offset=roadsideClearance(route,l.z,l.side,l.offset+3),x=curveAt(l.z,route)+l.side*offset,yaw=headingAt(l.z,route);
   set(buildings,i,x,l.height*.5-.13,l.z,l.width,l.height,5.5,yaw);
   set(roof,i,x,l.height+(.45),l.z,l.width*1.12,route==='highlands'?2:0.9,6.1,yaw);
   for(let k=0;k<4;k++){
    const sx=(k%2?1:-1)*l.width*.20, sz=k<2?2.81:-2.81;
    const xx=x+sx*Math.cos(yaw)+sz*Math.sin(yaw), zz=l.z-sx*Math.sin(yaw)+sz*Math.cos(yaw);
    set(windows,i*4+k,xx,l.height*.58,zz,l.width*.20,.72,.08,yaw);
   }
  }
  for(const o of [buildings,roof,windows]){o.instanceMatrix.needsUpdate=true;objects.push(o)}
 }
 let n=0;for(const portal of plan.portals)n+=portal.count;
 if(n){
  const pillars=staticInstanced(scene,new THREE.BoxGeometry(1,1,1),dark,n*2);
  const beams=staticInstanced(scene,new THREE.BoxGeometry(1,1,1),walls,n);
  const lamps=staticInstanced(scene,new THREE.BoxGeometry(1,1,1),windowMat,n*2);
  let i=0;
  for(const p of plan.portals)for(let j=0;j<p.count;j++){
   const z=p.start+j*p.step,yaw=headingAt(z,route),x=curveAt(z,route);
   for(let s=0;s<2;s++){
    const side=s?-1:1,px=x+side*10.8*Math.cos(yaw),pz=z-side*10.8*Math.sin(yaw);
    set(pillars,i*2+s,px,3.8,pz,1.2,7.6,1.4,yaw);
    set(lamps,i*2+s,px,7.38,pz,0.6,.18,1.7,yaw);
   }
   set(beams,i,x,7.45,z,23.5,1.4,2.0,yaw);i++;
  }
  for(const o of [pillars,beams,lamps]){o.instanceMatrix.needsUpdate=true;objects.push(o)}
 }
 // Return reference for explicit disposal with RoadWorld.
 for(const o of objects)world.children.push(o);
 return {objects,landmarkCount:plan.landmarks.length,portalCount:n};
}
