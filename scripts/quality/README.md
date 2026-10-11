# أدلة إعادة فحص الجودة

من جذر المشروع شغل node scripts/quality/quality-repro.mjs وnode scripts/quality/quality-helper-repro.mjs وnode scripts/quality/boundary-verification.mjs. لا شبكة أو متصفح. الأول يحافظ على كشف عيوب أغلقت ويظهر النتيجة الحالية؛ الثاني يفحص نص حالات الأدلة؛ الثالث يفحص حد الإدخال والعقد الجديد.

runtime-contract-repro.mjs سجل تشخيص للمدخلات غير الصحيحة عند تجاوز حد الإدخال والدخول مباشرة إلى المحرك typed؛ ليس اختبار قبول للموصل الخارجي. استخدم compareExternal للبيانات الخارجية. حالات القبول في docs/quality/runtime-contract-cases.json ليست تلقائيًا نتائج suite كاملة. سجل النتائج الفعلية في التقريرين؛ العدد الحالي 59، والعدد السابق46 تاريخي.
