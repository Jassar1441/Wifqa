# AirPods 4 limited research pilot — 2026-10-13

Draft, not approved or integrated into WIFQA. Browser-hosted Aleph WebMCP read-only calls worked without an account, new permission or merchant fee in this session. This is not evidence of a free standalone commercial API or permission for bulk harvesting.

Live check: search_catalog query AirPods 4, limit 3 returned zero products. get_product using current product and subsequently catalog.id=airpods-4-mxp63ze-a returned SKU MXP63ZE/A, 449 SAR, available=true. These are separate outcomes. Source: https://alephksa.com/ar/products/airpods-4-mxp63ze-a . Captured fixtures contain selected fields transcribed from actual responses, not invented offers. Capture times are approximate minutes, not merchant freshness guarantees.

Run `node --test airpods-pilot/airpods.test.mjs`. These local tests replay captured data; they are NOT new network tests. Mutated negative cases exist only inside tests.

Host integration: discover current page WebMCP registrations first. Supply transport.searchCatalog that calls current search_catalog with {catalog:{query, pagination:{limit}}}, and transport.getProduct that calls current get_product with {catalog:{id:known_handle,navigate:false}}. Registration names change between sessions. No credentials or private endpoints are embedded. No standalone transport is supplied, and this module is not deployed. The browser live calls were performed separately and their selected responses saved as fixtures.

The 44900 amount is interpreted as minor units only for this observed Aleph tool, cross-checked against its human-readable 449.00 SAR response and rendered product page. Availability is a merchant catalog signal, not fulfillment confirmation. Abha shipping and final delivered total stay unknown. Voice Isolation is not ANC. Reviewed SKU mapping selects standard white USB-C AirPods 4.

Phase 2 retained: Breo wireless device (exact model requires prior evidence; reject wired substitutes), and the previously tested drone battery. No prior case files were deleted or replaced. Battery model/details are not newly verified by this pilot.

No independent quality approval has been performed. The delegated coding worker stopped at its usage limit; the coordinating assistant completed and ran the tests without purchasing credits.
