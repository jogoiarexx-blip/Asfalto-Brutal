/** Rendering budget independent from the Three.js renderer. Validated in Node tests. */
export const RENDER_PRESETS = Object.freeze({
 low: Object.freeze({pixelRatio:1,shadows:false,shadowMapSize:0,props:0,vehicleDetail:'low'}),
 medium: Object.freeze({pixelRatio:1.15,shadows:false,shadowMapSize:0,props:1,vehicleDetail:'medium'}),
 high: Object.freeze({pixelRatio:1.5,shadows:true,shadowMapSize:1024,props:2,vehicleDetail:'high'}),
 ultra: Object.freeze({pixelRatio:1.85,shadows:true,shadowMapSize:2048,props:3,vehicleDetail:'ultra'})
});
export function automaticQuality({cores=4,width=1280,height=720,reducedMotion=false}={}){
 if(reducedMotion||cores<=4||width<750||height<450)return 'low';
 if(cores<=6||width<1100)return 'medium';
 return 'high';
}
export function graphicsProfile(quality='auto',{cores=4,width=1280,height=720,reducedMotion=false,devicePixelRatio=1,autoScale=1,shadows='auto'}={}){
 const resolved=quality in RENDER_PRESETS?quality:automaticQuality({cores,width,height,reducedMotion});
 const base=RENDER_PRESETS[resolved];
 const enabled=shadows==='off'?false:shadows==='on'?true:base.shadows;
 // Avoid very large shadow render targets when a low-end machine forces shadows on.
 const shadowMapSize=enabled?(base.shadowMapSize||512):0;
 return Object.freeze({...base,quality:resolved,shadows:enabled,shadowMapSize,pixelRatio:Math.max(.5,Math.min(Number(devicePixelRatio)||1,base.pixelRatio)*Math.min(1,Math.max(.60,autoScale)))});
}
