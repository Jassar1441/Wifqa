# WIFQA parent identity — visual draft 01

**Status:** review draft only; not approved for use.  
**Branch:** `design/identity-concept-2026-10-14-r2` (created directly from `main`; rejected A/B/C concepts are not included).  
**Scope:** parent identity for a portfolio of future WIFQA services. The mark does not depict shopping or comparison.

## What is included

- `WIFQA-concept-landscape.svg`: editable horizontal lockup on cream.
- `WIFQA-concept-dark.svg`: the lockup on deep green.
- `WIFQA-icon-24.svg` and `WIFQA-icon-48.svg`: icon-only sizes, same drawing and viewBox.
- `WIFQA-app-icon-dark.svg`: rounded-square dark application-icon treatment.
- `WIFQA-concept-monochrome.svg`: one-colour lockup.

The abstract mark uses two crossing, curved ribbon/flame forms and a gold diamond. It was drawn as a new proposal and does not copy the previous rejected A/B/C marks. It follows the written description of the owner's reference: flowing motion, deep green, gold, cream, an elegant Arabic wordmark, and a parent-brand lockup. The supplied reference image itself was not available in my visual workspace; pixel-level or shape-level fidelity to it is not claimed. The project owner has independently viewed the reference and can compare this draft against it.

The English name is consistently **WIFQA**. Arabic is live SVG text set to Tajawal / IBM Plex Arabic with Tahoma fallback, so its final appearance depends on the renderer's installed fonts. The SVG sources remain editable. No fixed slogan is used; the small Arabic descriptor identifies the parent brand role for review only.

## Technical checks

- XML parse, accessible-title, exact-name, intrinsic-size, and viewBox checks passed for the six selected SVGs.
- Icon sizes are authored as 24×24 and 48×48 with the same 200×200 viewBox and same principal shape geometry.
- Calculated text-color contrast ratios: green #0F3D2E on cream #F8F5EC = 11.15:1; gold-brown #775A2B on cream = 5.87:1; cream on green = 11.15:1; charcoal #1F2937 on cream = 13.47:1. These calculations do not test the finished render.
- PNG previews have now been rendered with librsvg and reviewed at full frame and at native 24/48 px. The RTL Arabic labels fit within the canvas after replacing `text-anchor="end"` with `text-anchor="start"` on RTL text.
- Font embedding/path conversion, print tests, trademark/conflict search, independent design QA, and owner approval: not done.

The reference image itself was not available in my visual workspace; fidelity to it is not claimed. The librsvg-rendered previews confirm the SVGs display as expected in this renderer, but do not replace cross-browser/font testing or independent design review.

## Review request

Please independently review direction, legibility, icon consistency at 24/48 px, contrast in light/dark use, and safe area. Record findings before any finalization. No merge, publication, or approval is requested by this draft.
