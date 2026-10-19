import {heroSceneHealth} from './hero-compositor.js';
/** Debug panel is inert unless F9 or ?debug=1 is enabled. */
const fmt=n=>Number.isFinite(n)?n.toFixed(2):'--';
export function heroDiagnostic(game){
 const state=heroSceneHealth(game.playerBike,game.heroScene);
 const p=game.player||{}, camera=game.camera;
 return {
  version:'2.0.5',
  cameraMode:game.cameraMode,
  raceMode:game.mode,
  playerXYZ:[p.x,p.z,p.speed].map(fmt),
  heroAttached:state.attached, meshCount:state.meshes, visibleMeshes:state.visible, invalidMeshes:state.invalid,
  heroGroupVisible:!!game.playerBike?.group?.visible,
  heroBodyVisible:!!game.playerBike?.lean?.visible,
  riderVisible:!!game.playerBike?.rider?.visible,
  shadows:!!game.renderer.shadowMap.enabled,
  cameraXYZ:[camera?.position?.x,camera?.position?.y,camera?.position?.z].map(fmt),
  projectedHero:[game.heroProbe?.x,game.heroProbe?.y,game.heroProbe?.z].map(fmt),
  renderPath:'Three.js 3D model camera-relative',
  visual3D:game.playerView3D?.metrics||null,
  glCalls:game.renderer.info.render.calls,
  glTriangles:game.renderer.info.render.triangles,
  video:(()=>{try{const gl=game.renderer.getContext();return gl.getParameter(gl.VERSION)||'unavailable'}catch{return 'WebGL indisponível'}})()
 };
}
export function createHeroDebugPanel(){
 const div=document.createElement('pre');div.id='hero-debug';div.className='hero-debug hidden';div.setAttribute('role','status');
 div.setAttribute('aria-label','Diagnóstico 3D da moto');
 document.getElementById('game').append(div);return div;
}
export function updateHeroDebugPanel(panel,game){
 if(!panel||panel.classList.contains('hidden'))return;
 const data=heroDiagnostic(game);
 panel.textContent='MOTO / GPU — F9 OCULTA\n'+JSON.stringify(data,null,2)+'\n\nF9: diagnostico 3D real. Spector.js: GPU capture.';
}
