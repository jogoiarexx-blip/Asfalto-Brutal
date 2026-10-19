/**
 * 2D emergency display ONLY when WebGL reports hero draw calls but produces no
 * changed pixels. The real motorcycle stays in the 3D scene and drives the
 * physics, animation and shadow. This visibility fallback is intentionally
 * separate from the racing engine and never interferes with inputs.
 */
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export class HeroSafeOverlay{
 constructor(container){
  this.canvas=document.createElement('canvas');this.canvas.id='hero-safe-overlay';
  this.canvas.setAttribute('aria-hidden','true');this.canvas.style.display='none';
  container.appendChild(this.canvas);this.ctx=this.canvas.getContext('2d');this.w=0;this.h=0;this.ratio=1;
 }
 resize(){
  const w=Math.max(1,this.canvas.clientWidth),h=Math.max(1,this.canvas.clientHeight);
  const ratio=Math.min(1.35,devicePixelRatio||1);
  if(w!==this.w||h!==this.h||ratio!==this.ratio){this.w=w;this.h=h;this.ratio=ratio;this.canvas.width=Math.round(w*ratio);this.canvas.height=Math.round(h*ratio);this.ctx?.setTransform(ratio,0,0,ratio,0,0);}
 }
 draw({visible=false,player={},camera,worldPoint,fall=false,attackAge=Infinity,attackSide=0,boosting=false,model='street'}={}){
  if(!this.ctx)return;
  this.canvas.style.display=visible?'block':'none';if(!visible)return;
  this.resize();const c=this.ctx,w=this.w,h=this.h;c.clearRect(0,0,w,h);
  if(!camera || !worldPoint)return;
  // Position based on the real 3D world-to-clip transform, not hardcoded HUD pixels.
  const toXY=(v)=>({x:(v.x+1)*.5*w,y:(1-v.y)*.5*h});
  const ref=toXY(worldPoint);if(!Number.isFinite(ref.x)||!Number.isFinite(ref.y))return;
  const centerX=clamp(ref.x,55,w-55),groundY=clamp(ref.y,h*.34,h*.90);
  const S=clamp(h/730,.62,1.55);
  const lean=clamp((player.bank||0)*.95+(player.steer||0)*.13+(player.lateralVelocity||0)*.012,-.46,.46);
  c.save();c.translate(centerX,groundY);c.scale(S,S);c.rotate(lean);
  if(fall){c.translate(20,-8);c.rotate(.72)}
  const poly=(points,color,stroke='#081521',thickness=2)=>{
   c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=thickness;c.stroke();}
  };
  // Rear tire and mudguard. Keep this sufficiently contrasted over dark asphalt.
  c.shadowColor='#000c';c.shadowBlur=10;
  c.fillStyle='#080b11';c.beginPath();c.ellipse(0,-20,15,33,0,0,Math.PI*2);c.fill();c.shadowBlur=0;
  poly([[-19,-57],[19,-57],[24,-36],[17,-20],[-17,-20],[-24,-36]],'#283a48');
  poly([[-16,-47],[16,-47],[14,-29],[-14,-29]],model==='bulldog'?'#d89042':'#4286a5');
  c.fillStyle='#e62e47';c.fillRect(-12,-48,24,8);
  c.fillStyle='#eef6ff';c.fillRect(-10,-32,20,5);
  // Rear shock and footpegs.
  c.strokeStyle='#cbd6d8';c.lineWidth=5;
  for(const side of [-1,1]){c.beginPath();c.moveTo(side*13,-54);c.lineTo(side*31,-78);c.stroke();}
  // Boots and thighs are articulated with the bike lean.
  poly([[-24,-64],[-43,-37],[-34,-27],[-13,-52]],'#1a242d');
  poly([[24,-64],[43,-37],[34,-27],[13,-52]],'#1a242d');
  poly([[-39,-34],[-47,-24],[-29,-16],[-27,-30]],'#070e15');
  poly([[39,-34],[47,-24],[29,-16],[27,-30]],'#070e15');
  // Backpack / jacket silhouette; bright piping makes the motorcycle obvious.
  poly([[-27,-131],[-41,-111],[-35,-79],[-20,-62],[20,-62],[35,-79],[41,-111],[27,-131]],'#1b4054');
  poly([[-21,-119],[-22,-82],[-13,-70],[13,-70],[22,-82],[21,-119]],'#35627a');
  c.strokeStyle='#d9ff50';c.lineWidth=4;c.beginPath();c.moveTo(-20,-116);c.lineTo(-20,-89);c.moveTo(20,-116);c.lineTo(20,-89);c.stroke();
  c.fillStyle='#142130';c.fillRect(-9,-105,18,30);
  // Arms / weapon swings, using the same attack-side and age flags as 3D.
  const attack=clamp(1-attackAge/.34,0,1);const swing=Math.sin(attack*Math.PI);
  c.lineCap='round';
  for(const side of [-1,1]){
   const reach=side===attackSide?swing:0;
   c.strokeStyle='#1d3545';c.lineWidth=15;c.beginPath();c.moveTo(side*29,-118);c.lineTo(side*(40+reach*20),-91-reach*39);c.stroke();
   c.strokeStyle='#111a26';c.lineWidth=11;c.beginPath();c.moveTo(side*(40+reach*20),-91-reach*39);c.lineTo(side*(33+reach*48),-69-reach*55);c.stroke();
   c.fillStyle='#09131b';c.beginPath();c.arc(side*(33+reach*48),-69-reach*55,7,0,Math.PI*2);c.fill();
  }
  // Helmet and visor: deliberately bright as this is the visual safety mode.
  c.shadowColor='#d9ff5055';c.shadowBlur=8;
  c.fillStyle='#dcff50';c.beginPath();c.ellipse(0,-147,22,28,0,0,Math.PI*2);c.fill();
  c.shadowBlur=0;
  poly([[-19,-149],[19,-149],[18,-137],[-18,-137]],'#0b2530');
  c.fillStyle='#ebfbff';c.fillRect(-8,-166,16,4);
  if(boosting){c.fillStyle='#44d8ff';for(const side of [-1,1])poly([[side*10,-30],[side*18,-6],[side*5,8]],'#44d8ff',null);}
  c.restore();
  // Only this small label is displayed when the WebGL hero is known missing.
  c.font='bold 11px Arial';c.textAlign='center';c.fillStyle='#e9ff9b';
  c.fillText('MODO VISUAL SEGURO · F10',centerX,Math.max(28,groundY-184*S));
 }
}
