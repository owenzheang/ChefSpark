# ChefSpark design system — "Ember" (cream)

Status: implemented across every screen (Phase 1, completed 2026-10-23). It replaced the earlier
"Riso Kitchen" direction and the original green look; the old `styles.css` has been removed.

Reference mockup (private design canvas, page "C · Ember"): visual system, Kitchen, Tonight's menu,
Recipe, Cooking Mode — https://claude.ai/artifact/CsSP8SNGtVMv881mk9tSRy
(Pages A · Riso Kitchen and B · Mono are kept there as rejected explorations.)

## Idea

A calm, card-free kitchen at night: cast-iron black, flour-white type and one butter-cream glow.
Dishes are named like a tasting menu; data reads like a kitchen order ticket. A small spark marks what
ChefSpark does for you. Minimal and modern, but warm and food-specific rather than tech-like.

## Colour tokens

| Token | Hex | Role |
| --- | --- | --- |
| `iron` | `#15120F` | App background; text on cream |
| `flour` | `#F7F5F0` | Primary text, icons, outlines |
| `soft` | `#D8CFC2` | Reading text in long passages (steps, descriptions) |
| `ash` | `#A39B90` | Secondary text, labels, inactive tabs |
| `cream` | `#EBCD98` | The single accent: primary button fill, spark, match ring, timer arc, glow, chef's notes |

Hairlines are `flour` at 16% opacity (`border-flour/16`); stronger dividers 40%.

Measured contrast on `iron`: flour 17.1, soft 12.1, cream 12.2, ash 6.8. `iron` on `cream` 12.2.

Rules:

- Cream and flour differ only slightly in lightness (1.4:1), so cream is never the only signal. Pair it
  with a marker (✦ spark), a word ("NEED"), weight or an outline.
- One accent only. No red/green states; errors use flour text with a cream ✦ marker and plain words.
- Cream glow (`shadow-glow`) only on the single primary action of a screen.

## Typography

| Use | Font | Notes |
| --- | --- | --- |
| Display: screen titles, dish names | Instrument Serif, italic | Sentence case, line-height 0.95, slight negative tracking |
| Reading: body, buttons, inputs | Hanken Grotesk 400 / 500 / 600 | 16px minimum for body, line-height 1.5–1.6 |
| Data: labels, quantities, times, tickets | IBM Plex Mono 400 / 500 | Uppercase labels at 11–12px with 0.16–0.2em tracking |
| Chef's notes | Caveat 500 | Cream, rotated about −1.5°, at most one per screen |

Scale (mobile): screen title 50–58px, dish title 38–54px, section title 28–32px, body 16px (steps 16px,
Cooking Mode 26–30px), labels 11–13px. Fonts load from Google Fonts.

## Structure (no cards)

- No boxed cards, no drop shadows. Group with whitespace, 1px hairlines and alignment.
- Order-ticket lists: 2px dashed `flour/40` rules above and below, mono rows, no box.
- Images: round "plates" (circular crop) inside a match ring, never full-bleed rectangles.
- Background: `iron` with an optional faint cream radial glow at the top (`bg-ember-glow`).

## Signature elements

- **Spark** ✦ (four-point star, `components/Spark.jsx`): list markers, active tab, loading pulse,
  ticket "need" markers, course dividers.
- **Plate ring**: match score as a circular ring that fills with cream; the percentage sits inside or
  beside it in Instrument Serif.
- **Burners**: difficulty as three small rings, 1–3 lit in cream, always with the word (Easy/Medium/Hard).
- **Dial**: timers as a stove-knob dial with tick marks and a cream arc (Cooking Mode).
- **Chef's notes**: handwritten cream notes, only for content that exists in the recipe (tips,
  substitutions) or facts computed by code (e.g. "you have everything for this one"). Never invented.

## Controls

- Primary action: cream pill, `iron` text, 58px tall, `shadow-glow`. One per screen.
- Secondary action: 1px `flour/40` outlined pill, or an underlined text link with a cream underline.
- Inputs: underline only (1px flour), 48px tall, mono uppercase label above.
- Icon buttons: 44px circle; the add button is a cream circle.
- Selection (cuisine, difficulty): outlined pills; selected = cream fill with `iron` text plus
  `aria-pressed`.
- Bottom navigation: full-width bar with a top hairline; three text tabs (Kitchen / Cook / Shelf); the
  active tab is flour, semibold, with a small cream spark above it.
- Loading: cream spark pulse, rotating status line, elapsed clock, indeterminate hairline shimmer; never
  a fake percentage.

## Layout

- Mobile first, 390px design width, 24px side gutters, no horizontal scrolling at 360–430px.
- Spacing in multiples of 4px; section gaps 24–40px; centred "menu" layout for dish lists.
- Fixed primary actions sit above the navigation with a fade from `iron` behind them.

## Desktop layout (built 2026-10-26)

Same tokens, type, signature elements and controls; only the arrangement changes. One codebase:
the phone layout stays as it is below the breakpoint.

- Breakpoint: phone below 1024px (`lg`). Tablets (768–1023px) keep the phone layout, centred, until a
  tablet layout is designed.
- Shell: a 144px left rail (24px side padding, so the name never touches its hairline) replaces the bottom navigation: ✦ ChefSpark at the top, then Kitchen / Cook
  / Shelf (active = flour with a cream spark before it), Log out at the bottom. 1px `flour/16` hairline on
  its right. Content area up to 1240px wide, 48px gutters, 64px between columns (2026-10-27: was 1120px and 56px, too tight).
