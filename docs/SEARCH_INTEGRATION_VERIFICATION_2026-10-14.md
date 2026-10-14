# Search integration verification — 2026-10-14

## Scope

This change connects the Arabic comparison page to a live-search contract, adds an Aleph product-discovery adapter, tightens coupon eligibility, and records what can be verified without a production merchant connection. It does not merge or publish the application.

## Results

| Area | Result | Evidence / limit |
|---|---|---|
| App search flow | The page submits the requested text and destination to `/api/search`, rejects unsupported queries and stale, synthetic, mismatched, or unverified responses, and shows source-unavailable explicitly. | `src/app.ts`, `src/search-client.ts`, `tests/search-client.test.ts` |
| Merchant API in app server | **Not connected.** The standalone Node server starts without a provider and returns HTTP 503 with `live_provider_not_connected`. | `scripts/serve.mjs`, `scripts/search-api.mjs`, `tests/search-api.test.ts`, local test log |
| Aleph standard model mapping | Adapter requires exact title and unique `MXP63ZE/A`, SAR price, Aleph product URL, and a timestamp. It leaves Abha shipping, fees, taxes, and delivery unknown. | `src/aleph-provider.ts`, `tests/aleph-provider.test.ts` |
| Historical Aleph observation | Recorded browser evidence at `2026-10-13T09:54:39.936Z` reported MXP63ZE/A at SAR 449 and in stock. This is historical evidence and is not served as a live result. | `tests/fixtures/aleph-recorded-2026-10-13.json` |
| Coupon calculation | Coupon is applied only when evidence, freshness, country/city, offer, payment/member conditions, and merchandise subtotal minimum all match. | `src/coupon-policy.ts`, `tests/coupon-evidence.test.ts`, `tests/comparison.test.ts` |
| Automated checks | **118 tests passed; build passed.** Build uses Node's TypeScript syntax stripping and is not a static type check. | `evidence/tests.log`, `evidence/build.log` |
| Full UI/browser verification | **Not run.** Chromium is unavailable in the environment. Mobile layout and real shopper checkout/delivery behaviour remain unverified. | Environment check; no browser E2E evidence |

## Decision

Eligible for another bounded internal review only. It is not a completed live shopping search or release candidate: the runtime has no authorized, current merchant provider to call. Do not represent the October 13 price/stock observation as current. Do not claim shipping to Abha or a final total. Independent QA's earlier verdict was “internal limited test”; this updated revision requires review of the adapter replay tests. The owner's advisory review remains outstanding.

## Next gate

Connect an authorized live provider to the runtime and demonstrate one fresh UI-to-source request with source URL, observation time, exact SKU/specification, availability, and shipping/total evidence (or explicit unknowns), then run browser/mobile checks and independent QA. No merge or deployment is part of this change.
