# Design-Spec: Redesign Phase 2a – Gemeinsame Bausteine (VitaLoop)

**Stand:** 13.10.2026
**Status:** Architektonisches Vorhaben, brainstormed und vom Nutzer bestätigt, wartet auf Review der geschriebenen Spec.

## Kontext

Phase 1 („Fundament", PR #73) hat GSAP als lazy Chunk (`loadGsap()`), `prefersReducedMotion()`, den Token `--nav-clearance`, `stickyActionClass` und den animierten `Dialog` geliefert. Phase 2 wendet das auf die wirkungsvollsten Screens an und wurde in vier Teile zerlegt, jeder mit eigenem Spec → Plan → Umsetzung:

- **2a Gemeinsame Bausteine (diese Spec)**
- 2b Trainings-Session + Abschluss-Screen
- 2c Übungskatalog/-Picker (Filter-Kollaps, Listen-Reveal)
- 2d Home-Dashboard

2a kommt zuerst, weil 2b–2d auf den Bausteinen aufbauen. Übergeordnet gilt die Spec `2026-09-23-visuelles-interaktions-redesign-design.md` (Marke, Motion-Regeln, Reduced Motion, Performance als harte Grenze).

## Ziel

Jedes interaktive Element der App gibt beim Antippen spürbares, einheitliches Feedback (Scale-Down mit elastischem Zurückfedern), parallele Aktionen sind einheitlich gestylt, große Zahlen haben eine eigene Typografie, und die Bottom-Nav verdeckt auf keiner Seite mehr eine Primäraktion.

## Nutzer-Entscheidungen

- Tap-Feedback per **GSAP-Spring** wie in der Haupt-Spec, nicht CSS-only.
- Umsetzung per **Hook/Wrapper (`Pressable`)**, nicht per globalem Event-Listener.
- Umfang: **alle ~94 Stellen in 2a** umstellen, plus **ESLint-Regel gegen rohe `<button>`**.

## Abschnitt 1: Pressable und Tap-Feedback

- **`src/lib/press-feedback.ts`:** `attachPressFeedback(el): () => void`. Bei `pointerdown` skaliert ein GSAP-Tween auf ca. 0,96, bei `pointerup`, `pointerleave` und `pointercancel` springt er elastisch auf 1 zurück. `prefersReducedMotion()` wird zum Zeitpunkt des Events geprüft. Schlägt `loadGsap()` fehl, passiert nichts (die UI bleibt voll funktionsfähig). Die zurückgegebene Cleanup-Funktion entfernt die Listener, beendet laufende Tweens und setzt `scale` zurück.
- **`usePressFeedback(ref)`** (`src/lib/use-press-feedback.ts`) hängt das an ein Element und ruft die Cleanup-Funktion beim Unmount. Beim ersten Mount der App stößt es einmalig im Leerlauf (`requestIdleCallback`, Fallback `setTimeout`) das Vorladen des GSAP-Chunks an, damit der erste Tap nicht auf den Netzwerk-Load wartet. Der initiale Bundle bleibt unberührt.
- **`Pressable`** (`src/components/Pressable.tsx`) rendert einen `<button>`; **`PressableLink`** rendert ein react-router-`Link`. Prop `variant`: `primary`, `secondary`, `danger`, `bare`. Die Varianten nutzen die bestehenden Klassen-Strings aus `ui-classes.ts`, ergänzt um eine `danger`-Variante. Das CSS-`motion-safe:active:scale-[0.97]` wird aus `interactiveClass` entfernt, damit sich CSS-Skalierung und GSAP nicht doppelt anwenden.
- **`Chip`** und **`BottomNav`** nutzen `usePressFeedback` direkt.
- **Migration:** alle rohen `<button>`, die heute mit den Klassen-Strings oder dem globalen Basis-Stil gestylt sind, wechseln auf `Pressable`/`PressableLink`. Parallele Aktionen („Hinzufügen" in Mahlzeiten-Slots, „Aktivieren" vs. „Löschen") landen damit automatisch in den vier Varianten, das erledigt den Ein-Akzent-Lock der Haupt-Spec.
- **ESLint:** `no-restricted-syntax` verbietet `JSXOpeningElement[name.name='button']` mit Hinweis auf `Pressable`. Override für `Pressable.tsx` selbst (und Testdateien, die rohe Buttons als Fixture brauchen).
- **Opt-out:** `bare` ohne Feedback gibt es nicht; wer kein Feedback will, nutzt kein interaktives Element.

## Abschnitt 2: Layout, Typografie, Cleanup

- **`main`-Padding:** in `src/index.css` wird `padding-bottom` von `calc(4rem + env(safe-area-inset-bottom) + 16px)` auf `var(--nav-clearance)` umgestellt. Damit gilt der Nav-Abstand für alle Seiten, auch wenn die Primäraktion das letzte Element ist (z. B. Trainings-Session). `stickyActionClass` bleibt für den Fall „es folgt noch Inhalt“.
- **Typografie:** `ui-classes.ts` bekommt `statClass` (große, fette, eng getrackte Zahl, `font-variant-numeric: tabular-nums`) und `labelClass` (kleiner, gedämpft `text-text-muted`, mittleres Gewicht, klar abgesetzt vom Wert). Angewendet wird das in 2a nur auf `/body` (Beispiel aus dem Critique: „Gewicht (kg)—“ ohne Hierarchie). Die übrigen Screens folgen in 2b–2d.
- **Dialog-Cleanup:** `Dialog.tsx` führt die Tweens in einem `gsap.context()` und ruft beim Unmount `revert()` auf (Review-Finding aus Phase 1, damals bewusst nach 2 verschoben).

## Tests und Verifikation

- **Vitest:** `attachPressFeedback` (gemockter `gsap-loader`, Reduced Motion, Ladefehler, Cleanup entfernt Listener und setzt `scale` zurück), `Pressable`/`PressableLink` (Varianten, `disabled`, Weitergabe von Props und Ref), `Dialog` (Unmount während Animation räumt auf), Regressionstest, dass `src/index.css` für `main` `var(--nav-clearance)` verwendet.
- **ESLint:** Lauf über das ganze Projekt muss sauber sein; ein roher `<button>` in einer Fixture-Datei beweist, dass die Regel greift (RED vor GREEN).
- **`playwright-cli`, 390 px Viewport:** Nav-Abstand auf `/body`, `/training/session`, `/profile` per `getBoundingClientRect`; Tap-Feedback sichtbar (Scale-Messung während `pointerdown`); mit `reducedMotion: 'reduce'` wird der GSAP-Chunk nicht nachgeladen.
- **Live-Verifikation** nach Deploy gegen Produktion (Bundle-Hash, `/body`, ein Tap-Test).

## Risiken

- **Großer Diff** (~32 Dateien) kollidiert nicht mit 2b–2d, weil diese erst danach starten. Die Migration ist mechanisch und wird dateiweise geprüft.
- **Bundle:** der GSAP-Chunk (27 kB gzip) wird auf jeder Seite im Leerlauf geladen. Er blockiert weder Paint noch Interaktion; falls Messung das Gegenteil zeigt, ist der Rückfall, das Vorladen auf den ersten `pointerdown` zu verlegen.
- **Rohe Buttons in Drittkomponenten:** falls eine Bibliothek rohe Buttons rendert, greift die Lint-Regel nicht (sie wirkt nur auf eigenen JSX).

## Explizit außerhalb des Scopes

- Redesign der Screens selbst (2b–2d), insbesondere Abschluss-Feier, Listen-Reveal, Filter-Kollaps.
- Typografie-Anwendung außerhalb von `/body`.
- Vorhaben B (Logik-Fixes: `lang="de"`, stille Validierung, Locale, Übersetzungs-Leck, unbehandelte Routen).
- Desktop-Layout, 3D-Elemente.
