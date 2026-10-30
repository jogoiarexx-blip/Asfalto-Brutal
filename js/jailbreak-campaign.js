/** Capitulo I: missões autorais, verificáveis e independentes do renderer. */
export const CAMPAIGN_KEY='asfalto-brutal-campaign-v1';
export const MISSIONS=Object.freeze([
 {id:'primeira-marcha',name:'01 · A PRIMEIRA MARCHA',route:'coast',objective:'Chegue entre os 3 primeiros.',maxPlace:3,bonus:550},
 {id:'acerto-de-contas',name:'02 · ACERTO DE CONTAS',route:'coast',objective:'Derrube 1 rival e termine entre os 5 primeiros.',minHits:1,maxPlace:5,bonus:700},
 {id:'fio-da-navalha',name:'03 · FIO DA NAVALHA',route:'highlands',objective:'Termine entre os 5 primeiros sem cair.',maxPlace:5,maxFalls:0,bonus:850},
 {id:'fora-do-radar',name:'04 · FORA DO RADAR',route:'desert',objective:'Sobreviva à perseguição e termine com pelo menos 35% de integridade.',minHealth:35,policeStart:true,bonus:1000},
 {id:'correio-urgente',name:'05 · CORREIO URGENTE',route:'desert',objective:'Termine entre os 4 primeiros em até 135 segundos.',maxPlace:4,timeLimit:135,bonus:1200},
 {id:'dono-da-pista',name:'06 · DONO DA PISTA',route:'highlands',objective:'Chegue ao pódio, derrube 2 rivais e caia no máximo 1 vez.',maxPlace:3,minHits:2,maxFalls:1,bonus:1700}
].map(m=>Object.freeze(m)));
const base=()=>({version:1,completed:[]});
export function missionById(id){return MISSIONS.find(m=>m.id===id)||null}
export function normalizeCampaign(source){
 const done=Array.isArray(source?.completed)?source.completed:[];
 const completed=[];
 // Impede save inconsistente desbloqueando missão sem concluir as anteriores.
 for(const mission of MISSIONS){if(!done.includes(mission.id))break;completed.push(mission.id)}
 return {version:1,completed};
}
export function loadCampaign(storage){
 try{return normalizeCampaign(JSON.parse(storage?.getItem(CAMPAIGN_KEY)))}catch{return base()}
}
export function saveCampaign(storage,campaign){
 try{storage?.setItem(CAMPAIGN_KEY,JSON.stringify(normalizeCampaign(campaign)));return !!storage}catch{return false}
}
export function missionUnlocked(campaign,id){
 const index=MISSIONS.findIndex(m=>m.id===id);
 if(index<0)return false;
 return index<=normalizeCampaign(campaign).completed.length;
}
/** Só os objetivos realmente cumpridos desbloqueiam a próxima missão. */
export function evaluateMission(mission,stats={}){
 if(!mission)return {success:false,failures:['Missão inexistente.']};
 const failures=[];
 if(!stats.finished)failures.push('Cruze a linha de chegada com a moto funcionando.');
 if(stats.checkpointsValid===false)failures.push('Passe por todos os checkpoints.');
 if(mission.maxPlace && !(stats.place<=mission.maxPlace))failures.push('Posição exigida: '+mission.maxPlace+'º ou melhor.');
 if(mission.minHits && !(stats.hits>=mission.minHits))failures.push('Rivais derrubados: '+(stats.hits||0)+'/'+mission.minHits+'.');
 if(mission.minHealth && !(stats.health>=mission.minHealth))failures.push('Integridade mínima: '+mission.minHealth+'%.');
 if(mission.minEscapes && !(stats.escapes>=mission.minEscapes))failures.push('Fugas da polícia: '+(stats.escapes||0)+'/'+mission.minEscapes+'.');
 if(mission.maxFalls!==undefined && !(stats.falls<=mission.maxFalls))failures.push('Limite de quedas: '+mission.maxFalls+'.');
 if(mission.timeLimit && !(Number.isFinite(stats.time)&&stats.time<=mission.timeLimit))failures.push('Tempo limite: '+mission.timeLimit+' segundos.');
 return {success:failures.length===0,failures};
}
export function completeMission(campaign,id,stats){
 const state=normalizeCampaign(campaign),mission=missionById(id);
 if(!mission||!missionUnlocked(state,id))return {campaign:state,success:false,bonus:0,failures:['Missão bloqueada.']};
 const evaluation=evaluateMission(mission,stats);
 if(!evaluation.success)return {campaign:state,success:false,bonus:0,failures:evaluation.failures};
 if(state.completed.includes(id))return {campaign:state,success:true,bonus:0,failures:[],replay:true};
 const completed=[...state.completed,id];
 return {campaign:{version:1,completed},success:true,bonus:mission.bonus,failures:[],replay:false};
}
