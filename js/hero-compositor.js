/**
 * Rider-isolated draw pass for Three.js WebGLRenderer.
 *
 * WHY: A bike's fake ground shadow is a separate object; its visibility alone
 * did not establish that its 3D rider was actually drawn. Older builds kept
 * the hero in the world depth buffer and repeatedly 'fixed' .visible, while
 * scene geometry could still cover the rider. Draw the rider LAST with a fresh
 * depth buffer, retaining the ground contact shadow in the ordinary scene.
 *
 * Only the player uses the second pass. World, rivals, roads, hitboxes,
 * animation and input are otherwise unchanged. Never clear the COLOR buffer
 * between passes, and restore the renderer's original autoClear setting.
 */
export function renderWorldAndHero(renderer, world, hero, camera, onPass = null, heroDraw = null) {
 if (!renderer || !world || !hero || !camera) return false;
 const previousAutoClear = renderer.autoClear;
 try {
  renderer.autoClear = false;
  renderer.clear(true, true, true);
  renderer.render(world, camera);
  if(onPass)onPass('world');
  renderer.clearDepth();
  if(heroDraw)heroDraw(); else renderer.render(hero, camera);
  if(onPass)onPass('hero');
  return true;
 } finally {
  renderer.autoClear = previousAutoClear;
 }
}

/** Per-scene lighting: materials need lights after moving to the overlay scene. */
export function syncHeroLighting(world, heroHemi, heroSun) {
 if (!world || !heroHemi || !heroSun) return;
 const hemi=world.hemi, sun=world.sun;
 if (hemi) {
  heroHemi.intensity=hemi.intensity;
  heroHemi.color.copy(hemi.color);
  heroHemi.groundColor.copy(hemi.groundColor);
 }
 if (sun) {
  heroSun.intensity=sun.intensity;
  heroSun.color.copy(sun.color);
  heroSun.position.copy(sun.position);
 }
}

export function heroSceneHealth(vehicle, scene) {
 let meshes=0,visible=0,invalid=0;
 if(vehicle?.lean?.traverse)vehicle.lean.traverse(o=>{
  if(!o.isMesh)return;
  meshes++;
  let v=o;
  let shown=true;
  while(v){if(v.visible===false){shown=false;break}if(v===vehicle.lean)break;v=v.parent}
  if(shown)visible++;
  if(!o.geometry || o.geometry.attributes?.position?.count===0)invalid++;
 });
 return {attached:!!vehicle?.group&&vehicle.group.parent===scene,meshes,visible,invalid};
}
