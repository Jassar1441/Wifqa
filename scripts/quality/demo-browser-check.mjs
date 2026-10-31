import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';

// Run after npm run build and npm start. Only the local application is exercised.
const base=process.env.DEMO_URL??'http://127.0.0.1:4173';
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname),'Local demo URL required');
const output=resolve(process.argv[2]??'evidence/regional-demo');
await mkdir(output,{recursive:true});
const profile=await mkdtemp(join(tmpdir(),'wifqa-browser-'));
const browser=spawn(process.env.CHROME_BIN??'chromium',[
  '--headless','--no-sandbox',`--user-data-dir=${profile}`,'--disable-dev-shm-usage',
  '--disable-background-networking','--disable-component-update','--disable-sync',
  '--no-first-run','--no-default-browser-check','--no-proxy-server','--remote-debugging-port=0','about:blank',
],{stdio:'ignore'});
let socket;
const errors=[];
const results=[];
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try {
  let port;
  for(let attempt=0;attempt<100;attempt++){
    try{port=Number((await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);break;}
    catch{await pause(100);}
  }
  assert.ok(port,'Chromium did not start');
  const pages=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket=new WebSocket(pages.find(page=>page.url==='about:blank').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  let id=0;
  const pending=new Map();
  socket.onmessage=event=>{
    const data=JSON.parse(event.data);
    if(data.method==='Runtime.exceptionThrown')errors.push(data.params.exceptionDetails);
    const entry=pending.get(data.id);
    if(entry){clearTimeout(entry.timer);pending.delete(data.id);data.error?entry.reject(Error(JSON.stringify(data.error))):entry.resolve(data.result);}
  };
  const call=(method,params={})=>new Promise((resolve,reject)=>{
    const key=++id;
    const timer=setTimeout(()=>{pending.delete(key);reject(Error(`CDP timeout: ${method}`));},10000);
    pending.set(key,{resolve,reject,timer});socket.send(JSON.stringify({id:key,method,params}));
  });
  const evaluate=async expression=>{
    const result=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const waitFor=async expression=>{
    for(let attempt=0;attempt<100;attempt++){if(await evaluate(expression))return;await pause(100);}
    throw Error(`Page condition timed out: ${expression}`);
  };
  await call('Runtime.enable');await call('Page.enable');
  await call('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
  await call('Page.navigate',{url:base});
  await waitFor("document.querySelector('#summary')?.textContent.includes('الأول ضمن بيانات التجربة')");
  const snapshot=()=>evaluate(`({notice:document.querySelector('#data-notice').textContent,summary:document.querySelector('#summary').textContent,regions:document.querySelector('#city').options.length,body:document.body.innerText,rtl:document.documentElement.dir})`);
  let page=await snapshot();
  assert.equal(page.regions,13);assert.equal(page.rtl,'rtl');
  assert.match(page.notice,/بيانات تجريبية.*آخر تحديث/);
  assert.match(page.summary,/متجر الخصم غير المثبت/);
  assert.match(page.body,/موعد الوصول: مؤكد/);assert.match(page.body,/الشحن: غير معروف/);
  results.push({check:'initial Asir demo, labels, field evidence and unknown shipping',passed:true,notice:page.notice,summary:page.summary});
  await writeFile(join(output,'asir-desktop.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
  await evaluate("document.querySelector('#city').value='riyadh';document.querySelector('#city').dispatchEvent(new Event('change',{bubbles:true}))");
  await waitFor("document.querySelector('#summary').textContent.includes('متجر التغطية المحدودة')");
  page=await snapshot();assert.match(page.notice,/منطقة الرياض/);assert.match(page.body,/موعد الوصول: تقديري/);
  results.push({check:'Riyadh changes regional quotes and exposes estimated arrival',passed:true,notice:page.notice,summary:page.summary});
  await evaluate("document.querySelector('#city').value='jazan';document.querySelector('#city').dispatchEvent(new Event('change',{bubbles:true}))");
  await waitFor("document.querySelector('#summary').textContent.includes('منطقة جازان')");
  page=await snapshot();assert.match(page.summary,/لا عرض مستوفٍ/);
  await evaluate("document.querySelector('[data-priority=fastest]').click()");
  await waitFor("document.querySelector('#summary').textContent.includes('منطقة جازان') && !document.querySelector('#summary').textContent.includes('الأول ضمن')");
  assert.equal(await evaluate("document.querySelectorAll('.winner').length"),0);
  results.push({check:'unknown Jazan shipping cannot win cheapest or fastest',passed:true,summary:(await snapshot()).summary});
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await pause(200);
  assert.equal(await evaluate('document.documentElement.scrollWidth<=window.innerWidth'),true,'Mobile horizontal overflow');
  await writeFile(join(output,'jazan-mobile.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
  results.push({check:'390px mobile layout has no horizontal overflow',passed:true});
  assert.deepEqual(errors,[],'Uncaught browser exceptions');
  const report={passed:true,checks:results,browserErrors:errors};
  await writeFile(join(output,'browser.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
} finally {
  socket?.close();browser.kill('SIGTERM');
  await pause(200);browser.kill('SIGKILL');
  await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});
}
