# QA R36 — سجل اختبار مستقل معزول | 30 أكتوبر 2026

## مصدر الشفرة
قراءة مباشرة من PR #31، الرأس `a84c89533a94683cbb3cd73dde5377e4810577ba`.
نُقلت ملفات الإنتاج إلى مجلد محلي منفصل، وطابقت بصمة `git hash-object` **تمامًا** بصمة GitHub لكل ملف:
- `src/live-shipping-claims.ts`: `a3f274fb363e934a887ec8b80f7ff5972f140feb`
- `src/live-proof.ts`: `b73a6496cad0415816863da5e5a8034ab4772495`
- `src/money.ts`: `f5f7d16da97702c5bc32b7d407c084b6f5f75494`
- `src/evidence-time.ts`: `8ede328a03fac93ea239b853930381f6e2302ef2`
- اختبار PR #31 الأصلي `tests/p1-r31-shipping-claims.test.ts`: `bcfb4b49c4411bce84c05e91e68953f9684a1452`

## الأمر المنفذ
بيئة محلية Node `v22.16.0`، في مجلد منفصل يحوي نسخ الملفات ذات البصمات المطابقة:
```sh
node --experimental-strip-types --test tests/p1-r31-shipping-claims.test.ts tests/r36-independent.test.ts
```
`tests/r36-independent.test.ts` محليًا له نفس جسم اختبارات `qa/tests/r36-shipping-regression.test.ts` المحفوظ في هذا الفرع، مع اختلاف مسار الاستيراد فقط.

## النتيجة الفعلية
```text
ok 1 - R31: explicitly different destination city is rejected
ok 2 - R31: explicitly different destination country is rejected
ok 3 - R31: destination claim must agree with both offer and request
ok 4 - R31: explicitly mismatched shipping price is rejected
ok 5 - R31: fractions of halala cannot validate a shipping quote
ok 6 - R31: duplicate destination or price aliases are ambiguous
ok 7 - R31: matching explicit destination and halala amount have no contradiction
ok 8 - R31: no explicit quote fields is not contradictory but also not verified
ok 9 - CONTROL: mismatched top-level city is detected
ok 10 - CONTROL: mismatched top-level shipping cost is detected
ok 11 - CONTROL: matching explicit shipping cost has no contradiction
not ok 12 - R36-A: mismatched city in SPA fragment must be detected
not ok 13 - R36-A: mismatched cost in SPA fragment must be detected
not ok 14 - R36-B: destination quote parameter should not change product identity
not ok 15 - R36-B: shipping quote cost should not change product identity
ok 16 - CONTROL: different product variant must remain rejected
# tests 16
# pass 12
# fail 4
```
الاختباران 12–13: الناتج الفعلي `null` بينما التوقع رسالة تعارض.
الاختباران 14–15: الناتج الفعلي `false` بينما التوقع `true`. هذان اختباران تشخيصيان لعدم توافق ربط دليل الشحن مع تعريف المنتج، **وليس** اقتراحًا بالسماح العام بمعلمات URL إضافية؛ يجب إبقاء حماية variant.

## حدود
هذا تنفيذ مباشر **لوحدات إنتاج منسوخة مع بصمات Git مطابقة**، وليس `npm test` داخل المستودع أو اختبار البوابة `gateLiveOffers` أو البناء أو المتصفح. لم تُشغّل ملفات الاختبارات المضافة إلى GitHub في بيئة GitHub بعد رفعها. Node 24 غير متاح محليًا، ومحاولة `git ls-remote https://github.com/Jassar1441/Wifqa.git HEAD` فشلت بسبب `Could not resolve host: github.com`. لا CI ناجح ولا مصدر متجر حي مثبت.
