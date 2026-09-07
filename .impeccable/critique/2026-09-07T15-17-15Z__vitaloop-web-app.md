---
target: "https://vitaloop.web.app"
total_score: 14
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 3
target_identity: "url:https://vitaloop.web.app/"
timestamp: 2026-09-07T15-17-15Z
slug: vitaloop-web-app
---
**Method: dual-agent (Assessment A: design review · Assessment B: detector + browser evidence)**

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Progress stated as body-copy sentences, never visually (e.g. calorie status on `/nutrition`); no console errors anywhere (B, clean) |
| 2 | Match System / Real World | 1 | 17 muscle-group chips are raw English DB values (`lats`, `traps`, `middle back`) in a German UI |
| 3 | User Control and Freedom | 1 | B found a real functional bug A didn't: the Logout button on `/profile` is 58% covered by the sticky bottom nav (nav spans 825.5-893px, button 862-915px) and its bottom edge exceeds the viewport by ~4px |
| 4 | Consistency and Standards | 1 | `/login` was never brought onto the card/button design system; three visually identical buttons for opposite-intent actions |
| 5 | Error Prevention | 2 | 12+ field flat form on `/profile`, no inline validation shown, no per-field save unlike training screens |
| 6 | Recognition Rather Than Recall | 1 | Icon-only bottom nav (4 unlabeled glyphs); exercise rows show name only, no muscle group/equipment/image |
| 7 | Flexibility and Efficiency | 1 | ~4.5 of 873 exercises visible per screen, no favorites/recents/density control |
| 8 | Aesthetic and Minimalist Design | 2 | Clean but this is absence of design, not distillation - label and value share font/size everywhere |
| 9 | Error Recovery | 2 | No console errors (B, clean); Logout bug above is itself an unrecovered UI defect |
| 10 | Help and Documentation | 1 | `/` (home) ships "Platzhalter - Inhalt folgt in Phase 2/3." to production |
| **Total** | | **14/40** | **Poor** |

No heuristic scored n/a - this is an Operate-class app, both 7 and 10 apply directly.

## Design Specificity Verdict

LLM assessment (Assessment A): Reads as a generic dark admin shell, not a fitness app. Root cause architectural: `#root { text-align: center }` in `src/index.css:71` centers every page as prose.

Deterministic scan (Assessment B): CLI `impeccable detect --json` against `/login` (the one legitimately anonymous route) came back clean (exit 0, `[]`). All 8 authenticated routes inspected directly in the user's real logged-in Chrome session. No console errors/warnings on any of 8 pages, no broken images, no horizontal overflow. Two systemic WCAG contrast failures: accent-purple links measure 4.30:1 (need 4.5:1 AA for text); active bottom-nav icon measures 2.45:1 (need 3:1 for UI graphics).

Agreement: both flag bottom-nav occlusion and English muscle-group labels.
Detector caught, LLM missed: the Logout-button 58% coverage; exact WCAG contrast ratios.
False positives ruled out: H1 scrollHeight/clientHeight mismatch on /login (line-height artifact); four differently-styled "+ Hinzufuegen" buttons (confirmed intended pattern).

## Overall Impression

The three Nachschaerfung rounds did what they set out to do - hover/press/focus motion, WCAG-AA text-muted contrast, the Profile page, the two wall-of-options fixes - all verified present and working. None touched the actual cause of "boring": centered-prose layout with no visual hierarchy, a placeholder home screen, an unstyled login page.

## What's Working

- `/nutrition/entries` button hierarchy and `/training/exercises` chip filter both verified correct against real production data.
- Design-token layer is unusually disciplined - pixel-sampled hex values, a `--color-on-bright` token introduced specifically to fix a contrast failure, `motion-reduce:transition-none` done correctly, 44px tap targets enforced.
- Focus-visible works - confirmed via real Tab-key navigation.

## Priority Issues

[P0] Home dashboard is a shipped placeholder - `/` renders "Platzhalter - Inhalt folgt in Phase 2/3." -> /impeccable layout, then /impeccable bolder

[P0] `/login` was missed by every redesign pass - no logo, no card, no accent; three visually identical buttons for register/login/OAuth. -> /impeccable adapt, then /impeccable onboard

[P1] Bottom nav physically obscures interactive controls - Logout on `/profile` 58% covered, partly exceeds viewport; 2.5px overlap on "Fortschrittsfotos" on /body. -> /impeccable polish

[P1] Centered-prose layout removes all hierarchy - `#root { text-align: center }` (`src/index.css:71`). -> /impeccable typeset, then /impeccable layout

[P1] Every empty/no-data state is a dead end - "Kein aktiver Plan.", three "Noch nicht genug Daten"-cards, /body's seven em dashes. -> /impeccable clarify, then /impeccable onboard

[P2] Accent purple fails WCAG AA as text/icon color - 4.30:1 (need 4.5:1) on links, 2.45:1 (need 3:1) on active nav icon. -> /impeccable harden

[P2] English DB values leak into the German UI - all 17 muscle-group chips untranslated. -> /impeccable clarify

## Persona Red Flags

Jordan (first-timer): Lands on `/` and reads the product is unfinished, day one. `/login` gives no visual cue which of three identical buttons is for a new account. `/training` offers no "start here" CTA.

Alex (power user): ~4.5 of 873 exercises visible per screen, no favorites/recents/A-Z jump. No result count after filtering. `/profile` has no per-field auto-save unlike training screens.

Casey (distracted mobile): The one loud violet button on `/nutrition/entries` always says "add to Fruehstueck," even at 20:00 dinner time.

## Minor Observations

- `Gewicht (kg)-` on `/body`: label and value string-concatenated, no separating space - affects all 7 metric cards.
- Profile says 131 kg; `/body` shows `-` for the same fact, no cross-reference.
- The `--color-success` (lime) token exists and appears unused anywhere in the 8 pages checked.
- `/login` is reachable while authenticated (known since Phase 5, still true).

## Questions to Consider

1. If you deleted the four bottom-nav icons and translated the labels, could a stranger tell this was a fitness app rather than an expense tracker?
2. Should "screenshot every route in the router" become a standing final-review step, independent of what a given plan touches?
