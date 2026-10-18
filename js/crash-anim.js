import {clamp} from './config.js';
const smooth=t=>t*t*(3-2*t);
/** Stage 1: separation, stage 2: brief aerial rotation, stage 3: asphalt slide. */
export function crashPose(fall){
 if(!fall)return {active:false};
 const t=clamp(1-fall.remaining/fall.total,0,1),side=Math.sign(fall.side)||1;
 const eject=smooth(clamp(t/.3,0,1)),land=smooth(clamp((t-.3)/.5,0,1));
 const bikeTilt=side*(.1+1.36*smooth(clamp(t/.28,0,1)));
 const bikePitch=.19*Math.sin(clamp(t/.44,0,1)*Math.PI);
 const bikeYaw=side*.16*Math.sin(clamp(t/.48,0,1)*Math.PI);
 const lift=.12+.32*Math.sin(clamp(t/.42,0,1)*Math.PI);
 const riderOffsetX=side*(.7+1.65*eject+.75*land);
 const riderOffsetZ=1.85*eject+1.45*land;
 const riderLift=Math.max(.03,1.65*Math.sin(Math.PI*clamp(t/.56,0,1))*(1-land*.70));
 const riderRoll=side*(.15+1.4*eject+.35*land);
 const riderPitch=.15+1.05*eject;
 const riderSpin=side*.62*Math.sin(Math.PI*clamp(t/.65,0,1));
 return {active:true,t,bikeTilt,bikePitch,bikeYaw,lift,riderOffsetX,riderOffsetZ,riderLift,riderRoll,riderPitch,riderSpin};
}
