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
 fs.readFile(dest,(error,bytes)=>{if(error){res.writeHead(404).end();return}
  res.writeHead(200,{'Content-Type':types[path.extname(dest)]||'text/plain'}).end(bytes)});
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:760}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js',route=>route.fulfill({path:path.join(root,'node_modules/three/build/three.module.js'),contentType:'application/javascript',headers:{'access-control-allow-origin':'*'}}));
 await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'load'});
 await page.waitForFunction(()=>window.__asfaltoBooted===true,{timeout:30000});
 const data=await page.evaluate(async()=>{
  const g=window.asfaltoGame;
  const {forksFor,roadCenter}=await import('./js/road-network.js');
  g.quality='low';g.start();g.mode='race';g.renderer.setAnimationLoop(null);g.rivals=[];g.traffic=[];g.pickups=[];g.input.reset();
  const forks=forksFor(g.route);
  const sceneForks=g.world.children.filter(o=>o.name?.startsWith('FORK_')).map(o=>o.name);
  const sections=[];
  for(const [i,fork] of forks.entries()){
   g.checkpoints.passed=i+1;
   g.player.z=(fork.start+fork.end)/2;
   g.player.x=roadCenter(g.route,g.player.z,fork.id);
   g.player.pathId='main';
   g.player.speed=40;g.player.steer=0;g.player.lateralVelocity=0;g.player.slideVelocity=0;
   g.simulate(1/60);g.updateHUD();g.updateCamera(.016);g.scene.updateMatrixWorld(true);
   sections.push({id:fork.id,path:g.player.pathId,centerError:Math.abs(g.player.x-roadCenter(g.route,g.player.z,fork.id)),worldElements:sceneForks.filter(n=>n.startsWith('FORK_'+fork.id)).length,hud:document.getElementById('road-branch').textContent,visible:!document.getElementById('road-branch').classList.contains('hidden'),matrix:g.playerBike.group.matrixWorld.determinant()});
  }
  g.renderer.render(g.scene,g.camera);
  return {sections,errors:[],gl:g.renderer.getContext().getError()};
 });
 console.log('ROAD FORKS CHROMIUM:',JSON.stringify(data));
 assert.equal(data.sections.length,3);
 for(const s of data.sections){
  assert.equal(s.path,s.id,'motorcycle must select alternative branch');
  assert.ok(s.centerError<.5,'motorcycle must remain on branch road');
  assert.ok(s.worldElements>=5,'visible alternative geometry and signs must exist');
  assert.ok(s.visible,'HUD must mention branch');
  assert.match(s.hud,/ROTA ALTERNATIVA/);
  assert.ok(Number.isFinite(s.matrix)&&s.matrix!==0,'rider and motorcycle must retain valid 3D matrices');
 }
 assert.equal(data.gl,0,'WebGL should have no error');
 assert.deepEqual(errors,[]);
 await page.screenshot({path:path.join(root,'tests/road-fork-render.png')});
 console.log('SUCESSO: ramais reais 3D, fisica e HUD no Chromium');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
