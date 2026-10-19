
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const game=fs.readFileSync(path.join(root,'js/game.js'),'utf8');
const input=fs.readFileSync(path.join(root,'js/input.js'),'utf8');
assert.match(game,/Number\.isFinite\(b\.lean\.rotation\.x\)/);
assert.match(game,/const braking=!!this\.input\.braking,accelerating=!!this\.input\.accelerating/);
assert.match(game,/this\.renderer\.render\(this\.scene,this\.camera\)/);
assert.match(game,/this\.scene\.add\(this\.playerBike\.group\)/);
assert.doesNotMatch(game,/HeroSafeOverlay|HeroPixelProbe|playerView3D|renderWorldAndHero/);
assert.match(input,/get accelerating\(\)\{return !!\(/);
assert.match(input,/get braking\(\)\{return !!\(/);
assert.ok(!fs.existsSync(path.join(root,'js/hero-safe-overlay.js')));
console.log('Regressão moto invisível: entrada booleana, matriz finita, render 3D nativo OK');
