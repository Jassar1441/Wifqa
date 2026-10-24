# P1 — live coupon and partial-results regression evidence

24 October 2026, PM; branch `fix/p1-live-coupon-proof-partial-results-2026-10-24-pm`; draft PR #19.

## Two changes
1. `src/live-coupon.ts` + `src/search-client.ts`: a live coupon checked before this request does not reduce the final total. The offer remains in comparison without that discount.
2. `src/live-issues.ts` + `src/app.ts`: when the external-data boundary quarantines individual malformed offers, keep valid offers visible, explicitly display the number quarantined and include it in the report. Invalid requests still fail closed.

## Actually executed, local isolated copies (not repository checkout)

```sh
node --version
# v22.16.0
node --experimental-strip-types --test tests/live-coupon.test.ts tests/live-issues.test.ts
# tests 9
# pass 9
# fail 0
node --experimental-strip-types --check src/live-coupon.ts
node --experimental-strip-types --check src/live-issues.ts
# both exited successfully without syntax errors
```

Test cases: old, current, future and invalid calendar coupon proof; synthetic fixture unchanged; no-coupon unchanged; no issue; multiple bad fields in one offer counted once; unexpected issue path produces warning. Local `src/evidence-time.ts` was copied from the reviewed branch for helper tests. This does **not** test `searchAndCompare` and the browser app together.

## NOT executed
Full repository `npm test`, `npm run build`, static type check, actual browser/RTL/mobile, real merchant integration, QA independent review. Private repo clone failed in local runtime (`Could not resolve host: github.com`); available Node 22.16 is below `engines.node >=24`. The GitHub connector was used to read and write the exact repository files; remote changes were re-fetched and the branch comparison showed the intended files.

## QA gate
Run full tests/build with Node 24 and verify current-request coupon totals and mixed-validity offer handling end-to-end; issue #6 must provide an independent verdict. No merge, deployment, paid services, new access, or purchases without explicit owner approval.
