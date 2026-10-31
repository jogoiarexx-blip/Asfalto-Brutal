import * as THREE from 'three';
import {RACE_LENGTH,ROAD_HALF,ROUTES,clamp,lerp,approach,curveAt,headingAt,formatTime,rankOf,kmh,nextRacerSpeed} from './config.js';
import {HULLS,sweptVehicleHit,strikeCandidate,atTime} from './collision.js';
import {moveBike,ROAD_RAIL} from './physics.js';
import {contactResponse} from './contact-response.js';
import {chooseRivalDefense,guardDamage,dodgeOffset} from './defense.js';
import {RoadWorld} from './world.js';
import {createBike,createCar,createPoliceCar,createPoliceBike,setCrashRider,disposeVehicle,setBikeWeapon} from './vehicles.js';
import {BIKES,chosenBike,loadGarage,saveGarage,garageAction,awardRace,formatMoney} from './garage.js';
import {pickRivalLane,rivalShouldAttack,aggressionOf} from './ai.js';
import {crashPose} from './crash-anim.js';
import {FALL_TIME,RECOVERY_GRACE,ARREST_TIME,dangerousImpact,nextFall,pursuitTrigger,pursuitStep,updateHeat,policeArrestStep} from './encounters.js';
import {Input} from './input.js';
import {AudioSystem} from './audio.js';
import {WEAPONS, weaponById, weaponForRival, strikeIsActive, sideTowardPlayer, canEnemyStrike, enemyDamage} from './combat.js';
import {animateRider,reactionAmount} from './rider-animation.js';
import {chooseOvertake,resolveRivalPair,policeCurveTarget,skidIntensity} from './race-dynamics.js';
import {SkidMarks} from './skid-marks.js';
import {rivalStyle,rivalPace,rivalAttackCooldown,rivalLaneRate} from './rival-styles.js';
import {planTraffic} from './traffic-ai.js';
import {separateNpcPair} from './npc-contact.js';
import {graphicsProfile,automaticQuality} from './graphics-quality.js';
import {CameraDirector,frameCamera,CAMERA_MODES,nextCameraMode} from './camera-director.js';
import {LIGHT_MODES} from './lighting-director.js';
import {preparePlayerVehicle,ensurePlayerVehicle,playerOutsideView} from './player-visibility.js';
import {createHeroDebugPanel,updateHeroDebugPanel} from './debug-hero.js';
import {MISSIONS,missionById,missionUnlocked,loadCampaign,saveCampaign,completeMission} from './jailbreak-campaign.js';
import {createCheckpoints,advanceCheckpoints,allCheckpointsPassed,nextCheckpoint,missedCheckpoint} from './checkpoints.js';
import {roadCenter,roadHeading,activeFork,forkOffset} from './road-network.js';
import {npcRoadChoice,spawnNpcPath,npcRoadPose,sameNpcRoad} from './npc-routing.js';
import {initialMissionRun,advanceMissionRun,missionRunStatus} from './mission-events.js';
const $=id=>document.getElementById(id);
const rivalsColors=[0xffcf54,0xa66cff,0x51ccff,0xf96d90,0x71df9b,0xff8543];
const carColors=[0xde5549,0xf2d36b,0x57bcd5,0x5466a8,0xe9e6dc,0x418579];
const rand=(a,b)=>a+Math.random()*(b-a);
const lerpAngle=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
const WEAPON_STORAGE_KEY='asfalto-brutal-weapon-v1';
const WEAPON_DEFS=WEAPONS;

