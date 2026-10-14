# Librsvg render and visual check — 14 October 2026

## Correction

The first render exposed clipping on the right edge of the Arabic wordmark and descriptor in the light/dark/monochrome lockups. Their RTL text anchor was corrected from `end` to `start`. No geometry or typography strings were changed.

## Render evidence

Rendered locally with the installed shared library `librsvg-2.so.2` (reported library build path `librsvg-2.so.2.50.0`) and Cairo. The five PNG previews are beside the SVG sources.

| Source | Rendered size | Visual check |
|---|---:|---|
| `WIFQA-concept-landscape.svg` | 1280×460 | Arabic wordmark and descriptor fully inside the right edge; all content within frame |
| `WIFQA-concept-dark.svg` | 1280×460 | Arabic wordmark and descriptor fully inside the right edge; all content within frame |
| `WIFQA-concept-monochrome.svg` | 1280×460 | Arabic wordmark and descriptor fully inside the right edge; all content within frame |
| `WIFQA-icon-24.svg` | 24×24 | inspected at native size; full mark fits in rounded square |
| `WIFQA-icon-48.svg` | 48×48 | inspected at native size; full mark fits in rounded square |

XML parsing and explicit size checks passed for all five rendered sources. This is renderer-specific visual QA, not proof of consistent font shaping across browsers/devices. The draft remains unapproved and still needs independent design review and owner review.
