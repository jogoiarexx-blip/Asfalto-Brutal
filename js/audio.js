export class AudioSystem{
 constructor(){this.ctx=null;this.enabled=true;this.osc=null;this.gain=null;this.filter=null;this.noise=null;this.noiseGain=null;this.sirenOsc=null;this.sirenGain=null;}
 start(){if(!this.enabled)return;try{if(!this.ctx){const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;this.ctx=new Ctx();this.osc=this.ctx.createOscillator();this.osc.type='sawtooth';this.filter=this.ctx.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=280;this.gain=this.ctx.createGain();this.gain.gain.value=.0001;this.osc.connect(this.filter);this.filter.connect(this.gain);this.gain.connect(this.ctx.destination);this.osc.start();this.osc.frequency.value=58;
    this.sirenOsc=this.ctx.createOscillator();this.sirenOsc.type='triangle';
    this.sirenGain=this.ctx.createGain();this.sirenGain.gain.value=.0001;
    this.sirenOsc.connect(this.sirenGain);this.sirenGain.connect(this.ctx.destination);
    this.sirenOsc.frequency.value=700;this.sirenOsc.start();}this.ctx.resume()}catch(e){console.warn('Áudio desativado:',e.message)}}
 update(speed,boosting,active){if(!this.ctx||!this.osc)return;const t=this.ctx.currentTime;this.osc.frequency.setTargetAtTime(56+speed*2.3+(boosting?70:0),t,.11);this.filter.frequency.setTargetAtTime(220+speed*19+(boosting?500:0),t,.15);this.gain.gain.setTargetAtTime(this.enabled&&active?.025:0.0001,t,.07)}
 siren(active=false,relativeDistance=0){
  if(!this.ctx||!this.sirenOsc)return;
  const t=this.ctx.currentTime, sweep=Math.sin(t*8)*155;
  this.sirenOsc.frequency.setTargetAtTime(690+sweep,t,.08);
  const fade=active&&this.enabled?Math.max(.003,.016*(1-Math.min(1,Math.abs(relativeDistance)/130))):.0001;
  this.sirenGain.gain.setTargetAtTime(fade,t,.18);
 }
 tone(freq=450,duration=.12,type='square',gain=.05){if(!this.ctx||!this.enabled)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,this.ctx.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(40,freq*.55),this.ctx.currentTime+duration);g.gain.setValueAtTime(gain,this.ctx.currentTime);g.gain.exponentialRampToValueAtTime(.0001,this.ctx.currentTime+duration);o.connect(g);g.connect(this.ctx.destination);o.start();o.stop(this.ctx.currentTime+duration+.02)}
 hit(){this.tone(105,.21,'sawtooth',.10);this.tone(68,.25,'square',.06)}
 weaponSwing(id='chain'){
  const freq={chain:290,club:175,pipe:225,machete:350,baton:270}[id]||230;
  this.tone(freq,.13,id==='club'?'triangle':'sawtooth',.036);
 }
 weaponImpact(id='chain'){
  const freq={chain:128,club:80,pipe:165,machete:195,baton:145}[id]||110;
  this.tone(freq,.23,'sawtooth',.075);this.tone(freq*1.9,.095,'triangle',.045);
 }
 kick(){this.weaponSwing('club')}
 pickup(){this.tone(680,.11,'sine',.06);setTimeout(()=>this.tone(920,.14,'sine',.04),110)}
 toggle(){this.enabled=!this.enabled;if(this.enabled)this.start();else this.siren(false);return this.enabled}
}
