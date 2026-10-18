import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
let imports=0,domRefs=0;
for(const filename of fs.readdirSync(path.join(root,'js')).filter(f=>f.endsWith('.js'))){
 const file=path.join(root,'js',filename),code=fs.readFileSync(file,'utf8');
 for(const match of code.matchAll(/from\s+['"](\.\.?\/[^'"]+)['"]/g)){
  const target=path.resolve(path.dirname(file),match[1]);assert.ok(fs.existsSync(target),`${filename} imports missing ${match[1]}`);imports++;
 }
 for(const match of code.matchAll(/\$\('([a-z][\w-]+)'\)/g)){
  assert.ok(html.includes(`id="${match[1]}"`),`${filename}: missing HTML id ${match[1]}`);domRefs++;
 }
}
for(const key of ['left','right','hitLeft','hitRight','nitro','brake','accelerate','weaponNext'])assert.ok(html.includes(`data-control="${key}"`),`missing touch control ${key}`);
for(const mode of ['auto','low','medium','high','ultra'])assert.ok(html.includes(`value="${mode}"`));
assert.ok(html.includes('data-weapon="machete"'));
assert.ok(html.includes('data-weapon="baton"'));
console.log(`Integridade: ${imports} imports, ${domRefs} referências a elementos HTML, 8 controles touch e 5 níveis gráficos OK.`);
