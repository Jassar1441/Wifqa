import {spawnSync} from 'node:child_process';
import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const output=process.argv[2]??'verification.json';
const tests=(await readdir('tests')).filter(f=>f.endsWith('.test.ts')).sort().map(f=>`tests/${f}`);
tests.push('qa/tests/r36-shipping-regression.test.ts');
const commands=[['--test',...tests],['scripts/build.mjs'],['--check','dist/app.js'],['--check','dist/compare.js'],['--check','dist/ingest.js']];
const results=commands.map(args=>{const r=spawnSync(process.execPath,args,{encoding:'utf8'});return {command:['node',...args],exitCode:r.status,stdout:r.stdout??'',stderr:r.stderr??'',error:r.error?.message};});
const hashes={};
for(const dir of ['src','tests','scripts'])for(const name of (await readdir(dir)).sort()){const file=`${dir}/${name}`;if(name.includes('.'))hashes[file]=createHash('sha256').update(await readFile(file)).digest('hex');}
const report={verifiedAt:new Date().toISOString(),nodeVersion:process.version,checks:results,sourceSha256:hashes,passed:results.every(r=>r.exitCode===0),limitations:['No static TypeScript type check','No browser, mobile or RTL visual check','No live sources or purchase verification']};
await writeFile(resolve(output),JSON.stringify(report,null,2)+'\n');
console.log(`Verification saved: ${output}; passed=${report.passed}`);
if(!report.passed)process.exitCode=1;
