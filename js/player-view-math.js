/** Bound the real Three.js motorcycle to the camera frustum, not a 2D fallback. */
export function bikeViewCoordinates({ndcX=0,ndcY=0,distance=12,fov=70,aspect=1.6}={}) {
 const finite=(v,fallback)=>Number.isFinite(v)?v:fallback;
 const clip=(v,a,b)=>Math.max(a,Math.min(b,v));
 const depth=clip(finite(distance,12),8.5,16);
 const yNdc=clip(finite(ndcY,0),-.55,.5),xNdc=clip(finite(ndcX,0),-.65,.65);
 const tan=Math.tan(clip(finite(fov,70),45,85)*Math.PI/360);
 return {depth,xNdc,yNdc,x:xNdc*depth*tan*clip(finite(aspect,1.6),.6,3.2),y:yNdc*depth*tan};
}
