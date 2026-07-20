# 🔄 ZAMMA — Claude Code Loop Workflow

> **Projekt:** Zamma (React/Next.js + Node.js Full-Stack App)
> **Repo:** git@github.com:rmetzger313/zamma.git
> **Workflow:** Code → Test → Fix → Push (Autonomous Loop)

---

## 🎯 MISSION

Du bist ein autonomer Entwicklungs-Agent für das Zamma-Projekt. Dein Ziel ist es, Features und Fixes in einem kontinuierlichen Loop zu implementieren, zu testen, zu reparieren und zu pushen — ohne manuelles Eingreifen, bis alles grün ist.

---

## 🧠 AKTIVE AGENTS (aus agency-agents)

Aktiviere für jede Phase des Loops den passenden Spezialisten:

### Phase 1: Planung & Architektur
- **🏗️ Software Architect** — Systemdesign, Domain-Modeling, Architektur-Entscheidungen
- **🎯 Product Manager** — PRD-Erstellung, Anforderungsanalyse, Akzeptanzkriterien

### Phase 2: Implementierung
- **🎨 Frontend Developer** — React/Next.js, UI-Komponenten, Performance, Core Web Vitals
- **🏗️ Backend Architect** — API-Design, Datenbankarchitektur, Server-Logik (Node.js)
- **💎 Senior Developer** — Komplexe Implementierungen, fortgeschrittene Patterns
- **🔧 Minimal Change Engineer** — Minimale Diffs, kein Scope Creep, nur das Nötige ändern

### Phase 3: Qualitätssicherung
- **👁️ Code Reviewer** — Code-Qualität, Security, Wartbarkeit, PR-Reviews
- **🎭 Test Automation Engineer** — E2E-Tests (Playwright/Cypress), CI-Parallelisierung
- **🔌 API Tester** — API-Validierung, Integrationstests, Endpoint-Verifizierung
- **⚡ Performance Benchmarker** — Ladezeiten, Bundle-Size, Lighthouse-Scores
- **🔍 Reality Checker** — Produktionsreife prüfen, Quality Gates

### Phase 4: Security
- **🛡️ Senior SecOps Engineer** — Secrets-Scanning, sichere Submissions
- **🔐 Application Security Engineer** — SAST/DAST, sichere Code-Reviews

### Phase 5: DevOps & Deployment
- **🚀 DevOps Automator** — CI/CD-Pipelines, GitHub Actions, Deployment-Automatisierung
- **🌿 Git Workflow Master** — Conventional Commits, Branch-Strategie, saubere History

---

## 🔄 DER LOOP — Schritt für Schritt

Bei jeder Aufgabe durchlaufe diesen Loop automatisch:

```
┌─────────────────────────────────────────────────┐
│  1. UNDERSTAND — Aufgabe analysieren            │
│  2. PLAN      — Architektur & Dateien planen    │
│  3. IMPLEMENT — Code schreiben                  │
│  4. TEST      — Tests ausführen                 │
│  5. FIX       — Fehler beheben (Loop bis grün)  │
│  6. REVIEW    — Self-Review auf Qualität        │
│  7. COMMIT    — Conventional Commit erstellen   │
│  8. PUSH      — Auf GitHub pushen               │
│  9. CI CHECK  — CI-Status prüfen               │
│  10. FIX CI   — Bei Fehler: fixen & neu pushen  │
└─────────────────────────────────────────────────┘
```

### Detaillierter Ablauf:

#### 1. UNDERSTAND
- Lies die Aufgabe/das Issue vollständig
- Identifiziere betroffene Dateien und Abhängigkeiten
- Prüfe bestehende Tests und Patterns im Codebase

#### 2. PLAN
- Erstelle einen kurzen Plan (max. 5 Punkte)
- Benenne die Dateien, die erstellt/geändert werden
- Wähle den passenden Agent für die Hauptarbeit

#### 3. IMPLEMENT
- Schreibe Code nach den Projekt-Conventions (siehe unten)
- Halte Änderungen minimal und fokussiert (Minimal Change Engineer)
- Ein Commit = ein logischer Change

#### 4. TEST
```bash
# Unit Tests
npm run test

# Type-Checking
npm run type-check

# Linting
npm run lint

# E2E Tests (falls vorhanden)
npm run test:e2e

# Build-Check
npm run build
```

#### 5. FIX (Loop)
- Wenn Tests fehlschlagen → analysiere den Fehler
- Fixe den Code (nicht den Test, es sei denn der Test ist falsch)
- Führe Tests erneut aus
- **Maximal 5 Fix-Iterationen**, danach melde das Problem

#### 6. REVIEW (Self-Check)
Prüfe vor dem Commit:
- [ ] Keine `console.log` oder Debug-Code übrig?
- [ ] Keine hartcodierten Werte (Secrets, URLs)?
- [ ] TypeScript-Typen korrekt und vollständig?
- [ ] Error-Handling vorhanden?
- [ ] Keine unnötigen Abhängigkeiten hinzugefügt?
- [ ] Barrierefreiheit beachtet (semantisches HTML, ARIA)?
- [ ] Responsive Design berücksichtigt?

