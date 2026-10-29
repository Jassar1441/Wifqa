# R33 — سجل التشغيل المستقل — 2026-10-29 (السعودية)

## نطاق التشغيل
- `node --version` → `v22.16.0`.
- `node --test qa/tests/r33-isolated-source-predicates.test.mjs` على نسخة مطابقة للاختبارات المرفوعة في فرع QA، بعد نقل التعابير العددية حرفيًا من blobs GitHub المذكورة في الاختبار.
- **هذا تشغيل للتعابير المعزولة فقط، وليس تنفيذًا لملفات الإنتاج المستوردة من المستودع، ولا تنفيذًا لـ `npm test` أو `npm run build`.**
- مصدر القراءة: PR #28 (head `94651d6814de8c4386afa58908aaa7cb7f7c54ca`) وملفات `src/compare.ts` و`src/ingest.ts` و`src/coupon-policy.ts`.

## النتيجة الحرفية المختصرة
```text
TAP version 13
ok 1 - M1: 100.35 SAR is accepted
ok 2 - M2: 0.29 SAR is accepted
ok 3 - M3: 100.005 SAR is rejected
ok 4 - M4: 0.001 SAR is rejected
ok 5 - M5: negative price rejected
ok 6 - M6: infinity rejected
not ok 7 - M7: tiny sub-halala fraction 100.0000000005 must be rejected
ok 8 - C1: literal equal coupon amounts accepted
not ok 9 - C2: equal-in-halala coupon amounts accepted regardless of float construction
not ok 10 - C3: equal-in-halala merchandise subtotal accepted
ok 11 - C4: distinct halala amounts are rejected
1..11
# tests 11
# pass 8
# fail 3
```

## قيم إعادة الإنتاج
1. M7: `money(100.0000000005)` → `true` بينما المتوقع `false`. فرق المبلغ ضئيل جدًا لكنه يخالف قاعدة رفض كل كسر هللة حرفيًا. سبب القبول حد التسامح `1e-7` بعد ضرب العدد في 100.
2. C2: `0.1+0.2` → `0.30000000000000004`، ومقابلها `0.3`. الاثنان يمثلان 30 هللة بعد التطبيع، لكن `===` يعيد `false`.
3. C3: `99.9+0.2` → `100.10000000000001`، ومقابلها `100.1`. كلاهما 10010 هللات بعد التطبيع، لكن `===` يعيد `false`.

## الحدود
لا اتصال حي بالمتاجر، ولا متصفح أو RTL، ولا تثبيت/بناء للمستودع الكامل؛ بيئة التشغيل Node 22 وليست Node >=24 الذي يتطلبه المشروع. لم يثبت هذا التشغيل أثرًا ظاهرًا للمستخدم داخل واجهة التطبيق، ولم يُشغّل `couponIsApplicable` كوحدة إنتاجية مستوردة. الاختبارات المعزولة تكشف خصائص التعابير الفعلية وتحدد حالات انحدار يجب إعادة تنفيذها داخل المستودع الكامل.
