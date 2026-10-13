import {readFile} from 'node:fs/promises';
import {checkAirPods} from './airpods.mjs';
const c=JSON.parse(await readFile(new URL('./fixtures/live-run-1254.json',import.meta.url)));
const result=await checkAirPods({observation:c,transport:{searchCatalog:async()=>c.search_response,getProduct:async()=>c.product_response}});
console.log(JSON.stringify({execution:'local normalization of captured live browser responses; NOT a new fetch',...result},null,2));
