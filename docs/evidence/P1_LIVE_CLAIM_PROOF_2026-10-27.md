# P1 — live delivery, returns and seller claim provenance (2026-10-27 PM)

## Source reviewed
- `src/live-offer-gate.ts`: validates merchant-bound identity, specification, cost, availability and shipping evidence, but previously passed through delivery/returns/seller claims even when their proof belonged to another merchant or was stale.
- `src/compare.ts`: uses delivery evidence for fastest ranking and returns/seller evidence for balanced ranking. The existing `evidenceOk` checks timestamp and status but does not enforce same merchant origin.
- `src/live-issues.ts`: previously had no distinct summary for downgraded optional claims.
- `tests/live-offer-gate.test.ts`, `tests/search-gate-integration.test.ts`, `tests/live-issues.test.ts` reviewed.
- Base: draft PR #24, branch `fix/p1-live-ranking-visibility-2026-10-27-am`. No changes to `main`.

## Two fixes
1. Require confirmed, same-merchant, in-fetch proof for delivery claims before allowing a claimed confirmed/estimated delivery duration to enter comparison. When absent, stale or foreign, reset delivery status and duration to unknown without discarding an otherwise valid offer. This prevents an unrelated source from masquerading as fastest evidence.
2. Require same-merchant, in-fetch proof for confirmed returns and seller-identity claims. When invalid, reset only the affected return/seller claim and remove its evidence, so it cannot boost the balanced score or appear as verified. Count these downgraded claims separately in the live issue notice, never as quarantined offers.

The gate validates provenance structure and timing; it does **not** independently verify merchant-page truth, actual delivery, identity, availability or return conditions. Synthetic test records only.

## Tests actually run
Local runner: Node.js v22.16.0; local subset recovered from the prior isolated evidence archive and the latest `live-proof.ts`. **Important:** that archive contains a **test double** for `src/compare.ts`, not the full repository comparison engine. Therefore these are gate/issue unit tests and limited pipeline tests, not end-to-end comparison verification.

- Before fix: `node --experimental-strip-types --test tests/p1-live-claim-proof.test.ts` → **1 passed, 5 failed** (expected regressions).
- After fix: `node --experimental-strip-types --test tests/*.test.ts` → **36 passed, 0 failed**, including 6 new tests, 27 prior local tests and 3 existing issue-summary tests.
- `node --experimental-strip-types --check src/live-offer-gate.ts` and `node --experimental-strip-types --check src/live-issues.ts` → both passed.
- Test fixture uses `merchant.example` and a fixed timestamp; no live merchant lookup.

## Not executed and required QA
- The full GitHub repository could not be cloned in the local runner because `github.com` DNS resolution failed.
- Project requires Node >=24; local runtime is Node 22.16.
- **Not executed:** repository-wide `npm test`, `npm run build`, TypeScript static typecheck, browser/mobile RTL, actual source integration or real-store verification.
- QA #6 should run the full repository with Node >=24, confirm a forged fast-delivery proof cannot win `fastest`, confirm untrusted returns/seller proof cannot boost `balanced`, inspect the issue notice, and check valid same-origin merchant proof is preserved. Also review the conservative same-origin policy and its false-negative risk.

Draft PR only. No merge, deployment, permission changes, purchases or paid services. Independent QA and explicit owner approval required.
