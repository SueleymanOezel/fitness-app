---
target: "https://vitaloop.web.app"
total_score: 19
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "url:https://vitaloop.web.app/"
timestamp: 2026-09-06T15-36-50Z
slug: vitaloop-web-app
---
Method: dual-agent (A: general-purpose sub-agent · B: general-purpose sub-agent) — run sequentially, not concurrently, because both drive the one physical Chrome instance connected to this machine and parallel browser control risked tab/action interference; each was isolated from the other's output until this synthesis.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2/4 | Bare "Lädt…" text, no skeletons; every under-threshold chart shows the identical "Noch nicht genug Daten" with no indication of how much more is needed. |
| 2 | Match System / Real World | 3/4 | Consistent German copy; a few trainer terms (RIR, 1RM, MET) undefined for first-timers. |
| 3 | User Control and Freedom | 2/4 | No delete-confirmation dialogs anywhere (plans, sessions, entries), no undo. |
| 4 | Consistency and Standards | 2/4 | Profile/CalorieGoalEditor still pre-redesign native controls; Analyse-page checkboxes are raw `<input type=checkbox>` instead of the `Chip` used everywhere else for binary state. |
| 5 | Error Prevention | 2/4 | No confirmation before destructive actions; no proactive guardrails on the 873-row exercise list. |
| 6 | Recognition Rather Than Recall | 2/4 | Bottom nav has 4 icons with no on-screen text labels; 873-item exercise list has no visual memory aid. |
| 7 | Flexibility and Efficiency of Use | 1/4 | No shortcuts, no bulk actions, filtering limited to one name-substring box on the largest list; dashboard customization exists but is buried on the Analyse subpages. |
| 8 | Aesthetic and Minimalist Design | 2/4 | Clean but under-designed: the one accent color does double duty as CTA and plain link, so nothing signals importance; confirmed by the detector's own contrast findings below. |
| 9 | Error Recovery | 2/4 | Inline-vs-toast error rules exist per project docs, not verified live (empty test account, no error states triggered). |
| 10 | Help and Documentation | 1/4 | No help affordance, tooltip, or onboarding anywhere across 14 routes. |
| **Total** | | **19/40** | **Poor — major visual/interaction overhaul warranted; underlying engineering is solid.** |

## Design Specificity Verdict

**LLM assessment:** Category-interchangeable, not authored for this product. Every surface — chart panel, exercise row, empty-state card, metric tile — renders as the identical grey rounded rectangle with centered white text; strip the four nav icons and the German copy and nothing here says "fitness/nutrition tracker" specifically. A real, disciplined token system exists (`ui-classes.ts`, `Chip.tsx`, an exact 19-chart color map pixel-sampled from the reference video) — but a full-repo search for `transition|hover:|active:|animate-|@keyframes|focus-visible` across `src/` returns nothing. The palette was extracted from the reference video pixel-for-pixel; whatever made that reference feel alive was not extracted with it.

