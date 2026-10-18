import * as THREE from 'three';
/** Circular pool: fixed instance buffers prevent per-frame allocations and leaks. */
export class SkidMarks{
 constructor(scene,quality='high'){
  this.scene=scene;
  this.capacity=quality==='low'?80:quality==='medium'?140:quality==='ultra'?360:240;
  this.geometry=new THREE.BoxGeometry(.115,.009,.78);
  this.material=new THREE.MeshBasicMaterial({color:0x0a0c12,transparent:true,opacity:.48,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  this.mesh=new THREE.InstancedMesh(this.geometry,this.material,this.capacity);
  this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.mesh.frustumCulled=false;
  this.index=0;this.lastZ=-Infinity;this.tmp=new THREE.Object3D();
  this.tmp.scale.setScalar(.00001);this.tmp.updateMatrix();
  for(let i=0;i<this.capacity;i++)this.mesh.setMatrixAt(i,this.tmp.matrix);
  this.mesh.instanceMatrix.needsUpdate=true;scene.add(this.mesh);
 }
 add(x,z,yaw,intensity=1,force=false){
  if(!force&&Math.abs(z-this.lastZ)<.95)return;
  this.lastZ=z;
  const scale=.66+Math.max(0,Math.min(1,intensity))*.45;
  for(const side of [-1,1]){
   this.tmp.position.set(x+Math.cos(yaw)*side*.28,.075,z-Math.sin(yaw)*side*.28);
   this.tmp.rotation.set(0,yaw,0);
   this.tmp.scale.set(.92,1,scale);
   this.tmp.updateMatrix();this.mesh.setMatrixAt(this.index,this.tmp.matrix);
   this.index=(this.index+1)%this.capacity;
  }
  this.mesh.instanceMatrix.needsUpdate=true;
 }
 dispose(){this.scene.remove(this.mesh);this.mesh.geometry.dispose();this.mesh.material.dispose()}
}
