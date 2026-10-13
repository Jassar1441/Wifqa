// User-triggered only; never creates a public link.
export function demoShareText(report: string): string {
 const summary=report.trim() || 'لا توجد مقارنة جاهزة للمشاركة.';
 return ['وفقًا | مقارنة تجريبية','تنبيه: جميع العروض والأسعار المذكورة بيانات اصطناعية، وليست عروض شراء حقيقية.','',summary,'','الشراء والاختيار النهائي بيد العميل؛ لم تتحقق قابلية شراء هذه العروض.'].join('\n');
}
