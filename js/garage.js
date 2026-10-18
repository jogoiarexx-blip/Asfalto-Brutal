import {clamp} from './config.js';

export const GARAGE_KEY='asfalto-brutal-garage-v1';
export const BIKES=Object.freeze([
 Object.freeze({id:'street',name:'FALCÃO 250',subtitle:'ÁGIL E EQUILIBRADA',price:0,color:0xff5f4e,accel:1,topSpeed:1,handling:1,armor:1}),
 Object.freeze({id:'storm',name:'TEMPESTADE 600',subtitle:'ACELERAÇÃO E CONTROLE',price:2300,color:0x4bdbff,accel:1.21,topSpeed:1.12,handling:1.12,armor:1.04}),
 Object.freeze({id:'viper',name:'VÍBORA 900',subtitle:'POTÊNCIA DE COMPETIÇÃO',price:5800,color:0xd7ff5c,accel:1.34,topSpeed:1.26,handling:1.07,armor:1.16}),
 Object.freeze({id:'bulldog',name:'BULLDOG 1200',subtitle:'RESISTÊNCIA E FORÇA',price:7400,color:0xa58aff,accel:1.17,topSpeed:1.16,handling:.94,armor:1.58})
]);
const idSet=new Set(BIKES.map(b=>b.id));
export const baseGarage=()=>({money:0,owned:['street'],selected:'street',races:0});
export function normalizeGarage(source){
 if(!source||typeof source!=='object')return baseGarage();
 const owned=Array.isArray(source.owned)?[...new Set(source.owned.filter(id=>idSet.has(id)))]:[];
 if(!owned.includes('street'))owned.unshift('street');
 return {money:clamp(Number.isFinite(source.money)?Math.floor(source.money):0,0,99999999),owned,selected:owned.includes(source.selected)?source.selected:'street',races:clamp(Number.isFinite(source.races)?Math.floor(source.races):0,0,999999)};
}
export function loadGarage(storage){
 try{return normalizeGarage(JSON.parse(storage.getItem(GARAGE_KEY)))}catch{return baseGarage()}
}
export function saveGarage(storage,garage){try{storage.setItem(GARAGE_KEY,JSON.stringify(normalizeGarage(garage)));return true}catch{return false}}
export const chosenBike=(garage)=>BIKES.find(b=>b.id===garage.selected)||BIKES[0];
/** Purchase and select are separate commands. Never spend credits on an already owned bike. */
export function garageAction(garage,id){
 const bike=BIKES.find(b=>b.id===id),original=normalizeGarage(garage);
 if(!bike)return {garage:original,status:'invalid'};
 if(original.owned.includes(id))return {garage:{...original,selected:id},status:'selected'};
 if(original.money<bike.price)return {garage:original,status:'funds'};
 return {garage:{...original,owned:[...original.owned,id],selected:id,money:original.money-bike.price},status:'purchased'};
}
export function racePayout({place=7,finished=false,hits=0,escapes=0,z=0}={}){
 if(!finished)return Math.floor(clamp(z/3800,0,1)*160);
 const ranking=[1550,1100,820,620,480,350,260];
 return ranking[clamp(Math.floor(place)-1,0,6)]+clamp(Math.floor(hits),0,12)*90+clamp(Math.floor(escapes),0,4)*135;
}
export function awardRace(garage,details){const amount=racePayout(details);const clean=normalizeGarage(garage);return {amount,garage:{...clean,money:Math.min(99999999,clean.money+amount),races:clean.races+1}}}
export function formatMoney(amount){return new Intl.NumberFormat('pt-BR').format(amount)}
