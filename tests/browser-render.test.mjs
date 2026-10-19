import {chromium} from 'playwright';
import fs from 'node:fs';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const types={'.html':'text/html','.css':'text/css','.js':'application/javascript','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{let url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(url==='/')url='/index.html';const dest=path.resolve(root,'.'+url);if(!dest.startsWith(root+path.sep)){res.writeHead(403).end();return}fs.readFile(dest,(error,buf)=>{if(error){res.writeHead(404).end();return}res.writeHead(200,{'Content-Type':types[path.extname(dest)]||'text/plain'}).end(buf)})});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1366,height:768}});
 page.on('pageerror',e=>console.log('PAGE ERROR',e.message));
 await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js',route=>route.fulfill({path:path.join(root,'node_modules/three/build/three.module.js'),contentType:'application/javascript',headers:{'access-control-allow-origin':'*'}}));
 await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'load'});
 await page.waitForFunction(()=>window.__asfaltoBooted===true,{timeout:30000});
 const data=await page.evaluate(async()=>{
  const game=window.asfaltoGame;game.start();game.mode='race';game.renderer.setAnimationLoop(null);game.updatePlayerModel(.016,false);game.updateCamera(.016);
  const r=game.renderer,gl=r.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight;
  const before=new Uint8Array(w*h*4),after=new Uint8Array(w*h*4),wasAuto=r.autoClear;r.autoClear=false;
  try{
   r.clear(true,true,true);r.render(game.scene,game.camera);
   gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,before);
   r.clearDepth();
   const drawn=game.playerView3D.draw(r,game.heroScene,game.camera,game.playerBike,game.player);
   gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,after);
   const three=await import('three');
   const testCube=new three.Mesh(new three.BoxGeometry(2,2,2),new three.MeshBasicMaterial({color:0xff00ff,depthTest:false,depthWrite:false,side:three.DoubleSide}));
   testCube.position.set(0,0,-8).applyMatrix4(game.camera.matrixWorld);
   testCube.frustumCulled=false;
   game.heroScene.add(testCube);
   r.render(game.heroScene,game.camera);
   const cubePixels=new Uint8Array(w*h*4);
   gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,cubePixels);
   game.heroScene.remove(testCube);testCube.geometry.dispose();testCube.material.dispose();
   let coloredBefore=0,coloredAfter=0,cubeChanged=0;
   for(let i=0;i<before.length;i+=4){
     if(before[i]+before[i+1]+before[i+2]>100)coloredBefore++;
     if(after[i]+after[i+1]+after[i+2]>100)coloredAfter++;
     if(Math.abs(cubePixels[i]-after[i])+Math.abs(cubePixels[i+1]-after[i+1])+Math.abs(cubePixels[i+2]-after[i+2])>30)cubeChanged++;
   }
   let changed=0,minX=w,minY=h,maxX=0,maxY=0;
   for(let i=0;i<before.length;i+=4){
    const diff=Math.abs(before[i]-after[i])+Math.abs(before[i+1]-after[i+1])+Math.abs(before[i+2]-after[i+2]);
    if(diff<32)continue;
    const pixel=i/4,x=pixel%w,y=Math.floor(pixel/w);changed++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
   }
   return {drawn,changed,bounds:[minX,minY,maxX,maxY],coloredBefore,coloredAfter,cubeChanged,w,h,attached:game.playerBike.group.parent===game.heroScene,
     restored:Math.abs(game.playerBike.group.position.x-game.player.x)<.02&&Math.abs(game.playerBike.group.position.z-game.player.z)<.02,renderer:gl.getParameter(gl.VERSION),error:gl.getError()};
  }finally{r.autoClear=wasAuto}
 });
 console.log('3D PLAYER GPU PIXEL TEST:',JSON.stringify(data));
 await page.screenshot({path:path.join(root,'tests/browser-render.png')});
 if(!data.drawn||!data.attached||!data.restored||data.changed<500||(data.bounds[2]-data.bounds[0])<14||(data.bounds[3]-data.bounds[1])<25)throw Error('Motorcycle did not draw on GPU: '+JSON.stringify(data));
 console.log('PLAYER REAL THREE.JS MOTORCYCLE RENDERED ON WEBGL');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
