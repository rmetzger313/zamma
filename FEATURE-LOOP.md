# 🚀 ZAMMA — Autonomer Feature-Discovery & Implementation Loop

> **App:** Zamma — Hobby Matching App ("Zamma" = bayerisch für "zusammen")
> **Nische:** Menschen anhand gemeinsamer Hobbys verbinden
> **Zielgruppe:** Menschen, die Gleichgesinnte für gemeinsame Aktivitäten suchen
> **Referenz:** Implementierung erfolgt über den Dev-Loop in `CLAUDE.md`

---

## 🎯 APP-VISION

Zamma verbindet Menschen über geteilte Hobbys. Die App löst das Problem:
*"Ich will [Hobby] machen, aber mir fehlen Leute dafür."*

### Kernmechanik
- **Match:** Nutzer werden basierend auf Hobby-Kompatibilität gematcht
- **Meet:** Matches führen zu echten Treffen und gemeinsamen Aktivitäten
- **Grow:** Nutzer entdecken neue Hobbys durch ihre Connections

---

## 🧠 AGENTS FÜR FEATURE-DISCOVERY

Aktiviere diese Spezialisten für die Feature-Findung:

| Agent | Rolle im Discovery-Loop |
|-------|------------------------|
| 🎯 **Product Manager** | Feature-Ideen priorisieren, PRDs schreiben, Akzeptanzkriterien definieren |
| 🔍 **Trend Researcher** | Markttrends in Dating/Social/Hobby-Apps analysieren |
| 💬 **Feedback Synthesizer** | Nutzerbedürfnisse ableiten, Patterns erkennen |
| 🧠 **Behavioral Nudge Engine** | Engagement-Mechaniken, Retention-Loops, Gamification |
| 🚀 **Growth Hacker** | Virale Loops, Nutzer-Akquise, Conversion-Optimierung |
| 🔍 **UX Researcher** | Nutzerbedürfnisse verstehen, Pain Points identifizieren |
| 🎨 **UI Designer** | Interface-Konzepte, Komponenten-Design |
| 🔌 **API Tester** | Sicherstellen, dass neue APIs sauber integrieren |

---

## 🔄 DER META-LOOP

Dieser Loop läuft auf einer höheren Ebene als der Dev-Loop.
Jedes Feature, das hier entsteht, wird über den Dev-Loop aus `CLAUDE.md` implementiert.

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  ┌─ PHASE 1: DISCOVER ─────────────────────────────┐    │
│  │  Codebase analysieren → Lücken finden →          │    │
│  │  Feature-Ideen generieren                        │    │
│  └──────────────────────────────────────────────────┘    │
│                          ↓                               │
│  ┌─ PHASE 2: EVALUATE ─────────────────────────────┐    │
│  │  Impact vs. Effort bewerten →                    │    │
│  │  Abhängigkeiten prüfen → Priorisieren            │    │
│  └──────────────────────────────────────────────────┘    │
│                          ↓                               │
│  ┌─ PHASE 3: SPECIFY ──────────────────────────────┐    │
│  │  Mini-PRD schreiben → Akzeptanzkriterien →       │    │
│  │  Technischen Plan erstellen                      │    │
│  └──────────────────────────────────────────────────┘    │
│                          ↓                               │
│  ┌─ PHASE 4: IMPLEMENT (→ CLAUDE.md Dev-Loop) ─────┐    │
│  │  Code → Test → Fix → Review → Commit → Push →   │    │
│  │  CI Check → Fix CI                               │    │
│  └──────────────────────────────────────────────────┘    │
│                          ↓                               │
│  ┌─ PHASE 5: VALIDATE ─────────────────────────────┐    │
│  │  Feature funktioniert? → Passt zur Vision? →     │    │
│  │  Nächstes Feature starten                        │    │
│  └──────────────────────────────────────────────────┘    │
│                          ↓                               │
│                   ↻ Nächstes Feature                     │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 📋 PHASE 1: DISCOVER — Features finden

### Schritt 1: Codebase-Analyse
```
Lies den gesamten Codebase und beantworte:
1. Welche Features existieren bereits?
2. Welche Datenmodelle/Schemas sind vorhanden?
3. Welche API-Routen gibt es?
4. Welche UI-Seiten/Komponenten existieren?
5. Was fehlt offensichtlich für eine Hobby Matching App?
```

### Schritt 2: Feature-Generierung nach Kategorien

