import assert from 'node:assert/strict';
import {graphicsProfile,automaticQuality,RENDER_PRESETS} from '../js/graphics-quality.js';
import {architectureLayout} from '../js/roadside-architecture-layout.js';
import {RACE_LENGTH} from '../js/config.js';

assert.equal(automaticQuality({cores:2,width:1900,height:1080}),'low');
assert.equal(automaticQuality({cores:4,width:1024,height:768}),'low');
assert.equal(automaticQuality({cores:6,width:1900,height:1080}),'medium');
assert.equal(automaticQuality({cores:8,width:1900,height:1080}),'high');
assert.equal(automaticQuality({cores:8,width:600,height:1080}),'low');
assert.equal(automaticQuality({cores:8,width:1900,height:1080,reducedMotion:true}),'low');
for(const mode of Object.keys(RENDER_PRESETS)){
 const p=graphicsProfile(mode,{devicePixelRatio:3,autoScale:1});
 assert.equal(p.quality,mode);assert.ok(p.pixelRatio<=RENDER_PRESETS[mode].pixelRatio);
 assert.equal(p.shadows,RENDER_PRESETS[mode].shadows);
 assert.equal(p.shadowMapSize,p.shadows?RENDER_PRESETS[mode].shadowMapSize:0);
 assert.ok(Object.isFrozen(p));
}
assert.equal(graphicsProfile('auto',{cores:2}).quality,'low');
assert.equal(graphicsProfile('ultra',{shadows:'off'}).shadows,false);
assert.equal(graphicsProfile('low',{shadows:'on'}).shadowMapSize,512);
assert.equal(graphicsProfile('medium',{devicePixelRatio:2,autoScale:.6}).pixelRatio,1.15*.6);
assert.ok(graphicsProfile('high',{autoScale:.35}).pixelRatio>=.5);
for(const route of ['coast','desert','highlands']){
 const low=architectureLayout(route,'low'),med=architectureLayout(route,'medium'),high=architectureLayout(route,'high'),ultra=architectureLayout(route,'ultra');
 assert.equal(low.landmarks.length,0);
 assert.ok(med.landmarks.length<=high.landmarks.length&&high.landmarks.length<=ultra.landmarks.length);
 for(const plan of [med,high,ultra]){
  for(const l of plan.landmarks){assert.ok(l.offset>=18);assert.ok(l.z>0&&l.z<RACE_LENGTH)}
  for(const tunnel of plan.portals){assert.ok(tunnel.start>=0&&tunnel.start+tunnel.count*tunnel.step<RACE_LENGTH)}
 }
}
console.log('Perfis gráficos, orçamento de GPU, sombras e layout de construções: verificações OK.');
