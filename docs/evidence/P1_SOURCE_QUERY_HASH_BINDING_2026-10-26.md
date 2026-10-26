# P1 — Product source URL binding | 26 October 2026 PM

## Two tasks
1. Require every non-tracking product query parameter (including duplicate keys) to match the offer URL. Previously only the first `variant` and `sku` values were compared; mismatched `productId`, color, size and duplicate variants could pass.
2. Bind product evidence to SPA hash routes, preventing a proof for `#/product/other` from validating `#/product/requested`.

The same function is used by live identity/mandatory-spec validation and by the live cost/availability gate. Only explicit tracking keys `utm_*`, `gclid`, `fbclid`, `msclkid` are ignored; unknown query keys are conservatively treated as product-significant. This can reject some legitimate merchant-specific tracking URLs pending documented source adapters.

## Executed checks
An isolated copy of the actual `src/live-proof.ts` and `src/evidence-time.ts` was tested with Node.js v22.16.0:
- Before change: `node --experimental-strip-types --test tests/p1-source-identity-hardening.test.ts` → 3 passed, 5 failed (red regressions).
- After change: same command → **8 passed, 0 failed**.
- `node --experimental-strip-types --check src/live-proof.ts` → passed.

This is **not** the full repository test run or integration proof. Full `npm test`, `npm run build`, typecheck, browser/mobile tests and authorized live-provider tests were **not run**. The runtime available was Node 22, while `package.json` requires Node >=24; cloning the private repository into the test container failed because GitHub DNS resolution was unavailable.

## Governance
Draft PR stacked on #22, not on main. No merge, deployment, permission changes, paid services or purchases. Refer to independent QA issue #6 for review of the change, test scope and possible false rejections.
