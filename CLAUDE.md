# mechaform-cockpit

Spec of record: /Users/mattishaumann/dev/mattis-vault/cases/tacto/specs/mvp-cockpit.md. Follow the loop rules in ~/dev/mattis-vault/CLAUDE.md.

Read-only Tacto-branded prototype on the MechaForm Supabase project. Every number on screen comes from mvp_cases, mvp_register, mvp_stats or v_order_lines; nothing is recomputed in the browser. UI copy lives in src/copy.ts. Colours only through src/styles/tokens.css.

# Design rules
# Design rules

Applies to all UI in this repo. A hard ban is a bug, not a preference.
Machine-checkable parts: `python3 ~/.claude/skills/design/audit.py`

## Gate: before writing any UI
1. A tokens file must exist and define the accent, a neutral ramp tinted toward
   the accent hue, radius, and shadows. Generate one:
   `python3 ~/.claude/skills/design/make_tokens.py "#YOURHEX" > src/styles/tokens.css`
2. A named visual reference must exist (`design/reference/*.png`) or be named in
   the prompt. "Clean and modern" is not a reference; "match Linear's density and
   type hierarchy" is.
3. One component at a time, with all its states, before composing a page.

## Hard bans
- No emoji in UI, headings, nav, buttons, or empty states.
- No purple/indigo-to-blue gradient, unless it is literally the brand.
- No pure neutrals: never `#000`, `#fff`, or an untinted gray.
- No arbitrary values. Every spacing, size, radius and colour comes from a token
  or a scale below. No `p-[13px]`, no inline hex.
- No untouched shadcn/Tailwind default palette (zinc/slate/gray as shipped).
- No glassmorphism, no three-equal-card feature grid, no uniform hover-lift on
  every card, no "Transform your business" copy.
- One font family for UI. A second only for a display face. Never a third.

## Spacing (px): 4, 8, 12, 16, 24, 32, 48, 64, 96, 128
Related elements get less space than the gap to the next group - a form label
sits closer to its input than to the field above it. Separate sections with
space, not border lines.

## Type
- Sizes (rem): 0.75, 0.875, 1, 1.125, 1.25, 1.5, 1.875, 2.25, 3, 4
- Weights: 400 body, 500-600 headings, 700 max. Never below 400.
- Headings >=1.875rem: line-height 1.1, letter-spacing -0.02em
- Body: line-height 1.5, measure 60-75ch
- `clamp()` for fluid headings. `tabular-nums` on any number that updates in place.
- Inputs >=16px so iOS does not zoom.

## Colour
- One accent, for one job (primary action / active state). Not for headings, not
  for decoration.
- Components reference semantic tokens only: `--color-bg`, `--color-surface`,
  `--color-text`, `--color-text-muted`, `--color-border`, `--color-border-strong`,
  `--color-accent`. Never a raw ramp value, never a hex.
- `--color-border` is decorative (dividers, card edges) and may be very low
  contrast. `--color-border-strong` is for input and control edges and must clear
  3:1. Do not swap them.
- WCAG AA: 4.5:1 body text, 3:1 large text and control edges. Check muted text
  against its real surface, not against white. `make_tokens.py` verifies this at
  generation and picks the passing ramp stops for you.

## Motion
- 150-250ms for UI, 300ms ceiling for page-level. Nothing longer.
- ease-out for enter and for responses to input; ease-in-out for moves.
- Animate `transform` and `opacity` only.
- Dialogs scale in from 0.96-0.98 with a fade, never from 0. Buttons to 0.96 on press.
- Interruptible. `prefers-reduced-motion` swaps movement for a fade.
- Do NOT animate frequent or keyboard-initiated actions: command menus, dropdowns
  on keypress, list add/delete, tab switches.

## Every interactive component ships all eight
default, hover (inside `@media (hover:hover)`), focus-visible (box-shadow ring so
it follows the radius, never `outline`), active, disabled, loading (skeleton
matching the real layout, not a spinner), empty (with the create action), error
(inline, adjacent to what failed).

A component without its empty and error state is not done.

## Structure and a11y
- Semantic HTML. `<button>` for actions, `<a>` for navigation. Icon-only buttons
  need `aria-label`.
- Inputs live in a `<form>` so Enter submits. Labels are `<label for>`.
- Disable the submit button while the request is in flight.
- Dropdowns open on `mousedown`, not `click`. Lists are arrow-key navigable.
- Mutations update optimistically and roll back visibly on error.

## Content
Real content, never lorem ipsum. Sentence case for headings and buttons. No
exclamation marks.

## Before calling a screen done
- [ ] `python3 ~/.claude/skills/design/audit.py` exits 0
- [ ] every interactive element has all eight states
- [ ] rendered at 375 / 768 / 1280, no horizontal overflow
- [ ] tab through it: focus ring visible at every stop, order is sane
- [ ] screenshot-diffed against the reference, two passes
