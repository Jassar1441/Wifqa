import type { Assessment, Offer } from './types.ts';
import { verifiedTimestamp } from './evidence-time.ts';

// Display-only helpers. A provider-supplied timestamp is not proof of a live offer.
const formatMoney = (value: number): string =>
  new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 }).format(value);

export function priceBreakdownText(assessment: Assessment): string {
  const offer = assessment.offer;
  if (assessment.total === null || offer.price === null ||
      offer.shippingCost === null || offer.fees === null ||
      offer.taxIncluded === null || (!offer.taxIncluded && offer.tax === null)) {
    return 'الإجمالي غير مكتمل؛ لا يمكن تأكيد السعر شامل الشحن والرسوم.';
  }
  const parts = [
    `المنتج ${formatMoney(offer.price)}`,
    `+ الشحن ${formatMoney(offer.shippingCost)}`,
    `+ الرسوم ${formatMoney(offer.fees)}`,
    offer.taxIncluded ? '· الضريبة ضمن السعر' : `+ الضريبة ${formatMoney(offer.tax!)}`,
  ];
  if (assessment.couponApplied && offer.coupon) {
    parts.push(`− خصم منطبق بحسب بيانات العرض ${formatMoney(offer.coupon.amount)}`);
  } else if (offer.coupon) {
    parts.push('· الكوبون غير محتسب في الإجمالي');
  }
  parts.push(`= الإجمالي ${formatMoney(assessment.total)} ريال`);
  return parts.join(' ');
}

const claims = [
  ['cost', 'السعر والتكلفة'],
  ['availability', 'التوفر'],
  ['shipping', 'الشحن'],
] as const;

export function offerEvidenceText(offer: Offer, now = new Date()): string {
  const prefix = offer.dataKind === 'synthetic'
    ? 'مصادر وأوقات اصطناعية للتجربة فقط؛ ليست تحققًا من متجر.'
    : 'مصادر وأوقات مذكورة في بيانات العرض؛ لم تُتحقق استقلاليًا.';
  const details = claims.map(([key, label]) => {
    const evidence = offer.evidence[key];
    if (!evidence || !evidence.source?.trim()) {
      return `${label}: المصدر غير محدد؛ يحتاج تحققًا.`;
    }
    const checked = verifiedTimestamp(evidence.checkedAt);
    const valid = Number.isFinite(checked) && checked <= now.getTime();
    const fresh = valid && now.getTime() - checked <= 24 * 60 * 60 * 1000;
    const time = valid
      ? new Intl.DateTimeFormat('ar-SA', {
          dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Riyadh',
        }).format(checked)
      : 'وقت فحص غير صالح';
    const state = !valid ? 'يحتاج تحققًا'
      : evidence.status !== 'confirmed' ? 'الدليل غير مؤكد'
      : !fresh ? 'قديم؛ يحتاج تحديثًا'
      : offer.dataKind === 'synthetic' ? 'محاكاة فقط' : 'حديث بحسب البيانات المدخلة';
    return `${label}: ${evidence.source} · ${time} · ${state}`;
  });
  return [prefix, ...details].join('\n');
}
