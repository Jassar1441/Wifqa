# WIFQA parent-brand correction — 14 October 2026
Status: **owner review draft; NOT APPROVED**. Source reference: https://github.com/Jassar1441/Wifqa/issues/14#issuecomment-6150774421
Scope: WIFQA is the parent company for multiple future services. The shopping agent is its first service, not the brand's entire identity.

## Two completed production tasks
1. New reference-inspired flowing ribbon lockup, in editable dark/light SVG. Arabic spelling: **وفقًا**; English: **WIFQA**. Text is live and editable, with Amiri / Noto Naskh Arabic font fallback.
2. Distinct small app icon SVGs at 24px and 48px. Local PNG renders were generated using Inkscape and visually checked at native resolution. Monochrome/256px versions and a full visual presentation board are in the local review package.

## Technical review
- SVG XML parse, title, and viewBox: passed locally.
- Non-background icon mark bounds: 24px x=7..17, y=3..19; margins 7/3/6/4. 48px x=15..36, y=6..40; margins 15/6/11/7. Both clear 10% safe-area margin.
- Contrast: cream #F8F5EC on forest #092F27: 13.31:1; gold #D4AF7C on forest: 7.06:1; charcoal #1E2B28 on cream: 13.46:1. Brown-gold #9C753E on cream: 3.83:1, **not suitable for normal small text**.
- This is a NEW drawing inspired by the owner's visual reference, NOT a traced reproduction or a claim of exact match.
- Not yet completed: font outline conversion, cross-device/print tests, trademark/conflict search, independent QA and owner approval.
- No additional shopping UI was designed, per the owner's later instruction.
- No merge, deployment, payment or permission changes.
