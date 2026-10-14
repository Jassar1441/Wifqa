/** Limited AirPods 4 discovery. No product ID, SKU or handle is supplied as input. */
export async function discoverAirPods({tools,names,query,clock=()=>new Date().toISOString()}) {
  if (!/airpods\s*4/i.test(query) || !/(without\s+anc|non[- ]anc|بدون\s+ANC|دون\s+ANC)/i.test(query)) throw new Error('Only explicit standard AirPods 4 without ANC is supported');
  if(!/^search_catalog__/.test(names.search)||!/^browse_store__/.test(names.browse)||!/^get_product__/.test(names.product)) throw new Error('Unsupported registration');
  const trace=[];
  async function call(name,input){const raw=await tools.call(name,input);const response=typeof raw==='string'?JSON.parse(raw):raw;if(response.isError||!response.structuredContent)throw new Error('Merchant response failed');trace.push({tool:name,input,observed_at:clock(),response:{structuredContent:response.structuredContent}});return response.structuredContent;}
  const search=await call(names.search,{catalog:{query:'AirPods 4',pagination:{limit:10}}});
  if(!Array.isArray(search.products))throw new Error('Invalid search response');
  let products=search.products;let fallback=false;
  const isCandidate=p=>p.vendor==='Apple'&&/^AirPods\s+4$/i.test(p.title?.trim()??'');
  if(!products.some(isCandidate)){
    fallback=true;
    const groups=await call(names.browse,{navigate:false});
    const matches=groups.collections?.filter(c=>/^AirPods?$/i.test(c.title?.trim()??''))??[];
    if(matches.length!==1)throw new Error('No unambiguous headphone collection');
    const group=matches[0];
    if(typeof group.handle!=='string'||!group.handle)throw new Error('Missing discovered collection handle');
    const listing=await call(names.browse,{collection:group.handle,navigate:false,page:1});
    if(!Array.isArray(listing.products))throw new Error('Invalid collection response');
    products=listing.products;
  }
  const candidates=products.filter(isCandidate);
  if(candidates.length!==1||typeof candidates[0].id!=='string')throw new Error('No unique exact candidate within bounded search');
  const candidate=candidates[0];
  const detail=await call(names.product,{catalog:{id:candidate.id,navigate:false}});
  if(detail.id!==candidate.id||detail.handle!==candidate.handle||detail.title!==candidate.title)throw new Error('Discovery/detail identity conflict');
  return {query,observed_at:trace.at(-1).observed_at,observation_time_precision:'exact_client_clock',native_search_count:search.products.length,discovery_method:fallback?'discovered_collection_fallback':'native_search',manual_product_id:false,bounded_to_first_collection_page:true,trace,product_response:{structuredContent:detail}};
}

