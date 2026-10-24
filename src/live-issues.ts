import type { InputIssue } from './ingest.ts';

// A bad external offer is quarantined by compareExternal; do not hide good offers.
export function liveIssueSummary(issues: readonly InputIssue[]): string | null {
  if (issues.length === 0) return null;
  const rejected = new Set<string>();
  for (const issue of issues) {
    const index = /^offers\[(\d+)\](?:\.|$)/.exec(issue.path)?.[1];
    if (index !== undefined) rejected.add(index);
  }
  return rejected.size > 0
    ? `تم عزل ${rejected.size} عرض غير صالح من رد المصدر؛ لم يدخل المقارنة أو قائمة العروض المؤكدة.`
    : 'رد المصدر يتضمن مشكلات تحقق؛ راجع الأدلة قبل الاعتماد.';
}
