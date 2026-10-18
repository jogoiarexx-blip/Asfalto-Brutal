import assert from 'node:assert/strict';
import {WEAPONS,WEAPON_IDS,weaponById,weaponForRival,nextWeapon,attackEnvelope,strikeIsActive,sideTowardPlayer,canEnemyStrike,enemyDamage} from '../js/combat.js';
import {strikeCandidate} from '../js/collision.js';
import {crashPose} from '../js/crash-anim.js';
import {animateRider} from '../js/rider-animation.js';
assert.equal(WEAPON_IDS.length,5,'all requested armaments available');
assert.deepEqual(WEAPON_IDS,['chain','club','pipe','machete','baton']);
for(const [id,w] of Object.entries(WEAPONS)){
 assert.equal(w.id,id);assert.ok(w.reachBike>2&&w.cooldown>0);
 assert.ok(enemyDamage(w,.8)>0);
}
assert.equal(weaponById('invalid'),WEAPONS.chain);
assert.equal(nextWeapon('baton'),'chain');assert.equal(nextWeapon('chain',-1),'baton');
assert.equal(weaponForRival(4),'machete');
assert.equal(attackEnvelope(Infinity),0);
assert.equal(attackEnvelope(.6),0);
assert.ok(attackEnvelope(.20)>.75,'swing animation reaches full extension');
assert.equal(strikeIsActive(.04),false);assert.equal(strikeIsActive(.14),true);assert.equal(strikeIsActive(.33),false);
assert.equal(sideTowardPlayer(2,0),1);assert.equal(sideTowardPlayer(-2,0),-1);
const foe={x:2.85,z:102,attackCD:0,stunTimer:0,fallen:0};const player={x:0,z:100};
assert.equal(canEnemyStrike(foe,player,WEAPONS.chain),true);
assert.equal(canEnemyStrike(foe,player,WEAPONS.club),false);
assert.equal(canEnemyStrike({...foe,attackCD:.5},player,WEAPONS.chain),false);
assert.equal(canEnemyStrike(foe,player,WEAPONS.chain,{playerDown:true}),false);
assert.notEqual(strikeCandidate({...foe,yaw:0},player,1,'bike',WEAPONS.chain),null);
assert.equal(strikeCandidate({...foe,yaw:0},player,1,'bike',WEAPONS.club),null);
for(const t of [0,.1,.2,.4,.7,1]){
 const pose=crashPose({remaining:1-t,total:1,side:-1});
 assert.ok(Number.isFinite(pose.bikeYaw)&&Number.isFinite(pose.bikePitch)&&Number.isFinite(pose.riderSpin));
 assert.ok(pose.riderLift>=0);
}
const poseVal=()=>({rotation:{x:0,y:0,z:0}});
const makeArm=()=>({shoulder:poseVal(),forearmPivot:poseVal(),weaponPivot:poseVal(),weaponSets:Object.fromEntries(WEAPON_IDS.map(id=>[id,{group:{visible:false}}])),updateChain(){this.updated=true}});
const rider={armLeft:makeArm(),armRight:makeArm(),rider:poseVal(),weaponType:'machete'};
animateRider(rider,{attackAge:.20,attackSide:-1,dt:.04,time:1,speed:50});
assert.ok(rider.armRight.shoulder.rotation.z>0.3,'screen-left means right-side model arm');
assert.ok(Math.abs(rider.armLeft.shoulder.rotation.z)<.5,'opposite arm stays near the handlebar');
assert.equal(rider.armRight.weaponSets.machete.group.visible,true);
assert.equal(rider.armLeft.weaponSets.machete.group.visible,false);
animateRider(rider,{attackAge:.20,attackSide:1,dt:.04,time:1,speed:50});
assert.equal(rider.armLeft.weaponSets.machete.group.visible,true);
assert.equal(rider.armRight.weaponSets.machete.group.visible,false);
console.log('v1.5: 5 armas, hitbox por alcance, animações esquerda/direita, rival armament e poses de queda OK.');
