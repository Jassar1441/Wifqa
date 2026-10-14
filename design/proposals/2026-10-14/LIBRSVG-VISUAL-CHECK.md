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

## Small-icon safe-area adjustment

The QA pass found that the previous small mark reached the bottom edge. The 24/48 SVGs now wrap all mark paths in `translate(20 15) scale(.78)`, use one deep-green fill for both ribbons, remove the fine lower gold tail, widen the cream cut, and use dark gold `#8B5E1A` for the diamond. The light/dark/monochrome lockups were not changed in this pass.

At native-size PNG raster dimensions, a pixel mask for the green/gold artwork (excluding the cream rounded-square background) measured:

| PNG | Mark bounds (x,y) | Margins left/top/right/bottom | 10% target | Result |
|---|---:|---:|---:|---|
| 24×24 | x=8–18, y=4–19 | 8/4/5/4 px | 2 px | pass |
| 48×48 | x=16–38, y=8–40 | 16/8/9/7 px | 5 px | pass |

Calculated accent contrast is 5.19:1 for dark gold `#8B5E1A` on cream `#F8F5EC`; the cream cut against green `#0F3D2E` is 11.15:1. The 24px and 48px PNGs were inspected at native size after this simplified redraw.

XML parsing and explicit size checks passed for all five rendered sources. This is renderer-specific visual QA, not proof of consistent font shaping across browsers/devices. The draft remains unapproved; independent QA should review only the small-icon revision, followed by owner review.
