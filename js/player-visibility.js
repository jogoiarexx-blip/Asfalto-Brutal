/**
 * Player-specific visibility safeguards.
 * The fake ground shadow is a sibling of the actual bike body. Seeing the
 * circle does NOT guarantee that the model itself is visible.
 * All work is done only at construction/recovery, never per-frame per mesh.
 */
export function preparePlayerVehicle(vehicle) {
 if (!vehicle?.group || !vehicle?.lean || !vehicle?.rider) return 0;
 vehicle.group.visible = true;
 vehicle.lean.visible = true;
 vehicle.rider.visible = true;
 let visibleMeshes = 0;
 vehicle.lean.traverse(object => {
  if (!object.isMesh) return;
  // Animated rider limbs, procedural parts and decals should not disappear
  // as a group when Three.js tests rapidly-changing local bounds.
  object.frustumCulled = false;
  if (object.visible) visibleMeshes++;
 });
 // Only the soft circle is allowed underneath the road. The rest of the
 // vehicle remains normal depth-tested 3D geometry, never an HUD overlay.
 if (vehicle.shadow) {
  vehicle.shadow.frustumCulled = false;
  vehicle.shadow.renderOrder = -1;
 }
 return visibleMeshes;
}

/** Restore only accidental disappearance; preserve the rider-ejection state. */
export function ensurePlayerVehicle(vehicle, falling = false) {
 if (!vehicle?.group || !vehicle?.lean) return false;
 let changed = !vehicle.group.visible || !vehicle.lean.visible;
 vehicle.group.visible = true;
 vehicle.lean.visible = true;
 if (vehicle.rider && !falling && !vehicle.rider.visible) {
  vehicle.rider.visible = true;
  changed = true;
 }
 return changed;
}

/** NDC check including a small safe margin; invalid projections require a reset. */
export function playerOutsideView(projected) {
 if (!projected) return true;
 const {x, y, z} = projected;
 return !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)
  || x < -0.84 || x > 0.84 || y < -0.76 || y > 0.88 || z < -1 || z > 1;
}
