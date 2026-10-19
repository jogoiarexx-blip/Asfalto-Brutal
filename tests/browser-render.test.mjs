import {chromium} from 'playwright';
import fs from 'node:fs';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const types={'.html':'text/html','.css':'text/css','.js':'application/javascript','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{
 let url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(url==='/')url='/index.html';
 const dest=path.resolve(root,'.'+url);
 if(!dest.startsWith(root+path.sep)){res.writeHead(403).end();return}
 fs.readFile(dest,(err,buf)=>{if(err){res.writeHead(404).end();return}
 res.writeHead(200,{'Content-Type':types[path.extname(dest)]||'text/plain'}).end(buf)});
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
try {
 const page=await browser.newPage({viewport:{width:1366,height:768}});
 page.on('pageerror',err=>console.log('PAGE ERROR',err.message));
 await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js',route=>route.fulfill({path:path.join(root,'node_modules/three/build/three.module.js'),contentType:'application/javascript',headers:{'access-control-allow-origin':'*'}}));
 await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'load'});
 await page.waitForFunction(()=>window.__asfaltoBooted===true,{timeout:30000});
 const result=await page.evaluate(()=>{
  const g=window.asfaltoGame;
  g.start();g.mode='race';g.renderer.setAnimationLoop(null);
  g.updatePlayerModel(.016,false);g.updateCamera(.016);g.scene.updateMatrixWorld(true);
  const pitch=g.playerBike.lean.rotation.x,matrixDet=g.playerBike.lean.matrixWorld.determinant();
  const r=g.renderer,gl=r.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight;
  const on=new Uint8Array(w*h*4),off=new Uint8Array(w*h*4),savedAutoClear=r.autoClear;
  r.autoClear=false;
  try{
   r.clear(true,true,true);r.render(g.scene,g.camera);
   gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,on);
   g.playerBike.group.visible=false;
   r.clear(true,true,true);r.render(g.scene,g.camera);
   gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,off);
  }finally{g.playerBike.group.visible=true;r.autoClear=savedAutoClear}
  let changed=0,minX=w,minY=h,maxX=0,maxY=0;
  for(let i=0;i<on.length;i+=4){
   if(Math.abs(on[i]-off[i])+Math.abs(on[i+1]-off[i+1])+Math.abs(on[i+2]-off[i+2])<36)continue;
   const pixel=i/4,x=pixel%w,y=Math.floor(pixel/w);
   changed++;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
  }
  r.render(g.scene,g.camera);
  return {pitch,matrixDet,changed,bounds:[minX,minY,maxX,maxY],w,h,attached:g.playerBike.group.parent===g.scene,
          renderer:gl.getParameter(gl.VERSION),error:gl.getError()};
 });
 console.log('REAL PLAYER THREE.JS GPU TEST:',JSON.stringify(result));
 await page.screenshot({path:path.join(root,'tests/browser-render.png')});
 if(!Number.isFinite(result.pitch)||!Number.isFinite(result.matrixDet)||!result.attached||result.changed<500||(result.bounds[2]-result.bounds[0])<14||(result.bounds[3]-result.bounds[1])<24)
  throw Error('Motorcycle not visible on real GPU: '+JSON.stringify(result));
 console.log('SUCESSO: MOTO REAL 3D VISIVEL NO CHROMIUM WEBGL');
} finally {await browser.close();await new Promise(resolve=>server.close(resolve))}
