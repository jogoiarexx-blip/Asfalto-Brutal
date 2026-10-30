import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const server=createServer((req,res)=>{
 let url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(url==='/')url='/index.html';
 const file=path.resolve(root,'.'+url);
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return}
 const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'};
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'text/plain'}).end(data)});
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:760}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js',route=>route.fulfill({path:path.join(root,'node_modules/three/build/three.module.js'),contentType:'application/javascript',headers:{'access-control-allow-origin':'*'}}));
 await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'load'});
 await page.waitForFunction(()=>window.__asfaltoBooted===true,{timeout:30000});
 const state=await page.evaluate(async()=>{
  const g=window.asfaltoGame,{forksFor,roadCenter}=await import('./js/road-network.js');
  const {curveAt}=await import('./js/config.js');
  const {frameCamera}=await import('./js/camera-director.js');
  g.start();g.renderer.setAnimationLoop(null);g.mode='race';
  const fork=forksFor(g.route)[0],entry=fork.start-.2;
  const rider=g.rivals[0],car=g.traffic[0];
  rider.z=entry;rider.pathId='main';rider.laneOffset=-2.2;rider.speed=38;
  rider.x=curveAt(entry,g.route)+rider.laneOffset;rider.vehicle.group.position.set(rider.x,0,entry);
  car.z=entry;car.pathId='main';car.laneOffset=3.95;car.speed=26;
  car.x=curveAt(entry,g.route)+car.laneOffset;car.vehicle.group.position.set(car.x,0,entry);
  g.player.z=entry-75;g.player.x=curveAt(g.player.z,g.route);
  g.updateAI(1/60);g.updateTraffic(1/60);
  const riderEntered=rider.pathId===fork.id,carEntered=car.pathId===fork.id;
  const near={riderError:Math.abs(rider.x-roadCenter(g.route,rider.z,fork.id)-rider.laneOffset),carError:Math.abs(car.x-roadCenter(g.route,car.z,fork.id)-car.laneOffset)};
  // Separate the two NPCs visually so the screenshot and matrix checks are stable.
  const mid=(fork.start+fork.end)/2;
  for(const [vehicle,offset] of [[rider,-2.2],[car,3.95]]){
   vehicle.z=mid+offset*3;vehicle.pathId=fork.id;vehicle.laneOffset=offset;
   vehicle.x=roadCenter(g.route,vehicle.z,fork.id)+offset;vehicle.vehicle.group.position.set(vehicle.x,0,vehicle.z);
  }
  g.updateAI(1/60);g.updateTraffic(1/60);
  const midState={
   riderPath:rider.pathId,carPath:car.pathId,
   riderError:Math.abs(rider.x-roadCenter(g.route,rider.z,fork.id)-rider.laneOffset),
   carError:Math.abs(car.x-roadCenter(g.route,car.z,fork.id)-car.laneOffset),
   riderMatrix:rider.vehicle.group.matrixWorld.determinant(),
   carMatrix:car.vehicle.group.matrixWorld.determinant()
  };
  g.player.z=mid+50;g.player.pathId=fork.id;g.player.x=roadCenter(g.route,g.player.z,fork.id);
  g.player.speed=45;g.spawnPolice();
  const initialPolicePath=g.police.pathId,initialPoliceX=g.police.x;
  g.updatePolice(1/60);
  const copState={path:g.police?.pathId,error:g.police?Math.abs(g.police.x-roadCenter(g.route,g.police.z,g.police.pathId)-g.police.laneOffset):Infinity};
  // A second officer on the main road cannot instantly jump to another road at midpoint.
  g.dismissPolice();g.policeNext=Infinity;g.spawnPolice();
  g.police.pathId='main';g.police.z=mid;g.police.x=roadCenter(g.route,mid,'main')+g.police.laneOffset;
  g.police.vehicle.group.position.set(g.police.x,0,mid);
  g.updatePolice(1/60);
  const noTeleport=g.police?.pathId==='main';
  g.playerBike.group.position.set(g.player.x,0,g.player.z);
  g.updateHUD();g.cameraDirector.reset(frameCamera({player:g.player,route:g.route,mode:'chase'}));g.scene.updateMatrixWorld(true);
  g.renderer.render(g.scene,g.camera);
  return {fork:fork.id,riderEntered,carEntered,near,midState,initialPolicePath,initialPoliceX,copState,noTeleport,hud:document.getElementById('road-branch').textContent,glError:g.renderer.getContext().getError()};
 });
 console.log('NPC FORKS CHROMIUM:',JSON.stringify(state));
 assert.ok(state.riderEntered&&state.carEntered,'rider and traffic must turn at entrance');
 assert.ok(state.near.riderError<.01&&state.near.carError<.01);
 assert.equal(state.midState.riderPath,state.fork);
 assert.equal(state.midState.carPath,state.fork);
 assert.ok(state.midState.riderError<.01&&state.midState.carError<.01);
 assert.ok(Number.isFinite(state.midState.riderMatrix)&&Number.isFinite(state.midState.carMatrix));
 assert.equal(state.initialPolicePath,state.fork,'police spawned on the player alternative road');
 assert.equal(state.copState.path,state.fork);
 assert.ok(state.copState.error<.01);
 assert.equal(state.noTeleport,true);
 assert.match(state.hud,/ROTA ALTERNATIVA/);
 assert.equal(state.glError,0);
 assert.deepEqual(errors,[]);
 await page.screenshot({path:path.join(root,'tests/npc-fork-render.png')});
 console.log('SUCESSO: IA de motos, carros e policia transitando por caminhos alternativos no WebGL');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
