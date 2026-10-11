import {stripTypeScriptTypes} from 'node:module';
import {mkdir, readFile, writeFile, copyFile, readdir, rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
for(const name of await readdir('src')) {
  if(!name.endsWith('.ts')) continue;
  const text=await readFile(`src/${name}`,'utf8');
  const js=stripTypeScriptTypes(text,{mode:'strip'}).replace(/(from\s+['"]\.\/[^'"]+)\.ts(['"])/g,'$1.js$2');
  await writeFile(`dist/${name.replace(/\.ts$/,'.js')}`,js);
}
for(const file of ['index.html','styles.css']) await copyFile(`public/${file}`,`dist/${file}`);
console.log('Built dist using Node TypeScript syntax stripping; static type checking is not included.');
