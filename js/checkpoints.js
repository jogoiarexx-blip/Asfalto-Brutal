/** Postos de controle de pista: a ordem e o cruzamento frontal são obrigatórios. */
export const CHECKPOINT_DISTANCES=Object.freeze([950,1900,2850]);
export function createCheckpoints(gates=CHECKPOINT_DISTANCES){
 return {gates:[...gates],passed:0};
}
export function advanceCheckpoints(state,previousZ,nextZ,lateralDistance,roadHalfWidth=6.7){
 const current={gates:[...state.gates],passed:state.passed};
 if(!Number.isFinite(previousZ)||!Number.isFinite(nextZ)||nextZ<previousZ)return current;
 while(current.passed<current.gates.length){
  const gate=current.gates[current.passed];
  if(previousZ>gate||nextZ<gate)break;
  if(!Number.isFinite(lateralDistance)||Math.abs(lateralDistance)>roadHalfWidth+.65)break;
  current.passed++;
 }
 return current;
}
export const allCheckpointsPassed=state=>!!state&&state.passed===state.gates.length;
export const nextCheckpoint=state=>state.gates[state.passed]??null;

/** Um checkpoint perdido não força o jogador a chegar até o final da pista para retornar. */
export function missedCheckpoint(state,playerZ,graceMeters=12){
 const gate=nextCheckpoint(state);
 return Number.isFinite(gate)&&Number.isFinite(playerZ)&&playerZ>gate+graceMeters?gate:null;
}