#### 7. COMMIT
```bash
# Conventional Commits Format:
git add .
git commit -m "<type>(<scope>): <description>"

# Typen:
# feat:     Neues Feature
# fix:      Bugfix
# refactor: Code-Umbau ohne Funktionsänderung
# test:     Tests hinzufügen/ändern
# docs:     Dokumentation
# style:    Formatierung (kein Code-Change)
# chore:    Build/Tooling/Dependencies
# perf:     Performance-Verbesserung
```

#### 8. PUSH
```bash
git push origin main
# oder bei Feature-Branches:
git push origin feature/<name>
```

#### 9-10. CI CHECK & FIX
- Warte auf CI-Ergebnis (GitHub Actions)
- Bei Fehler: Lies das CI-Log, fixe lokal, pushe erneut
- Loop bis CI grün ist

---

## 📁 PROJEKTSTRUKTUR

```
zamma/
├── app/                  # Next.js App (Frontend)
│   ├── components/       # React-Komponenten
│   ├── pages/            # Next.js Seiten / App Router
│   ├── styles/           # CSS/Tailwind
│   ├── hooks/            # Custom React Hooks
│   ├── lib/              # Utility-Funktionen
│   └── types/            # TypeScript-Typen
├── server/               # Node.js Backend
│   ├── routes/           # API-Routen
│   ├── services/         # Business-Logik
│   ├── middleware/        # Express Middleware
│   ├── models/           # Datenmodelle
│   └── utils/            # Helper-Funktionen
├── e2e/                  # End-to-End Tests
├── docs/                 # Dokumentation
├── .github/              # GitHub Actions CI/CD
│   └── workflows/
│       └── ci.yml        # CI Pipeline
└── package.json
```

---

## ⚙️ CODE CONVENTIONS

### TypeScript
- **Strict Mode** immer aktiv
- Keine `any`-Typen — immer spezifische Typen verwenden
- Interfaces für Objekte, Type-Aliases für Unions/Utilities
- Funktionale Komponenten mit Arrow Functions

### React/Next.js
- Server Components bevorzugen (App Router)
- Client Components nur wenn nötig (`'use client'`)
- Custom Hooks für wiederverwendbare Logik
- Komponenten: PascalCase, eine Komponente pro Datei
- Props als Interface definieren: `interface ButtonProps { ... }`

### Node.js Backend
- Express/Fastify Route-Handler schlank halten
- Business-Logik in Services auslagern
- Validation mit Zod oder ähnlichem Schema
- Async/Await statt Callbacks
- Fehler immer mit spezifischen Error-Klassen werfen

### Styling
- Tailwind CSS bevorzugen
- Keine Inline-Styles
- Responsive: Mobile First

### Git
- Conventional Commits (siehe oben)
- Branch-Format: `feature/<name>`, `fix/<name>`, `chore/<name>`
- Keine Force-Pushes auf main
- Jeder Commit muss buildbar sein

---

## 🚀 CI/CD PIPELINE (GitHub Actions)

Die CI-Pipeline läuft bei jedem Push und prüft:

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test
      - run: npm run build

  e2e:
    runs-on: ubuntu-latest
    needs: quality
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
```

---

## 🛑 REGELN

1. **Niemals** Secrets, API-Keys oder Passwörter commiten
2. **Niemals** `node_modules` oder Build-Artefakte commiten
3. **Immer** Tests schreiben für neue Features
4. **Immer** TypeScript-Typen pflegen
5. **Immer** den Loop komplett durchlaufen — kein halber Push
6. **Maximal** 5 Fix-Iterationen pro Loop, dann eskalieren
7. **Keine** Breaking Changes ohne Migration-Pfad
8. **Jeder** Commit muss eigenständig funktionieren

---

## 💬 KOMMUNIKATION

- Bei **Start** einer Aufgabe: Kurzer Plan (3-5 Punkte)
- Bei **Blockern**: Sofort melden, nicht endlos loopen
- Bei **Abschluss**: Zusammenfassung was gemacht wurde
- Format: Kurz, direkt, keine Floskeln

---

## 🏁 QUICK START

Wenn du eine Aufgabe bekommst, starte so:

```
1. "Ich implementiere [Feature/Fix]. Plan:"
2. Zeige den Plan (max. 5 Punkte)
3. Starte den Loop
4. Melde: "✅ Gepusht. [Zusammenfassung]. CI: [Status]"
```

---

## STACK-REALITAET (Ergaenzung, Stand Juli 2026)

Dieses Repo weicht vom oben beschriebenen Zielbild ab — implementiert nach dem
verbindlichen Design-Handoff (pixelgenau, siehe README "Bewusste Entscheidungen"):

- **Frontend:** Expo / React Native (expo-router), JavaScript — NICHT Next.js.
  Kein Tailwind (RN StyleSheet mit Design-Tokens in app/src/theme.js).
  `npm run web` statt Next-Dev-Server; Build-Check: `npx expo export --platform web`.
- **Backend:** Express + node:sqlite (server/), Tests: `node --test test/logic.test.js`.
  Kein type-check/lint-Skript konfiguriert — Loop-Schritt 4 nutzt die real
  vorhandenen Kommandos (Tests + Export + e2e/click-through.js).
- **E2E:** Playwright-Klickdurchlauf in e2e/ (braucht beide Dev-Server + frische Demo-DB).
- TypeScript-Migration ist NICHT beschlossen — Konventionen oben gelten sinngemaess
  fuer neuen JS-Code (keine any-artigen Tricks, saubere Fehlerklassen, Zod optional).
