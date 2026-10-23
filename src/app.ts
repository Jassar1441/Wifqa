import { compare, BALANCE_RULE, deliveryText, sellerText, returnsText, safeUrl } from './compare.ts';
import { demoOffers, demoRequest } from './fixtures.ts';
import { priceBreakdownText, offerEvidenceText } from './ui-facts.ts';
import { demoShareText } from './share.ts';
import type { Assessment, Request } from './types.ts';
import {searchAndCompare} from './search-client.ts';

const byId=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const input=(id:string)=>byId<HTMLInputElement>(id);
const request=demoRequest();
const form=byId<HTMLFormElement>('search-form');
let report='';
function element(tag:string,text?:string,className?:string):HTMLElement {
  const node=document.createElement(tag); if(text!==undefined)node.textContent=text; if(className)node.className=className;return node;
}
const format=(n:number)=>new Intl.NumberFormat('ar-SA',{maximumFractionDigits:2}).format(n);
function fact(label:string,value:string){const p=element('div',undefined,'fact');p.append(element('span',label,'fact-label'),element('span',value));return p;}
function offerCard(a:Assessment,first:boolean):HTMLElement {
  const card=element('article',undefined,'offer'+(first?' winner':''));
  card.append(element('span',first?'الأنسب للأولوية الحالية':'خيار للمقارنة','badge'),element('h3',a.offer.title),element('p',a.offer.seller,'seller'));
  if(a.group==='alternative') card.append(element('p','بديل — يختلف عن النسخة المطلوبة','warn'));
  const total=element('p',format(a.total!), 'total');total.append(element('span',' ريال'));card.append(total);
  card.append(element('div',priceBreakdownText(a),'breakdown'));
  const o=a.offer;const facts=element('div',undefined,'facts');
  facts.append(fact('الوصول',deliveryText(o)));
  facts.append(fact('الإرجاع',returnsText(o)));
  facts.append(fact('هوية البائع',sellerText(o)));
  card.append(facts);
  for(const warning of a.warnings.filter(w=>!w.includes('بيانات اختبار')))card.append(element('div',warning,'warn'));
  card.append(element('p',offerEvidenceText(o),'demo-tag provenance'));
  card.append(element('p','لا رابط شراء: هذه محاكاة وليست بيانات متجر حقيقية.','demo-tag'));
  return card;
}
function optionalNumber(id:string):number|undefined {const s=input(id).value.trim();return s===''?undefined:Number(s);}
function renderDemo(){
  request.city=byId<HTMLSelectElement>('city').value;
  request.allowAlternatives=input('alternatives').checked;
  request.budget=optionalNumber('budget');request.deadlineDays=optionalNumber('deadline');
  const offers=demoOffers();
  const scenario=byId<HTMLSelectElement>('scenario').value;
  if(scenario==='unavailable')for(const o of offers)o.availability='out_of_stock';
  if(scenario==='conflicting')offers[0].evidence.cost.status='conflicting';
  const query=input('query').value.trim().toLowerCase();
  const filtered=query?offers.filter(o=>o.title.toLowerCase().includes(query)):offers;
  const result=compare(filtered,request);
  const root=byId('results');root.replaceChildren();
  const exact=result.ranking.filter(a=>a.group==='exact');
  const alternatives=result.ranking.filter(a=>a.group==='alternative');
  root.append(element('p',`${exact.length} عروض تجريبية لنفس النسخة · ${alternatives.length} بدائل مأذون بها · ${result.assessed.length-result.ranking.length} عروض تحتاج مراجعة أو مستبعدة`,'subtle'));
  if(!exact.length)root.append(element('div','لم نجد عرضًا مستوفيًا للشروط في بيانات التجربة الحالية. لا نعلن نجاح الحصول على المنتج ولا نرفع الناقص إلى مرتبة المطابق.','empty'));
  if(exact.length){const cards=element('div',undefined,'cards');exact.forEach((a,i)=>cards.append(offerCard(a,i===0)));root.append(cards);}
  if(alternatives.length){root.append(element('h3','بدائل تختلف عن النسخة المطلوبة','secondary-title'));const cards=element('div',undefined,'cards');alternatives.forEach(a=>cards.append(offerCard(a,false)));root.append(cards);}
  const remaining=result.assessed.filter(a=>!result.ranking.includes(a));
  if(remaining.length){const details=element('details');details.append(element('summary',`راجع أسباب عدم الترشيح (${remaining.length})`));for(const a of remaining){const row=element('div',undefined,'excluded');row.append(element('strong',`${a.offer.seller} — ${a.offer.title}`),element('span',a.reasons.join('؛ ') || 'لا مدة وصول موثقة للترتيب بالأسرع'));details.append(row);}root.append(details);}
  const first=exact[0]??alternatives[0];
  const lines=['تقرير وفقًا — بيانات اصطناعية فقط، لا عروض شراء حقيقية.',`الأولوية: ${request.priority==='cheapest'?'الأرخص إجمالًا':request.priority==='fastest'?'الأسرع وصولًا':'أفضل توازن'}. الوجهة: ${request.city==='Abha'?'أبها':'الرياض'}.`];
  if(first){lines.push(`الأول ضمن بيانات التجربة: ${first.offer.seller}، بإجمالي ${format(first.total!)} ريال${first.group==='alternative'?'، وهو بديل مختلف عن النسخة المطلوبة':''}.`);const next=exact[1];if(next)lines.push(`الخيار التالي ${next.offer.seller}: إجمالي ${format(next.total!)} ريال، والفرق ${format(Math.abs(next.total!-first.total!))} ريال. هذا الفرق لا يثبت أنه الأفضل لكل عميل.`);}
  else lines.push('لا عرض يستوفي الشروط في بيانات التجربة الحالية.');
  lines.push('موعد الوصول التقديري ليس ضمانًا، وسياسة الإرجاع الناقصة تحتاج تحققًا. لم يتحقق هدف الحصول على المنتج من هذه البيانات الاصطناعية.');
  report=lines.join('\n');byId('summary').textContent=report;
  byId('balance-rule').hidden=request.priority!=='balanced';byId('balance-rule').textContent=BALANCE_RULE;byId('method-balance').textContent=BALANCE_RULE;
  for(const b of document.querySelectorAll<HTMLButtonElement>('[data-priority]'))b.setAttribute('aria-pressed',String(b.dataset.priority===request.priority));
}
let revision=0;
async function render(){
 const current=++revision;const live=byId<HTMLSelectElement>('data-mode').value==='live';
 byId('share').hidden=live;
 byId('data-notice').textContent=live?'جلب جديد من المصدر؛ الشحن والإجمالي لا يُؤكدان دون أدلة.':'بيانات اصطناعية فقط؛ ليست عروض شراء ولا بحثًا حيًا.';
 if(!live){renderDemo();return;}
 const root=byId('results');root.replaceChildren(element('p','جارٍ طلب بيانات جديدة من المصدر…','subtle'));report='';byId('summary').textContent='';
 const liveRequest:Request={identity:{model:'AirPods 4',condition:'new',quantity:1},mustHave:{color:{equals:'white'},charging:{equals:'USB-C'},anc:{equals:0}},country:'SA',city:byId<HTMLSelectElement>('city').value,currency:'SAR',priority:request.priority,allowAlternatives:false,budget:optionalNumber('budget'),deadlineDays:optionalNumber('deadline')};
 try{
  const response=await searchAndCompare(input('query').value.trim(),liveRequest);if(current!==revision)return;
  if(!response.result||response.issues.length)throw new Error('رد المصدر لم يجتز التحقق من البيانات.');
  root.replaceChildren();const result=response.result;
  const visible=result.assessed.filter(a=>a.state!=='excluded'&&a.state!=='separate_variant');
  if(!visible.length)root.append(element('p','لا عروض مستوفية متاحة للعرض في هذا الجلب.','empty'));
  for(const a of visible){const card=element('article',undefined,'offer');card.append(element('h3',a.offer.title),element('p',a.offer.seller,'seller'),element('p',a.state==='eligible'?'مستوفٍ لشروط المقارنة':'عرض مسترجع يحتاج تحققًا إضافيًا','badge'),element('p',a.offer.price===null?'السعر غير مؤكد':`${format(a.offer.price)} ${a.offer.currency==='SAR'?'ريال':a.offer.currency} — سعر المنتج`,'total'),element('p',a.total===null?'الإجمالي مع الشحن غير مكتمل':priceBreakdownText(a),'breakdown'),element('p',offerEvidenceText(a.offer),'provenance'),element('p',a.reasons.join('؛ '),'warn'));if(a.offer.url&&safeUrl(a.offer.url)){const link=document.createElement('a');link.href=a.offer.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='عرض المنتج لدى المتجر';card.append(link);}root.append(card);}
  report=`وفقًا — نتيجة جلب ${response.retrievedAt}. ${visible.length} عروض مسترجعة، ${result.ranking.length} عروض مكتملة البيانات للترتيب. راجع أسباب التحقق؛ لا شراء أو تسليم مؤكد.`;byId('summary').textContent=report;
 }catch(e){if(current!==revision)return;report=e instanceof Error?e.message:'تعذر البحث.';root.replaceChildren(element('p',report,'empty'));byId('summary').textContent=report;}
}
byId('data-mode').addEventListener('change',()=>{input('query').value=byId<HTMLSelectElement>('data-mode').value==='demo'?'عطر تجريبي':'Apple AirPods 4 without ANC';render();});
form.addEventListener('submit',e=>{e.preventDefault();if(form.reportValidity())render();});
for(const b of document.querySelectorAll<HTMLButtonElement>('[data-priority]'))b.addEventListener('click',()=>{request.priority=b.dataset.priority as Request['priority'];if(form.reportValidity())render();});
byId('copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(report);byId('action-status').textContent='نُسخ التقرير.';}catch{byId('action-status').textContent='تعذر النسخ؛ استخدم تنزيل التقرير النصي.';}});
byId('share').addEventListener('click',async()=>{
  const text=demoShareText(report);
  try {
    if(typeof navigator.share==='function'){
      await navigator.share({title:'وفقًا — مقارنة تجريبية',text});
      byId('action-status').textContent='تم فتح خيارات المشاركة.';
    } else if(navigator.clipboard?.writeText){
      await navigator.clipboard.writeText(text);
      byId('action-status').textContent='نُسخ نص المقارنة التجريبية للمشاركة.';
    } else byId('action-status').textContent='المشاركة غير مدعومة؛ استخدم نسخ التقرير.';
  } catch(err){
    if(err instanceof Error && err.name==='AbortError')return;
    byId('action-status').textContent='تعذرت المشاركة؛ استخدم نسخ التقرير.';
  }
});
byId('download').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([report],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='wifqa-comparison-demo.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
render();

