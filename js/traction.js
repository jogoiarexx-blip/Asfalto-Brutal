import {clamp} from './config.js';
/** Stateful but deterministic arcade grip model; changing direction suddenly at speed
 * under braking pushes the tyre past its traction budget. Recovery takes time.
 */
export function evolveTraction(state,{speed=0,steer=0,brake=false,offRoad=false,dt=.016}={}){
 const ratio=clamp(speed/65,0,1.35);
 const steerLoad=Math.abs(steer)*ratio*(brake?1.15:.60);
 const countersteer=Math.abs(steer-(state.lastInputSteer||0))*ratio*.2;
 const desired=clamp(steerLoad*.66+countersteer+(offRoad?.30:0)-.16,0,.82);
 const current=clamp(state.tractionLoss||0,0,1);
 const gain=desired>current?5.2:2.9;
 const loss=current+(desired-current)*(1-Math.exp(-clamp(dt,0,.05)*gain));
 const grip=clamp((offRoad?.55:1)-loss*(offRoad?.23:.56),.30,1);
 const slide=clamp(loss*ratio*(brake?1.0:.66),0,.95);
 return {loss,grip,slide};
}
