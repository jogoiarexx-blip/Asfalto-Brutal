/**
 * GPU readback probe for the player's motorcycle. The screenshot in v2.0.3
 * showed the vehicle had 77 draw calls but produced no visible color. Counting
 * meshes/draw calls cannot prove a fragment reached the framebuffer.
 *
 * Probe no more than once every ~1.6s (readPixels stalls the GPU); never
 * impact steering, collision or progression. If readback is disallowed, offer
 * a manual F10 safe-visual override rather than pretending it was successful.
 */
export function patchDifference(before,after,{channelThreshold=12,minPixels=16}={}){
 if(!before || !after || before.length!==after.length || before.length%4)return {valid:false,changed:0,pixels:0,visible:false};
 let changed=0;
 for(let i=0;i<before.length;i+=4){
  const amount=Math.abs(after[i]-before[i])+Math.abs(after[i+1]-before[i+1])+Math.abs(after[i+2]-before[i+2]);
  if(amount>=channelThreshold)changed++;
 }
 return {valid:true,changed,pixels:before.length/4,visible:changed>=Math.min(minPixels,Math.ceil(before.length/4*.05))};
}
export function sampleRect(ndcPoints,width,height,pad=8){
 if(!Array.isArray(ndcPoints)||!ndcPoints.length||width<10||height<10)return null;
 const screen=ndcPoints.filter(p=>p&&[p.x,p.y,p.z].every(Number.isFinite)&&p.z>=-1&&p.z<=1).map(p=>({x:(p.x+1)*.5*width,y:(p.y+1)*.5*height}));
 if(!screen.length)return null;
 const left=Math.max(0,Math.floor(Math.min(...screen.map(p=>p.x))-pad));
 const bottom=Math.max(0,Math.floor(Math.min(...screen.map(p=>p.y))-pad));
 const right=Math.min(width,Math.ceil(Math.max(...screen.map(p=>p.x))+pad));
 const top=Math.min(height,Math.ceil(Math.max(...screen.map(p=>p.y))+pad));
 // Avoid pathological allocations if the camera flips or goes unstable.
 if(right-left<2||top-bottom<2||right-left>width*.45||top-bottom>height*.48)return null;
 return {x:left,y:bottom,width:right-left,height:top-bottom};
}
export class HeroPixelProbe{
 constructor(){this.active=false;this.time=0;this.failures=0;this.successes=0;this.samples=0;this.changed=0;this.visible=null;this.supported=null;this.status='aguardando';this.rect=null;this.before=null;this.context=null;}
 shouldSample(dt,enabled=true){
  if(!enabled)return false;
  this.time+=Math.max(0,dt||0);
  if(this.time<1.6)return false;
  this.time=0;return true;
 }
 start(renderer,points){
  this.before=null;this.context=null;this.rect=null;
  try{
   const gl=renderer.getContext();if(!gl || !gl.readPixels)throw Error('Readback indisponível');
   const rect=sampleRect(points,gl.drawingBufferWidth,gl.drawingBufferHeight,12);
   if(!rect)throw Error('Área da moto fora do buffer');
   const before=new Uint8Array(rect.width*rect.height*4);
   gl.readPixels(rect.x,rect.y,rect.width,rect.height,gl.RGBA,gl.UNSIGNED_BYTE,before);
   if(gl.getError&&gl.getError()!==gl.NO_ERROR)throw Error('Falha de leitura WebGL');
   this.context=gl;this.rect=rect;this.before=before;this.supported=true;
  }catch(e){this.status=String(e?.message||e);this.supported=false;this.before=null;this.failures++;this.samples++;if(this.failures>=2)this.active=true;}
 }
 finish(){
  if(!this.before||!this.context||!this.rect)return null;
  const gl=this.context,rect=this.rect;let result;
  try{
   const after=new Uint8Array(this.before.length);
   gl.readPixels(rect.x,rect.y,rect.width,rect.height,gl.RGBA,gl.UNSIGNED_BYTE,after);
   if(gl.getError&&gl.getError()!==gl.NO_ERROR)throw Error('Falha de leitura do herói');
   result=patchDifference(this.before,after,{minPixels:35});
   this.samples++;this.changed=result.changed;this.visible=result.visible;
   this.failures=result.visible?0:this.failures+1;
   this.successes=result.visible?this.successes+1:0;
   if(this.failures>=2)this.active=true;
   if(this.successes>=2)this.active=false;
   this.status=result.visible?'Pixels de moto detectados':'Sem alteração de pixels na área da moto';
  }catch(e){this.supported=false;this.status=String(e?.message||e);this.failures++;if(this.failures>=2)this.active=true;}
  finally{this.before=null;this.context=null;}
  return result||null;
 }
 reset(){this.active=false;this.failures=0;this.successes=0;this.visible=null;this.time=0;this.status='aguardando';}
}
