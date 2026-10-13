# Design-Spec: Visuelles & Interaktions-Redesign (VitaLoop)

**Stand:** 23.09.2026
**Status:** Architektonisches Vorhaben, brainstormed und vom Nutzer abschnittsweise bestätigt, bereit für die Implementierungsplanung.

## Kontext und Motivation

Der `/impeccable critique`-Re-Run vom 23.09.2026 (voll authentifiziert, dual-agent, siehe `.impeccable/critique/2026-09-23T00-41-12Z__vitaloop-web-app.md`) ergab **18/40 (Poor)**. Nutzer-Feedback direkt dazu: die App sei „sehr hässlich und nicht interaktiv", er wünscht sich mehr Animationen und will, dass nicht jede Kleinigkeit eine neue Seite lädt (Pop-ups statt Navigation). Mobile ist die primäre Zielplattform.

Der Critique-Fund-Katalog (12 Punkte, P0–P3) wurde bewusst in zwei getrennte Vorhaben aufgeteilt:

- **Vorhaben A (dieses Spec):** Visuelles & Interaktions-Redesign. Löst dabei mehrere P0/P2-Funde des Critique-Katalogs nebenbei (siehe „Verhältnis zum Critique-Katalog" unten).
- **Vorhaben B (separat, bounded, nicht Teil dieses Specs):** Reine Logik-/Korrektheits-Fixes ohne Design-Bezug — `lang="en"` statt `de`, stille Validierungslücke im Plan-Assistenten, fehlende Trennzeichen/inkonsistente Dezimal-Locale in Listeneinträgen, unübersetzter Übungsname auf dem Abschluss-Screen, unbehandelte Routen. Läuft über den normalen Bounded-Workflow (TDD, kein eigenes Spec).

## Marken-Grenzen (vom Nutzer bestätigt)

**Fix, nicht verhandelbar:** Logo, Produktname „VitaLoop", die bestehenden Lila-/Türkis-Akzentfarben, dunkles Grundthema.

**Frei zur Neugestaltung:** Layout, Typografie, Spacing, Komponenten-Stil, Card-/Struktur-Behandlung, Animation/Interaktion.

**Harte Nicht-Design-Grenze:** Performance/Bundle-Größe ist eine explizit gewählte Priorität — die App hat bereits eine bekannte Bundle-Size-Warnung im Build. Jede Ergänzung muss das rechtfertigen (siehe „Motion-Architektur" unten für die konkrete Lösung beim GSAP-Konflikt).

## Verhältnis zum Critique-Katalog

Dieses Redesign berührt dieselben Komponenten wie mehrere Critique-Funde und schließt sie strukturell mit, statt sie separat zu patchen:

- **[P0] Bottom-Nav-Overlap** (`/body`, aktiver Trainings-Session-Screen) — wird durch den neuen gemeinsamen Layout-Wrapper (siehe unten) systemisch gelöst, nicht durch einen Einzel-Patch pro Seite.
- **[P2] Peak-End-Moment ohne visuelle Behandlung** (Abschluss-Screen) — wird durch die Feier-Sequenz im Motion-System gelöst.
- **[P2] 29-Chip-Filterwand** — wird durch das Mobile-Layout-Prinzip „Filter hinter Trigger einklappen" gelöst.
- **[P2] Design-System-Ausreißer** (inkonsistente Button-Stile, fehlende Spinner) — werden durch den einheitlichen Farb-/Komponenten-Lock des Redesigns mit erledigt.

Nicht hier behandelt (bleiben Vorhaben B): `lang="en"`, stille Validierung, String-Trennzeichen/Locale, Übersetzungs-Leck, unbehandelte Routen. Diese haben keinen visuellen/strukturellen Bezug zu diesem Redesign.

## Visuelle Richtung: „Data-Forward Athlete"

Erarbeitet über `taste-skill:redesign-skill` (Redesign-Audit-Checkliste, passend für eine bestehende App statt einer Landing Page) und punktuell `taste-skill:brutalist-skill` (nur einzelne Techniken übernommen, nicht das volle Archetyp — die dortige Farbvorgabe „nur Hazard-Rot als Akzent, kein `border-radius`" widerspricht der fixen Marke).

### Typografie

- Große, kräftige, eng getrackte Zahlen für Statistiken/PRs/Gewichte, mit `font-variant-numeric: tabular-nums` (Ziffern springen nicht bei Änderungen, z. B. beim Hochzählen der Sätze).
- Klar abgesetztes zweites Gewicht für Labels (nicht dasselbe Gewicht wie der Wert, wie aktuell auf `/body`s „Gewicht (kg)—").
- Sentence Case statt des aktuellen generischen Looks.

### Farbe

- **Ein-Akzent-Lock:** Die bestehende Lila-Akzentfarbe wird konsequent für alle primären interaktiven Elemente verwendet — behebt den Fund, dass parallele Aktionen (z. B. „Eintrag hinzufügen" in verschiedenen Mahlzeiten-Slots, „Aktivieren" vs. „Löschen") uneinheitlich gestylt sind.
- Getönte statt generischer schwarzer Schatten.
- Bestehendes Off-Black-Hintergrundthema bleibt.

### Struktur

- Card-Elevation nur dort, wo sie echte Hierarchie kommuniziert (nicht als Standard überall) — per `redesign-skill`-Regel.
- Sichtbare, dünne (1px) Grid-Trennlinien zur Datengruppierung, wo sinnvoll (z. B. innerhalb eines geloggten Satzes: Gewicht/Wdh./RIR), als Ersatz für die aktuell komplett randlosen, unstrukturierten Flächen.

## Motion-Architektur

**Bibliothek: GSAP**, per Nutzer-Entscheidung trotz Bundle-Size-Bedenken — aufgelöst durch **Lazy-Loading/Code-Splitting**: GSAP wird nicht im initialen Bundle geladen, sondern per dynamischem `import()` erst auf den Seiten/Komponenten, die es tatsächlich brauchen (Abschluss-Screen, animierte Dialoge, Listen-Reveals). Der initiale Bundle bleibt unberührt.

### Isolationsprinzip

Jede GSAP-Nutzung lebt in einer kleinen, isolierten Leaf-Komponente mit eigenem Mount/Cleanup (`useEffect` + `gsap.context().revert()` beim Unmount). Keine globale GSAP-Registrierung im App-Root.

### Konkrete Interaktionsmuster

1. **Tap-/Press-Feedback (überall):** jedes interaktive Element bekommt eine kurze Scale-Down-plus-Spring-Back-Reaktion beim Antippen — nicht nur einen Farbwechsel. Das ist die direkte Antwort auf „nicht interaktiv".
2. **Pop-ups statt Navigation:** die bestehende native `<dialog>`-basierte `Dialog`-Komponente bekommt animiertes Öffnen/Schließen (Scale+Fade) statt des aktuellen sofortigen Erscheinens. Wird für leichte Aktionen genutzt (Übung aus Plan entfernen, Bestätigungen, Quick-Add) statt vollständiger Seitennavigation.
3. **Feier-Momente:** der Workout-Abschluss-Screen (PR-Reveal, Streak, Dauer/Kalorien) bekommt eine eigene animierte Sequenz — Headline-Stat zählt/skaliert ein, PR-Karte bekommt einen Highlight-Sweep. Motiviert durch „den einen Moment belohnen, der es verdient", keine Dekoration um der Dekoration willen.
4. **Listen-/Daten-Reveals:** Übungslisten, geloggte Sätze, Ernährungseinträge erscheinen gestaffelt beim Laden statt alle gleichzeitig aufzupoppen.

### Reduced Motion (nicht verhandelbar)

Jede GSAP-Animation prüft `prefers-reduced-motion` und fällt auf einen sofortigen/statischen Zustand zurück. Gilt auch für die Tap-/Press-Feedback-Ebene.

### Fehlerbehandlung

Schlägt der dynamische Import von GSAP fehl (z. B. Netzwerkproblem), bleibt die UI vollständig funktional ohne Animation — die Animation ist eine Zusatzschicht, keine Voraussetzung für Funktionalität.

## Mobile-First-Layout

### Gemeinsamer Layout-Wrapper (löst den P0-Nav-Overlap systemisch)

Statt dass jede Seite ihr eigenes Bottom-Padding rät (exakt so ist der `/body`-Bug entstanden), reserviert ein gemeinsamer Layout-Wrapper `nav-height + env(safe-area-inset-bottom) + Puffer` als Scroll-Padding für den Hauptinhaltsbereich jeder Seite. Einmal implementiert, korrekt für alle aktuellen und künftigen Seiten — kein Einzel-Fix pro Screen nötig.

### Daumenzone

Primäre Aktionen liegen wo möglich in der unteren Bildschirmhälfte („Training abschließen", „Satz erfassen") statt oben.

### Filter-Kollaps

Die 29-Chip-Filterwand (Muskelgruppe + Gerät) klappt auf Mobile standardmäßig hinter einen „Filter"-Trigger ein, auf breiteren Screens inline sichtbar, wo Platz ist.

### Desktop

Keine eigene Desktop-Layout-Investition über „sieht nicht kaputt aus" hinaus — entspricht dem gesetzten Mobile-Fokus, vermeidet Scope-Creep in ein zweites Design.

## Komponenten-Übersicht (betroffen/neu)

- **Neuer gemeinsamer Layout-Wrapper** (z. B. `PageLayout` oder Erweiterung des bestehenden App-Shells) — Nav-Clearance-Logik, einmal implementiert, von jeder Seite genutzt.
- **`Dialog`-Komponente** (bestehend, `src/components/Dialog.tsx` o. ä.) — erweitert um animiertes Enter/Exit.
- **`ui-classes.ts`** (bestehende Token-Datei) — Farb-Lock, Typografie-Skala, Tap-Feedback-Klassen aktualisiert.
- **Neue kleine Motion-Leaf-Komponenten** für: Tap-Feedback-Wrapper, Listen-Stagger-Reveal, Abschluss-Screen-Feier-Sequenz.
- **`ExerciseFilterChips`** (bestehend) — Kollaps-Verhalten hinter Filter-Trigger auf Mobile.
- **`SessionCompletionScreen`** (bestehend) — visuelle und animierte Neugestaltung.

## Rollout-Reihenfolge

1. **Fundament** — gemeinsamer Layout-Wrapper (Nav-Clearance-Fix), Typografie-/Farb-Tokens, aktualisierte Button-/Dialog-Primitives mit eingebautem Tap-Feedback und animiertem Öffnen/Schließen. Alles Weitere baut darauf auf, deshalb zuerst und allein.
2. **Screens mit größter Wirkung** — Home-Dashboard, Trainings-Session + Abschluss-Screen, Übungs-Katalog/-Picker (Chip-Wand-Fix).
3. **Verbleibende Screens** — Ernährung, Körper, Profil, Plan-Assistent, mit dem dann etablierten System.

## Testing/Verifikation

- **`playwright-cli`** (bereits als Design-Workflow-Skill für dieses Projekt gelistet) für visuelle Screenshots je Phase, inklusive echter Mobile-Viewport-Emulation — zuverlässiger als die Chrome-Extension, deren `resize_window` beim Critique-Lauf nicht funktionierte.
- **Vitest** für die Logik-Anteile (Nav-Clearance-Berechnung, Reduced-Motion-Fallback-Logik), passend zur TDD-Konvention dieses Projekts.
- **Abschließende Live-Verifikation** gegen Produktion nach Deploy, wie bei jedem anderen Feature dieses Projekts.

## Explizit außerhalb des Scopes

- Vorhaben B (reine Logik-Fixes, siehe oben).
- Eigenständige Desktop-Layout-Gestaltung.
- 3D-Elemente (`img2threejs`) — nicht angefragt, würde der Performance-Priorität widersprechen.
- Landing-Page-spezifische Muster aus dem generischen `taste-skill` (Hero-Sektionen, Bento-Grids, Marquees) — dieser Skill deklariert sich selbst als nicht zuständig für datenlastige App-/Dashboard-Oberflächen wie VitaLoop.
- Volles `brutalist-skill`-Archetyp (Hazard-Rot-Only-Akzent, Null-Border-Radius, Scanline-Effekte) — widerspricht der fixen Lila-/Türkis-Marke.
