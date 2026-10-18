import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {graphicsProfile} from '../js/graphics-quality.js';
const dir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(dir,'..');
const game=readFileSync(path.join(root,'js/game.js'),'utf8');
const html=readFileSync(path.join(root,'index.html'),'utf8');
for(const file of ['js/game.js','js/world.js','js/graphics-quality.js']){
 const source=readFileSync(path.join(root,file),'utf8');
 assert.ok(!source.includes('PCFSoftShadowMap'),`${file}: modo removido pelo Three.js r186`);
}
assert.match(game,/renderer\.shadowMap\.type\s*=\s*THREE\.PCFShadowMap\s*;/);
assert.match(html,/three@0\.186\.1/);
assert.equal(graphicsProfile('high',{shadows:'auto'}).shadows,true);
assert.equal(graphicsProfile('low',{shadows:'auto'}).shadows,false);
assert.equal(graphicsProfile('low',{shadows:'on'}).shadows,true);
assert.equal(graphicsProfile('ultra',{shadows:'off'}).shadowMapSize,0);
console.log('Compatibilidade de sombras Three.js r186 e perfis gráficos: OK.');
