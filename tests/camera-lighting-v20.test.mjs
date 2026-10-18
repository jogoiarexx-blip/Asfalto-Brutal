import assert from 'node:assert/strict';
import fs from 'node:fs';
import {frameCamera,CameraDirector,CAMERA_MODES,nextCameraMode,easeForFrame} from '../js/camera-director.js';
import {lightingFrame,lightBlend,LIGHT_MODES} from '../js/lighting-director.js';

assert.deepEqual(Object.keys(CAMERA_MODES),['chase','sport','cinematic']);
assert.deepEqual(Object.keys(LIGHT_MODES),['auto','soft','cinematic']);
assert.equal(nextCameraMode('chase'),'sport');
assert.equal(nextCameraMode('cinematic'),'chase');
assert.equal(nextCameraMode('sport',-1),'chase');
assert.equal(easeForFrame(0,5),0);
assert.ok(easeForFrame(1/30,5)>easeForFrame(1/60,5));
for(const mode of Object.keys(CAMERA_MODES)){
 const pose=frameCamera({player:{x:3,z:650,speed:60,steer:.6,lateralVelocity:4},route:'highlands',mode,nitro:true});
 assert.ok(pose.position.z<650,'the camera must be behind the rider');
 assert.ok(pose.lookAt.z>650,'camera must look ahead');
 assert.ok(pose.fov>60&&pose.fov<90);
 assert.ok(Number.isFinite(pose.roll));
 const reduced=frameCamera({player:{x:3,z:650,speed:60,steer:.6,lateralVelocity:4},mode,reducedMotion:true});
 assert.ok(Math.abs(reduced.roll)<Math.abs(pose.roll));
}
const crash=frameCamera({player:{x:10,z:100,speed:0},fall:{side:-1,riderLift:2,riderOffsetX:-3}});
assert.ok(crash.position.x<10&&crash.position.y>4&&crash.fov===59);
const cam={position:{x:0,y:0,z:0},fov:70,lookAt(x,y,z){this.look={x,y,z}},rotateZ(z){this.roll=z},updateProjectionMatrix(){this.updated=true}};
const director=new CameraDirector(cam),desired=frameCamera({player:{x:2,z:50,speed:30}});
director.reset(desired);assert.deepEqual({x:cam.position.x,y:cam.position.y,z:cam.position.z},desired.position);
assert.deepEqual(cam.look,desired.lookAt);
const shifted=frameCamera({player:{x:30,z:200,speed:55,steer:-1}});
director.update(.016,shifted);
assert.ok(cam.position.z>desired.position.z&&cam.position.z<shifted.position.z);
assert.ok(Number.isFinite(cam.roll)&&cam.updated);
for(const route of ['coast','desert','highlands'])for(const mode of Object.keys(LIGHT_MODES))for(const quality of ['low','medium','high','ultra']){
 const a=lightingFrame({route,mode,quality,progress:0}),b=lightingFrame({route,mode,quality,progress:1});
 assert.ok(a.sunIntensity>0&&a.hemisphereIntensity>0);
 assert.ok(a.exposure>=.9&&a.exposure<=1.45);
 assert.ok(a.sunColor.every(x=>x>=0&&x<=1));
 assert.ok(a.fillIntensity>=0);
 if(quality==='low')assert.equal(a.fillIntensity,0);
 if(mode==='auto'&&quality!=='low')assert.ok(a.exposure>=b.exposure);
}
assert.equal(lightingFrame({quality:'high'}).fillIntensity>0,true);
assert.equal(lightingFrame({quality:'low'}).fillIntensity,0);
assert.ok(lightBlend(0,1,.016)>0&&lightBlend(0,1,.016)<1);
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
for(const id of ['camera-mode','camera-toggle','lighting'])assert.ok(html.includes(`id="${id}"`));
const input=fs.readFileSync(new URL('../js/input.js',import.meta.url),'utf8');
assert.ok(input.includes('KeyC')&&input.includes('rising[11]')&&input.includes('consumeCamera'));
console.log('v2.0: câmera suavizada, troca de modos, enquadramento de quedas, iluminação por rota e baixo custo gráfico OK.');
