import { BALANCE_RULE, deliveryText, safeUrl } from './compare.ts';
import { priceBreakdownText, offerEvidenceText } from './ui-facts.ts';
import { fieldFactsText } from './field-facts.ts';
import { demoShareText } from './share.ts';
import type { Assessment, Request } from './types.ts';
import { searchAndCompare } from './search-client.ts';
import { buildLiveRequest } from './live-request.ts';
import { REGIONS, regionName } from './regions.ts';
import { demoDatasetIsStale } from './demo-freshness.ts';
import { liveIssueSummary } from './live-issues.ts';

const byId=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const input=(id:string)=>byId<HTMLInputElement>(id);
const form=byId<HTMLFormElement>('search-form');
const regionSelect=byId<HTMLSelectElement>('city');
regionSelect.replaceChildren(...REGIONS.map(region=>{
  const option=document.createElement('option');option.value=region.id;option.textContent=region.name;return option;
}));
regionSelect.value='asir';
let priority:Request['priority']='cheapest';
let report='';
let revision=0;
const format=(value:number)=>new Intl.NumberFormat('ar-SA',{maximumFractionDigits:2}).format(value);
function element(tag:string,text?:string,className?:string):HTMLElement {
  const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;
}
function optionalNumber(id:string):number|undefined {const value=input(id).value.trim();return value===''?undefined:Number(value);}
function offerCard(a:Assessment,ranked:boolean,first:boolean):HTMLElement {
  const o=a.offer;
  const card=element('article',undefined,'offer'+(first?' winner':''));
  card.append(element('span','بيانات تجريبية','badge'),element('h3',o.title),element('p',o.seller,'seller'));
  if(first)card.append(element('p','الأنسب للأولوية الحالية ضمن بيانات التجربة','badge'));
  if(!ranked)card.append(element('p','خارج الترتيب؛ لا يوصف بالأرخص أو الأسرع','warn'));
  if(a.group==='alternative'||a.state==='separate_variant')card.append(element('p','نسخة مختلفة عن المنتج المطلوب','warn'));
  const price=element('p',o.price===null?'غير معروف':format(o.price),'total');
  price.append(element('span',` ${o.currency==='SAR'?'ريال':o.currency} — سعر المنتج`));card.append(price);
  card.append(element('p',priceBreakdownText(a),'breakdown'));
  card.append(element('p',`الشحن: ${o.shipping.available===false?'غير متاح إلى المنطقة المختارة':o.shippingCost===null?'تكلفته غير معروفة':`${format(o.shippingCost)} ${o.currency}`} · ${regionName(o.shipping.region??'')}`));
  card.append(element('p',`موعد الوصول: ${deliveryText(o)}`));
  card.append(element('p',fieldFactsText(o),'provenance'));
  for(const message of [...a.reasons,...a.warnings])card.append(element('p',message,'warn'));
  card.append(element('p',offerEvidenceText(o),'demo-tag provenance'));
  if(o.dataKind==='live'&&o.url&&safeUrl(o.url)){
    const link=document.createElement('a');link.href=o.url;link.rel='noopener noreferrer';link.textContent='اذهب إلى المتجر';card.append(link);
  }else card.append(element('p','ليست عروض شراء حقيقية؛ لا مدفوعات ولا مزود خارجي.','demo-tag'));
  return card;
}
async function render(){
  const current=++revision;
  const request=buildLiveRequest({region:regionSelect.value,priority,allowAlternatives:input('alternatives').checked,
    budget:optionalNumber('budget'),deadlineDays:optionalNumber('deadline')});
  const root=byId('results');root.replaceChildren(element('p','جارٍ تحميل بيانات التجربة المحلية…','subtle'));
  report='';byId('summary').textContent='';byId('action-status').textContent='';
  byId('data-notice').textContent='بيانات تجريبية من ملف محلي؛ ليست أسعارًا أو نتائج حية.';
  for(const button of document.querySelectorAll<HTMLButtonElement>('[data-priority]'))
    button.setAttribute('aria-pressed',String(button.dataset.priority===priority));
  byId('balance-rule').hidden=priority!=='balanced';byId('balance-rule').textContent=BALANCE_RULE;
  byId('method-balance').textContent=BALANCE_RULE;
  try{
    const response=await searchAndCompare(input('query').value.trim(),request,fetch,()=>new Date(),
      {mode:'demo',scenario:byId<HTMLSelectElement>('scenario').value});
    if(current!==revision)return;
    if(!response.result)throw new Error('بيانات التجربة لم تجتز التحقق.');
    const result=response.result;
    const staleDataset=demoDatasetIsStale(response.updatedAt);
    byId('data-notice').textContent=`بيانات تجريبية · آخر تحديث للملف: ${response.updatedAt} · المنطقة: ${regionName(request.region!)}${staleDataset?' · تنبيه: بيانات الملف تجاوزت 24 ساعة':''}`;
    root.replaceChildren();
    if(staleDataset)root.append(element('p','بيانات التجربة قديمة؛ لا تعتبر الأسعار أو الشحن أو ترتيب النتائج معلومات حديثة. لن تُجدّد أوقات الإثبات تلقائيًا.','warn'));
    const issue=liveIssueSummary(response.issues);if(issue)root.append(element('p',issue,'warn'));
    const exact=result.ranking.filter(a=>a.group==='exact');
    const alternatives=result.ranking.filter(a=>a.group==='alternative');
    if(!exact.length)root.append(element('p','لا عرض مطابق ببيانات تكلفة وشحن مؤكدة إلى منطقتك يدخل ترتيب الأولوية الحالية.','empty'));
    const appendCards=(rows:Assessment[],ranked:boolean)=>{
      const cards=element('div',undefined,'cards');
      rows.forEach(a=>cards.append(offerCard(a,ranked,a===result.winner&&ranked)));root.append(cards);
    };
    appendCards(exact,true);
    if(alternatives.length){root.append(element('h3','بدائل مأذون بها تختلف عن النسخة المطلوبة','secondary-title'));appendCards(alternatives,true);}
    const remaining=result.assessed.filter(a=>!result.ranking.includes(a));
    if(remaining.length){root.append(element('h3','عروض خارج الترتيب أو مستبعدة — مع أسبابها','secondary-title'));appendCards(remaining,false);}
    report=[`وفقًا — بيانات تجريبية فقط. آخر تحديث: ${response.updatedAt}.`,
      `المنطقة: ${regionName(request.region!)}. ${result.ranking.length} عروض دخلت الترتيب؛ ${remaining.length} خارج الترتيب.`,
      result.winner?`الأول ضمن بيانات التجربة: ${result.winner.offer.seller}، الإجمالي ${format(result.winner.total!)} ريال.`:'لا عرض مستوفٍ للأولوية الحالية.',
      'الشحن المجهول لا يدخل ترتيب الأرخص أو الأسرع. المواعيد التقديرية ليست ضمانًا. لا شراء أو تسليم حقيقي مؤكد.'].join('\n');
    byId('summary').textContent=report;
  }catch(error){
    if(current!==revision)return;
    report=error instanceof Error?error.message:'تعذر تحميل بيانات التجربة.';
    root.replaceChildren(element('p',report,'empty'));byId('summary').textContent=report;
  }
}
form.addEventListener('submit',event=>{event.preventDefault();if(form.reportValidity())void render();});
regionSelect.addEventListener('change',()=>{if(form.reportValidity())void render();});
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-priority]'))button.addEventListener('click',()=>{
  priority=button.dataset.priority as Request['priority'];if(form.reportValidity())void render();
});
byId('copy').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(report);byId('action-status').textContent='نُسخ التقرير.';}
  catch{byId('action-status').textContent='تعذر النسخ؛ استخدم تنزيل التقرير النصي.';}
});
byId('share').addEventListener('click',async()=>{
  const text=demoShareText(report);
  try{
    if(typeof navigator.share==='function')await navigator.share({title:'وفقًا — بيانات تجريبية',text});
    else await navigator.clipboard.writeText(text);
    byId('action-status').textContent='تم تجهيز مشاركة المقارنة التجريبية.';
  }catch(error){if(error instanceof Error&&error.name==='AbortError')return;byId('action-status').textContent='تعذرت المشاركة؛ استخدم نسخ التقرير.';}
});
byId('download').addEventListener('click',()=>{
  const url=URL.createObjectURL(new Blob([report],{type:'text/plain;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download='wifqa-comparison-demo.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
void render();
