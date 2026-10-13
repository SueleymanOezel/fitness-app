---
target: "https://vitaloop.web.app"
total_score: 18
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 3
target_identity: "url:https://vitaloop.web.app/"
timestamp: 2026-09-23T00-41-12Z
slug: vitaloop-web-app
---
Method: dual-agent (Assessment A: design review, Assessment B: detector + browser evidence), both fully authenticated. Supersedes the partial/unauthenticated snapshot from earlier the same day.

Design Health Score total: 18/40 (Poor).

Design specificity: genuine strength-training domain logic (live muscle-silhouette highlighting, RIR question, warm-up-set exclusion, live 1RM calc, dynamic TDEE recalculation) but generic flat visual language that never rises to meet it; peak-end moment (workout completion) uses the same template as a neutral list screen.

Priority Issues:
[P0] Bottom-nav overlap only partially fixed - /profile Logout is fixed (70px clearance, live-confirmed), but /body's "Heute eintragen" button has 57-69% overlap with the bottom nav at initial load (getBoundingClientRect + elementFromPoint confirmed clicks land on nav, not button); also observed on the active workout-session screen.
[P0] Logout and "Konto loeschen" (permanent account deletion) are visually identical, adjacent, unconfirmed - same row/size/color, 8px apart, no extra friction before an irreversible action.
[P1] <html lang="en"> on fully German app content - live-confirmed via DOM, app-wide, unaffected by login state.
[P1] Silent validation failure - submitting the plan-wizard name step empty does nothing, no error state.
[P1] Systemic missing-separator/locale bugs in nutrition list ("Testapfel100 g52 kcal") and body-history ("23.09.2026Gewicht (kg): 82.5", raw period instead of the app's usual German-locale comma).
[P2] English exercise name ("Machine Bench Press") leaks into German set-logging and the completion screen's records card.
[P2] Peak-end completion screen (new 1RM, first-workout milestone) has no distinct visual treatment vs. neutral list screens.
[P2] 29-chip filter wall (16 muscle + 13 equipment) shown unconditionally before any results, confirmed again live.
[P2] Design-system escapes: "Aktivieren" plain text next to icon-styled "Loeschen"; inconsistent "Eintrag hinzufuegen" styling across meal slots; missing number-spinner on Wiederholungen field.
[P3] No step indicator in the 3-step plan wizard.
[P3] Unmatched routes render a blank page with no way back.
[P3] Zero help/documentation anywhere.

What's working: live muscle-silhouette feedback on adding an exercise; set-logging micro-interactions (Satz X von Y, auto-advance, RIR question); dynamic calorie-goal recalculation after logging bodyweight.

Contrast (live, both agents corroborate): accent rgb(162,136,241) vs body bg 6.11:1, vs card bg 5.39:1; muted text 5.59:1/4.93:1 - all AA pass, prior P2 contrast fix confirmed live and effective. No console errors, no broken images, all touch targets >=44px, keyboard focus visible everywhere tested.

Persona red flags: Alex (no recents/favorites in exercise picker, no "done" state after finishing planned sets, click-through day reordering); Sam (exercise-detail modal close button only at bottom of scroll content, unlabeled floating "131 kg" on workout screen); Casey (true 390px emulation not achievable this run - tooling limitation, not fabricated; desktop-observed single-column layout at all widths 1568-1920px suggests the nav-overlap bug would be equal or worse on real mobile).

User decision: bundle all findings (P0-P3) into one combined Vorhaben rather than tackling by priority tier separately.
