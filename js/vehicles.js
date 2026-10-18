import * as THREE from 'three';
function part(parent,geo,mat,pos,rot){const m=new THREE.Mesh(geo,mat);if(pos)m.position.set(...pos);if(rot)m.rotation.set(...rot);parent.add(m);return m}
function between(parent,start,end,radius,mat,segments=7){const a=new THREE.Vector3(...start),b=new THREE.Vector3(...end),dir=new THREE.Vector3().subVectors(b,a);const o=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,dir.length(),segments),mat);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());parent.add(o);return o}
const material=(color,metalness=.1,roughness=.65,options={})=>new THREE.MeshStandardMaterial({color,metalness,roughness,...options});
const box=(parent,size,mat,pos,rot)=>part(parent,new THREE.BoxGeometry(...size),mat,pos,rot);
function tire(parent,z,radius,rubber,rim,disc,low){
 const pivot=new THREE.Group();pivot.position.set(0,radius+.1,z);parent.add(pivot);
 part(pivot,new THREE.TorusGeometry(radius,.155,low?6:10,low?12:24),rubber,[0,0,0],[0,Math.PI/2,0]);
 part(pivot,new THREE.CylinderGeometry(radius*.66,radius*.66,.11,low?10:18),rim,[0,0,0],[0,0,Math.PI/2]);
 part(pivot,new THREE.CylinderGeometry(radius*.46,radius*.46,.15,low?10:18),disc,[0,0,0],[0,0,Math.PI/2]);
 if(!low)for(let i=0;i<5;i++){const a=i*Math.PI/5;between(pivot,[0,Math.sin(a)*radius*.45,Math.cos(a)*radius*.45],[0,-Math.sin(a)*radius*.45,-Math.cos(a)*radius*.45],.025,rim,4)}
 return pivot;
}
/** Small fixed-link Verlet rope: springy visual chain, no rigid-body engine or per-frame meshes. */
function createChain(side,low,dark,metal){
 const g=new THREE.Group();
 box(g,[.11,.09,.27],dark,[0,0,0]);
 const count=low?4:7,length=.145,nodes=[],previous=[],links=[];
 for(let i=0;i<=count;i++){
  const v=new THREE.Vector3(side*i*length*.50,-i*length*.70,0);
  nodes.push(v);previous.push(v.clone());
  if(i){
   const ring=part(g,new THREE.TorusGeometry(.057,.020,low?4:6,low?7:12),metal);
   links.push(ring);
  }
 }
 const unit=new THREE.Vector3(0,1,0),delta=new THREE.Vector3(),mid=new THREE.Vector3();
 function update(dt,power){
  if(!g.visible)return;
  const d=Math.min(.033,Math.max(.001,dt));
  for(let i=1;i<nodes.length;i++){
   const p=nodes[i],old=previous[i];
   const vx=Math.max(-.20,Math.min(.20,(p.x-old.x)*.93));
   const vy=Math.max(-.20,Math.min(.20,(p.y-old.y)*.93));
   const vz=Math.max(-.20,Math.min(.20,(p.z-old.z)*.93));
   old.copy(p);
   p.set(p.x+vx+side*(.45+power*14)*d*d,p.y+vy-12*d*d,p.z+vz+(power*1.2)*d*d);
  }
  for(let pass=0;pass<4;pass++){
   nodes[0].set(0,0,0);
   for(let i=1;i<nodes.length;i++){
    const a=nodes[i-1],b=nodes[i];delta.subVectors(b,a);
    const mag=Math.max(.0001,delta.length());const scale=(mag-length)/mag;
    if(i===1)b.addScaledVector(delta,-scale);
    else{a.addScaledVector(delta,scale*.48);b.addScaledVector(delta,-scale*.52)}
   }
  }
  nodes[0].set(0,0,0);
  for(let i=1;i<nodes.length;i++){
   const m=links[i-1],a=nodes[i-1],b=nodes[i];
   delta.subVectors(b,a);mid.copy(a).add(b).multiplyScalar(.5);m.position.copy(mid);
   m.quaternion.setFromUnitVectors(unit,delta.normalize());
  }
 }
 g.visible=false;return {group:g,update};
}
function weaponShape(type,side,low,dark,metal){
 if(type==='chain')return createChain(side,low,dark,metal);
 const group=new THREE.Group();
 if(type==='club'){
  part(group,new THREE.CylinderGeometry(.055,.065,.73,low?5:9),new THREE.MeshStandardMaterial({color:0x82522d,metalness:.12,roughness:.77}),[side*.32,-.01,0],[0,0,side*Math.PI/2]);
  box(group,[.105,.13,.14],metal,[side*.68,.02,0]);
 }else if(type==='pipe'){
  part(group,new THREE.CylinderGeometry(.052,.052,.83,low?5:10),metal,[side*.38,-.02,0],[0,0,side*Math.PI/2]);
  part(group,new THREE.CylinderGeometry(.074,.074,.12,low?5:9),metal,[side*.73,.08,0],[0,0,side*Math.PI/2]);
 }else if(type==='machete'){
  const handle=material(0x2b1e16,.12,.7);
  box(group,[.38,.10,.11],handle,[side*.18,0,0]);
  const shape=new THREE.Shape();shape.moveTo(0,0);shape.lineTo(.61,0);shape.lineTo(.85,.10);shape.lineTo(.82,.20);shape.lineTo(.07,.14);shape.closePath();
  const blade=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.045,bevelEnabled:!low,bevelSize:.01,bevelThickness:.008,bevelSegments:1,steps:1}),metal);
  blade.position.set(side*.32,-.05,-.025);blade.scale.x=side;group.add(blade);
 }else if(type==='baton'){
  const rubber=material(0x1a1c20,.07,.86);
  part(group,new THREE.CylinderGeometry(.047,.053,.73,low?5:10),rubber,[side*.35,0,0],[0,0,side*Math.PI/2]);
  box(group,[.1,.11,.10],metal,[side*.67,0,0]);
 }
 group.visible=false;return {group,update:null};
}
function armRig(parent,side,jacket,glove,low,dark,metal){
 const shoulder=new THREE.Group();shoulder.position.set(side*.34,2.18,-.10);parent.add(shoulder);
 const upperArm=between(shoulder,[0,0,0],[side*.20,-.33,.45],.11,jacket,low?5:8);
 const elbow=part(shoulder,new THREE.SphereGeometry(.11,low?6:10,6),dark,[side*.20,-.33,.45]);
 const forearmPivot=new THREE.Group();forearmPivot.position.set(side*.20,-.33,.45);shoulder.add(forearmPivot);
 const forearm=between(forearmPivot,[0,0,0],[side*.13,-.08,.48],.092,jacket,low?5:8);
 const fist=part(forearmPivot,new THREE.SphereGeometry(.09,low?6:10,6),glove,[side*.14,-.08,.50]);
 const weaponPivot=new THREE.Group();weaponPivot.position.set(side*.16,-.06,.52);forearmPivot.add(weaponPivot);
 const weaponSets={
  chain:weaponShape('chain',side,low,dark,metal),
  club:weaponShape('club',side,low,dark,metal),
  pipe:weaponShape('pipe',side,low,dark,metal),
  machete:weaponShape('machete',side,low,dark,metal),
  baton:weaponShape('baton',side,low,dark,metal)
 };
 Object.values(weaponSets).forEach(w=>weaponPivot.add(w.group));
 return {shoulder,upperArm,elbow,forearmPivot,forearm,fist,weaponPivot,weaponSets,
  updateChain(dt,power){weaponSets.chain.update(dt,power)}};
}
export function createBike(color=0xff5a4e,{player=false,quality='high'}={}){
 const low=quality==='low',root=new THREE.Group(),lean=new THREE.Group();root.add(lean);
 const body=material(color,.55,.31),dark=material(0x14191c,.12,.85),chrome=material(0xb6c8cf,.78,.24),rubber=material(0x080d11,.03,.95),paint2=material(0x151f2b,.23,.43);
 const accent=material(player?0xddff50:0xf5f8fb,.34,.48),helmet=material(player?0xddff50:color,.42,.32),jacket=material(player?0x24465a:0x27323e,.11,.84),glove=material(0x11161d,.14,.74),glass=material(0x162f3c,.36,.18),white=material(0xe6f1ef,.12,.4);
 const lightMat=new THREE.MeshStandardMaterial({color:0xffeee2,emissive:0xffeec6,emissiveIntensity:1.5});
 const rearMat=new THREE.MeshStandardMaterial({color:0xff333e,emissive:0xff181d,emissiveIntensity:1.2});
 const wheels=[tire(lean,-1.17,.5,rubber,chrome,dark,low),tire(lean,1.12,.5,rubber,chrome,dark,low)];
 for(const x of [-.24,.24]){
  between(lean,[x,.7,-1.15],[x*.77,1.04,.11],.067,chrome);
  between(lean,[x,.63,1.1],[x*.92,1.6,.81],.07,chrome);
  between(lean,[x*.85,.92,-.82],[x*.86,.68,-1.23],.048,chrome);
 }
 box(lean,[.64,.53,.62],dark,[0,.96,-.15]);
 for(let i=0;i<4;i++)box(lean,[.73,.035,.55],chrome,[0,.77+i*.105,-.15]);
 box(lean,[.54,.29,2.0],paint2,[0,1.03,-.05]);
 box(lean,[.75,.27,1.09],body,[0,1.30,.15]);
 part(lean,new THREE.SphereGeometry(.46,low?9:16,low?6:10),body,[0,1.38,.37]);
 box(lean,[.78,.055,1.30],accent,[0,1.42,.18]);
 for(const side of [-1,1]){
  box(lean,[.12,.29,1.04],body,[side*.34,1.11,.29],[0,0,side*.16]);
  box(lean,[.15,.13,.49],paint2,[side*.39,1.15,.98]);
  between(lean,[side*.43,.91,-.5],[side*.52,.82,-1.16],.09,chrome);
  between(lean,[side*.24,.84,-.82],[side*.55,.77,-1.38],.045,chrome);
  box(lean,[.14,.055,.44],chrome,[side*.49,1.04,-.63]);
  box(lean,[.08,.20,.46],accent,[side*.36,1.18,.72]);
  part(lean,new THREE.CylinderGeometry(.10,.10,.08,low?6:10),chrome,[side*.64,.68,-1.15],[0,0,Math.PI/2]);
 }
 box(lean,[.59,.18,.82],rubber,[0,1.48,-.65]);
 box(lean,[.52,.29,.48],body,[0,1.29,-1.07]);
 box(lean,[.53,.10,.19],rearMat,[0,1.26,-1.38]);
 if(!low){
  for(const x of [-1,1]){
   box(lean,[.07,.10,.68],chrome,[x*.34,1.08,.29],[0,0,x*.15]);
   box(lean,[.08,.14,.28],accent,[x*.36,1.26,.93]);
   part(lean,new THREE.CylinderGeometry(.065,.065,.13,10),dark,[x*.28,.98,-.12],[0,0,Math.PI/2]);
  }
  box(lean,[.43,.09,.42],glass,[0,1.48,.52],[-.3,0,0]);
  box(lean,[.57,.04,.35],accent,[0,1.31,-1.12]);
 }
 const brakeLight=part(lean,new THREE.BoxGeometry(.35,.085,.035),rearMat,[0,1.28,-1.48]);
 part(lean,new THREE.CylinderGeometry(.08,.08,.95,low?5:8),chrome,[-.31,.83,-1.65],[Math.PI/2,0,0]);
 part(lean,new THREE.CylinderGeometry(.08,.08,.95,low?5:8),chrome,[.31,.83,-1.65],[Math.PI/2,0,0]);
 box(lean,[.65,.44,.44],body,[0,1.32,1.03],[-.16,0,0]);
 box(lean,[.58,.34,.07],glass,[0,1.6,1.0],[-.3,0,0]);
 box(lean,[.45,.20,.075],lightMat,[0,1.29,1.3]);
 box(lean,[.40,.06,.30],accent,[0,1.47,1.17],[-.10,0,0]);
 for(const x of [-1,1]){between(lean,[x*.57,1.56,.82],[x*.42,1.33,.87],.042,chrome);part(lean,new THREE.SphereGeometry(.16,low?6:10,6),dark,[x*.65,1.7,.84]);part(lean,new THREE.CylinderGeometry(.05,.05,.22,5),chrome,[x*.64,1.66,1.04],[Math.PI/2,0,0]);}
 between(lean,[-.63,1.58,.84],[.63,1.58,.84],.047,chrome);
 const rider=new THREE.Group();lean.add(rider);
 box(rider,[.71,.72,.48],jacket,[0,1.95,-.19],[.20,0,0]);
 // Separate neck/head pivot allows looking through bends instead of rigid helmet pose.
 const headRig=new THREE.Group();headRig.position.set(0,2.45,.04);rider.add(headRig);
 part(headRig,new THREE.SphereGeometry(.32,low?10:18,low?8:14),helmet,[0,0,0]);
 box(headRig,[.53,.19,.10],glass,[0,-.04,.285]);
 box(headRig,[.36,.055,.072],white,[0,.145,.255]);
 box(headRig,[.27,.09,.12],dark,[0,-.24,.19]);
 const collar=part(rider,new THREE.CylinderGeometry(.29,.34,.13,low?7:12),dark,[0,2.25,-.025]);
 if(!low){
  box(rider,[.51,.22,.085],dark,[0,2.04,.083],[.19,0,0]);
  box(rider,[.33,.07,.09],accent,[0,2.13,.11]);
  box(rider,[.59,.16,.085],dark,[0,1.76,-.006]);
  for(const side of [-1,1]){
   box(rider,[.17,.34,.09],accent,[side*.30,2.03,.11],[0,0,side*.16]);
   box(headRig,[.045,.25,.14],white,[side*.27,.03,.08]);
  }
 }
 for(const side of [-1,1])between(rider,[side*.23,1.70,-.49],[side*.42,1.03,-.48],.158,jacket);
 const armLeft=armRig(rider,-1,jacket,glove,low,dark,chrome),armRight=armRig(rider,1,jacket,glove,low,dark,chrome);
 const kickLeft=new THREE.Group(),kickRight=new THREE.Group();kickLeft.position.set(-.43,1.01,-.47);kickRight.position.set(.43,1.01,-.47);rider.add(kickLeft,kickRight);
 const boots=material(0x0b1119,.1,.8);
 between(kickLeft,[0,0,0],[-.13,-.39,.12],.15,jacket);box(kickLeft,[.25,.18,.46],boots,[-.18,-.46,.20]);
 between(kickRight,[0,0,0],[.13,-.39,.12],.15,jacket);box(kickRight,[.25,.18,.46],boots,[.18,-.46,.20]);
 for(const group of [kickLeft,kickRight])if(!low){
  box(group,[.19,.12,.13],accent,[group===kickLeft?-.12:.12,-.29,.11]);
  box(group,[.24,.065,.22],chrome,[group===kickLeft?-.19:.19,-.49,.33]);
 }
 const flameMat=new THREE.MeshBasicMaterial({color:0x34cfff,transparent:true,opacity:.92,depthWrite:false,side:THREE.DoubleSide});
 const boostFx=new THREE.Group();boostFx.visible=false;lean.add(boostFx);
 for(const x of [-.35,.35]){const cone=part(boostFx,new THREE.ConeGeometry(.19,.95,low?5:8),flameMat,[x,.82,-1.78],[Math.PI/2,0,0]);cone.scale.y=.8;}
 const shadow=part(root,new THREE.CircleGeometry(1.08,18),new THREE.MeshBasicMaterial({color:0x02070c,transparent:true,opacity:.27,depthWrite:false}),[0,.035,0],[-Math.PI/2,0,0]);shadow.scale.set(.78,1.76,1);
 return {kind:'bike',group:root,lean,rider,headRig,kickLeft,kickRight,wheels,brakeLight,boostFx,shadow,armLeft,armRight,weaponType:'chain'};
}
export function createCar(color=0x4aa4bb,{quality='high'}={}){
 const low=quality==='low',root=new THREE.Group(),paint=material(color,.59,.36),glass=material(0x122936,.19,.16),rubber=material(0x101215),chrome=material(0x9faeb4,.74,.29);
 const lamp=new THREE.MeshStandardMaterial({color:0xffe6ae,emissive:0xffcc81,emissiveIntensity:1.15}),rear=new THREE.MeshStandardMaterial({color:0xff3434,emissive:0xd51e20,emissiveIntensity:1.1});
 box(root,[2.04,.66,3.76],paint,[0,.85,0]);box(root,[1.66,.69,2],paint,[0,1.37,-.2]);
 box(root,[1.60,.49,.065],glass,[0,1.52,.78],[-.20,0,0]);box(root,[1.60,.42,.065],glass,[0,1.52,-1.18],[.17,0,0]);
 for(const x of [-1,1]){box(root,[.06,.39,.80],glass,[x*.84,1.46,-.18]);box(root,[.2,.23,.35],paint,[x*1.04,1.45,.66]);}
 const wheels=[];
 for(const x of [-1,1])for(const z of [-1.13,1.12]){const pivot=new THREE.Group();pivot.position.set(x*1.03,.49,z);root.add(pivot);part(pivot,new THREE.CylinderGeometry(.43,.43,.25,low?10:16),rubber,[0,0,0],[0,0,Math.PI/2]);part(pivot,new THREE.CylinderGeometry(.26,.26,.275,low?8:12),chrome,[0,0,0],[0,0,Math.PI/2]);wheels.push(pivot)}
 box(root,[2.1,.14,.17],chrome,[0,.6,1.9]);box(root,[2.1,.14,.17],chrome,[0,.6,-1.9]);
 for(const x of [-.7,.7]){box(root,[.42,.20,.06],lamp,[x,.9,1.91]);box(root,[.38,.16,.06],rear,[x,.9,-1.91]);}
 box(root,[.78,.24,.04],glass,[0,.86,1.94]);
 return {kind:'car',group:root,lean:root,wheels};
}
export function createPoliceCar({quality='high'}={}) {
 const vehicle=createCar(0xe3e9ee,{quality});const body=new THREE.MeshStandardMaterial({color:0x1b334a,metalness:.48,roughness:.44});
 box(vehicle.group,[2.075,.19,1.50],body,[0,.93,-.33]);
 const red=new THREE.MeshStandardMaterial({color:0xff323b,emissive:0xff222b,emissiveIntensity:3.1});
 const blue=new THREE.MeshStandardMaterial({color:0x438dff,emissive:0x2366ff,emissiveIntensity:.4});
 const black=material(0x162530,.25,.43);
 box(vehicle.group,[1.2,.11,.35],black,[0,1.81,-.25]);
 const lights=[box(vehicle.group,[.49,.18,.34],red,[ -.31,1.91,-.25]),box(vehicle.group,[.49,.18,.34],blue,[.31,1.91,-.25])];
 box(vehicle.group,[.85,.24,.06],black,[0,1.20,-1.99]);
 return {...vehicle,kind:'police',lights};
}
export function disposeVehicle(vehicle){const g=new Set(),m=new Set();vehicle.group.traverse(o=>{if(o.geometry)g.add(o.geometry);if(o.material)for(const mat of(Array.isArray(o.material)?o.material:[o.material]))m.add(mat)});for(const geo of g)geo.dispose();for(const mat of m)mat.dispose()}
export function createPoliceBike({quality='high'}={}) {
 const vehicle=createBike(0x1a3b62,{quality});
 const low=quality==='low';
 const red=new THREE.MeshStandardMaterial({color:0xff4d54,emissive:0xff1826,emissiveIntensity:3});
 const blue=new THREE.MeshStandardMaterial({color:0x498fff,emissive:0x245bff,emissiveIntensity:.2});
 const white=material(0xf5f8ff,.34,.40),dark=material(0x1f293e,.22,.6);
 box(vehicle.lean,[.62,.24,.54],white,[0,1.28,-.90]);
 box(vehicle.lean,[.48,.25,.075],dark,[0,1.3,-1.19]);
 const lights=[box(vehicle.lean,[.24,.13,.18],red,[-.25,1.81,.85]),box(vehicle.lean,[.24,.13,.18],blue,[.25,1.81,.85])];
 if(!low){box(vehicle.lean,[.58,.27,.18],white,[0,1.32,1.15]);box(vehicle.lean,[.15,.21,.23],dark,[0,1.35,1.19]);}
 return {...vehicle,kind:'policeBike',lights};
}
export function createCrashRider(vehicle){
 if(vehicle.crashRider)return vehicle.crashRider;
 const mesh=vehicle.rider.clone(true);
 mesh.visible=false;
 vehicle.group.add(mesh);
 vehicle.crashRider=mesh;
 return mesh;
}
export function setCrashRider(vehicle,enabled){
 if(!vehicle?.rider)return;
 if(enabled)createCrashRider(vehicle);
 vehicle.rider.visible=!enabled;
 if(vehicle.crashRider){vehicle.crashRider.visible=enabled;if(!enabled){vehicle.crashRider.position.set(0,0,0);vehicle.crashRider.rotation.set(0,0,0)}}
}
export function setBikeWeapon(vehicle,type='chain'){
 if(!vehicle?.armLeft?.weaponSets||!vehicle?.armRight?.weaponSets)return;
 vehicle.weaponType=type;
 for(const rig of [vehicle.armLeft,vehicle.armRight])for(const [id,weapon] of Object.entries(rig.weaponSets))weapon.group.visible=id===type&&rig===vehicle.armRight;
}