**Deterministic scan:** The bundled detector, run via live browser overlay on 5 representative pages (`/training`, `/nutrition`, `/body`, `/training/analyse`, `/profile`), returned 6 raw findings, all either `low-contrast` (5 instances, 2 distinct color pairs) or `line-length` (1, on `/profile`'s helper text). No layout-shift or tap-target findings fired. The two contrast pairs recur identically across pages — a systemic token gap, not detector noise:
- `#5e5f66` muted text on `#23242b` surface → **2.4:1** (need 4.5:1) — inactive Chip/range-filter labels, empty-state copy.
- `#fefeff` button text on `#8766ed` accent → **4.0:1** (need 4.5:1) — this is the *primary CTA color itself* ("Heute eintragen", active range pill), not just secondary text.

The second finding is new information the LLM pass didn't have in this precise form — Assessment A named the muted-text contrast issue qualitatively but didn't measure the accent-button text itself failing AA too. Both scans agree completely on the underlying cause: this is a token-level problem (2 color pairs), not scattered inconsistency.

**Visual overlays:** Script injection succeeded (no CSP blocking observed) and the detector overlay ran live in-browser, but the assessment closed its tab afterward as instructed, so no overlay is currently visible in your browser — the findings above are the console output it captured before closing.

## Overall Impression

The bones are good and the surface is flat. A real, disciplined design-token system shipped in Phase 6 (cards, buttons, chips, a documented 19-chart color map, a genuinely well-built native `<dialog>`) — but nothing on screen ever reacts to being touched: zero CSS transitions, hover states, or active states exist anywhere in the codebase, confirmed independently by both passes. That is almost certainly the literal, mechanical source of "langweilig" and "nicht interaktiv": every tap is silent until the resulting state change appears. Layered on top, a genuine token bug (two contrast pairs both failing AA, one of them on the primary CTA color itself) drains what little visual weight the accent color could carry, and `/profile` — reachable from every screen — was left out of all four Phase-6 area plans and still looks like the pre-redesign app. Biggest single opportunity: motion and press-feedback on the existing component set, which touches every page at once without redesigning anything structurally.

## What's Working

1. **A real, consistently-applied token system.** `cardClass`/`buttonPrimaryClass`/`Chip`/`ChartFrame` are used the same way across Training, Nutrition, Body, and all 19 charts, with an exact documented color-to-metric map — rarer and better executed than most solo-project redesigns.
2. **The native `<dialog>` pattern is genuinely well-crafted** — `::backdrop` blur, centered layout, a deliberately non-standard close affordance matching the reference material instead of a generic top-right X.
3. **Baseline accessibility hygiene is present under the visual surface**: `aria-label` on every icon-only control with `aria-hidden` on the glyph, `role="list"` preserved on markerless lists, 44px minimum tap targets enforced project-wide, safe-area-inset handling on the floating nav.

## Priority Issues

**[P1] Zero interactive/motion feedback anywhere in the codebase**
- **What:** No button, card, chip, or nav item changes appearance on hover, press, or focus beyond the browser default. Repo-wide search for `transition`/`hover:`/`active:`/`animate-`/`@keyframes`/`focus-visible` finds nothing real.
- **Why it matters:** This is the mechanical root of "nicht interaktiv" — the app is fully functional but visually inert on every interaction.
- **Fix:** Add `transition-colors`/`transition-transform` plus `hover:`/`active:` states to `buttonPrimaryClass`, `buttonSecondaryClass`, `Chip`, and any tappable card; a brief success flourish on the toast.
- **Suggested command:** `/impeccable animate`

**[P1] Two contrast-failing color pairs, one of them on the primary CTA color itself**
- **What:** Detector-confirmed: `#5e5f66` on `#23242b` = 2.4:1 (muted text/inactive chips, used app-wide); `#fefeff` on `#8766ed` = 4.0:1 (the accent CTA color itself, on "Heute eintragen" and active range pills). Both fail the 4.5:1 AA text minimum; the muted pair also fails 3:1 even for UI components (confirmed against the bottom-nav pill background, where 3 of 4 inactive icons are nearly invisible).
- **Why it matters:** A real accessibility failure for low-vision users, and it's the specific reason the app reads as visually flat — the one color meant to carry emphasis is borderline-illegible on its own button, and secondary text washes out everywhere.
- **Fix:** Lighten `--color-text-muted` to clear AA on both backgrounds it's used against; verify/adjust the CTA text color on `#8766ed` to clear 4.5:1; give inactive nav icons their own value distinct from generic muted text.
- **Suggested command:** `/impeccable harden`

**[P1] `/profile` (and `CalorieGoalEditor`) is a visual regression one tap from anywhere**
- **What:** Confirmed deliberately out of scope for all four Phase-6 area plans; still renders entirely as unstyled native browser inputs/dropdowns/buttons. Detector also flags a line-length issue on its helper text (~122 chars/line, no wrap treatment).
- **Why it matters:** Profile is reachable from every single screen via the header icon — most sessions hit this jarring quality drop within seconds.
- **Fix:** Bring Profile onto `cardClass`/`buttonPrimaryClass`/`buttonSecondaryClass` like the rest of the app; needs its own small follow-up scope since it fell through the cracks of the four area plans.
- **Suggested command:** `/impeccable adapt`

**[P2] Accent purple means two different things**
- **What:** `#8766ed` is used identically for plain in-page navigation links ("Meine Pläne", "Analyse", "Zurück zum Training") and for primary CTA buttons ("Anlegen", "Barcode scannen", "Heute eintragen") — and per the finding above, is itself borderline-illegible as button text.
- **Why it matters:** The only accent color in an otherwise two-tone-grey app is spent equally on ordinary links and primary actions, so it stops signaling priority.
- **Fix:** Give plain navigational links a neutral, properly-contrasted treatment; reserve accent purple for primary actions and active/selected states only.
- **Suggested command:** `/impeccable clarify`

**[P2] The app's biggest list and busiest form both violate the ≤4-choice guidance**
- **What:** `/training/exercises` renders 873 visually identical grey pills filterable only by name substring, despite muscle-group data already existing in the same codebase. `/nutrition/entries` stacks four full-width, equal-weight "+ Hinzufügen" buttons with no visual priority.
- **Why it matters:** Both are textbook wall-of-options violations on workflows that should be fast (finding an exercise, logging a meal), not a scroll-fest through lookalikes.
- **Fix:** Add a muscle-group `Chip` filter row above the exercise search; demote three of the four nutrition "+ Hinzufügen" buttons to secondary styling or fold under section headers.
- **Suggested command:** `/impeccable layout`

## Persona Red Flags

**Alex (Power User)**
- No keyboard shortcuts, no bulk actions on the 873-row exercise list, food-entry list, or body-entry history.
- Must scroll a flat, unfiltered 873-item list one row at a time — the only filter is a name-substring box.
- Dashboard customization exists (per-chart "Auf dem Dashboard zeigen" checkbox) but is buried on the Analyse subpages, never surfaced from the dashboard itself.
- Zero hover/press feedback (confirmed by repo search) makes the app *feel* laggy to a fast user even though the underlying reactivity is instant.

**Sam (Accessibility-Dependent User)**
- Bottom-nav icons carry correct `aria-label`s for screen readers, but sighted low-vision users get no visible text labels at all.
- Detector-confirmed: inactive nav icons/text measure 2.4:1 — below even the 3:1 WCAG minimum for UI components — so 3 of 4 nav destinations are effectively invisible to reduced-contrast vision.
- The primary CTA color itself (`#fefeff` on `#8766ed`, 4.0:1) also fails AA text contrast — even the "important" surfaces aren't safely readable.
- `/body/photos`'s date/file inputs render as unstyled native widgets inside an otherwise-styled card — low-contrast, small-hit-area, breaking the 44px convention followed everywhere else.

## Minor Observations

- Analyse-page "Auf dem Dashboard zeigen" toggles are raw `<input type=checkbox>`, not the `Chip` component used for every other binary state.
- The dialog offers two redundant cancel affordances (a labeled "Abbrechen" button and an unlabeled circular X) with no cue for which is "correct."
- Every under-threshold chart across all 19 charts shows the identical "Noch nicht genug Daten" string with no indication of what's needed to unlock it.
- The reviewed account had zero training/nutrition/body data — none of the 19 charts' actual colors/tooltips/interactivity could be evaluated live. Some of the "boring" impression may be partly an empty-account artifact layered on top of the real issues above, worth keeping in mind when judging the fix.
- True narrow-viewport (~390px) rendering wasn't reliably captured in either pass; mobile-specific layout is inferred from CSS (`max-width: 100%`), not visually confirmed.
- Detector only swept 5 of 14 routes (representative sample); `/`, `/training/plans`, `/training/exercises`, `/training/history`, `/nutrition/entries`, `/nutrition/analyse`, `/body/entries`, `/body/photos`, `/body/analyse` weren't run through the overlay — the contrast tokens are app-wide though, so the same two pairs almost certainly recur there too.

## Questions to Consider

1. If every surface — a chart panel, an exercise row, a metric tile, a nav link — renders as the same grey rounded rectangle with white centered text, how is a user meant to tell "this is information" from "this is a button" at a glance?
2. The reference video's colors were measured down to the pixel, but there isn't a single CSS transition or hover/active state anywhere in the codebase — was "interactive" ever actually visible in that reference, and did it get lost between the color analysis and the build?
3. The one color meant to say "do this now" is also the color of every plain text link, and it's borderline-illegible as button text besides — is the app actually calm, or is it just refusing to have an opinion (and doing so with a token bug)?