Generiere Features aus diesen Hobby-Matching-spezifischen Kategorien:

#### 🔗 Matching & Discovery
- Hobby-basierter Matching-Algorithmus (Kompatibilitäts-Score)
- Skill-Level-Matching (Anfänger sucht Anfänger, oder Mentor sucht Mentee)
- Standort-basierte Filterung (Umkreissuche)
- Hobby-Gruppen & Communities
- "Hobby des Monats" — Discovery-Feature für neue Hobbys
- Swipe-Mechanik oder Card-basiertes Browsing
- Smart Suggestions: "Weil du Klettern magst, könnte dir Bouldern gefallen"

#### 👤 Profil & Onboarding
- Hobby-Auswahl mit Kategorien und Sub-Hobbys
- Skill-Level pro Hobby (Anfänger / Fortgeschritten / Profi)
- Verfügbarkeitskalender (wann hat der Nutzer Zeit?)
- Foto-Upload und Galerie (Hobby-Fotos, nicht nur Selfies)
- Bio mit Hobby-Story ("Wie ich zum Klettern kam")
- Verifizierung / Trust-Score

#### 📅 Aktivitäten & Events
- Aktivität erstellen ("Suche Kletter-Partner für Samstag")
- Event-Kalender mit lokalen Hobby-Events
- Gruppen-Aktivitäten (3+ Personen)
- Recurring Activities (wöchentliches Lauftraining)
- Standort-Vorschläge für Aktivitäten (Kletterhallen, Parks, etc.)
- Wetter-Integration für Outdoor-Hobbys

#### 💬 Kommunikation
- In-App Chat (1:1 und Gruppen)
- Icebreaker-Fragen basierend auf gemeinsamen Hobbys
- Activity-Einladungen per Chat
- Push-Notifications für Matches und Nachrichten
- Voicemessages

#### 🏆 Engagement & Gamification
- Hobby-Streak (X Tage in Folge aktiv)
- Badges & Achievements ("Erster Boulder-Treff", "10 Matches")
- Hobby-Tagebuch / Activity-Log
- Leaderboard pro Hobby-Community
- Referral-System ("Lade Freunde ein")
- Weekly Challenges ("Probiere diese Woche ein neues Hobby")

#### 📊 Insights & Analytics (für Nutzer)
- Hobby-Statistiken (Wie oft, mit wem, wo)
- Kompatibilitäts-Insights ("Warum ihr gematcht wurdet")
- Neue Hobby-Empfehlungen basierend auf Aktivität
- Soziales Netzwerk-Graph (Hobby-Connections visualisieren)

#### 🛡️ Trust & Safety
- Report & Block
- Profil-Verifizierung
- Bewertungen nach gemeinsamen Aktivitäten
- Community-Guidelines
- Spam-/Fake-Erkennung

#### 💰 Monetarisierung
- Premium-Features (mehr Matches, erweiterte Filter)
- Promoted Activities / Events
- Hobby-Partner-Boost (Profil hervorheben)
- Freemium-Modell mit sinnvollen Grenzen

---

## 📋 PHASE 2: EVALUATE — Priorisieren

Bewerte jedes Feature mit diesem Scoring:

```
SCORE = (Impact × 3) + (Machbarkeit × 2) + (Nischen-Fit × 2) - (Komplexität × 1)

Impact:        1-5  (Wie sehr verbessert es die Nutzererfahrung?)
Machbarkeit:   1-5  (Kann es mit dem aktuellen Stack gebaut werden?)
Nischen-Fit:   1-5  (Passt es zur Hobby-Matching-Vision?)
Komplexität:   1-5  (Wie aufwändig ist die Implementierung?)
```

### Priorisierungs-Regeln:
1. **Zuerst:** Features, die den Core-Loop ermöglichen (Matching, Chat, Profil)
2. **Dann:** Features, die Retention steigern (Engagement, Gamification)
3. **Dann:** Features, die Wachstum treiben (Referral, Virality)
4. **Zuletzt:** Nice-to-haves und Monetarisierung

### Abhängigkeiten beachten:
```
Profil-Erstellung → muss vor Matching existieren
Matching          → muss vor Chat existieren
Chat              → muss vor Activity-Einladungen existieren
Events            → kann parallel zu Chat gebaut werden
Gamification      → braucht Aktivitäts-Tracking als Basis
```

---

