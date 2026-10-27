# P1 live result ranking and unranked visibility — 2026-10-27 AM

## Code inspected
- `src/compare.ts`: returns `assessed` in source order, but sorts `ranking` by user priority and omits offers with unverified delivery duration when priority is `fastest`.
- `src/live-groups.ts` and `src/app.ts`: previously grouped the unsorted `assessed` array and displayed all `eligible` offers as recommendations, including those omitted from `ranking`.
- `tests/live-groups.test.ts`: old tests covered only state grouping, not recommendation order or the fastest-priority exclusion.
- Base: `fix/p1-source-query-hash-binding-2026-10-26-pm` (draft PR #23); no change to `main`.

## Two implemented tasks
1. Make the live exact and alternative cards follow `compare().ranking`, not the source's input order. This prevents a more expensive or slower first input from appearing first in the recommendation list.
2. Keep `eligible` offers omitted from `ranking` in a separate `unranked` group, not as recommended exact offers. In the live UI, label this group and explain that the arrival time does not qualify for the requested priority. Continue to keep `needs_verification` separate.

Files: `src/live-groups.ts`, `src/app.ts`, `tests/live-groups.test.ts`, `tests/p1-live-ranking.test.ts`.

## Actual local test commands and results
Runtime: Node.js v22.16.0. Tested an isolated local copy of the **actual modified grouping module** with the existing two grouping tests and six new regression tests.

- Before fix, running the six new tests against the previous grouping implementation: **1 passed, 5 failed** (exit 1). The old implementation ignored the ranking argument.
- After fix: `node --experimental-strip-types --test tests/live-groups.test.ts tests/p1-live-ranking.test.ts` → **8 passed, 0 failed** (exit 0).
- `node --experimental-strip-types --check src/live-groups.ts` → passed.

These tests use synthetic `Assessment` fixtures only. They prove the grouping function's behavior, **not** that the full application, fetch integration or browser display works.

## Not executed / QA request
- `npm test`, `npm run build`, TypeScript typecheck and mobile/RTL browser test: **not executed**. The private repository could not be cloned into the local runner (GitHub DNS failure); local Node 22 is below the repository's required Node >=24.
- No live merchant/provider query or source verification was attempted.
- QA #6 should run the complete suite and build on Node >=24, then inspect the live UI with unsorted source offers and a cheapest/fastest priority switch, verifying the displayed first card follows the engine's ranking and unknown-ETA offers never appear as fastest recommendations.

Draft stacked on PR #23. No merge, deployment, permissions change, purchases or paid services. QA review and explicit owner approval remain required.
