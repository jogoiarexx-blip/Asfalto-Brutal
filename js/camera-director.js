/** Pure camera framing, kept independent from WebGL for deterministic tests. */
import {clamp,curveAt,headingAt} from './config.js';

export const CAMERA_MODES=Object.freeze({
 chase:Object.freeze({name:'CLÁSSICA',distance:13.8,height:4.65,lookAhead:22,fov:69,lag:6.1,aimLag:8.5,tilt:.016}),
 sport:Object.freeze({name:'ESPORTIVA',distance:10.6,height:3.15,lookAhead:26,fov:75,lag:8.0,aimLag:9.5,tilt:.012}),
 cinematic:Object.freeze({name:'CINEMÁTICA',distance:16.4,height:5.55,lookAhead:30,fov:71,lag:4.4,aimLag:6.4,tilt:.034})
});
export const cameraModes=Object.keys(CAMERA_MODES);
export function nextCameraMode(mode='chase',step=1){const i=cameraModes.indexOf(mode);return cameraModes[((i<0?0:i)+step+cameraModes.length)%cameraModes.length]}
export function easeForFrame(dt,rate){return 1-Math.exp(-clamp(dt,0,.06)*Math.max(.1,rate))}
export function frameCamera({player={},route='coast',mode='chase',nitro=false,menu=false,reducedMotion=false,fall=null}={}){
 const preset=CAMERA_MODES[mode]||CAMERA_MODES.chase;
 const x=Number.isFinite(player.x)?player.x:0,z=Number.isFinite(player.z)?player.z:0;
 const speed=clamp(Number.isFinite(player.speed)?player.speed:0,0,95),v=speed/75;
 const steer=clamp(Number.isFinite(player.steer)?player.steer:0,-1,1);
 const slip=clamp(Number.isFinite(player.lateralVelocity)?player.lateralVelocity:0,-8,8);
 const curveLook=curveAt(z+16+speed*.23,route)-curveAt(z,route);
 const heading=headingAt(z,route);
 const turnLead=clamp(curveLook*.22,-2.4,2.4);
 const motion=reducedMotion?.34:1;
 const chaseDistance=preset.distance+(menu?0:v*1.35)+(nitro&&!menu?1.7:0);
 const cameraX=x+Math.sin(heading)*1.05+turnLead*.38+slip*.035*motion;
 const cameraY=preset.height+v*.46+(nitro&&!menu?.20:0);
 const targetX=x+turnLead+clamp(-steer*.65,-.6,.6)*motion;
 const targetY=1.55+(preset===CAMERA_MODES.cinematic?.20:0);
 let pose={position:{x:cameraX,y:cameraY,z:z-chaseDistance},lookAt:{x:targetX,y:targetY,z:z+preset.lookAhead+v*4},fov:preset.fov+(nitro&&!menu?6:0),roll:clamp(steer*preset.tilt*motion,-.06,.06),lag:preset.lag,aimLag:preset.aimLag};
 if(fall){
  const side=(Math.sign(fall.side)||1),height=clamp(fall.riderLift||0,0,3);
  pose={position:{x:x+side*6,y:4+height*.65,z:z-8},lookAt:{x:x+clamp(fall.riderOffsetX||0,-6,6)*.35,y:1.3+height*.55,z:z+1.8},fov:59,roll:0,lag:3.5,aimLag:5};
 }
 return pose;
}

/** A reusable director: never allocates geometry, renderer effects or GPU passes. */
export class CameraDirector{
 constructor(camera){this.camera=camera;this.target=null;this.roll=0;this.ready=false;}
 reset(pose){this.ready=false;if(pose)this.update(0,pose,true)}
 update(dt,pose,instant=false){
  const cam=this.camera;if(!this.target){this.target={...pose.lookAt}}
  const ap=instant||!this.ready?1:easeForFrame(dt,pose.lag);
  const al=instant||!this.ready?1:easeForFrame(dt,pose.aimLag);
  for(const axis of ['x','y','z']){
   cam.position[axis]+=(pose.position[axis]-cam.position[axis])*ap;
   this.target[axis]+=(pose.lookAt[axis]-this.target[axis])*al;
  }
  this.roll+=(pose.roll-this.roll)*al;
  cam.lookAt(this.target.x,this.target.y,this.target.z);
  cam.rotateZ(this.roll);
  cam.fov+=(pose.fov-cam.fov)*al;
  cam.updateProjectionMatrix();this.ready=true;
 }
}
