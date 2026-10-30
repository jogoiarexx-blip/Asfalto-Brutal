import * as THREE from 'three';
import {RACE_LENGTH,ROAD_HALF,ROUTES,curveAt,headingAt} from './config.js';
import {CHECKPOINT_DISTANCES} from './checkpoints.js';
import {forksFor,roadCenter,roadHeading,isForkMouth,roadsideClearance} from './road-network.js';
import {buildRoadsideArchitecture} from './roadside-architecture.js';
import {lightingFrame,lightBlend} from './lighting-director.js';
const UP=new THREE.Vector3(0,1,0);const MATRIX=new THREE.Matrix4();const Q=new THREE.Quaternion();const V=new THREE.Vector3();const S=new THREE.Vector3();
function seeded(seed){return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}}
function ribbon(route,from,to,height,step,material){const verts=[],indices=[],uvs=[];for(let z=-120;z<=RACE_LENGTH+320;z+=8){const x=curveAt(z,route);verts.push(x+from,height,z,x+to,height,z);uvs.push(0,z/16,1,z/16);if(verts.length>6){const i=verts.length/3-4;indices.push(i,i+2,i+1,i+1,i+2,i+3)}}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();return new THREE.Mesh(geo,material)}
function forkRibbon(route,fork,from,to,height,material){
 const vertices=[],indices=[],uv=[];const steps=Math.ceil((fork.end-fork.start)/7);
 for(let j=0;j<=steps;j++){
  const z=fork.start+(fork.end-fork.start)*j/steps,x=roadCenter(route,z,fork.id);
  vertices.push(x+from,height,z,x+to,height,z);uv.push(0,z/16,1,z/16);
  if(j){const i=j*2-2;indices.push(i,i+2,i+1,i+1,i+2,i+3)}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return new THREE.Mesh(g,material);
}
function placeInstance(mesh,index,x,y,z,sx=1,sy=1,sz=1,rot=0){V.set(x,y,z);Q.setFromAxisAngle(UP,rot);S.set(sx,sy,sz);MATRIX.compose(V,Q,S);mesh.setMatrixAt(index,MATRIX)}
function meshInstanced(geo,mat,count,scene){const m=new THREE.InstancedMesh(geo,mat,count);m.instanceMatrix.setUsage(THREE.StaticDrawUsage);m.castShadow=false;m.receiveShadow=false;m.frustumCulled=false;scene.add(m);return m}
function mat(color,extra={}){return new THREE.MeshLambertMaterial({color,...extra})}
function asphaltTexture(low){
 const c=document.createElement('canvas');c.width=256;c.height=low?256:512;
 const ctx=c.getContext('2d');ctx.fillStyle='#b8b6b0';ctx.fillRect(0,0,c.width,c.height);
 const rnd=seeded(9865);
 const n=low?4500:15500;
 for(let i=0;i<n;i++){const v=Math.floor(75+rnd()*135);ctx.fillStyle=`rgba(${v},${v},${v},${.08+rnd()*.37})`;const x=rnd()*c.width,y=rnd()*c.height;ctx.fillRect(x,y,.4+rnd()*2.3,.4+rnd()*3.3)}
 // Faint rubber traces and repairs make the track less geometrically pristine.
 for(let j=0;j<2;j++){const x=c.width*(j?.64:.35);ctx.fillStyle='rgba(22,26,28,.075)';ctx.fillRect(x,0,c.width*.025,c.height)}
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=low?1:4;return t;
}
function skyTexture(config,route){
 const c=document.createElement('canvas');c.width=8;c.height=256;const ctx=c.getContext('2d'),grad=ctx.createLinearGradient(0,0,0,256);
 if(route==='desert'){grad.addColorStop(0,'#456e9c');grad.addColorStop(.57,'#eda778');grad.addColorStop(1,'#ffe1a2')}
 else if(route==='highlands'){grad.addColorStop(0,'#28445f');grad.addColorStop(.6,'#709db4');grad.addColorStop(1,'#c4d4cc')}
 else{grad.addColorStop(0,'#2b5681');grad.addColorStop(.57,'#83bad2');grad.addColorStop(1,'#e8d9b3')}
 ctx.fillStyle=grad;ctx.fillRect(0,0,8,256);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;
}
export class RoadWorld{
 constructor(scene,route='coast',quality='high',profile={shadows:false,shadowMapSize:0}) {this.scene=scene;this.route=route;this.quality=quality;this.profile=profile;this.children=[];this.lights=[];this.exposure=1.18;this.build()}
 add(o){this.scene.add(o);this.children.push(o);return o}
 build(){const route=this.route,config=ROUTES[route];this.sky=skyTexture(config,route);this.scene.background=this.sky;this.scene.fog=new THREE.Fog(config.fog,config.fogNear,config.fogFar);
  const hemi=this.add(new THREE.HemisphereLight(0xddeaf7,config.ground,1.55));this.hemi=hemi;const sun=new THREE.DirectionalLight(config.light,2.15);sun.position.set(-35,110,60);this.add(sun);this.sun=sun;
  if(this.quality==='high'||this.quality==='ultra'){const fill=new THREE.DirectionalLight(0x86b7e8,.3);fill.position.set(26,40,-18);fill.castShadow=false;this.add(fill);this.add(fill.target);this.fill=fill;}
  if(this.profile.shadows){sun.castShadow=true;const shadow=sun.shadow;shadow.mapSize.set(this.profile.shadowMapSize,this.profile.shadowMapSize);shadow.camera.left=-35;shadow.camera.right=35;shadow.camera.top=35;shadow.camera.bottom=-35;shadow.camera.near=1;shadow.camera.far=220;shadow.bias=-.0002;shadow.normalBias=.035;this.add(sun.target)}
  const ground=this.add(new THREE.Mesh(new THREE.PlaneGeometry(1250,RACE_LENGTH+1500),mat(config.ground)));ground.rotation.x=-Math.PI/2;ground.position.set(0,-.24,RACE_LENGTH/2);
  if(route==='coast'){const sea=this.add(new THREE.Mesh(new THREE.PlaneGeometry(390,RACE_LENGTH+1500),new THREE.MeshLambertMaterial({color:0x4485a1,emissive:0x183b56,emissiveIntensity:.3})));sea.rotation.x=-Math.PI/2;sea.position.set(-350,-.18,RACE_LENGTH/2)}
  const roadMat=new THREE.MeshStandardMaterial({color:config.road,map:asphaltTexture(this.quality==='low'),roughness:.96});const ribbons=[[-ROAD_HALF-.86,ROAD_HALF+.86,.005,mat(config.shoulder)],[-ROAD_HALF,ROAD_HALF,.026,roadMat],[-ROAD_HALF,-ROAD_HALF+.13,.032,new THREE.MeshBasicMaterial({color:0xefeee8})],[ROAD_HALF-.13,ROAD_HALF,.032,new THREE.MeshBasicMaterial({color:0xefeee8})]];
  for(const [a,b,h,m] of ribbons){const roadPiece=ribbon(route,a,b,h,8,m);roadPiece.receiveShadow=this.profile.shadows;this.add(roadPiece)}
  this.createForkRoads(route,config,roadMat);
  // Painted rumble strips, patched asphalt and periodic cat's-eye reflectors.
  const rumbleCount=Math.floor((RACE_LENGTH+160)/6)*2;
  const rumble=this.add(new THREE.InstancedMesh(new THREE.BoxGeometry(.64,.025,2.55),new THREE.MeshBasicMaterial({color:config.edge}),rumbleCount));
  for(let i=0;i<rumbleCount;i++){const z=Math.floor(i/2)*6-40,side=i%2?-1:1;
   placeInstance(rumble,i,curveAt(z,route)+side*(ROAD_HALF+.37),.06,z,1,1,1,headingAt(z,route))}
  rumble.instanceMatrix.needsUpdate=true;
  const patchCount=this.quality==='low'?55:115;
  const patches=this.add(new THREE.InstancedMesh(new THREE.BoxGeometry(1,.012,1),new THREE.MeshBasicMaterial({color:config.road,transparent:true,opacity:.22,depthWrite:false}),patchCount));
  const patchRnd=seeded(1901);for(let i=0;i<patchCount;i++){const z=30+patchRnd()*RACE_LENGTH,x=curveAt(z,route)+(patchRnd()-.5)*10;
   placeInstance(patches,i,x,.052,z,.35+patchRnd()*2.1,1,.6+patchRnd()*3.8,headingAt(z,route))}
  patches.instanceMatrix.needsUpdate=true;
  const lineGeo=new THREE.BoxGeometry(1,.017,3.8),lineMat=new THREE.MeshBasicMaterial({color:0xf8b85c});const count=Math.ceil((RACE_LENGTH+180)/9),doubleLine=this.add(new THREE.InstancedMesh(lineGeo,lineMat,count*2));doubleLine.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  const dashMat=new THREE.MeshBasicMaterial({color:0xf0f4e8}),dash=this.add(new THREE.InstancedMesh(new THREE.BoxGeometry(.12,.02,4.2),dashMat,count*2));dash.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  for(let i=0;i<count;i++){const z=i*9-40;for(let k=0;k<2;k++){placeInstance(doubleLine,i*2+k,curveAt(z,route)+(k?0.24:-.24),.052,z,.08,1,1,headingAt(z,route));placeInstance(dash,i*2+k,curveAt(z,route)+(k?3.35:-3.35),.052,z,1,1,1,headingAt(z,route))}}doubleLine.instanceMatrix.needsUpdate=true;dash.instanceMatrix.needsUpdate=true;
  const random=seeded(({coast:42,desert:119,highlands:871})[route]);const spacing=this.quality==='low'?52:27,treeCount=Math.floor((RACE_LENGTH+220)/spacing)*2;
  const trunk=this.add(new THREE.InstancedMesh(new THREE.CylinderGeometry(.19,.3,1,5),mat(route==='desert'?0x69412c:0x503c31),treeCount));trunk.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  const crownGeo=route==='coast'?new THREE.DodecahedronGeometry(1,0):route==='desert'?new THREE.CylinderGeometry(.35,.48,1,6):new THREE.ConeGeometry(1,1,6);
  const tops=this.add(new THREE.InstancedMesh(crownGeo,mat(config.trees),treeCount));
  const arms=route==='desert'?this.add(new THREE.InstancedMesh(new THREE.CylinderGeometry(.17,.22,.9,5),mat(0x758049),treeCount*2)):null;tops.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  for(let i=0;i<treeCount;i++){const side=i%2?-1:1,z=Math.floor(i/2)*spacing-45+random()*13;const x=curveAt(z,route)+side*roadsideClearance(route,z,side,18+random()*34);const h=route==='desert'?2.4+random()*2.4:3+random()*5;
   placeInstance(trunk,i,x,h*.30,z,route==='desert'?1.2:.8,h*.65,route==='desert'?1.2:.8,random()*6);
   if(route==='desert'){
    placeInstance(tops,i,x,h*.81,z,1.25,h*.64,1.25);
    placeInstance(arms,i*2,x-.41,h*.55,z,.75,.8,.75,.66);
    placeInstance(arms,i*2+1,x+.40,h*.69,z,.7,.6,.7,-.55);
   }else if(route==='coast')placeInstance(tops,i,x,h*.94,z,2.25,.65,2.0,random()*6);
   else placeInstance(tops,i,x,h*.84,z,1.6,h*.99,1.6,random()*6);
  const tone=route==='desert'?(random()>.55?0x9a8e49:0x657c40):random()>.52?config.trees:0x38596c;tops.setColorAt(i,new THREE.Color(tone))}trunk.instanceMatrix.needsUpdate=true;tops.instanceMatrix.needsUpdate=true;if(tops.instanceColor)tops.instanceColor.needsUpdate=true;if(arms)arms.instanceMatrix.needsUpdate=true;
  // Rocky silhouettes add depth behind the shoulder without imported assets.
  const mountainCount=this.quality==='low'?40:105;const hills=this.add(new THREE.InstancedMesh(new THREE.ConeGeometry(1,1,4),mat(config.mountain),mountainCount));hills.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  for(let i=0;i<mountainCount;i++){const z=i/(mountainCount-1)*(RACE_LENGTH+360)-80,side=i%2?-1:1;const x=curveAt(z,route)+side*(90+random()*110);const height=route==='highlands'?40+random()*95:20+random()*65;placeInstance(hills,i,x,height*.3-1,z,25+random()*39,height,24+random()*39,random()*Math.PI)}hills.instanceMatrix.needsUpdate=true;
  const barCount=Math.floor((RACE_LENGTH+200)/17)*2;const rail=this.add(new THREE.InstancedMesh(new THREE.BoxGeometry(.17,.3,15),mat(route==='desert'?0xd5b3a0:0x9babaf),barCount));rail.instanceMatrix.setUsage(THREE.StaticDrawUsage);let idx=0;for(let z=-45;z<RACE_LENGTH+120;z+=17)for(let side of [-1,1]){const hide=isForkMouth(route,z,side);placeInstance(rail,idx++,curveAt(z,route)+side*8.4,.57,z,hide?.001:1,hide?.001:1,hide?.001:1,headingAt(z,route))}rail.instanceMatrix.needsUpdate=true;
  const posts=this.add(new THREE.InstancedMesh(new THREE.BoxGeometry(.14,1.15,.14),mat(0x687d86),barCount));posts.instanceMatrix.setUsage(THREE.StaticDrawUsage);idx=0;for(let z=-45;z<RACE_LENGTH+120;z+=17)for(let side of [-1,1]){const hide=isForkMouth(route,z,side);placeInstance(posts,idx++,curveAt(z,route)+side*8.4,.30,z,hide?.001:1,hide?.001:1,hide?.001:1)}posts.instanceMatrix.needsUpdate=true;
  for(let z=260;z<RACE_LENGTH;z+=490){this.createSign(z,config,route)}
  this.createFinish(route);this.createCheckpointGates(route);this.createRoadsideDetail(random);this.architecture=buildRoadsideArchitecture(this);
  const sunBall=this.add(new THREE.Mesh(new THREE.SphereGeometry(20,16,8),new THREE.MeshBasicMaterial({color:route==='desert'?0xffd69b:0xffeac5,fog:false})));sunBall.position.set(-150,110,230);this.sunBall=sunBall;
 }
 /** Geometry is batched with InstancedMesh: extra landmarks without extra draw calls per item. */
 createRoadsideDetail(random){
  const route=this.route,low=this.quality==='low',count=low?32:75;
  const studs=this.add(new THREE.InstancedMesh(new THREE.BoxGeometry(.65,.52,.40),new THREE.MeshLambertMaterial({color:route==='desert'?0xd5ac74:route==='highlands'?0x88a5a5:0xb5d5d8}),count));
  const posts=this.add(new THREE.InstancedMesh(new THREE.CylinderGeometry(.09,.13,3.7,5),mat(0x344c55),count));
  const accents=this.add(new THREE.InstancedMesh(new THREE.BoxGeometry(.85,.34,.24),new THREE.MeshBasicMaterial({color:route==='desert'?0xffbc72:route==='highlands'?0x8fdfff:0xffdd9c}),count));
  for(let i=0;i<count;i++){
   const z=-30+i*(RACE_LENGTH+120)/count,side=i%2?1:-1;
   const x=curveAt(z,route)+side*roadsideClearance(route,z,side,10.9+random()*1.6);
   placeInstance(posts,i,x,1.85,z,1,1,1,headingAt(z,route));
   placeInstance(studs,i,x,3.65,z,.95,1,1,headingAt(z,route));
   placeInstance(accents,i,x,3.67,z+side*.15,.85,1,1,headingAt(z,route));
  }
  studs.instanceMatrix.needsUpdate=true;posts.instanceMatrix.needsUpdate=true;accents.instanceMatrix.needsUpdate=true;
  if(route==='desert'){
   // Layered sandstone slabs at varied angles suggest a wider, deeper desert landscape.
   const rocks=this.add(new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),mat(0xab7756),low?65:145));
   for(let i=0;i<rocks.count;i++){
    const z=random()*(RACE_LENGTH+180)-65,side=i%2?1:-1,scale=1.5+random()*4;
    placeInstance(rocks,i,curveAt(z,route)+side*(23+random()*65),scale*.35-.20,z,scale*1.7,scale*.67,scale*.8,random()*Math.PI);
   }rocks.instanceMatrix.needsUpdate=true;
  }else if(route==='highlands'){
   // Low rock ledges and alpine boulders make the mountain route feel less empty.
   const rocks=this.add(new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),mat(0x5e7384),low?60:140));
   for(let i=0;i<rocks.count;i++){
    const z=random()*(RACE_LENGTH+180)-65,side=i%2?1:-1,scale=.9+random()*2.5;
    placeInstance(rocks,i,curveAt(z,route)+side*(14+random()*42),scale*.35-.2,z,scale*1.4,scale*.8,scale,random()*Math.PI);
   }rocks.instanceMatrix.needsUpdate=true;
  }else{
   // White surf flecks separate the sea from the distant sky.
   const waves=this.add(new THREE.InstancedMesh(new THREE.BoxGeometry(1,.012,.09),new THREE.MeshBasicMaterial({color:0xd3f5f5,transparent:true,opacity:.36,depthWrite:false}),low?100:260));
   for(let i=0;i<waves.count;i++){
    const z=random()*(RACE_LENGTH+400)-90;
    placeInstance(waves,i,-130-random()*360,-.153,z,1+random()*3,1,1+random()*5);
   }waves.instanceMatrix.needsUpdate=true;
  }
 }


 /** Both branches reconnect to the mandatory main road before each checkpoint. */
 createForkRoads(route,config,roadMaterial){
  for(const fork of forksFor(route)){
   const shoulders=new THREE.MeshLambertMaterial({color:config.shoulder,side:THREE.DoubleSide});
   const edgeMat=new THREE.MeshBasicMaterial({color:0xf0efe7,side:THREE.DoubleSide});
   const details=[
    [-ROAD_HALF-.90,ROAD_HALF+.90,.012,shoulders],
    [-ROAD_HALF,ROAD_HALF,.041,roadMaterial],
    [-ROAD_HALF,-ROAD_HALF+.12,.056,edgeMat],
    [ROAD_HALF-.12,ROAD_HALF,.056,edgeMat]
   ];
   for(const [left,right,height,material] of details){
    const road=forkRibbon(route,fork,left,right,height,material);
    road.name='FORK_'+fork.id+'_ROAD';
    road.receiveShadow=this.profile.shadows;this.add(road);
   }
   const n=Math.floor((fork.end-fork.start)/15);
   const markers=this.add(new THREE.InstancedMesh(new THREE.BoxGeometry(.13,.012,4.1),new THREE.MeshBasicMaterial({color:config.edge}),n));
   markers.name='FORK_'+fork.id+'_CENTERLINE';
   for(let i=0;i<n;i++){
    const z=fork.start+8+i*15;
    placeInstance(markers,i,roadCenter(route,z,fork.id),.069,z,1,1,1,roadHeading(route,z,fork.id));
   }
   markers.instanceMatrix.needsUpdate=true;
   const sign=new THREE.Group();
   const base=new THREE.Mesh(new THREE.BoxGeometry(.17,3.7,.20),new THREE.MeshLambertMaterial({color:0x596872}));
   base.position.y=1.85;sign.add(base);
   const frame=new THREE.Mesh(new THREE.BoxGeometry(4.8,1.5,.15),new THREE.MeshLambertMaterial({color:0x162c33}));
   frame.position.y=4.1;sign.add(frame);
   const canvas=document.createElement('canvas');canvas.width=512;canvas.height=160;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#172b32';ctx.fillRect(0,0,512,160);
   ctx.fillStyle='#eaff77';ctx.font='bold 46px Impact, sans-serif';ctx.textAlign='center';ctx.fillText('DESVIO',256,56);
   ctx.fillStyle='#ffffff';ctx.font='bold 32px Impact, sans-serif';ctx.fillText(fork.name,256,108);
   const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
   const face=new THREE.Mesh(new THREE.PlaneGeometry(4.6,1.36),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));
   face.position.set(0,4.1,.087);sign.add(face);
   const z=fork.start+105;
   const x=roadCenter(route,z,fork.id)+fork.side*(ROAD_HALF+2.8);
   sign.position.set(x,0,z);sign.rotation.y=roadHeading(route,z,fork.id);
   sign.name='FORK_'+fork.id+'_SIGN';
   this.add(sign);
  }
 }
 createCheckpointGates(route){
  const config=ROUTES[route];
  for(const [index,z] of CHECKPOINT_DISTANCES.entries()){
   const gate=new THREE.Group();
   const postMat=new THREE.MeshLambertMaterial({color:0x28434f});
   const glow=new THREE.MeshBasicMaterial({color:config.edge});
   for(const side of [-1,1]){
    const post=new THREE.Mesh(new THREE.BoxGeometry(.24,4.6,.24),postMat);
    post.position.set(side*(ROAD_HALF+.6),2.3,0);gate.add(post);
    const strip=new THREE.Mesh(new THREE.BoxGeometry(.12,2.8,.10),glow);
    strip.position.set(side*(ROAD_HALF+.6),3,0.17);gate.add(strip);
   }
   const beam=new THREE.Mesh(new THREE.BoxGeometry(ROAD_HALF*2+1.4,.32,.35),postMat);
   beam.position.set(0,4.6,0);gate.add(beam);
   const panel=new THREE.Mesh(new THREE.PlaneGeometry(2.65,.68),new THREE.MeshBasicMaterial({color:config.edge,side:THREE.DoubleSide}));
   panel.position.set(0,4.62,.22);gate.add(panel);
   const tag=new THREE.Mesh(new THREE.PlaneGeometry(2.2,.25),new THREE.MeshBasicMaterial({color:0x14232a,side:THREE.DoubleSide}));
   tag.position.set(0,4.63,.232);gate.add(tag);
   gate.name='CHECKPOINT_'+(index+1);
   gate.position.set(curveAt(z,route),0,z);gate.rotation.y=headingAt(z,route);this.add(gate);
  }
 }
 createFinish(route){
  const finishZ=RACE_LENGTH;const group=new THREE.Group();
  const pillarMat=new THREE.MeshStandardMaterial({color:0x223440,metalness:.4,roughness:.55});
  const accent=new THREE.MeshBasicMaterial({color:ROUTES[route].accent});
  for(const x of [-ROAD_HALF-.5,ROAD_HALF+.5]){
   const pole=new THREE.Mesh(new THREE.BoxGeometry(.42,7.8,.42),pillarMat);pole.position.set(x,3.9,0);group.add(pole);
   const strip=new THREE.Mesh(new THREE.BoxGeometry(.11,6.7,.07),accent);strip.position.set(x,4,.27);group.add(strip);
  }
  const bar=new THREE.Mesh(new THREE.BoxGeometry(ROAD_HALF*2+1.5,.75,.45),pillarMat);bar.position.y=7.7;group.add(bar);
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=60;const ctx=canvas.getContext('2d');ctx.fillStyle='#0f2430';ctx.fillRect(0,0,512,60);ctx.font='bold 42px Impact, sans-serif';ctx.textAlign='center';ctx.fillStyle='#ddff50';ctx.fillText('CHEGADA  ★  FINISH',256,46);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(11,.72),new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide}));sign.position.set(0,7.7,.28);group.add(sign);
  const grid=new THREE.Group();for(let col=0;col<13;col++)for(let row=0;row<2;row++){
   if((col+row)%2===0){const tile=new THREE.Mesh(new THREE.PlaneGeometry(1.04,1.2),new THREE.MeshBasicMaterial({color:0xf3f5f0,side:THREE.DoubleSide}));tile.rotation.x=-Math.PI/2;tile.position.set(-ROAD_HALF+.52+col*1.04,.068,-1.2+row*1.2);grid.add(tile)}
  }
  grid.position.set(curveAt(finishZ,route),0,finishZ);grid.rotation.y=headingAt(finishZ,route);this.add(grid);group.position.set(curveAt(finishZ,route),0,finishZ);group.rotation.y=headingAt(finishZ,route);this.add(group);
 }
 createSign(z,config,route){const g=new THREE.Group(),sign=new THREE.Mesh(new THREE.BoxGeometry(6.8,2.5,.24),new THREE.MeshLambertMaterial({color:0x162837,emissive:0x12262a}));sign.position.y=6.2;g.add(sign);const canvas=document.createElement('canvas');canvas.width=512;canvas.height=190;const ctx=canvas.getContext('2d');ctx.fillStyle='#091923';ctx.fillRect(0,0,512,190);ctx.fillStyle='#ddff50';ctx.font='900 62px Impact, sans-serif';ctx.fillText('ASFALTO',24,78);ctx.fillStyle='#f6f9f3';ctx.font='900 67px Impact, sans-serif';ctx.fillText('BRUTAL  ↗',24,151);const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;const poster=new THREE.Mesh(new THREE.PlaneGeometry(6.65,2.4),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));poster.position.set(0,6.2,.15);g.add(poster);const post=new THREE.Mesh(new THREE.BoxGeometry(.22,6,.25),mat(0x7f9098));post.position.set(0,2.95,0);g.add(post);g.position.set(curveAt(z,route)+11.4,0,z);g.rotation.y=headingAt(z,route);this.add(g)}
 update(z,dt=.016,lightingMode='auto'){
  const frame=lightingFrame({route:this.route,mode:lightingMode,progress:z/RACE_LENGTH,quality:this.quality});
  this.sun.intensity=lightBlend(this.sun.intensity,frame.sunIntensity,dt);
  this.hemi.intensity=lightBlend(this.hemi.intensity,frame.hemisphereIntensity,dt);
  if(this.fill){this.fill.intensity=lightBlend(this.fill.intensity,frame.fillIntensity,dt);this.fill.color.setRGB(...frame.fillColor);this.fill.position.z=z-18;this.fill.position.x=curveAt(z,this.route)+26;this.fill.target.position.set(curveAt(z,this.route),0,z+15);this.fill.target.updateMatrixWorld();}
  this.sun.color.setRGB(...frame.sunColor);
  this.hemi.color.setRGB(...frame.skyColor);this.hemi.groundColor.setRGB(...frame.groundColor);
  this.exposure=lightBlend(this.exposure,frame.exposure,dt);
  if(this.sunBall)this.sunBall.position.z=z+260;
  // Keep the shadow map centered on the rider instead of a fixed start line.
  if(this.profile.shadows&&this.sun){const x=curveAt(z,this.route);this.sun.position.set(x-35,110,z+60);this.sun.target.position.set(x,0,z+13);this.sun.target.updateMatrixWorld()}
 }
 dispose(){for(const obj of this.children){this.scene.remove(obj);obj.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){for(const m of (Array.isArray(o.material)?o.material:[o.material])){if(m.map)m.map.dispose();m.dispose()}}})}this.children.length=0;this.scene.fog=null;this.scene.background=null;if(this.sun?.shadow?.dispose)this.sun.shadow.dispose();if(this.sky){this.sky.dispose();this.sky=null}}
}
