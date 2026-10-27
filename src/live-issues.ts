import type { InputIssue } from './ingest.ts';

// Keep quarantined products separate from offers whose discount alone was removed.
export function liveIssueSummary(issues: readonly InputIssue[]): string | null {
  if (issues.length === 0) return null;
  const rejected = new Set<string>();
  const discounts = new Set<string>();
  const downgradedClaims = new Set<string>();
  for (const issue of issues) {
    const rejectedIndex = /^offers\[(\d+)\](?:\.|$)/.exec(issue.path)?.[1];
    if (rejectedIndex !== undefined) rejected.add(rejectedIndex);
    const discountIndex = /^discounts\[(\d+)\](?:\.|$)/.exec(issue.path)?.[1];
    if (discountIndex !== undefined) discounts.add(discountIndex);
    if (/^claims\[\d+\]\.(delivery|returns|seller)$/.test(issue.path)) downgradedClaims.add(issue.path);
  }
  const messages: string[] = [];
  if (rejected.size) messages.push(`تم عزل ${rejected.size} عرض غير صالح؛ لم يدخل المقارنة.`);
  if (discounts.size) messages.push(`أُلغي خصم غير مثبت في ${discounts.size} عرض، مع إبقاء المنتج للمقارنة دون الخصم إن كانت بقية بياناته صالحة.`);
  if (downgradedClaims.size) messages.push(`خُفّض توثيق ${downgradedClaims.size} ادعاء عن التوصيل أو الإرجاع أو البائع لغياب دليل حديث من المتجر؛ لم تُعزل المنتجات بسبب هذه الادعاءات وحدها.`);
  return messages.join(' ') || 'رد المصدر يتضمن مشكلات تحقق؛ راجع الأدلة قبل الاعتماد.';
}
