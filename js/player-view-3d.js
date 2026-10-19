/** Present the real procedural Three.js bike in camera-space, restoring its world pose. */
import {bikeViewCoordinates} from './player-view-math.js';
export class PlayerView3D {
 constructor(THREE) {
  this.tmpCenter=new THREE.Vector3();this.tmpLocal=new THREE.Vector3();
  this.savedPosition=new THREE.Vector3();this.savedRotation=new THREE.Quaternion();
  this.reverseYaw=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI);
  this.metrics={drawn:false,depth:0,xNdc:0,yNdc:0,real3D:true};
 }
 draw(renderer,scene,camera,bike,player) {
  if(!bike?.group)return false;
  const body=bike.group;
  this.savedPosition.copy(body.position);this.savedRotation.copy(body.quaternion);
  try {
   camera.updateMatrixWorld();
   this.tmpCenter.set(player.x,body.position.y,player.z);
   const distance=camera.position.distanceTo(this.tmpCenter);
   const projected=this.tmpCenter.project(camera);
   const v=bikeViewCoordinates({ndcX:projected.x,ndcY:projected.y,distance,fov:camera.fov,aspect:camera.aspect});
   this.tmpLocal.set(v.x,v.y,-v.depth).applyMatrix4(camera.matrixWorld);
   body.position.copy(this.tmpLocal);
   body.quaternion.copy(camera.quaternion).multiply(this.reverseYaw);
   body.updateMatrixWorld(true);
   renderer.render(scene,camera);
   this.metrics={drawn:true,depth:v.depth,xNdc:v.ndcX,yNdc:v.ndcY,real3D:true};
   return true;
  } finally {
   body.position.copy(this.savedPosition);
   body.quaternion.copy(this.savedRotation);
   body.updateMatrixWorld(true);
  }
 }
}
