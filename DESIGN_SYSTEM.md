# ChefSpark design system — "Riso Kitchen"

Status: approved direction for the Phase 1 UI redesign (2026-10-22). It replaces the legacy green
look in `client/src/styles.css`, which stays only until each screen is migrated to Tailwind.

Reference mockup (private design canvas, six artboards: visual system, Kitchen, Plan tonight,
Three dishes, Recipe page, Shelf): https://claude.ai/artifact/CsSP8SNGtVMv881mk9tSRy

## Idea

A risograph-printed cooking zine you can actually cook from: ink-black outlines, two spot colours,
chunky display type, hard offset shadows and a faint halftone texture. Bold on browsing screens,
calm and highly legible wherever someone is actually cooking.

## Colour tokens

| Token | Hex | Role |
| --- | --- | --- |
| `ink` | `#141414` | Text, outlines, shadows, navigation bar, primary dark buttons |
| `paper` | `#F3EDE2` | App background |
| `card` | `#FFFDF8` | Cards, inputs, sheets |
| `muted` | `#4A4741` | Secondary text |
| `tomato` | `#E8542F` | Primary action fill, step numbers, "you need" emphasis |
| `tomato-tint` | `#FBDCCF` | "You need" backgrounds, missing ingredient rows |
| `cobalt` | `#2F4FE0` | Match stamp, AI-related accents, links |
| `cobalt-tint` | `#D9DFFB` | "You have" backgrounds, inventory chips, info panels |

Measured contrast (WCAG): ink on paper 15.8, ink on card 18.1, muted on paper 7.9, ink on tomato
5.0, ink on either tint ≥ 13.9, white on cobalt 6.3, cobalt on paper 5.4.

Rules that follow from those numbers:

- Text on `tomato` is always `ink` (white on tomato is 3.7 and fails).
- Never use `tomato` as a text colour on paper (3.1 fails); use it only as a fill.
- Text on `cobalt` is white. Cobalt may be used for link text.
- Tomato means "act / missing"; cobalt means "have / AI". They also differ in lightness, so they
  are not told apart by hue alone.

## Typography

| Use | Font | Notes |
| --- | --- | --- |
| Display: screen titles, dish names, section headings | Bricolage Grotesque 800 | Tight tracking (−0.02 to −0.05em), line-height 0.9–1.0 |
| Body: instructions, descriptions, buttons | DM Sans 400 / 500 / 700 | 16px minimum for body text, line-height 1.5 |
| Data: quantities, times, labels, counters | DM Mono 500 | Often uppercase with 0.1–0.14em letter-spacing |

Scale (mobile): screen title 44–50px, dish title 26px (card) / 50px (recipe page), section heading
20–32px, body 16px, secondary 13–14px, mono label 11–13px. Load fonts from Google Fonts.

## Shape, depth and texture

- Border: 2px solid `ink` on cards, inputs, chips and buttons. Dashed 2px for "add / not yet".
- Radius: 14px inputs and small tiles, 16–22px cards and images, `999px` pills, circles for icon
  buttons and step numbers.
- Shadow: hard offset, no blur: `3px 3px 0`, `4px 4px 0` or `5–6px 5–6px 0` in `ink`.
- Texture: halftone dots on `paper`: `radial-gradient(#14141414 1px, transparent 1.2px)` at 14px.
- Rotation: −3° to +3° on stickers, chips and taped images only; the match stamp may use ±10°.
  Never rotate text the user must read closely (steps, quantities).

## Components

- Primary button: `tomato` fill, ink text, 2px ink border, pill, 4–5px hard shadow, min height 52–60px.
- Secondary button: `card` fill, ink border. Dark button: `ink` fill, `paper` text.
- Icon button: 44px circle, `card` fill, ink border, always with `aria-label`.
- Chip: pill, 2px ink border, min height 40px; inventory chips in `cobalt-tint`; pantry toggles are
  `ink` fill when on and dashed outline when off (`aria-pressed`).
- Card: `card` fill, 2px ink border, 18–20px radius, hard shadow; images sit edge to edge above a
  2px ink rule.
- Match stamp: cobalt circle with white percentage (Bricolage) and mono "MATCH", rotated, overlapping
  the card image corner.
- Have / need panel: two columns, `cobalt-tint` (have) and `tomato-tint` (need), mono headings with counts.
- Segmented control: pill track in `card`; selected segment `ink` with `paper` text.
- Bottom navigation: floating `ink` pill with three tabs (Kitchen / Cook / Shelf); the active tab is a
  `paper` pill. Logout moves to account settings.
- Steps: numbered tomato circles (the final step in ink), 16px body text.
- Loading artwork: `cobalt-tint` panel with diagonal stripes, sparkle icon and a mono status line
  (`role="status"`). Recipe text never waits for artwork.
- Missing artwork: typographic cover in `cobalt` or `tomato` with the dish name in Bricolage.

## Layout

- Mobile first, 390px design width, 20px side gutters, no horizontal scrolling at 360–430px.
- Vertical rhythm in multiples of 4px; section gaps 18–32px.
- Primary action sits above the floating navigation; content gets bottom padding so nothing is hidden
  behind it.
- Desktop: centre the app column (max ~480px for app screens; recipe pages may widen to ~720px).

## Cooking Mode exception

Cooking Mode follows the palette and fonts but not the playful treatment: no rotation, no stickers
or texture behind text, step text 24px or larger, one step per screen, high contrast (ink on card),
44px+ controls reachable by thumb, and screen kept awake where supported.

## Accessibility

Real `<button>`, `<a>`, `<input>` and `<label>` elements; visible focus (3px ink or cobalt outline);
touch targets at least 44px; icon-only controls labelled; decorative images `alt=""`; respect
`prefers-reduced-motion`; all text meets 4.5:1 (see the contrast rules above).

## AI imagery

AI pictures are illustrations only. Label them ("AI illustration" badge or caption); every ingredient,
amount and step comes from the recipe JSON. Show the typographic cover rather than a stock photo
that does not match the dish.

## Implementation (Phase 1)

Tailwind CSS through its Vite plugin, with the tokens above declared once as theme variables (colour,
font family, radius, shadow) so components use names such as `bg-tomato`, `border-ink`, `font-display`.
Screens migrate one at a time while `styles.css` still serves unmigrated screens; the Zine's decorative
CSS (`zine.css`) may remain as custom CSS. Mockup features that are not part of Phase 1 ("Save as
image", "Share", "Redraw artwork") are not implemented while the Zine is paused.
