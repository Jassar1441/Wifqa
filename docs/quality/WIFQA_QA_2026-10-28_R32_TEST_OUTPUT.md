# QA R32 — standalone source-extracted run (2026-10-28)
Source ref: PR #27 head 89dac38df4c609e33efcf45f2ef624c8d3d858bd
Node: v22.16.0
Command: node --test independent-r32.test.mjs
Exit code: 1
TAP: tests 12; pass 8; fail 4; skipped 0
Failures:
5. source proof: conflicting duplicate variant keys must fail closed — expected false, actual true.
6. source proof: conflicting duplicate productId keys must fail closed — expected false, actual true.
9. money: compare rejects fractional price halala — expected false, actual true.
10. money: compare rejects fractional shipping halala — expected false, actual true.
Passes: #1,#2,#3,#4,#7,#8,#11,#12.
Scope: isolated copy of exact function logic (only TS type annotations removed); NOT full repository tests.
Repo-import regression file qa/tests/r32-source-money-regression.test.ts was added but NOT run in full repository.
