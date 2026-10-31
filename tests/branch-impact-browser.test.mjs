// Regressão específica: choque no ramal não pode teleportar a moto à pista principal.
// Estado controlado de contato: NÃO substitui uma corrida completa de jogador.
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
 fs.readFile(dest,(err,bytes)=>{
  if(err){res.writeHead(404).end();return}
  res.writeHead(200,{'Content-Type':types[path.extname(dest)]||'text/plain'}).end(bytes);
 });
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1024,height:720}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js',route=>route.fulfill({path:path.join(root,'node_modules/three/build/three.module.js'),contentType:'application/javascript',headers:{'access-control-allow-origin':'*'}}));
 await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'load'});
 await page.waitForFunction(()=>window.__asfaltoBooted===true,{timeout:30000});
 const results=await page.evaluate(async()=>{
  const g=window.asfaltoGame;
  const {forksFor,roadCenter,nearestRoad}=await import('./js/road-network.js');
  const {ROAD_RAIL}=await import('./js/physics.js');
  g.quality='low';g.gameMode='free';g.route='coast';g.start();g.renderer.setAnimationLoop(null);g.mode='race';g.input.reset();
  const competitor=g.rivals[0];g.rivals=[competitor];g.traffic=[];g.pickups=[];g.police=null;
  const reports=[];
  for(const fork of forksFor(g.route)){
   const z=(fork.start+fork.end)/2,center=roadCenter(g.route,z,fork.id);
   g.player.x=center;g.player.z=z;g.player.pathId=fork.id;g.player.speed=36;g.player.yaw=0;g.player.health=100;g.player.lateralVelocity=0;g.player.slideVelocity=0;
   competitor.x=center+.4;competitor.z=z+.35;competitor.yaw=0;competitor.speed=25;competitor.fallen=0;competitor.pathId=fork.id;competitor.old={x:competitor.x,z:competitor.z,yaw:0};competitor.vehicle.kind='bike';
   const before={x:g.player.x,z:g.player.z,yaw:0,speed:g.player.speed};
   g.resolveContacts(before);
   const after={id:fork.id,offset:Math.abs(g.player.x-roadCenter(g.route,g.player.z,fork.id)),rail:ROAD_RAIL,nearest:nearestRoad(g.player.x,g.player.z,g.route,fork.id).pathId,deltaX:g.player.x-center,health:g.player.health};
   reports.push(after);
  }
  return {reports,gl:g.renderer.getContext().getError()};
 });
 console.log('IMPACTO NOS RAMAIS:',JSON.stringify(results));
 for(const report of results.reports){
  assert.ok(report.offset<=report.rail+.02,report.id+' contato não deve deslocar moto para fora da via alternativa');
  assert.equal(report.nearest,report.id,report.id+' colisão deve preservar ramal ativo');
 }
 assert.equal(results.gl,0);
 assert.deepEqual(errors,[]);
 console.log('CONTATO EM RAMAIS: os 3 ramais da costa preservam pista após colisão');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
