// Full Three.js browser integration with controlled race states. Not a natural full playthrough.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const types={'.html':'text/html','.css':'text/css','.js':'application/javascript','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{
 let url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(url==='/')url='/index.html';
 const dest=path.resolve(root,'.'+url);
 if(!dest.startsWith(root+path.sep)){res.writeHead(403).end();return}
 fs.readFile(dest,(err,bytes)=>{if(err){res.writeHead(404).end();return}
  res.writeHead(200,{'Content-Type':types[path.extname(dest)]||'text/plain'}).end(bytes)});
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js',route=>route.fulfill({path:path.join(root,'node_modules/three/build/three.module.js'),contentType:'application/javascript',headers:{'access-control-allow-origin':'*'}}));
 await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'load'});
 await page.waitForFunction(()=>window.__asfaltoBooted===true,{timeout:30000});
 const result=await page.evaluate(async()=>{
  const g=window.asfaltoGame,{MISSIONS}=await import('./js/jailbreak-campaign.js');
  const {roadCenter,forksFor}=await import('./js/road-network.js');
  const {RACE_LENGTH}=await import('./js/config.js');
  const onRoad=(z,path='main',speed=42)=>{
   g.player.z=z;g.player.x=roadCenter(g.route,z,path);g.player.pathId=path;
   g.player.speed=speed;g.player.lateralVelocity=0;g.player.slideVelocity=0;g.input.reset();
  };
  const simulate=(z,path='main',speed=42)=>{
   onRoad(z,path,speed);g.simulate(1/60);
  };
  const prepare=id=>{
   g.gameMode='campaign';g.selectedMissionId=id;g.route=MISSIONS.find(m=>m.id===id).route;
   g.start();g.renderer.setAnimationLoop(null);g.mode='race';g.rivals=[];g.traffic=[];g.pickups=[];
  };
  g.campaign.completed=MISSIONS.slice(0,6).map(m=>m.id);
  g.renderCampaign();
  const menuCount=document.getElementById('campaign-count').textContent;
  const chapter2Unlocked=!document.querySelector('[data-mission="correio-enseada"]').disabled;
  prepare('correio-enseada');
  const markerCount=g.world.children.filter(o=>o.name?.startsWith('MISSION_')).length;
  simulate(534.6,'main');
  const illegalPickup=g.missionRun.cargoPicked;
  simulate(534.6,'enseada');
  const pickup=g.missionRun.cargoPicked,visited=g.missionRun.visitedForks.enseada,pickupHidden=!g.world.missionMarkers.pickup.visible;
  const deliveryShown=g.world.missionMarkers.delivery.visible;
  g.checkpoints.passed=g.checkpoints.gates.length;
  simulate(3299.65,'main');
  const delivered=g.missionRun.cargoDelivered;
  g.updateHUD();
  const status=document.getElementById('mission-live').textContent;
  onRoad(RACE_LENGTH,'main');g.finish('finish');
  const courierSuccess=g.campaign.completed.includes('correio-enseada'),courierBonus=g.earnedLast;
  g.home();
  const eighthUnlocked=!document.querySelector('[data-mission="sombra-do-canion"]').disabled;
  prepare('sombra-do-canion');
  g.updateCountdown(4);
  const policeStarted=!!g.police;
  simulate(1419,'canion');
  const canyonVisited=g.missionRun.visitedForks.canion;
  g.dismissPolice();g.checkpoints.passed=g.checkpoints.gates.length;
  onRoad(RACE_LENGTH,'main');g.finish('finish');
  const pursuitSuccess=g.campaign.completed.includes('sombra-do-canion');
  g.home();
  prepare('pacto-das-serras');
  simulate(1419,'pedreira');simulate(2350,'colina');
  const forksVisited=Object.keys(g.missionRun.visitedForks).sort();
  g.hits=1;g.checkpoints.passed=g.checkpoints.gates.length;
  onRoad(RACE_LENGTH,'main');g.finish('finish');
  const finalSuccess=g.campaign.completed.includes('pacto-das-serras');
  g.home();g.renderCampaign();
  const finalCount=document.getElementById('campaign-count').textContent;
  const ninthForks=forksFor('coast').length;
  const gl=g.renderer.getContext().getError();
  return {menuCount,chapter2Unlocked,markerCount,illegalPickup,pickup,visited,pickupHidden,deliveryShown,delivered,status,courierSuccess,courierBonus,eighthUnlocked,policeStarted,canyonVisited,pursuitSuccess,forksVisited,finalSuccess,finalCount,ninthForks,gl};
 });
 console.log('CHAPTER II CHROMIUM:',JSON.stringify(result));
 assert.equal(result.menuCount,'6/9');
 assert.equal(result.chapter2Unlocked,true);
 assert.equal(result.markerCount,2);
 assert.equal(result.illegalPickup,false);
 assert.equal(result.pickup,true);
 assert.equal(result.visited,true);
 assert.equal(result.pickupHidden,true);
 assert.equal(result.deliveryShown,true);
 assert.equal(result.delivered,true);
 assert.match(result.status,/ENTREGA OK/);
 assert.equal(result.courierSuccess,true);
 assert.ok(result.courierBonus>=1900);
 assert.equal(result.eighthUnlocked,true);
 assert.equal(result.policeStarted,true);
 assert.equal(result.canyonVisited,true);
 assert.equal(result.pursuitSuccess,true);
 assert.deepEqual(result.forksVisited,['colina','pedreira']);
 assert.equal(result.finalSuccess,true);
 assert.equal(result.finalCount,'9/9');
 assert.equal(result.ninthForks,3);
 assert.equal(result.gl,0);
 assert.deepEqual(errors,[]);
 await page.screenshot({path:path.join(root,'tests/chapter2-render.png')});
 console.log('SUCESSO: 3 novas missoes, encomenda 3D, perseguição, desvios e salvamento no Chromium');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
