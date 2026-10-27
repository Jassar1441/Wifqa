# WIFQA QA R30 PM — independent isolated provenance checks
Date: 2026-10-27 (Asia/Riyadh). Runtime: Node.js v22.16.0.

Source: PR #25, branch `fix/p1-live-claim-proof-2026-10-27-pm`.
Examined `src/live-offer-gate.ts` blob `bd062e56744234bea40ac833e7537a3efcbc12c7`, `src/live-proof.ts`, `src/evidence-time.ts`, `src/compare.ts`, and `tests/p1-live-claim-proof.test.ts`.

Executed locally:
`node --test /mnt/data/wifqa_r30/r30_provenance_isolated.test.mjs`
This runner copies the current `proofFromMerchant` decision expression and the repository's timestamp parser. Its `sameProductEvidenceSource` placeholder is NOT invoked because the current call sites use default `productBound=false`. **This is not a full-repository or browser test.**

TAP outcome: **4 tests, 2 passed, 2 failed, exit code 1**.
- PASS control: other origin rejected.
- PASS control: same-product proof accepted.
- FAIL R30-A: expected false, actual true for `https://merchant.example/product-b?variant=blue` as delivery proof for `https://merchant.example/product-a?variant=red`.
- FAIL R30-B: expected false, actual true for generic `https://merchant.example/` as proof of a marketplace seller's identity.

Both failures are expected regression assertions and demonstrate that the isolated helper permits these sources. They do **not** prove a real merchant misrepresented delivery or identity.

The accompanying `qa/tests/r30-optional-claim-provenance.test.ts` targets the real `gateLiveOffers` module in the GitHub branch, but **was not run in the full repository**. Full build, typecheck, Node 24, mobile RTL, live-source validation remain unverified.
