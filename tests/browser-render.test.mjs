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
 page.on('pageerror',e=>console.log('PAGE ERROR',e.message));page.on('console',m=>{if(m.type()==='error')console.log('THREE SHADER ERROR',m.text())});
 await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js',route=>route.fulfill({path:path.join(root,'node_modules/three/build/three.module.js'),contentType:'application/javascript',headers:{'access-control-allow-origin':'*'}}));
 await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'load'});
 await page.waitForFunction(()=>window.__asfaltoBooted===true,{timeout:30000});
 const data=await page.evaluate(async()=>{
  const game=window.asfaltoGame;game.start();game.mode='race';game.renderer.setAnimationLoop(null);game.updatePlayerModel(.016,false);game.updateCamera(.016);const leanBeforeWasInvalid=!Number.isFinite(game.playerBike.lean.rotation.x);game.playerBike.lean.rotation.x=0;
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
   const oldColor=r.getClearColor(new three.Color()).clone(),oldAlpha=r.getClearAlpha();
   r.setClearColor(0x00ff00,1);
   r.clear(true,true,true);const blank=new Uint8Array(w*h*4);
   gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,blank);
   game.playerView3D.draw(r,game.heroScene,game.camera,game.playerBike,game.player);
   const bikeIsolated=new Uint8Array(w*h*4);
   gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,bikeIsolated);
   const marker=new three.Mesh(new three.BoxGeometry(1.8,1.8,1.8),new three.MeshBasicMaterial({color:0xff0000,depthTest:false,depthWrite:false,side:three.DoubleSide}));
   marker.position.set(0,1.25,0);marker.frustumCulled=false;marker.renderOrder=999;
   game.playerBike.lean.add(marker);
   r.clear(true,true,true);game.playerView3D.draw(r,game.heroScene,game.camera,game.playerBike,game.player);
   const markerPixels=new Uint8Array(w*h*4);
   gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,markerPixels);
   game.playerBike.lean.remove(marker);marker.geometry.dispose();marker.material.dispose();
   const unique=new Set();game.playerBike.group.traverse(o=>{if(o.isMesh){for(const mat of (Array.isArray(o.material)?o.material:[o.material]))unique.add(mat)}});
   const materials=[...unique].filter(Boolean),savedMaterials=materials.map(m=>({m,depthTest:m.depthTest,depthWrite:m.depthWrite,side:m.side}));
   for(const m of materials){m.depthTest=false;m.depthWrite=false;m.side=three.DoubleSide;m.needsUpdate=true;}
   r.clear(true,true,true);game.playerView3D.draw(r,game.heroScene,game.camera,game.playerBike,game.player);
   const depthOff=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,depthOff);
   for(const s of savedMaterials){s.m.depthTest=s.depthTest;s.m.depthWrite=s.depthWrite;s.m.side=s.side;s.m.needsUpdate=true;}
   const simple=new three.MeshBasicMaterial({color:0xff0000,depthTest:false,depthWrite:false,side:three.DoubleSide});
   const originalMeshes=[];game.playerBike.group.traverse(o=>{if(o.isMesh){originalMeshes.push({o,material:o.material});o.material=simple;}});
   r.clear(true,true,true);game.playerView3D.draw(r,game.heroScene,game.camera,game.playerBike,game.player);
   const basicOff=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,basicOff);
   for(const s of originalMeshes)s.o.material=s.material;
   simple.dispose();
   const deltaCount=buf=>{let n=0;for(let i=0;i<buf.length;i+=4){if(Math.abs(buf[i]-blank[i])+Math.abs(buf[i+1]-blank[i+1])+Math.abs(buf[i+2]-blank[i+2])>30)n++;}return n};
   const depthOffPixels=deltaCount(depthOff),basicMaterialPixels=deltaCount(basicOff),totalParts=originalMeshes.length,materialTypes=[...new Set(materials.map(m=>m.type))];
   r.clear(true,true,true);r.render(game.heroScene,game.camera);
   const cubeIsolated=new Uint8Array(w*h*4);
   gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,cubeIsolated);
   r.setClearColor(oldColor,oldAlpha);
   let bikeOnBlank=0,cubeOnBlank=0,markerOnBlank=0,blankCorner=[],bikeCorner=[],cubeCorner=[];
   for(let i=0;i<blank.length;i+=4){
     if(Math.abs(blank[i]-bikeIsolated[i])+Math.abs(blank[i+1]-bikeIsolated[i+1])+Math.abs(blank[i+2]-bikeIsolated[i+2])>30)bikeOnBlank++;
     if(Math.abs(blank[i]-markerPixels[i])+Math.abs(blank[i+1]-markerPixels[i+1])+Math.abs(blank[i+2]-markerPixels[i+2])>30)markerOnBlank++;
     if(Math.abs(blank[i]-cubeIsolated[i])+Math.abs(blank[i+1]-cubeIsolated[i+1])+Math.abs(blank[i+2]-cubeIsolated[i+2])>30)cubeOnBlank++;
   }
   for(const buffer of [blank,bikeIsolated,cubeIsolated])blankCorner.push([...buffer.subarray(0,4)]);
   let changed=0,minX=w,minY=h,maxX=0,maxY=0;
   for(let i=0;i<before.length;i+=4){
    const diff=Math.abs(before[i]-after[i])+Math.abs(before[i+1]-after[i+1])+Math.abs(before[i+2]-after[i+2]);
    if(diff<32)continue;
    const pixel=i/4,x=pixel%w,y=Math.floor(pixel/w);changed++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
   }
   return {drawn,changed,leanBeforeWasInvalid,bounds:[minX,minY,maxX,maxY],coloredBefore,coloredAfter,cubeChanged,bikeOnBlank,cubeOnBlank,markerOnBlank,depthOffPixels,basicMaterialPixels,totalParts,materialTypes,leanScale:[...game.playerBike.lean.scale],leanMatrixDet:game.playerBike.lean.matrixWorld.determinant(),leanPosition:[...game.playerBike.lean.position],blankCorner,w,h,attached:game.playerBike.group.parent===game.heroScene,
     restored:Math.abs(game.playerBike.group.position.x-game.player.x)<.02&&Math.abs(game.playerBike.group.position.z-game.player.z)<.02,renderer:gl.getParameter(gl.VERSION),error:gl.getError()};
  }finally{r.autoClear=wasAuto}
 });
 console.log('3D PLAYER GPU PIXEL TEST:',JSON.stringify(data));
 await page.screenshot({path:path.join(root,'tests/browser-render.png')});
 if(!data.drawn||!data.attached||!data.restored||data.changed<500||(data.bounds[2]-data.bounds[0])<14||(data.bounds[3]-data.bounds[1])<25)throw Error('Motorcycle did not draw on GPU: '+JSON.stringify(data));
 console.log('PLAYER REAL THREE.JS MOTORCYCLE RENDERED ON WEBGL');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