## 📋 PHASE 3: SPECIFY — Mini-PRD pro Feature

Erstelle für jedes Feature ein kompaktes PRD:

```markdown
## Feature: [Name]
**Priorität:** P0 / P1 / P2 / P3
**Agent:** [Primärer Agent für Implementierung]
**Geschätzter Aufwand:** S / M / L / XL

### Problem
[1-2 Sätze: Welches Nutzerproblem wird gelöst?]

### Lösung
[3-5 Punkte: Was wird gebaut?]

### Akzeptanzkriterien
- [ ] [Konkretes, testbares Kriterium 1]
- [ ] [Konkretes, testbares Kriterium 2]
- [ ] [Konkretes, testbares Kriterium 3]

### Betroffene Dateien
- app/components/...
- server/routes/...
- server/models/...

### API-Endpunkte (falls nötig)
- `POST /api/...`
- `GET /api/...`

### Datenmodell (falls nötig)
```typescript
interface NewModel {
  id: string;
  // ...
}
```
```

---

## 📋 PHASE 4: IMPLEMENT — Dev-Loop ausführen

**Hier greift der Loop aus `CLAUDE.md`.**

Für jedes Feature:
1. Erstelle einen Feature-Branch: `git checkout -b feature/<feature-name>`
2. Durchlaufe den kompletten Dev-Loop (UNDERSTAND → PUSH → CI CHECK)
3. Erstelle einen PR (oder merge direkt auf main bei Solo-Development)
4. Gehe zum nächsten Feature

### Reihenfolge pro Feature:
```
1. Datenmodell / Schema anlegen (Backend)
2. API-Route(n) implementieren (Backend)
3. API-Tests schreiben (Backend)
4. UI-Komponenten bauen (Frontend)
5. Seiten/Views erstellen (Frontend)
6. Integration Frontend ↔ Backend
7. E2E-Test schreiben
8. Self-Review & Push
```

---

## 📋 PHASE 5: VALIDATE — Feature prüfen

Nach jedem implementierten Feature:

```
✅ Checkliste:
- [ ] Feature funktioniert end-to-end (Frontend → Backend → DB)?
- [ ] Tests sind grün (Unit + E2E)?
- [ ] CI Pipeline ist grün?
- [ ] Feature passt zur Hobby-Matching-Vision?
- [ ] UX ist intuitiv (kein Erklärungsbedarf)?
- [ ] Performance ist akzeptabel (keine spürbaren Lags)?
- [ ] Mobile-responsive?
- [ ] Keine Regression in bestehenden Features?
```

Wenn alles grün → starte den Loop für das nächste Feature.

---

## 🏁 STARTBEFEHL

Kopiere diesen Befehl in Claude Code, um den autonomen Loop zu starten:

```
Lies FEATURE-LOOP.md und CLAUDE.md. 

Analysiere den aktuellen Codebase von Zamma (Hobby Matching App). 
Identifiziere, welche Features bereits existieren und was fehlt.
Erstelle eine priorisierte Feature-Liste (Top 5) nach dem Scoring-System.
Zeige mir die Liste mit Score und Mini-PRD für jedes Feature.
Warte auf mein OK, dann implementiere Feature 1 über den Dev-Loop.
Nach Abschluss: automatisch weiter mit Feature 2, bis alle 5 fertig sind.
```

---

## ⚡ TURBO-MODUS (Kein Warten)

Wenn du willst, dass Claude Code komplett autonom durchläuft:

```
Lies FEATURE-LOOP.md und CLAUDE.md.

TURBO-MODUS: Analysiere Zamma, generiere die Top-3-Features nach Score,
und implementiere sie nacheinander über den Dev-Loop.
Kein Warten auf Bestätigung zwischen Features.
Melde dich erst, wenn alle 3 Features implementiert und gepusht sind.
```

---

## 🛑 SICHERHEITSREGELN

1. **Maximal 3 Features** im Turbo-Modus pro Durchlauf
2. **Kein Feature** darf bestehende Features brechen
3. **Jedes Feature** bekommt seinen eigenen Commit (oder Branch)
4. **Bei Unsicherheit** über die Nische: konservativ entscheiden, nachfragen
5. **Keine Drittanbieter-APIs** einbinden ohne explizite Freigabe
6. **Keine Zahlungs-Integration** ohne explizite Freigabe
7. **Datenschutz beachten:** Keine unnötigen Nutzerdaten sammeln
