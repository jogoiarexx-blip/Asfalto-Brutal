// Browser integration, controlled race state. Not a claim of human gameplay completion.
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
 const page=await browser.newPage({viewport:{width:1280,height:760}});
 const errors=[];page.on('pageerror',err=>errors.push(err.message));
 await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js',route=>route.fulfill({path:path.join(root,'node_modules/three/build/three.module.js'),contentType:'application/javascript',headers:{'access-control-allow-origin':'*'}}));
 await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'load'});
 await page.waitForFunction(()=>window.__asfaltoBooted===true,{timeout:30000});
 await page.locator('#campaign-mode').click();
 assert.equal(await page.locator('#campaign-panel').isVisible(),true);
 assert.equal(await page.locator('[data-mission="acerto-de-contas"]').isDisabled(),true);
 await page.locator('#play').click();
 const result=await page.evaluate(async()=>{
  const g=window.asfaltoGame,{curveAt,RACE_LENGTH}=await import('./js/config.js');
  g.renderer.setAnimationLoop(null);g.mode='race';
  g.rivals=[];g.traffic=[];g.pickups=[];g.input.reset();
  // Missed gate should send player back immediately, not at the finish.
  g.player.z=963.6;g.player.x=curveAt(g.player.z,g.route);g.player.speed=30;
  g.simulate(1/60);
  const resetZ=g.player.z,missingGateReturned=resetZ<950&&g.checkpoints.passed===0;
  // Cross real gate boundaries through the game physics, in order.
  const gates=[...g.checkpoints.gates],steps=[];
  for(const target of gates){
   g.player.z=target-.35;g.player.x=curveAt(g.player.z,g.route);g.player.speed=60;
   g.simulate(1/60);steps.push(g.checkpoints.passed);
  }
  const stageText=document.getElementById('stage-status').textContent;
  g.player.z=RACE_LENGTH-.2;g.player.x=curveAt(g.player.z,g.route);g.player.speed=50;
  g.simulate(1/60);
  const finished=g.mode==='finish',firstMoney=g.earnedLast,unlocked=g.campaign.completed.length;
  g.home();
  const secondOpen=!document.querySelector('[data-mission="acerto-de-contas"]').disabled;
  // Replay completed mission, force a valid completed checkpoint state to check rewards.
  g.start();g.renderer.setAnimationLoop(null);g.mode='race';g.rivals=[];
  g.checkpoints.passed=g.checkpoints.gates.length;g.player.z=RACE_LENGTH;
  g.finish('finish');
  const secondMoney=g.earnedLast;
  g.home();
  // Controlled mission 4: verify spawning and objective accounting (not natural play).
  g.campaign.completed=['primeira-marcha','acerto-de-contas','fio-da-navalha'];
  g.gameMode='campaign';g.selectedMissionId='fora-do-radar';g.route='desert';g.renderCampaign();
  g.start();g.renderer.setAnimationLoop(null);g.updateCountdown(4);
  const policeStarted=!!g.police,heat=g.heat,startedMission=g.mission.id;
  g.dismissPolice();g.rivals=[];g.player.health=70;g.checkpoints.passed=g.checkpoints.gates.length;g.player.z=RACE_LENGTH;
  g.finish('finish');const escaped=g.campaign.completed.includes('fora-do-radar');
  g.home();
  g.gameMode='free';g.start();g.renderer.setAnimationLoop(null);g.mode='race';g.finish('arrest');
  const arrestResult=document.getElementById('finish-kicker').textContent;
  return {resetZ,missingGateReturned,steps,stageText,finished,firstMoney,unlocked,secondOpen,secondMoney,policeStarted,heat,startedMission,escaped,arrestResult,arrestPayout:g.earnedLast};
 });
 console.log('JAILBREAK BROWSER STATE INTEGRATION:',JSON.stringify(result));
 assert.equal(result.missingGateReturned,true,'missing gate should auto retry');
 assert.deepEqual(result.steps,[1,2,3],'all three actual physics crossings should count');
 assert.match(result.stageText,/POSTOS 3\/3/);
 assert.equal(result.finished,true);
 assert.equal(result.unlocked,1);
 assert.equal(result.secondOpen,true);
 assert.equal(result.firstMoney-result.secondMoney,550,'campaign one-time bonus');
 assert.equal(result.policeStarted,true);
 assert.equal(result.startedMission,'fora-do-radar');
 assert.ok(result.heat>=85);
 assert.equal(result.escaped,true,'escape mission must unlock on a recorded police escape');
 assert.match(result.arrestResult,/PRESO/);
 assert.equal(result.arrestPayout,0);
 assert.deepEqual(errors,[],'no unhandled page errors');
 console.log('SUCESSO: UI, checkpoints fisicos, campanha, policia e resultado de prisao integrados no Chromium');
}finally{
 await browser.close();await new Promise(resolve=>server.close(resolve));
}
