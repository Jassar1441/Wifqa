# R29 — Independent QA execution evidence (2026-10-27, Asia/Riyadh)

Source branch: `fix/p1-live-ranking-visibility-2026-10-27-am` at `7f7052a2fe376079b8d05574c3d5084b0d9268ee`.

## Run A: real grouping function with type-only syntax removed
- Read `src/live-groups.ts` through the connected GitHub repository API.
- Blob SHA: `0129d31f3435fa1f2bd88299b60a6f0390a36e1d`.
- Removed only `import type` and the `Assessment[]` type annotations in the exported function signature.
- Evaluated resulting JavaScript function independently in a V8 isolate with ten new assertions. **10 PASS / 0 FAIL**.

```text
PASS 01 ranking beats source order for three exact offers
PASS 02 alternatives follow ranking, not input
PASS 03 alternative not promoted to exact
PASS 04 unverified ranked entry not promoted
PASS 05 eligible with unknown ETA kept unranked
PASS 06 empty ranking has no winner
PASS 07 needs_verification remains visible
PASS 08 excluded/separate_variant not promoted
PASS 09 ranked offer not duplicated in unranked
PASS 10 unranked input order preserved
```

## Run B: live request expression extracted from actual app source
- Read `src/app.ts` (SHA `6adb8df437d7de6cf6f77bd26f2ffbd2acef8b9a`), `public/index.html` (SHA `ae2f2805f12e98be315e618e738007252c516a66`) and `src/compare.ts` (SHA `3c2825c5b093be1dd07c4717f2c04a399f3836df`).
- Extracted the exact `const liveRequest:Request={...};` line, removed only TS generic and variable type annotation, and evaluated it with two simulated checkbox states.
- Confirmed the checkbox is present in HTML and is read by `renderDemo`; the live expression does not read it.

```text
PASS 11 alternatives checkbox unchecked -> liveRequest.allowAlternatives=false
FAIL 12 alternatives checkbox checked   -> liveRequest.allowAlternatives=false (expected true)
```

**Combined: 11 PASS / 1 FAIL (12 assertions).**

## Reproduction and limitations
- Proposed repository regression script: `node --test qa/tests/r29-ranking-live-options.test.mjs` on Node >=24.
- That script was **written to the QA branch but NOT executed as a complete repository test**. The actual executions above used isolated V8 evaluation of the GitHub source.
- `git ls-remote https://github.com/Jassar1441/Wifqa.git HEAD` in the local runner failed with `Could not resolve host: github.com`. Local Node: `v22.16.0`; project requires >=24.
- Full test/build, browser/RTL, and live merchant integration: NOT RUN.
- No changes to main, publication, permissions, spending, or approval.
