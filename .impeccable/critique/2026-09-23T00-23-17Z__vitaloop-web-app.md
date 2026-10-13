---
target: "https://vitaloop.web.app"
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
target_identity: "url:https://vitaloop.web.app/"
timestamp: 2026-09-23T00-23-17Z
slug: vitaloop-web-app
---
Method: dual-agent (Assessment A: design review · Assessment B: detector + browser evidence). Coverage caveat: neither sub-agent had an authenticated Chrome session; only /login was live-verified this run, everything else is source-grounded. A false-positive claim from Assessment B (broken Registrieren button) was independently corrected via direct re-test.

Design Health Score total: 26/40 (Acceptable, borderline Poor).

Priority Issues:
[P0] Session-completion screen (SessionCompletionScreen) has no visual design despite housing PR/streak payoff.
[P0] Exercise filtering shows all 29 muscle+equipment chips unconditionally before any content (ExerciseFilterChips), on /training/exercises and in the picker.
[P1] <html lang="en"> on fully German app content - live-confirmed via DOM, breaks screen-reader pronunciation app-wide.
[P1] No confirmation before removing a configured exercise from a plan day (DayBlock "Entfernen") - silent loss of tuned sets/reps/rest.
[P2] Design-system escapes: unstyled reorder buttons next to styled Entfernen; inconsistent retry-button styling across pages; "Registrieren" link has zero visual distinction from static text on /login (live-confirmed, both agents).

What's working: Dialog primitive engineering, login's live-verified contrast/accessibility fundamentals, warm-up/working-set separation logic.

Persona red flags: Alex (no repeat-last-set, tap-through reordering, RIR shown every set); Sam (Registrieren link contrast, lang=en, ambiguous duplicate button accessible names); Casey (not testable this run, filter wall likely worse on mobile).

Minor: wizard duration has no sanity ceiling; unlabeled 82.5kg pre-completion; Streak card duplicates Training card destination; Help/Docs heuristic scored 1/4.
