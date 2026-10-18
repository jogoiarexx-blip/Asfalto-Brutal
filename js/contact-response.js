/** Two-dimensional arcade impact resolution. Pure calculations for deterministic tests.
 * Never changes the input objects. The SAT sweep tells us WHEN; this solver decides
 * how to separate bodies and how much speed/momentum each should retain.
 */
export function contactResponse(player,other,playerHull,otherHull,{restitution=.17,contactDx=null,contactDz=null}={}){
 const dx=contactDx??(player.x-other.x),dz=contactDz??(player.z-other.z);
 const sideLimit=playerHull.halfWidth+otherHull.halfWidth+.11;
 const frontLimit=playerHull.halfLength+otherHull.halfLength+.12;
 const px=sideLimit-Math.abs(dx),pz=frontLimit-Math.abs(dz);
 const side=px<=pz*.95;
 const sign=side?(Math.sign(dx)||1):(Math.sign(dz)||-1);
 const relativeZ=player.speed-(other.speed||0);
 const relativeX=player.lateralVelocity||0;
 const relativeSpeed=Math.hypot(relativeZ,relativeX);
 const mass=otherHull.halfWidth>0.9?4.5:1.45;
 const intensity=Math.min(1,relativeSpeed/38);
 let x=player.x,z=player.z,speed=player.speed,lateralVelocity=relativeX;
 if(side){
  x=other.x+sign*sideLimit;
  const towards=Math.sign(lateralVelocity)===-sign?Math.abs(lateralVelocity):0;
  lateralVelocity=sign*Math.min(5.6,1.25+intensity*2.1+towards*restitution);
  speed=Math.max(0,speed*(1-.07-intensity*.19/mass));
 }else{
  z=other.z+sign*frontLimit;
  if(sign<0){ // striking a vehicle ahead
   const absorbed=Math.max(0,relativeZ)*(.35+.21*Math.min(1,mass/3));
   speed=Math.max(0,Math.min(speed-absorbed,(other.speed||0)+4.0));
  }else{ // hit from behind
   speed=Math.max(0,speed+Math.min(3.7,Math.max(0,-relativeZ)*.19));
  }
  lateralVelocity=sign*(Math.abs(lateralVelocity)*restitution+.75);
  x+=(Math.sign(dx)||1)*Math.min(.24,.09+intensity*.17);
 }
 return {x,z,speed,lateralVelocity,side,normal:sign,relativeSpeed,
  intensity,damageFactor:.55+Math.min(1.3,relativeSpeed/28)+(mass>2?.25:0)};
}