- Primary actions are no longer fixed: they sit in the flow at the end of their column, with the same
  cream pill (one per screen). No bottom fade.
- Columns: two columns at most beside the rail; the left one is the "prep" column (inputs, facts,
  ingredients). It stays in view (`sticky`) only where it is short enough (Plan tonight's choices);
  the recipe page's ingredient list can be taller than the screen, so it scrolls with the page.
- Kitchen: left = heading, add input with microphone and add buttons, quick add; right = "In my
  kitchen" ticket as a two-column list, then "Find tonight's dishes".
- Plan tonight: left (320px) = heading, cuisine / difficulty / diet pills and "Try 3 new dishes";
  right = "Tonight's menu" with the three courses side by side (I, II, III), plate rings about 168px.
- Recipe page: left (360px) = back link, plate (232px) with "AI image", facts row,
  ingredients ticket with servings; right = title, method, tips and substitutions, "Adjust this dish",
  "Light the stove".
- Shelf: rows become a three-column grid of the same row (64px plate, title, mono facts), hairline
  under each; no cards.
- Cooking Mode: still full screen without the rail. Three columns (240px, step, 280px; up to 1280px wide): step list (current step marked
  with a cream spark), the current step large in the centre with its ingredients, the two step
  questions and Back / Next, and the timer dial plus any chef's note on the right.
- Dish lists stay centred "menu" style; no boxed cards, no shadows, as on the phone.

## Cooking Mode

One step per screen, step text 26–30px in Hanken Grotesk, progress as dots with a cream spark on the
current step, the dial timer when the step text contains a duration, Back (outlined) and Next (cream)
as large bottom buttons, screen kept awake where supported.

## Motion

Warm and unhurried, like a hob coming up to heat; never bouncy or techy. Tokens live in
`client/src/utils/motion.js` (the `motion` library is already in the stack).

- Timing: fast 150ms (presses), base 250ms (steps, toggles), slow 450ms (arrivals), fill 1.1s (rings and
  counting numbers). One easing, "ember" `cubic-bezier(0.22, 1, 0.36, 1)`; springs only for the gliding spark.
- Animate transform and opacity only (plus SVG `pathLength` for rings). At most one signature moment per screen.
- Signature moments (phase A, 2026-10-29):
  - Plate ring: the rim fills like a flame and the percentage counts up from 0 the first time a plate scrolls
    into view (menu, recipe page); the food picture fades in once loaded. The line under each course's plate
    always takes its space, so a picture arriving never shifts the page.
  - Spark: the active tab's spark glides between tabs (bottom bar and rail); the spark on "Cook up 3 dishes"
    flares and sends out a ring when pressed.
  - Tonight's menu: the courses arrive one after another (I, II, III).
  - Cooking Mode: the stove glow comes up on entry; Next slides in from the right and Back from the left; the
    step spark glides along the progress dots; a finished timer's dial glows and fades (`animate-ember-glow`).
- Small interactions (phase B, 2026-10-29):
  - Kitchen: confirmed ingredients drop into the ticket one after another; a deleted one shrinks away and the
    empty-kitchen line fades in only after it has gone; while listening, rings spread from the microphone.
  - Choice pills (cuisine, difficulty, diet): the cream fill glides to the chosen option.
  - Save: "Saved to shelf" rises in and its spark lights once (only when the save just happened).
  - Servings and the recipe page's amounts roll like a counter (`RollingNumber`): up for more, down for fewer.
  - Cooking Mode step help: an answer opens downward into its place.
- Making tonight's menu (2026-10-29): on each empty plate a short cream flame circles the rim (`animate-burner`,
  2.4s loop, plates offset by 0.8s) around the breathing centre spark. It loops and never fills, so it claims no
  progress. Steam lines were tried and dropped: too small to read as steam. With reduced motion only the rim shows.
- Shared plate (phase C, 2026-10-29): opening a dish from tonight's menu flies its plate from the menu to the
  dish page (and back with "← Menu", which returns the menu scrolled to that dish). The flying plate arrives
  already filled; the pages it lands on skip their fade-in so nothing dims it. Built on screen coordinates
  (`PlateRing` `flightId`, `plateDeparted`/`takeDeparture` in `motion.js`), not motion's `layoutId`, which
  misplaces the start when the page scrolls on navigation. No flight if the landing spot is off screen.
  The breathing top glow was considered and declined.
- Reduced motion: `MotionConfig reducedMotion="user"` stops transform animations; components that animate
  other values (ring fill, counting) check `useReducedMotion` and show the final state. CSS animations always
  use `motion-safe:`.

## Accessibility

Real `<button>`, `<a>`, `<input>` and `<label>` elements; visible focus (2px cream outline with offset);
touch targets at least 44px; icon-only controls labelled; decorative images and sparks hidden from
assistive tech; respect `prefers-reduced-motion`; text contrast as measured above.

## AI imagery

Illustrations only, labelled as AI. Generated food images should be top-down plated dishes so the round
plate crop works. Without an accurate image, show the empty plate ring (never a stock photo of another
dish).

## Implementation

Tailwind CSS 4 through its Vite plugin. `client/src/index.css` declares these tokens once (colours, font
families, glow shadow) and the `bg-ember-glow` utility; components use names such as `bg-iron`,
`text-flour`, `bg-cream`, `font-display`, `border-flour/16`. Tailwind's preflight reset is on; `html`
and `body` default to the sans font, `flour` text and the `iron` background. Screen roots carry a
`data-ds` attribute as a marker for tests (it no longer drives any CSS).