export class Game{
 constructor(){
  this.canvas=$('scene');this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(70,1,.1,580);
  this.heroShadowAnchor=new THREE.Group();this.heroShadowAnchor.name='PLAYER_GROUND_SHADOW';this.heroDebugPanel=createHeroDebugPanel();this.heroDebugEnabled=new URLSearchParams(location.search).has('debug');if(this.heroDebugEnabled)this.heroDebugPanel.classList.remove('hidden');
  this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,antialias:true,powerPreference:'high-performance',alpha:false});
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.21;
  this.renderer.shadowMap.enabled=false;this.renderer.shadowMap.type=THREE.PCFShadowMap;
  this.input=new Input();this.audio=new AudioSystem();this.storage=null;try{this.storage=window.localStorage}catch{}this.garage=loadGarage(this.storage);this.campaign=loadCampaign(this.storage);this.gameMode='free';this.selectedMissionId=MISSIONS[0].id;this.mission=null;this.checkpoints=createCheckpoints();this.branchChoices={};this.simAccum=0;this.selectedWeapon=this.loadWeapon();this.policePatrolCount=0;this.earnedLast=0;this.route='coast';this.quality='auto';this.shadows='auto';this.cameraMode=this.readSetting('asfalto-camera-v2','chase',CAMERA_MODES);this.lighting='auto';this.mode='menu';this.cameraDirector=new CameraDirector(this.camera);
  this.skidMarks=null;this.rivalCollisions=0;this.npcContacts=0;this.frame=0;this.elapsed=0;this.player={z:0,x:0,speed:0,health:100,nitro:100};this.rivals=[];this.traffic=[];this.pickups=[];this.effects=[];this.police=null;this.policeNext=0;this.policeLost=0;this.arrestProgress=0;this.arrestGrace=0;this.heat=0;this.playerFall=null;this.dustClock=0;
  this.hitCooldown=0;this.hurtCooldown=0;this.attackPhase=0;this.attackSide=0;this.activeStrike=null;this.playerAttackAge=Infinity;this.reactionTimer=0;this.lastPadStatus=false;this.attackSerial=0;this.impactSlow=0;
  this.toastTimer=0;this.flashTimer=0;this.cameraShake=0;this.debugBoxes=false;this.lastFrame=performance.now();this.hits=0;this.falls=0;this.escapes=0;this.hudTick=0;this.fpsTime=0;this.fpsFrames=0;this.autoScale=1;this.automaticShadowDrop=false;
  this.heroProbe=new THREE.Vector3();this.heroOutOfViewTime=0;this.heroDiagnosticTick=0;this.bindUI();
  document.addEventListener('keydown',e=>{if(e.repeat)return;if(e.code==='F9'){e.preventDefault();this.heroDebugEnabled=!this.heroDebugEnabled;this.heroDebugPanel.classList.toggle('hidden',!this.heroDebugEnabled)}});this.renderGarage();this.renderCampaign();this.buildTrack();this.resize();
  addEventListener('resize',()=>this.resize());this.renderer.setAnimationLoop(t=>this.frameLoop(t));
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&this.mode==='race')this.pause()});
  $('loading').classList.add('hidden');window.__asfaltoBooted=true;
 }
 readSetting(key,fallback,valid){try{const stored=this.storage?.getItem(key);return stored in valid?stored:fallback}catch{return fallback}}
 get reducedMotion(){return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches}
 get resolvedQuality(){return this.quality==='auto'?automaticQuality({cores:navigator.hardwareConcurrency||4,width:innerWidth,height:innerHeight,reducedMotion:!!matchMedia?.('(prefers-reduced-motion: reduce)').matches}):this.quality}
 get renderProfile(){return graphicsProfile(this.resolvedQuality,{cores:navigator.hardwareConcurrency||4,width:innerWidth,height:innerHeight,devicePixelRatio:devicePixelRatio||1,autoScale:this.quality==='auto'?this.autoScale:1,shadows:this.shadows})}
 configureShadows(vehicle){if(!this.renderProfile.shadows)return;let count=0;vehicle.group.traverse(o=>{if(o.isMesh&&!o.material?.transparent&&o.material?.type!=='MeshBasicMaterial'&&count<10){o.castShadow=true;count++}})}
 buildTrack(){
  this.removeTrack();this.automaticShadowDrop=false;const profile=this.renderProfile;this.renderer.shadowMap.enabled=profile.shadows;this.world=new RoadWorld(this.scene,this.route,this.resolvedQuality,profile);this.skidMarks=new SkidMarks(this.scene,this.resolvedQuality);
  this.playerBike=createBike(chosenBike(this.garage).color,{player:true,quality:this.resolvedQuality,model:this.garage.selected});this.configureShadows(this.playerBike);setBikeWeapon(this.playerBike,this.selectedWeapon);preparePlayerVehicle(this.playerBike);
  // Keep the physical shadow on the road; the bike and rider render in a separate
  // foreground pass so scenery's depth buffer cannot hide them.
  this.playerBike.group.name='PLAYER_BIKE_3D';this.scene.add(this.playerBike.group);
  this.playerBike.shadow.removeFromParent();this.heroShadowAnchor.add(this.playerBike.shadow);this.scene.add(this.heroShadowAnchor);
  this.player={x:curveAt(0,this.route),z:0,pathId:'main',yaw:headingAt(0,this.route),speed:0,health:100,nitro:100,steer:0,lateralVelocity:0,slideVelocity:0,tractionLoss:0,bank:0,suspension:0,contactJolt:0,slip:0};
  this.playerBike.group.position.set(this.player.x,0,0);this.heroOutOfViewTime=0;this.addHull(this.playerBike,HULLS.bike,0x8fff8b);
  this.syncHeroShadow();
  this.cameraDirector.reset(frameCamera({player:this.player,route:this.route,mode:this.cameraMode,menu:true,reducedMotion:this.reducedMotion}));this.world.update(0,.016,this.lighting);
 }
 removeTrack(){
  if(this.skidMarks){this.skidMarks.dispose();this.skidMarks=null}
  if(this.world){this.world.dispose();this.world=null}
  if(this.playerBike){this.scene.remove(this.playerBike.group);this.scene.remove(this.heroShadowAnchor);disposeVehicle(this.playerBike);this.playerBike.shadow?.geometry?.dispose();this.playerBike.shadow?.material?.dispose();this.playerBike=null;this.heroShadowAnchor.clear()}
  for(const entity of [...this.rivals,...this.traffic,...(this.police?[this.police]:[])]){this.scene.remove(entity.vehicle.group);disposeVehicle(entity.vehicle)}
  for(const pickup of this.pickups){this.scene.remove(pickup.mesh);pickup.mesh.geometry.dispose();pickup.mesh.material.dispose()}
  for(const fx of this.effects){this.scene.remove(fx.mesh);fx.mesh.geometry.dispose();fx.mesh.material.dispose()}
  this.rivals=[];this.traffic=[];this.pickups=[];this.effects=[];this.police=null;this.playerFall=null;
 }
 syncHeroShadow(){
  if(!this.playerBike)return;
  this.heroShadowAnchor.position.copy(this.playerBike.group.position);
  this.heroShadowAnchor.rotation.y=this.playerBike.group.rotation.y;
  // Keep fake shadow on ground even when bike jumps or falls.
  this.heroShadowAnchor.position.y=0;
 }
 addHull(vehicle,hull,color){
  const m=new THREE.Mesh(new THREE.BoxGeometry(hull.halfWidth*2,.12,hull.halfLength*2),new THREE.MeshBasicMaterial({color,wireframe:true,transparent:true,opacity:.8,depthTest:false}));
  m.position.y=.85;m.renderOrder=100;m.visible=this.debugBoxes;vehicle.group.add(m);vehicle.debugHull=m;
 }
 toggleHull(){this.debugBoxes=!this.debugBoxes;for(const vehicle of [this.playerBike,...this.rivals.map(e=>e.vehicle),...this.traffic.map(e=>e.vehicle),this.police?.vehicle])if(vehicle?.debugHull)vehicle.debugHull.visible=this.debugBoxes;this.notify(this.debugBoxes?'HITBOXES VISÍVEIS (H)':'HITBOXES OCULTAS (H)')}
 populate(){
  for(let i=0;i<6;i++){
   const vehicle=createBike(rivalsColors[i],{quality:this.resolvedQuality,model:['street','storm','viper','bulldog'][i%4]});this.configureShadows(vehicle);setBikeWeapon(vehicle,weaponForRival(i));this.scene.add(vehicle.group);this.addHull(vehicle,HULLS.bike,0xffbd4e);
   const style=rivalStyle(i);
   const a={navId:i,pathId:'main',style,vehicle,z:48+i*17,x:0,baseLane:(i%3)-1,laneOffset:(i%3-1)*3.35,speed:nextRacerSpeed(i,this.route),health:2,phase:i*.8,knock:0,knockPower:0,stunTimer:0,attackCD:rand(3,6),attackAge:Infinity,attackSide:0,weaponId:weaponForRival(i),fallen:0,fallSide:0,aggression:aggressionOf(i)*(.80+style.bravery*.32),laneAim:0,guardTimer:0,dodgeTimer:0,dodgeTarget:0,defenseCD:0,defenseAttackId:0,passTimer:0,passOffset:null,contactRoll:0};
   a.pathId=spawnNpcPath({route:this.route,z:a.z,role:'rival',index:i});Object.assign(a,npcRoadPose(this.route,a.z,a.pathId,a.laneOffset));this.rivals.push(a);vehicle.group.position.set(a.x,0,a.z);
  }
  for(let i=0;i<11;i++){
   const vehicle=createCar(carColors[i%carColors.length],{quality:this.resolvedQuality,style:['sedan','van','pickup','sport','sedan','wagon'][i%6]});this.configureShadows(vehicle);this.scene.add(vehicle.group);this.addHull(vehicle,HULLS.car,0x58d9ff);
   const cruiseSpeed=rand(19,33);
   const a={navId:i,pathId:'main',vehicle,z:155+i*160+rand(-30,50),x:0,lane:[-1,0,1][i%3],targetLane:[-1,0,1][i%3],laneOffset:0,speed:cruiseSpeed,cruiseSpeed,phase:rand(0,7),changeCD:rand(.4,2.1)};
   a.laneOffset=a.lane*3.95;a.pathId=spawnNpcPath({route:this.route,z:a.z,role:'traffic',index:i});Object.assign(a,npcRoadPose(this.route,a.z,a.pathId,a.laneOffset));this.traffic.push(a);vehicle.group.position.set(a.x,0,a.z);
  }
  for(let i=0;i<9;i++){
   const type=i%4===2?'repair':'nitro',z=260+i*410;
   const mesh=new THREE.Mesh(new THREE.TorusGeometry(.70,.16,this.resolvedQuality==='low'?6:10,16),new THREE.MeshBasicMaterial({color:type==='nitro'?0x32eafa:0x90ff73}));
   mesh.position.set(curveAt(z,this.route)+([-3.25,0,3.25][i%3]),1.5,z);this.scene.add(mesh);
   this.pickups.push({type,z,x:mesh.position.x,mesh,collected:false,phase:i*.7});
  }
 }
 bindUI(){
  document.querySelectorAll('.route').forEach(btn=>btn.addEventListener('click',()=>{if(this.mode!=='menu')return;this.route=btn.dataset.route;this.gameMode='free';this.renderCampaign();document.querySelectorAll('.route').forEach(b=>b.classList.toggle('selected',b===btn));this.buildTrack()}));
  $('quality').addEventListener('change',e=>{this.quality=e.target.value;this.resize();if(this.mode==='menu')this.buildTrack()});
  $('shadows').addEventListener('change',e=>{this.shadows=e.target.value;if(this.mode==='menu')this.buildTrack()});
  $('lighting').addEventListener('change',e=>{if(e.target.value in LIGHT_MODES){this.lighting=e.target.value;this.world?.update(this.player.z,.2,this.lighting)}});
  $('camera-mode').value=this.cameraMode;
  $('camera-mode').addEventListener('change',e=>this.selectCamera(e.target.value));
  $('camera-toggle').addEventListener('click',()=>this.selectCamera(nextCameraMode(this.cameraMode),true));
  $('sound').addEventListener('change',e=>{this.audio.enabled=e.target.checked;if(e.target.checked)this.audio.start()});
  $('play').addEventListener('click',()=>this.start());$('pause').addEventListener('click',()=>this.pause());$('resume').addEventListener('click',()=>this.resume());
  $('quit').addEventListener('click',()=>this.home());$('replay').addEventListener('click',()=>this.start());$('home').addEventListener('click',()=>this.home());
  $('mute').addEventListener('click',()=>{const enabled=this.audio.toggle();$('mute').textContent=enabled?'♫':'♪̸';$('sound').checked=enabled});
  $('garage-bikes').addEventListener('click',event=>{const button=event.target.closest('button[data-bike]');if(!button||this.mode!=='menu')return;const {garage,status}=garageAction(this.garage,button.dataset.bike);this.garage=garage;saveGarage(this.storage,this.garage);this.renderGarage();if(status==='selected'||status==='purchased'){this.buildTrack();this.notify(status==='purchased'?'MOTO COMPRADA!':'MOTO EQUIPADA!')}else this.notify(status==='funds'?'CRÉDITOS INSUFICIENTES':'MOTO INDISPONÍVEL')});
  $('weapon-list').addEventListener('click',event=>{const button=event.target.closest('[data-weapon]');if(!button||this.mode!=='menu')return;this.selectWeapon(button.dataset.weapon,true)});
  $('free-mode').addEventListener('click',()=>{if(this.mode!=='menu')return;this.gameMode='free';this.renderCampaign()});
  $('campaign-mode').addEventListener('click',()=>{if(this.mode!=='menu')return;this.gameMode='campaign';const available=MISSIONS[Math.min(this.campaign.completed.length,MISSIONS.length-1)];this.selectedMissionId=available.id;this.route=available.route;document.querySelectorAll('.route').forEach(b=>b.classList.toggle('selected',b.dataset.route===this.route));this.buildTrack();this.renderCampaign()});
  $('campaign-missions').addEventListener('click',event=>{const btn=event.target.closest('button[data-mission]');if(!btn||this.mode!=='menu'||!missionUnlocked(this.campaign,btn.dataset.mission))return;this.gameMode='campaign';this.selectedMissionId=btn.dataset.mission;this.route=missionById(this.selectedMissionId).route;document.querySelectorAll('.route').forEach(b=>b.classList.toggle('selected',b.dataset.route===this.route));this.buildTrack();this.renderCampaign()});
 }
 selectCamera(mode,announce=false){
  if(!(mode in CAMERA_MODES))return false;
  this.cameraMode=mode;$('camera-mode').value=mode;
  try{this.storage?.setItem('asfalto-camera-v2',mode)}catch{}
  // Preserve interpolation while switching views during a race.
  if(announce)this.notify(`CÂMERA: ${CAMERA_MODES[mode].name}`);
  return true;
 }
 renderGarage(){
  $('money').textContent=formatMoney(this.garage.money);
  $('garage-selected').textContent=chosenBike(this.garage).name;
  const bikes=BIKES.map(b=>{
   const owned=this.garage.owned.includes(b.id),selected=this.garage.selected===b.id;
   const status=selected?'EQUIPADA':owned?'EQUIPAR':`COMPRAR • ${formatMoney(b.price)} CR`;
   return `<article class="garage-bike${selected?' current':''}"><div class="bike-stripe" style="background:#${b.color.toString(16).padStart(6,'0')}"></div><div><strong>${b.name}</strong><small>${b.subtitle}</small><span>VEL ${Math.round(b.topSpeed*100)} · ARR ${Math.round(b.accel*100)} · CTRL ${Math.round(b.handling*100)} · RES ${Math.round(b.armor*100)}</span></div><button type="button" data-bike="${b.id}" ${selected?'disabled':''}>${status}</button></article>`;
  });
  $('garage-bikes').innerHTML=bikes.join('');
  this.renderWeapons();
 }
 renderCampaign(){
  const campaigning=this.gameMode==='campaign';
  $('free-mode').classList.toggle('selected',!campaigning);
  $('campaign-mode').classList.toggle('selected',campaigning);
  $('campaign-panel').classList.toggle('hidden',!campaigning);
  $('free-track-picker').classList.toggle('hidden',campaigning);
  $('campaign-count').textContent=this.campaign.completed.length+'/'+MISSIONS.length;
  $('campaign-missions').innerHTML=MISSIONS.map(m=>{
   const unlocked=missionUnlocked(this.campaign,m.id),done=this.campaign.completed.includes(m.id);
   const classes=(this.selectedMissionId===m.id?' selected':'')+(unlocked?'':' locked')+(done?' completed':'');
   return '<button type="button" data-mission="'+m.id+'" class="'+classes.trim()+'" '+(!unlocked?'disabled':'')+'><strong>'+m.name+'</strong><small>'+(done?'CONCLUÍDA':unlocked?'DISPONÍVEL':'BLOQUEADA')+' · '+m.bonus.toLocaleString('pt-BR')+' CR</small></button>';
  }).join('');
  const current=missionById(this.selectedMissionId)||MISSIONS[0];
  $('mission-brief').textContent=current.objective+' · '+current.route.toUpperCase()+' · BÔNUS '+current.bonus.toLocaleString('pt-BR')+' CR';
  $('play').innerHTML=campaigning?'INICIAR MISSÃO <span>↗</span>':'INICIAR CORRIDA <span>↗</span>';
 }
 loadWeapon(){try{const value=this.storage?.getItem?.(WEAPON_STORAGE_KEY)||'chain';return WEAPON_DEFS[value]?value:'chain'}catch{return 'chain'}}
 saveWeapon(){try{this.storage?.setItem?.(WEAPON_STORAGE_KEY,this.selectedWeapon)}catch{}}
 get weapon(){return WEAPON_DEFS[this.selectedWeapon]||WEAPON_DEFS.chain}
 renderWeapons(){
  $('weapon-selected').textContent=this.weapon.name;
  $('weapon-hud').textContent=this.weapon.hud;
  document.querySelectorAll('[data-weapon]').forEach(btn=>btn.classList.toggle('selected',btn.dataset.weapon===this.selectedWeapon));
 }
 selectWeapon(id,announce=false){
  if(!WEAPON_DEFS[id])return false;
  this.selectedWeapon=id;this.saveWeapon();this.renderWeapons();
  if(this.playerBike)setBikeWeapon(this.playerBike,id);
  if(announce)this.notify(`${this.weapon.name} EQUIPADA!`);
  return true;
 }
 resize(){const w=Math.max(1,innerWidth),h=Math.max(1,innerHeight);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setPixelRatio(this.renderProfile.pixelRatio);this.renderer.setSize(w,h,false)}
 start(){
  this.mission=this.gameMode==='campaign'?missionById(this.selectedMissionId):null;
  if(this.mission)this.route=this.mission.route;
  this.checkpoints=createCheckpoints();this.branchChoices={};this.missionRun=initialMissionRun(this.mission);this.simAccum=0;
  this.buildTrack();if(this.mission?.cargo)this.world.createMissionMarkers(this.mission);this.populate();this.mode='countdown';this.countTimer=3.3;this.elapsed=0;this.hits=0;this.falls=0;this.escapes=0;
  this.hitCooldown=0;this.hurtCooldown=0;this.activeStrike=null;this.attackPhase=0;this.playerAttackAge=Infinity;this.reactionTimer=0;this.hudTick=0;this.fpsTime=0;this.fpsFrames=0;this.heat=0;this.policeNext=0;this.policeLost=0;this.arrestProgress=0;this.arrestGrace=0;this.policePatrolCount=0;this.earnedLast=0;this.playerFall=null;this.dustClock=0;this.attackSerial=0;this.impactSlow=0;this.rivalCollisions=0;this.input.reset();
  $('menu').classList.add('hidden');$('finish-screen').classList.add('hidden');$('pause-screen').classList.add('hidden');
  $('hud').classList.remove('is-hidden');$('course-tag').textContent=ROUTES[this.route].name;$('race-objective').textContent=this.mission?'MISSÃO · '+this.mission.objective:'CORRIDA LIVRE · 3 CHECKPOINTS OBRIGATÓRIOS';this.renderWeapons();$('mission-live').classList.toggle('hidden',!this.mission);this.setTouch();this.audio.start();this.audio.siren(false);this.updateHUD();
  $('countdown').classList.remove('hidden');$('countdown').textContent='3';$('fall-banner').classList.add('hidden');$('speed-lines').classList.remove('active');$('police-status').classList.add('is-hidden');
 }
 setTouch(){const coarse=matchMedia('(pointer:coarse)').matches||innerWidth<640;$('touch-controls').classList.toggle('is-hidden',!coarse||!['countdown','race'].includes(this.mode))}
 pause(){if(this.mode!=='race')return;this.mode='pause';this.input.reset();$('pause-screen').classList.remove('hidden');$('touch-controls').classList.add('is-hidden');this.audio.update(0,false,false);this.audio.siren(false)}
 resume(){if(this.mode!=='pause')return;this.mode='race';$('pause-screen').classList.add('hidden');this.setTouch()}
 home(){this.mode='menu';this.simAccum=0;this.renderGarage();this.renderCampaign();$('speed-lines').classList.remove('active');$('fall-banner').classList.add('hidden');$('police-status').classList.add('is-hidden');$('menu').classList.remove('hidden');$('pause-screen').classList.add('hidden');$('finish-screen').classList.add('hidden');$('hud').classList.add('is-hidden');$('countdown').classList.add('hidden');$('touch-controls').classList.add('is-hidden');this.audio.update(0,false,false);this.audio.siren(false);this.buildTrack()}

 finish(reason='finish'){
  if(this.mode!=='race')return;
  this.mode='finish';$('speed-lines').classList.remove('active');$('fall-banner').classList.add('hidden');$('finish-screen').classList.remove('hidden');$('touch-controls').classList.add('is-hidden');
  const finished=reason==='finish'&&allCheckpointsPassed(this.checkpoints);
  $('finish-kicker').textContent=reason==='arrest'?'VOCÊ FOI PRESO':reason==='crash'?'FIM DE PISTA':this.mission?'DESAFIO DA GANGUE':'LINHA DE CHEGADA';
  $('finish-headline').innerHTML=reason==='arrest'?'FIM DA<br/><span>FUGA.</span>':reason==='crash'?'MOTO<br/><span>DESTRUÍDA.</span>':this.position()<=3?'PÓDIO<br/><span>CONQUISTADO.</span>':'CORRIDA<br/><span>CONCLUÍDA.</span>';
  const payout=awardRace(this.garage,{place:this.position(),finished,hits:this.hits,escapes:this.escapes,z:reason==='arrest'?0:this.player.z});
  this.garage=payout.garage;let bonus=0;
  $('mission-result').classList.add('hidden');$('mission-result').classList.remove('success');
  if(this.mission){
   const outcome=completeMission(this.campaign,this.mission.id,{finished,checkpointsValid:allCheckpointsPassed(this.checkpoints),place:this.position(),hits:this.hits,falls:this.falls,escapes:this.escapes,health:this.player.health,time:this.elapsed,visitedForks:this.missionRun?.visitedForks,cargoDelivered:this.missionRun?.cargoDelivered});
   this.campaign=outcome.campaign;saveCampaign(this.storage,this.campaign);bonus=outcome.bonus;
   $('mission-result').classList.remove('hidden');
   $('mission-result').classList.toggle('success',outcome.success);
   $('mission-result').textContent=outcome.success?(outcome.replay?'MISSÃO REJOGADA · SEM BÔNUS DUPLICADO':'MISSÃO CONCLUÍDA! NOVO DESAFIO DESBLOQUEADO.'):('MISSÃO NÃO CONCLUÍDA · '+(reason==='arrest'?'Você foi preso. ':'')+outcome.failures.join(' '));
   if(outcome.success)$('finish-headline').innerHTML='MISSÃO<br/><span>CONCLUÍDA.</span>';
  }
  this.garage.money=Math.min(99999999,this.garage.money+bonus);
  this.earnedLast=payout.amount+bonus;saveGarage(this.storage,this.garage);
  $('final-money').textContent='+ '+formatMoney(this.earnedLast)+' CR';$('final-wallet').textContent='SALDO: '+formatMoney(this.garage.money)+' CR';
  $('final-place').textContent=this.position()+'º';$('final-time').textContent=formatTime(this.elapsed);$('final-hits').textContent=String(this.hits);$('final-falls').textContent=String(this.falls);$('final-escapes').textContent=String(this.escapes);
  this.audio.tone(reason==='crash'||reason==='arrest'?120:780,.5,'sawtooth',.1);this.audio.update(0,false,false);this.audio.siren(false);
 }
 position(){const z=Math.min(this.player.z,nextCheckpoint(this.checkpoints)??RACE_LENGTH);return rankOf(z,this.rivals)}
 notify(message){$('toast').textContent=message;$('toast').classList.add('visible');this.toastTimer=1.45}
 hit(damage=15,impact=false,relativeSpeed=0,side=1){
  if(this.hurtCooldown>0||this.playerFall)return false;
  const speedAtImpact=this.player.speed;
  this.player.health=clamp(this.player.health-damage/(chosenBike(this.garage).armor||1),0,100);this.player.speed*=impact?.75:.89;this.hurtCooldown=1.22;
  this.flashTimer=.34;this.cameraShake=.38;this.reactionTimer=.36;this.player.contactJolt=Math.max(this.player.contactJolt||0,impact?1:.48);this.impactSlow=impact?.19:.08;this.audio.hit();this.input.rumble(impact?.72:.36,impact?220:120);this.spawnSparks(this.player.x,1.1,this.player.z+1.5,impact?0xffcc70:0xff5b56);this.spawnImpactRing(this.player.x,1.4,this.player.z+1,impact?0xffb878:0xff5862);
  if(this.player.health<=0){this.finish('crash');return true}
  if(impact&&dangerousImpact(speedAtImpact,relativeSpeed,damage)){this.knockDownPlayer(side);return true}
  this.notify(impact?'BATIDA!':'VOCÊ LEVOU UM GOLPE!');return true;
 }
 knockDownPlayer(side=1){
  this.falls++;this.playerFall={remaining:FALL_TIME,total:FALL_TIME,side:Math.sign(side)||1};
  this.player.speed=0;this.player.lateralVelocity=0;this.player.contactJolt=1.25;this.activeStrike=null;this.attackPhase=0;this.playerAttackAge=Infinity;
  this.hurtCooldown=FALL_TIME+RECOVERY_GRACE;
  setCrashRider(this.playerBike,true);this.spawnSparks(this.player.x,.65,this.player.z,0xffca7a);this.spawnDust(this.player.x,this.player.z);
  $('fall-banner').classList.remove('hidden');this.notify('QUEDA! VOLTE À MOTO');this.audio.tone(115,.48,'sawtooth',.09);
 }
 recoverPlayer(){
  const p=this.player;
  // Choose the least occupied lane, then back up if every lane is crowded.
  const others=[...this.rivals,...this.traffic,...(this.police?[this.police]:[])].filter(e=>!(e.fallen>0));
  const center=roadCenter(this.route,p.z,p.pathId||'main');
  const lanes=[-4.4,0,4.4].sort((a,b)=>Math.abs((p.x-center)-a)-Math.abs((p.x-center)-b));
  const lane=lanes.find(offset=>others.every(e=>Math.abs(e.z-p.z)>8||Math.abs(e.x-center-offset)>2.6));
  if(lane===undefined)p.z=Math.max(0,p.z-12);
  p.x=center+(lane??lanes[0]);p.speed=17;p.lateralVelocity=0;p.slideVelocity=0;p.tractionLoss=0;p.steer=0;p.bank=0;p.contactJolt=0;p.suspension=0;
  this.playerFall=null;this.arrestGrace=RECOVERY_GRACE;setCrashRider(this.playerBike,false);ensurePlayerVehicle(this.playerBike,false);this.playerBike.lean.rotation.set(0,0,0);this.playerBike.rider.rotation.set(0,0,0);this.heroOutOfViewTime=0;$('fall-banner').classList.add('hidden');this.notify('DE VOLTA À CORRIDA!');
 }

 spawnImpactRing(x,y,z,color=0xffef9c){
  const low=this.resolvedQuality==='low';
  const mesh=new THREE.Mesh(new THREE.TorusGeometry(.42,.04,low?5:8,low?12:24),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9,depthWrite:false,side:THREE.DoubleSide}));
  mesh.position.set(x,y,z);mesh.renderOrder=5;this.scene.add(mesh);
  this.effects.push({mesh,life:.33,maxLife:.33,kind:'ring',vx:0,vy:0,vz:0});
 }
 spawnSparks(x,y,z,color=0xffef9c){const n=this.resolvedQuality==='low'?5:9;for(let i=0;i<n;i++){
  const mesh=new THREE.Mesh(new THREE.TetrahedronGeometry(.075,0),new THREE.MeshBasicMaterial({color}));
  mesh.position.set(x+rand(-.35,.35),y+rand(-.15,.15),z+rand(-.2,.2));this.scene.add(mesh);
  this.effects.push({mesh,life:rand(.25,.65),maxLife:.65,vx:rand(-7,7),vy:rand(2,9),vz:rand(-5,5)});
 }}
 attack(side){if(this.hitCooldown>0||this.mode!=='race'||this.playerFall)return;this.hitCooldown=this.weapon.cooldown;this.attackPhase=1;this.attackSide=side;this.playerAttackAge=0;this.activeStrike={id:++this.attackSerial,side,age:0,done:false,weapon:this.weapon};this.audio.weaponSwing?.(this.weapon.id)}
 updateCombat(dt){
  if(!this.activeStrike)return;
  const strike=this.activeStrike;strike.age+=dt;
  if(!strike.done&&strikeIsActive(strike.age)){
   let target=null,closest=99;
   for(const e of [...this.rivals,...this.traffic,...(this.police?[this.police]:[])]){
    if(e.fallen>0||Math.abs(e.z-this.player.z)>5)continue;
    const kind=['police','car'].includes(e.vehicle.kind)?'car':'bike';
    const metric=strikeCandidate({...this.player,yaw:roadHeading(this.route,this.player.z,this.player.pathId)},e,strike.side,kind,strike.weapon);
    if(metric!==null&&metric<closest){closest=metric;target=e}
   }
   if(target){
    strike.done=true;
    const weapon=strike.weapon||this.weapon;
    const guarding=target.guardTimer>0&&'health' in target;
    const blockedFactor=guardDamage(1,guarding);
    target.knockPower=-strike.side*weapon.knock*blockedFactor;
    target.knock=guarding?.21:.68;
    target.speed=Math.max(8,target.speed-(6+weapon.damage*4)*blockedFactor);
    target.hurtAnim=guarding?.13:.36;this.heat=updateHeat(this.heat,0,{offense:true});
    this.spawnSparks(target.x,1.5,target.z,guarding?0x76dfff:weapon.id==='club'?0xff9f7a:weapon.id==='pipe'?0xc8e7ff:0xffe681);
    this.spawnImpactRing(target.x,1.65,target.z,guarding?0x76dfff:weapon.id==='club'?0xffb977:0x9cecff);
    this.cameraShake=Math.max(this.cameraShake,guarding?.08:.17);this.input.rumble(guarding?.14:.34,115);
    if(guarding){target.guardTimer=0;this.notify('RIVAL BLOQUEOU O GOLPE!')}
    else if(target.vehicle.kind==='policeBike'){target.stunTimer=weapon.stun;target.fallen=1.3+weapon.fall*.45;target.fallSide=strike.side;setCrashRider(target.vehicle,true);this.notify(`${weapon.name} DERRUBOU O POLICIAL!`)}
    else if('health' in target){target.health-=weapon.id==='club'?2:1;if(target.health<=0||weapon.fall>1.8){target.health=2;target.speed=0;target.stunTimer=2.1+weapon.stun*.5;target.fallen=1.7+weapon.fall*.42;target.fallSide=strike.side;setCrashRider(target.vehicle,true);this.hits++;this.notify(`RIVAL DERRUBADO COM ${weapon.name}! +1`)}
     else this.notify(`${weapon.name} ACERTOU EM CHEIO!`)}
    else {this.notify(target.vehicle.kind==='police'?`${weapon.name} CONTRA A POLÍCIA!`:`${weapon.name} AMASSOU O VEÍCULO!`)}
    this.audio.weaponImpact?.(weapon.id);
   }
  }
  if(strike.age>.42)this.activeStrike=null;
 }
 updateCountdown(dt){this.countTimer-=dt;const txt=this.countTimer>2.2?'3':this.countTimer>1.2?'2':this.countTimer>.2?'1':'VAI!';if($('countdown').textContent!==txt){$('countdown').textContent=txt;this.audio.tone(txt==='VAI!'?770:430,.14,'square',.04)}if(this.countTimer<=-.52){this.mode='race';$('countdown').classList.add('hidden');this.audio.start();if(this.mission?.policeStart){this.spawnPolice();this.heat=85}}}
 simulate(dt){
  if(this.input.consumePause()){this.pause();return}
  if(this.input.consumeDebug())this.toggleHull();
  const weaponChange=this.input.consumeWeapon(this.selectedWeapon);if(weaponChange)this.selectWeapon(weaponChange,true);
  this.elapsed+=dt;const p=this.player;
  this.heat=updateHeat(this.heat,dt,{policeNear:!!this.police&&Math.abs(this.police.z-p.z)<75});
  if(this.playerFall){
   this.playerFall=nextFall(this.playerFall,dt);
   this.hurtCooldown=Math.max(0,this.hurtCooldown-dt);this.updateAI(dt);this.updateTraffic(dt);this.updatePolice(dt);if(this.mode!=='race')return;this.resolveRivalContacts();this.resolveTrafficContacts();this.updateEffects(dt);this.updatePlayerModel(dt,false);
   $('speed-lines').classList.remove('active');this.world.update(p.z,dt,this.lighting);this.updateHUD();this.audio.update(0,false,false);this.audio.siren(!!this.police,this.police?.z-p.z||0);
   $('fall-progress').style.width=`${Math.round(100*(1-this.playerFall.remaining/this.playerFall.total))}%`;
   if(this.playerFall.remaining<=0)this.recoverPlayer();
   if(this.toastTimer>0){this.toastTimer-=dt;if(this.toastTimer<=0)$('toast').classList.remove('visible')}
   this.flashTimer=Math.max(0,this.flashTimer-dt);$('hit-flash').style.opacity=String(clamp(this.flashTimer*1.9,0,.65));
   return;
  }
  const hits=this.input.consumeHits();if(hits.left)this.attack(-1);if(hits.right)this.attack(1);
  this.hitCooldown=Math.max(0,this.hitCooldown-dt);this.hurtCooldown=Math.max(0,this.hurtCooldown-dt);this.reactionTimer=Math.max(0,this.reactionTimer-dt);this.playerAttackAge+=dt;this.attackPhase=Math.max(0,this.attackPhase-dt*2.5);
  const steer=this.input.steer,accel=this.input.accelerating,brake=this.input.braking;
  const movement=moveBike(p,{steer,accel,brake,boost:this.input.boosting},dt,this.route,chosenBike(this.garage));
  p.yaw=roadHeading(this.route,p.z,p.pathId)-p.steer*.105;
  const branch=activeFork(this.route,p.z);
  if(branch&&p.pathId===branch.id&&Math.abs(forkOffset(branch,p.z))>12&&!this.branchChoices[branch.id]){this.branchChoices[branch.id]=true;this.notify('ROTA ALTERNATIVA: '+branch.name)}
  if(this.mission){const progress=advanceMissionRun(this.mission,this.missionRun,p,movement.old.z);this.missionRun=progress.run;for(const event of progress.events)this.notify(event);if(progress.events.some(event=>event.includes('ENCOMENDA')||event.includes('ENTREGA')))this.world.setMissionMarkerProgress(this.missionRun)}
  const oldGateCount=this.checkpoints.passed;
  this.checkpoints=advanceCheckpoints(this.checkpoints,movement.old.z,p.z,p.x-curveAt(p.z,this.route),ROAD_HALF);
  if(this.checkpoints.passed>oldGateCount)this.notify('CHECKPOINT '+this.checkpoints.passed+'/'+this.checkpoints.gates.length+' VALIDADO');
  const missed=missedCheckpoint(this.checkpoints,p.z);
  if(missed!==null){p.z=missed-22;p.x=curveAt(p.z,this.route);p.speed=Math.min(p.speed,16);p.lateralVelocity=0;p.slideVelocity=0;p.bank=0;this.notify('CHECKPOINT PERDIDO · RETORNANDO AO POSTO')};
  if(movement.offRoad)this.cameraShake=Math.max(this.cameraShake,.045);
  if(movement.railImpact&&this.hurtCooldown<=0)this.hit(11,true,0);
  this.dustClock-=dt;if(movement.offRoad&&p.speed>12&&this.dustClock<=0){this.dustClock=.16;this.spawnDust(p.x,p.z)}
  this.updateAI(dt);this.updateTraffic(dt);this.updatePolice(dt);if(this.mode!=='race')return;this.resolveRivalContacts();this.resolveTrafficContacts();this.resolveContacts(movement.old);
  const skid=skidIntensity({speed:p.speed,steer:p.steer,slip:p.slip,brake,offRoad:movement.offRoad});
  if(skid>.17&&this.skidMarks){this.skidMarks.add(p.x,p.z,p.yaw,skid);if(this.dustClock<=0&&movement.offRoad)this.spawnDust(p.x,p.z)}
  this.updateCombat(dt);this.updatePickups(dt);this.updateEffects(dt);this.updatePlayerModel(dt,movement.boosted);
  if(this.toastTimer>0){this.toastTimer-=dt;if(this.toastTimer<=0)$('toast').classList.remove('visible')}
  this.flashTimer=Math.max(0,this.flashTimer-dt);$('hit-flash').style.opacity=String(clamp(this.flashTimer*1.9,0,.65));
  $('speed-lines').classList.toggle('active',movement.boosted&&p.speed>32);this.audio.update(p.speed,movement.boosted,true);this.audio.siren(!!this.police&&Math.abs(this.police.z-p.z)<105,this.police?.z-p.z||0);this.world.update(p.z,dt,this.lighting);this.hudTick+=dt;if(this.hudTick>.065){this.hudTick=0;this.updateHUD()}if(p.z>=RACE_LENGTH){if(!allCheckpointsPassed(this.checkpoints)){const retry=nextCheckpoint(this.checkpoints);p.z=Math.max(0,(retry??RACE_LENGTH)-22);p.x=curveAt(p.z,this.route);p.speed=Math.min(p.speed,16);this.notify('CHECKPOINT PERDIDO · RETORNANDO AO POSTO')}else{this.updateHUD();this.finish()}}
 }
 updateAI(dt){
  for(let i=0;i<this.rivals.length;i++){
   const e=this.rivals[i];e.vehicle.group.visible=Math.abs(e.z-this.player.z)<390;e.old={x:e.x,z:e.z,yaw:e.yaw};e.phase+=dt;
   if(e.fallen>0){
    e.fallen=Math.max(0,e.fallen-dt);e.speed=0;
    const pose=crashPose({remaining:e.fallen,total:2.3,side:e.fallSide});
    e.vehicle.lean.rotation.z=pose.bikeTilt;e.vehicle.lean.rotation.x=pose.bikePitch;e.vehicle.lean.rotation.y=pose.bikeYaw;e.vehicle.group.position.set(e.x,pose.lift,e.z);
    if(e.vehicle.crashRider){e.vehicle.crashRider.position.set(pose.riderOffsetX,pose.riderLift,pose.riderOffsetZ);e.vehicle.crashRider.rotation.set(pose.riderPitch,pose.riderSpin,pose.riderRoll)}
    if(e.fallen===0){e.speed=16;e.stunTimer=1.1;e.knockPower=0;e.vehicle.lean.rotation.set(0,0,0);e.vehicle.group.position.y=0;setCrashRider(e.vehicle,false)}
    continue;
   }
   e.z+=e.speed*dt;e.pathId=npcRoadChoice({route:this.route,z:e.z,oldZ:e.old.z,pathId:e.pathId,role:'rival',index:e.navId});e.knock=Math.max(0,e.knock-dt);e.stunTimer=Math.max(0,e.stunTimer-dt);e.contactRoll=Math.max(0,(e.contactRoll||0)-dt*1.8);
   e.guardTimer=Math.max(0,(e.guardTimer||0)-dt);e.dodgeTimer=Math.max(0,(e.dodgeTimer||0)-dt);
   e.defenseCD=Math.max(0,(e.defenseCD||0)-dt);
   const defense=chooseRivalDefense(e,this.player,this.activeStrike);
   if(defense!=='none'){
    e.defenseAttackId=this.activeStrike.id;
    e.defenseCD=2.3+(.95-e.aggression)*2;
    if(defense==='guard'){e.guardTimer=.48}
    else {e.dodgeTimer=.57;e.dodgeTarget=dodgeOffset(e.laneOffset,e.x-this.player.x)}
   }
   // Road-local lane evaluation: flank the player without driving through cars or teammates.
   const others=[...this.traffic,...this.rivals,...(this.police?[this.police]:[])].filter(o=>o!==e&&sameNpcRoad(e,o)&&(o.fallen??0)<=0&&Math.abs(o.z-e.z)<75).map(o=>({z:o.z,offset:o.x-roadCenter(this.route,o.z,o.pathId)}));
   const desired=pickRivalLane({currentOffset:e.laneOffset,preferredOffset:e.style?.preferredLane??e.baseLane*3.35,z:e.z,speed:e.speed,playerZ:this.playerFall||!sameNpcRoad(e,this.player)?-9999:this.player.z,playerOffset:this.player.x-roadCenter(this.route,this.player.z,this.player.pathId),aggression:e.aggression,obstacles:others});
   // Commit briefly to passing a slower vehicle, preventing left-right lane oscillation.
   e.passTimer=Math.max(0,(e.passTimer||0)-dt);
   if(e.passTimer===0){e.passOffset=chooseOvertake(e,[...this.rivals,...this.traffic,...(this.police?[this.police]:[])],this.route);if(e.passOffset!==null)e.passTimer=.75+(e.style?.passing??1)*.3}
   const target=e.dodgeTimer>0?e.dodgeTarget:(e.passTimer>0&&e.passOffset!==null?e.passOffset:desired)+Math.sin(e.phase*.46+i)*.12+(e.knockPower||0)*(e.knock/.63);
   e.laneOffset=approach(e.laneOffset,clamp(target,-5.4,5.4),dt*rivalLaneRate(e.style||rivalStyle(i),{stunned:e.stunTimer>0,dodging:e.dodgeTimer>0}));
   e.x=roadCenter(this.route,e.z,e.pathId)+e.laneOffset;
   const base=nextRacerSpeed(i,this.route);const curveDelta=Math.abs(roadHeading(this.route,e.z+28,e.pathId)-roadHeading(this.route,e.z,e.pathId));const corner=clamp(curveDelta/.42,0,1);
   const styled=rivalPace(e.style||rivalStyle(i),base,corner);
   const chase=sameNpcRoad(e,this.player)&&this.player.z-e.z>0&&this.player.z-e.z<95?Math.min(4,e.aggression*5):0;
   e.speed=approach(e.speed,e.stunTimer>0?Math.max(15,styled*.56):styled+chase,dt*(2.8+(e.style?.agility||1)*.9));
   e.yaw=roadHeading(this.route,e.z,e.pathId)+clamp((e.laneOffset-(e.old.x-roadCenter(this.route,e.old.z,e.pathId)))*.12,-.24,.24);
   e.vehicle.group.position.set(e.x,0,e.z);e.vehicle.group.rotation.y=lerpAngle(e.vehicle.group.rotation.y,e.yaw,Math.min(1,dt*9));
   const lateralChange=e.laneOffset-(e.old.x-roadCenter(this.route,e.old.z,e.pathId));
   e.vehicle.lean.rotation.z=e.stunTimer>0?Math.sin(e.stunTimer*4)*.64:clamp(lateralChange*1.8,-.28,.28)+Math.sin(e.phase*1.5)*.024+(e.contactRoll||0)*Math.sin(e.phase*15)*.13;
   for(const w of e.vehicle.wheels||[])w.rotation.x+=e.speed*dt/.53;
   e.attackCD-=dt;
   e.attackAge+=dt;e.hurtAnim=Math.max(0,(e.hurtAnim||0)-dt);
   const weapon=weaponById(e.weaponId);
   if(canEnemyStrike(e,this.player,weapon,{playerDown:!!this.playerFall})){
    const side=sideTowardPlayer(e.x,this.player.x);
    const inReach=strikeCandidate({...e,yaw:e.yaw},this.player,side,'bike',weapon)!==null;
    if(inReach){
     e.attackCD=rivalAttackCooldown(e.style||rivalStyle(i),e.aggression)*rand(.85,1.12);e.attackAge=0;e.attackSide=side;
     const damage=enemyDamage(weapon,e.aggression);
     if(this.hit(damage,false,0,side))this.notify(`RIVAL ATACOU COM ${weapon.name}!`);
    }
   }
   if(e.vehicle.group.visible)animateRider(e.vehicle,{dt,time:e.phase,attackAge:e.attackAge,attackSide:e.attackSide,speed:e.speed,steer:clamp(lateralChange*2.1,-1,1),hurt:reactionAmount(e.hurtAnim),guard:e.guardTimer>0?1:0});
  }
 }
 resolveRivalContacts(){
  // Only the six racing bikes interact; traffic and police retain their existing solver.
  for(let i=0;i<this.rivals.length;i++)for(let j=i+1;j<this.rivals.length;j++){
   const a=this.rivals[i],b=this.rivals[j];
   const hit=resolveRivalPair(a,b,this.route);
   if(!hit)continue;
   // Reposition immediately: same-frame hitboxes, rider models and future AI read the corrected state.
   for(const e of [a,b]){e.vehicle.group.position.set(e.x,0,e.z);e.yaw=roadHeading(this.route,e.z,e.pathId);e.vehicle.group.rotation.y=e.yaw}
   if((a.contactFX??-Infinity)<this.elapsed-.38&&(b.contactFX??-Infinity)<this.elapsed-.38){
    a.contactFX=b.contactFX=this.elapsed;this.rivalCollisions++;
    const x=(a.x+b.x)*.5,z=(a.z+b.z)*.5;
    if(this.effects.length<95)this.spawnSparks(x,1.0,z,hit.intensity>.55?0xffd290:0x88d7eb);
    if(hit.intensity>.70&&this.resolvedQuality!=='low')this.spawnImpactRing(x,1.0,z,0xffa87a);
   }
  }
 }
 updateTraffic(dt){
  const obstacles=[...this.traffic,...this.rivals,...(this.police?[this.police]:[])];
  for(const e of this.traffic){
   e.vehicle.group.visible=Math.abs(e.z-this.player.z)<390;
   e.old={x:e.x,z:e.z,yaw:e.yaw};
   e.changeCD=Math.max(0,(e.changeCD||0)-dt);
   const planned=planTraffic(e,obstacles.filter(o=>sameNpcRoad(e,o)),dt,{allowChange:e.changeCD===0});
   if(planned.targetLane!==e.targetLane){e.changeCD=2.2+rand(0,.6)}
   e.targetLane=planned.targetLane;
   e.speed=planned.speed;e.laneOffset=planned.offset;
   e.z+=e.speed*dt;
   e.pathId=npcRoadChoice({route:this.route,z:e.z,oldZ:e.old.z,pathId:e.pathId,role:'traffic',index:e.navId});
   e.x=roadCenter(this.route,e.z,e.pathId)+e.laneOffset;
   e.yaw=roadHeading(this.route,e.z,e.pathId)+clamp((e.laneOffset-(e.old.x-roadCenter(this.route,e.old.z,e.pathId)))*.18,-.17,.17);
   e.vehicle.group.position.set(e.x,0,e.z);e.vehicle.group.rotation.y=lerpAngle(e.vehicle.group.rotation.y,e.yaw,Math.min(1,dt*7));
   if(e.knock>0){e.x+=e.knockPower*e.knock*.55;e.knock=Math.max(0,e.knock-dt);e.vehicle.group.position.x=e.x}
   for(const w of e.vehicle.wheels||[])w.rotation.x+=e.speed*dt/.43;
   if(e.z<this.player.z-70){
    e.z=this.player.z+rand(550,980);
    const otherCars=this.traffic.filter(o=>o!==e);
    const lane=[-1,0,1].find(l=>otherCars.every(o=>Math.abs(o.z-e.z)>24||Math.abs((o.laneOffset||0)-l*3.95)>2))??[-1,0,1][Math.floor(Math.random()*3)];
    e.lane=e.targetLane=lane;e.laneOffset=lane*3.95;e.speed=e.cruiseSpeed;
    e.changeCD=2;e.pathId=spawnNpcPath({route:this.route,z:e.z,role:'traffic',index:e.navId});Object.assign(e,npcRoadPose(this.route,e.z,e.pathId,e.laneOffset));
    e.old={x:e.x,z:e.z,yaw:e.yaw};e.vehicle.group.position.set(e.x,0,e.z);
   }
  }
 }
 resolveTrafficContacts(){
  // Cars now exchange contact with other cars and rival bikes; the player solver is separate.
  const agents=[...this.traffic,...this.rivals];
  for(let i=0;i<agents.length;i++)for(let j=i+1;j<agents.length;j++){
   const a=agents[i],b=agents[j];
   if(a.vehicle.kind==='bike'&&b.vehicle.kind==='bike')continue; // already solved by resolveRivalContacts
   if(Math.abs(a.z-b.z)>11||Math.abs(a.x-b.x)>5)continue;
   const contact=separateNpcPair(a,b,this.route);
   if(!contact)continue;
   this.npcContacts++;
   for(const e of [a,b]){
    e.yaw=roadHeading(this.route,e.z,e.pathId);
    e.vehicle.group.position.set(e.x,0,e.z);
    e.vehicle.group.rotation.y=e.yaw;
   }
   if(this.effects.length<65&&(a.contactFX??-Infinity)<this.elapsed-.6&&(b.contactFX??-Infinity)<this.elapsed-.6){
    a.contactFX=b.contactFX=this.elapsed;
    this.spawnSparks((a.x+b.x)*.5,1.1,(a.z+b.z)*.5,0xfbc184);
   }
  }
 }
 resolveContacts(playerOld){
  if(this.mode!=='race')return;
  const p=this.player;
  const oldA={...playerOld,...HULLS.bike};const newA={...p,...HULLS.bike};
  let closest=null;
  for(const e of [...this.rivals,...this.traffic,...(this.police?[this.police]:[])]){
   if(e.fallen>0)continue;
   // Cheap broad phase before swept oriented-box overlap.
   if(Math.min(e.old.z,e.z)>Math.max(playerOld.z,p.z)+5||Math.max(e.old.z,e.z)<Math.min(playerOld.z,p.z)-5)continue;
   if(Math.min(e.old.x,e.x)>Math.max(playerOld.x,p.x)+3||Math.max(e.old.x,e.x)<Math.min(playerOld.x,p.x)-3)continue;
   const hull=['car','police'].includes(e.vehicle.kind)?HULLS.car:HULLS.bike;
   const time=sweptVehicleHit(oldA,newA,{...e.old,...hull},{...e,...hull});
   if(time!==null&&(!closest||time<closest.time))closest={e,time,hull};
  }
  if(!closest)return;
  const {e,time,hull}=closest;
  // Solve at end-of-step (where bodies actually are), then separate and bounce.
  const atPlayer=atTime(playerOld,p,time),atOther=atTime(e.old,e,time);
  const contact=contactResponse(p,e,HULLS.bike,hull,{contactDx:atPlayer.x-atOther.x,contactDz:atPlayer.z-atOther.z});
  p.z=contact.z;
  // Collision displacement stays relative to the road being driven, including side routes.
  const roadX=roadCenter(this.route,p.z,p.pathId);
  p.x=clamp(contact.x,roadX-ROAD_RAIL,roadX+ROAD_RAIL);
  p.speed=contact.speed;p.lateralVelocity=contact.lateralVelocity;p.slideVelocity=(p.slideVelocity||0)*.4;
  p.contactJolt=Math.max(p.contactJolt||0,Math.min(1.4,contact.intensity*1.3));
  p.suspension=Math.max(p.suspension||0,Math.min(.20,contact.intensity*.19));
  p.yaw=roadHeading(this.route,p.z,p.pathId)-p.steer*.105;
  if(contact.intensity>.30){
   if(this.skidMarks)this.skidMarks.add(p.x,p.z,p.yaw,contact.intensity,true);
   this.cameraShake=Math.max(this.cameraShake,.12+contact.intensity*.18);
   if(e.vehicle.kind==='bike'){
    e.knockPower=(e.x-p.x>0?1:-1)*Math.max(1,contact.intensity*2.5);
    e.knock=Math.max(e.knock||0,.28);
    e.hurtAnim=Math.max(e.hurtAnim||0,.22);
   }
  }
  if(this.hurtCooldown<=0){
   const base=e.vehicle.kind==='police'?22:e.vehicle.kind==='car'?19:13;
   this.hit(Math.round(base*contact.damageFactor),true,contact.relativeSpeed,contact.normal);
  }
 }
 spawnPolice(){
  if(this.police)return;
  const isMoto=(this.policePatrolCount++%2===0);
  const vehicle=isMoto?createPoliceBike({quality:this.resolvedQuality}):createPoliceCar({quality:this.resolvedQuality});this.configureShadows(vehicle);this.scene.add(vehicle.group);this.addHull(vehicle,isMoto?HULLS.bike:HULLS.car,0xff345f);
  const z=this.player.z-54,policePath=spawnNpcPath({route:this.route,z,role:'police',playerPath:this.player.pathId,playerZ:this.player.z});
  const laneOffset=clamp((this.player.x-roadCenter(this.route,this.player.z,this.player.pathId))+3.1,-4.9,4.9);
  const e={vehicle,z,pathId:policePath,x:roadCenter(this.route,z,policePath)+laneOffset,yaw:roadHeading(this.route,z,policePath),speed:Math.max(38,this.player.speed*.86),laneOffset,phase:0,attackAge:Infinity,attackSide:0,weaponId:'baton'};if(isMoto)setBikeWeapon(vehicle,'baton');
  e.old={x:e.x,z:e.z,yaw:e.yaw};vehicle.group.position.set(e.x,0,z);this.police=e;this.policeLost=0;this.arrestProgress=0;
  this.heat=Math.max(this.heat,35);this.notify(isMoto?'MOTO POLICIAL NA SUA COLA!':'VIATURA NA SUA COLA!');this.audio.tone(550,.24,'square',.075);
 }
 dismissPolice(){
  if(!this.police)return;
  this.scene.remove(this.police.vehicle.group);disposeVehicle(this.police.vehicle);this.police=null;
  this.escapes++;this.policeNext=this.elapsed+32;this.policeLost=0;this.arrestProgress=0;this.heat=0;this.audio.siren(false);this.notify('VOCÊ DESPISTOU A POLÍCIA!');
 }
 updatePolice(dt){
  this.arrestGrace=Math.max(0,this.arrestGrace-dt);
  if(!this.police){this.arrestProgress=0;if(pursuitTrigger({elapsed:this.elapsed,heat:this.heat,alreadyDeployed:false,nextAllowed:this.policeNext,playerZ:this.player.z}))this.spawnPolice();return}
  const e=this.police,p=this.player;e.old={x:e.x,z:e.z,yaw:e.yaw};
  // A fallen officer must not move forward under pursuit physics.
  if(e.fallen>0){
   e.fallen=Math.max(0,e.fallen-dt);e.speed=0;
   const pose=crashPose({remaining:e.fallen,total:1.45,side:e.fallSide});
   e.vehicle.group.position.set(e.x,pose.lift,e.z);e.vehicle.lean.rotation.z=pose.bikeTilt;
   if(e.vehicle.crashRider){e.vehicle.crashRider.position.set(pose.riderOffsetX,pose.riderLift,pose.riderOffsetZ);e.vehicle.crashRider.rotation.set(pose.riderPitch,pose.riderSpin,pose.riderRoll)}
   if(e.fallen===0){setCrashRider(e.vehicle,false);e.vehicle.lean.rotation.set(0,0,0);this.dismissPolice()}
   return;
  }
  const updated=pursuitStep(e,p,dt,curveAt(e.z,this.route),curveAt(p.z,this.route),this.heat);
  const corner=policeCurveTarget(e,p,this.route);
  // Ease down into bends; accelerate back as the curve straightens.
  const canBoxIn=p.speed<12&&!this.playerFall&&Math.abs(p.z-e.z)<12&&Math.abs(p.x-e.x)<3.8;
  const targetCopSpeed=canBoxIn?Math.max(0,p.speed-2):Math.min(updated.speed,corner.curveLimit);
  e.speed=approach(e.speed,targetCopSpeed,dt*(canBoxIn?46:corner.severity>.30?15:12));
  e.z+=e.speed*dt;
  if(canBoxIn)e.z=Math.min(e.z,p.z+2.4);
  e.pathId=npcRoadChoice({route:this.route,z:e.z,oldZ:e.old.z,pathId:e.pathId,role:'police',playerPath:p.pathId,playerZ:p.z});
  e.laneOffset=approach(e.laneOffset,corner.desiredOffset,dt*(corner.severity>.4?3.6:4.3));
  e.knock=Math.max(0,(e.knock||0)-dt);e.laneOffset=clamp(e.laneOffset+(e.knockPower||0)*e.knock*dt*2.0,-5.4,5.4);
  e.x=roadCenter(this.route,e.z,e.pathId)+e.laneOffset;e.yaw=roadHeading(this.route,e.z,e.pathId);
  e.vehicle.group.position.set(e.x,0,e.z);e.vehicle.group.rotation.y=lerpAngle(e.vehicle.group.rotation.y,e.yaw,Math.min(1,dt*7));
  if(e.vehicle.kind==='policeBike'){e.vehicle.lean.rotation.z=lerp(e.vehicle.lean.rotation.z,clamp((updated.laneOffset-(e.old.x-roadCenter(this.route,e.old.z,e.pathId)))*.12,-.22,.22),Math.min(1,dt*9));e.attackCD=(e.attackCD??2.5)-dt;e.attackAge+=dt;const weapon=WEAPONS.baton;if(canEnemyStrike(e,p,weapon,{playerDown:!!this.playerFall})&&strikeCandidate({...e,yaw:e.yaw},p,sideTowardPlayer(e.x,p.x),'bike',weapon)!==null){e.attackCD=3.6;e.attackAge=0;e.attackSide=sideTowardPlayer(e.x,p.x);if(this.hit(enemyDamage(weapon,.85),false,0,e.attackSide))this.notify('POLICIAL ATACOU COM CASSETETE!')}if(e.vehicle.group.visible)animateRider(e.vehicle,{dt,time:this.elapsed,attackAge:e.attackAge,attackSide:e.attackSide,speed:e.speed})}
  for(const wheel of e.vehicle.wheels)wheel.rotation.x+=e.speed*dt/.43;
  const flash=Math.sin(this.elapsed*20)>0;
  e.vehicle.lights[0].material.emissiveIntensity=flash?4.5:.17;
  e.vehicle.lights[1].material.emissiveIntensity=flash?.17:4.5;
  this.policeLost=(p.z-e.z>125)?this.policeLost+dt:Math.max(0,this.policeLost-dt*1.4);
  e.vehicle.group.visible=Math.abs(e.z-p.z)<390;
  if(this.policeLost>=7.5){this.dismissPolice();return}
  this.arrestProgress=policeArrestStep(this.arrestProgress,{player:p,police:e,protectedRider:!!this.playerFall||this.arrestGrace>0},dt);
  if(this.arrestProgress>=ARREST_TIME)this.finish('arrest');
 }
 spawnDust(x,z){
  const low=this.resolvedQuality==='low';const amount=low?2:4;
  for(let i=0;i<amount;i++){
   const mesh=new THREE.Mesh(new THREE.TetrahedronGeometry(.15+Math.random()*.1,0),new THREE.MeshBasicMaterial({color:this.route==='desert'?0xeac49a:0x91a6a8,transparent:true,opacity:.75,depthWrite:false}));
   mesh.position.set(x+rand(-.38,.38),.22,z+rand(-.7,.2));this.scene.add(mesh);
   this.effects.push({mesh,life:rand(.32,.6),maxLife:.6,vx:rand(-2,2),vy:rand(.5,1.8),vz:rand(-2,2)});
  }
 }
 updatePickups(dt){for(const item of this.pickups){if(item.collected)continue;item.mesh.visible=Math.abs(item.z-this.player.z)<260;item.phase+=dt;item.mesh.position.y=1.5+Math.sin(item.phase*3)*.23;item.mesh.rotation.z+=dt*1.6;if(Math.abs(this.player.z-item.z)<3.2&&Math.abs(this.player.x-item.x)<1.2){item.collected=true;item.mesh.visible=false;if(item.type==='nitro'){this.player.nitro=clamp(this.player.nitro+40,0,100);this.notify('NITRO +40%')}else{this.player.health=clamp(this.player.health+30,0,100);this.notify('REPARO +30%')}this.audio.pickup()}}}
 updateEffects(dt){for(let i=this.effects.length-1;i>=0;i--){const e=this.effects[i];e.life-=dt;if(e.kind==='ring'){const t=Math.max(0,1-e.life/e.maxLife);e.mesh.scale.setScalar(.75+t*3);e.mesh.material.opacity=Math.max(0,.75*(1-t))}else{e.vy-=dt*16;e.mesh.position.x+=e.vx*dt;e.mesh.position.y+=e.vy*dt;e.mesh.position.z+=e.vz*dt;e.mesh.scale.setScalar(Math.max(.01,e.life/e.maxLife))}if(e.life<=0){this.scene.remove(e.mesh);e.mesh.geometry.dispose();e.mesh.material.dispose();this.effects.splice(i,1)}}}
 updatePlayerModel(dt,boosting){
  const p=this.player,b=this.playerBike;
  ensurePlayerVehicle(b,!!this.playerFall);
  if(this.playerFall){
   const pose=crashPose(this.playerFall);
   b.group.position.set(p.x,pose.lift,p.z);
   b.group.rotation.y=lerpAngle(b.group.rotation.y,p.yaw,Math.min(1,dt*5));
   b.lean.rotation.z=pose.bikeTilt;b.lean.rotation.x=pose.bikePitch;b.lean.rotation.y=pose.bikeYaw;
   if(b.crashRider){b.crashRider.position.set(pose.riderOffsetX,pose.riderLift,pose.riderOffsetZ);b.crashRider.rotation.set(pose.riderPitch,pose.riderSpin,pose.riderRoll)}
   b.boostFx.visible=false;this.syncHeroShadow();return;
  }
  b.group.position.set(p.x,Math.sin(this.elapsed*22)*Math.min(.022,p.speed*.00032)+(p.suspension||0)*.50,p.z);
  b.group.rotation.y=lerpAngle(b.group.rotation.y,p.yaw,Math.min(1,dt*8));
  b.lean.rotation.z=lerp(b.lean.rotation.z,(p.bank||0)-roadHeading(this.route,p.z,p.pathId||'main')*.20+(p.contactJolt||0)*Math.sin(this.elapsed*29)*.085,Math.min(1,dt*8));
  // Root cause: undefined from unconnected gamepad poisoned lean.rotation.x with NaN.
  // Three.js then generated an invalid world matrix for every rider/bike mesh.
  const braking=!!this.input.braking,accelerating=!!this.input.accelerating;
  b.lean.rotation.x=lerp(Number.isFinite(b.lean.rotation.x)?b.lean.rotation.x:0,
   (p.suspension||0)*.65-(braking?1:0)*.07+(accelerating?1:0)*.035,Math.min(1,dt*7));
  animateRider(b,{dt,time:this.elapsed,attackAge:this.playerAttackAge,attackSide:this.attackSide,speed:p.speed,steer:p.steer,hurt:reactionAmount(this.reactionTimer)});
  b.kickLeft.rotation.z=lerp(b.kickLeft.rotation.z,0,Math.min(1,dt*12));
  b.kickRight.rotation.z=lerp(b.kickRight.rotation.z,0,Math.min(1,dt*12));
  for(const w of b.wheels||[])w.rotation.x+=p.speed*dt/.53;
  if(b.brakeLight)b.brakeLight.material.emissiveIntensity=this.input.braking?3.5:1.2;
  if(b.boostFx){b.boostFx.visible=boosting&&p.speed>8;b.boostFx.scale.set(1,.85+Math.sin(this.elapsed*37)*.25,1)}
  this.syncHeroShadow();
 }
 updateCamera(dt){
  const p=this.player;
  const fall=this.playerFall?crashPose(this.playerFall):null;
  const shake=this.reducedMotion?0:this.cameraShake*rand(-1,1);
  this.cameraShake=Math.max(0,this.cameraShake-dt*1.8);
  const pose=frameCamera({player:p,route:this.route,mode:this.cameraMode,nitro:this.mode==='race'&&this.input.boosting&&p.nitro>0,menu:this.mode==='menu',reducedMotion:this.reducedMotion,fall:fall?{...fall,side:this.playerFall.side}:null});
  if(shake){pose.position.x+=shake*.20;pose.position.y+=shake*.12;}
  this.cameraDirector.update(dt,pose);
  this.camera.updateMatrixWorld();
  // Sanity check the BODY, not its ground decal. A camera transition or an
  // invalid persisted view must never strand the rider outside the viewport.
  if (this.mode==='race' || this.mode==='countdown' || this.mode==='menu') {
   this.heroProbe.set(p.x,1.55,p.z).project(this.camera);
   this.heroOutOfViewTime=playerOutsideView(this.heroProbe)?this.heroOutOfViewTime+dt:0;
   if (this.heroOutOfViewTime>.18 && !this.playerFall) {
    const rescuePose=frameCamera({player:p,route:this.route,mode:'chase',menu:this.mode==='menu',reducedMotion:true});
    this.cameraDirector.reset(rescuePose);
    this.heroOutOfViewTime=0;
   }
  }
 }
 updateHUD(){
  const p=this.player;
  $('speed').textContent=String(kmh(p.speed));
  $('place').innerHTML=this.position()+'<span>º</span>';
  $('timer').textContent=formatTime(this.elapsed);
  $('health-label').textContent=Math.ceil(p.health)+'%';
  $('health-bar').style.width=p.health+'%';
  $('nitro-label').textContent=Math.ceil(p.nitro)+'%';
  $('nitro-bar').style.width=p.nitro+'%';
  $('weapon-hud').textContent=this.weapon.hud;
  $('police-status').classList.toggle('is-hidden',!this.police);
  $('wanted-fill').style.width=Math.round(this.heat)+'%';
  $('police-distance').textContent=this.police?Math.round(Math.abs(p.z-this.police.z))+' M':'--';
  const arrestPercent=Math.round(100*this.arrestProgress/ARREST_TIME);
  $('arrest-status').classList.toggle('hidden',!this.police||arrestPercent===0);
  $('arrest-percent').textContent=arrestPercent+'%';
  $('arrest-fill').style.width=arrestPercent+'%';
  const progress=clamp(100*p.z/RACE_LENGTH,0,100);
  $('progress-fill').style.width=progress+'%';
  $('progress-pin').style.left=progress+'%';
  $('distance').textContent=Math.min(RACE_LENGTH,Math.floor(p.z)).toLocaleString('pt-BR')+' / '+RACE_LENGTH.toLocaleString('pt-BR')+' M';
  const count=this.checkpoints.passed+'/'+this.checkpoints.gates.length;
  $('checkpoint-status').textContent='POSTOS '+count;
  const pending=nextCheckpoint(this.checkpoints);
  $('stage-status').textContent='POSTOS '+count+(pending!==null?' · PRÓXIMO '+Math.max(0,Math.ceil(pending-p.z))+' M':' · RUMO À CHEGADA');
  const branch=activeFork(this.route,p.z);
  $('road-branch').classList.toggle('hidden',!branch);
  if(branch)$('road-branch').textContent=p.pathId===branch.id?'ROTA ALTERNATIVA · '+branch.name:'BIFURCAÇÃO · '+(branch.side<0?'DIREITA':'ESQUERDA')+' · '+branch.name;
  if(this.mission){
   const m=this.mission,parts=[];
   if(m.maxPlace)parts.push('META '+m.maxPlace+'º');
   if(m.minHits)parts.push('RIVAIS '+this.hits+'/'+m.minHits);
   if(m.minEscapes)parts.push('FUGAS '+this.escapes+'/'+m.minEscapes);
   if(m.minHealth)parts.push('MOTO '+Math.ceil(p.health)+'% / '+m.minHealth+'%');
   if(m.maxFalls!==undefined)parts.push('QUEDAS '+this.falls+'/'+m.maxFalls);
   if(m.timeLimit)parts.push('TEMPO '+Math.max(0,Math.ceil(m.timeLimit-this.elapsed))+' S');
   parts.push(...missionRunStatus(m,this.missionRun,p.z));
   $('mission-live').textContent=parts.join(' · ');
  }
 }
 handleMenuGamepad(){
  const buttons=this.input.consumeMenu();
  if(this.mode==='menu'){
   if(buttons.left||buttons.right){
    const routes=Object.keys(ROUTES),index=routes.indexOf(this.route),step=buttons.right?1:-1;
    this.route=routes[(index+step+routes.length)%routes.length];
    document.querySelectorAll('.route').forEach(b=>b.classList.toggle('selected',b.dataset.route===this.route));this.buildTrack();
   }
   if(buttons.up||buttons.down)this.selectWeapon((()=>{const ids=Object.keys(WEAPONS),n=ids.indexOf(this.selectedWeapon);return ids[(n+(buttons.down?1:-1)+ids.length)%ids.length]})(),true);
   if(buttons.confirm)this.start();
  }else if(this.mode==='pause'){
   if(buttons.confirm){this.input.consumePause();this.resume()}if(buttons.back)this.home();
  }else if(this.mode==='finish'){
   if(buttons.confirm)this.start();if(buttons.back)this.home();
  }
 }
 frameLoop(now){
  const rawDt=Math.max(.001,(now-this.lastFrame)/1000);
  const dt=Math.min(.09,rawDt);this.lastFrame=now;this.frame++;
  if(this.mode==='race'){
   this.fpsTime+=rawDt;this.fpsFrames++;
   if(this.fpsTime>=2.2){
    const fps=Math.round(this.fpsFrames/this.fpsTime);$('fps-value').textContent=String(fps);
    if(this.quality==='auto'){
     const previous=this.autoScale;
     if(fps<43&&this.autoScale>.67)this.autoScale=Math.max(.67,this.autoScale-.1);
     else if(fps>57&&this.autoScale<1)this.autoScale=Math.min(1,this.autoScale+.055);
     if(previous!==this.autoScale)this.resize();
     // Automatic quality can drop shadow rendering if the GPU cannot sustain racing FPS.
     if(fps<35&&this.shadows==='auto'&&this.renderer.shadowMap.enabled&&!this.automaticShadowDrop){
      this.renderer.shadowMap.enabled=false;this.automaticShadowDrop=true;
      this.notify('MODO AUTOMÁTICO: SOMBRAS DESATIVADAS PARA AUMENTAR FPS');
     }
    }
    this.fpsTime=0;this.fpsFrames=0;
   }
  }
  try{
   this.input.update();if(this.input.consumeCamera()&&this.mode==='race')this.selectCamera(nextCameraMode(this.cameraMode),true);if(this.input.padConnected!==this.lastPadStatus){this.lastPadStatus=this.input.padConnected;$('pad-indicator').textContent=this.lastPadStatus?'🎮 CONTROLE CONECTADO':'TECLADO'}this.handleMenuGamepad();if(this.mode==='countdown')this.updateCountdown(dt);const cinematicFactor=this.impactSlow>0?.55:1;this.impactSlow=Math.max(0,this.impactSlow-rawDt);if(this.mode==='race'){const step=1/60;this.simAccum=Math.min(this.simAccum+dt,step*5);let steps=0;while(this.simAccum>=step&&steps<5&&this.mode==='race'){this.simulate(step*cinematicFactor);this.simAccum-=step;steps++}}else this.simAccum=0;
   if(this.mode==='pause'&&this.input.consumePause())this.resume();
   if(this.mode==='menu'){this.playerBike.lean.rotation.z=Math.sin(now*.001)*.025;animateRider(this.playerBike,{dt,time:now*.001});this.world.update(0,dt,this.lighting);this.syncHeroShadow();if(this.input.consumeDebug())this.toggleHull()}
   if(this.mode!=='pause'){this.updateCamera(dt);if(this.world?.exposure)this.renderer.toneMappingExposure=this.world.exposure;}
   // One ordinary world pass draws the real original motorcycle 3D,
   // rivals, road and all scenery with shared depth and illumination.
   this.renderer.render(this.scene,this.camera);
   if(this.heroDebugEnabled){this.heroDiagnosticTick+=dt;if(this.heroDiagnosticTick>.3){this.heroDiagnosticTick=0;updateHeroDebugPanel(this.heroDebugPanel,this)}}
  }catch(e){console.error('Erro no loop do jogo:',e);this.renderer.setAnimationLoop(null);$('fatal').classList.remove('hidden');$('fatal').querySelector('p').textContent=e.message}
 }
}
