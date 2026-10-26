# R27 — سجل تشغيل اختبارات الجودة المستقلة
التاريخ: 2026-10-26 | Node v22.16.0 | --experimental-strip-types
البيئة: نسخ محلية من وحدات src/live-proof.ts, src/evidence-time.ts, src/compare.ts, src/coupon-policy.ts مع types.ts، وليس checkout كاملًا للمستودع.

## الأمر الأول
node --experimental-strip-types --test tests/r27-product-query-id.test.ts
Exit code: 1 | TAP: 5 tests, 2 pass, 3 fail
- PASS: same URL and tracking UTM accepted.
- PASS: different variant rejected.
- FAIL: different product_id (100 -> 999) on same path and variant: expected false, actual true.
- FAIL: different itemId (100 -> 999) without variant: expected false, actual true.
- FAIL: validateLiveProductEvidence with foreign product_id: expected throw, actual no exception.

## الأمر الثاني
node --experimental-strip-types --test tests/r27-fractional-cents.test.ts
Exit code: 1 | TAP: 4 tests, 2 pass, 2 fail
- PASS: 100.01 SAR => eligible, total 100.01.
- PASS: -1 SAR => excluded.
- FAIL: 100.001 SAR => expected not eligible, actual eligible; total 100.
- FAIL: 0.001 SAR => expected not eligible, actual eligible; total 0.

## فحوص الصياغة
node --experimental-strip-types --check src/live-proof.ts
node --experimental-strip-types --check src/compare.ts
النتيجة: exit 0 لكليهما.

**حدود مهمة:** اختبارات مستقلة مستخرجة من الشفرة الحالية في PR #22، لا اختبار بناء كامل أو CI، ولا تشغيل Node 24 أو متصفح أو متجر حي. ملفا QA في هذا الفرع يتيحان إعادة التشغيل داخل المستودع الكامل على Node 24.
