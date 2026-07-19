# Zamma — QA- & Evidenz-Report

Stand: 18.07.2026 · Referenz: `design_handoff_zamma/README.md` + Prototyp-HTML

## Testabdeckung (automatisiert)

`cd server && npm test` — **18/18 grün**:
Score-Regeln (−3/−10/+1, Clamps, 24-h-Grenzfälle, Absage-Vorschau), Haversine &
Mehr-Orte-Umkreis, Recurrence (+7/+14 Tage, Labels), Feedback-Fenster (Öffnen/
Reminder/Schließen inkl. Grenzwerte), Tag-Validierung, Verifizierungsstufen &
Badge-Entzug, Feed-Demotion, Tick-Integration (attended-Bonus inkl. Host,
idempotente Folge-Instanz, Reminder genau einmal), No-Show-Bestätigung
(einmalig, Bonus-Revert).

Produktions-Build: `npx expo export --platform web` → `app/dist/` (923 Module).

## Funktional verifiziert (Browser, DOM-basiert)

Onboarding (Hobby-Auswahl, CTA-Zähler) → Feed (Filter, Karten-Toggle mit
Filtererhalt, Empty-State, Sortierung: unverifizierter Host trotz frühestem
Termin zuletzt) → Detail (Info-Card, Join optimistic, „Du"-Pill vorn) →
Absage-Modal (>24 h: „Score bleibt"-Variante; <24 h: „96 % → 93 %" live vom
Server, Abzug in DB bestätigt) → Feedback (Senden-Sperre ohne Stern,
Submit → Danke-Banner, Banner verschwindet nach Verlassen des Feeds,
Duplikat → 409) → Chats (Unread-Badge, „Gestern"-Label) → Thread (Enter
sendet, optimistisches Anhängen, **Live-Empfang fremder Nachrichten via
WebSocket ohne Reload**) → Erstellen (Titel-Validierung, deutsches
Freitext-Datum, neue Card oben, „↻ Jeden Samstag") → Profil (Live-Score,
Feedback-Liste) → Verifizierung (3 Stufen, Regel-Box).

Visuelle Evidenz: `docs/screens/01…12-*.png` — per Playwright-Klickdurchlauf
(echte Input-Events, 390×844 @2x) aufgenommen; der fehlerfreie Durchlauf selbst
ist zugleich ein End-to-End-Beleg für alle Navigationspfade.

## Review-Befunde und Status

Runde 1 (Multi-Agent, Backend-Dimension) + Runde 2 (Selbst-Review UX/Logik/Frontend):

| # | Befund | Status |
|---|---|---|
| 1 | Feedback über unbeteiligte Nutzer möglich (inkl. Score-Angriff) | ✅ Fix: Beteiligten-Check, 400/404 |
| 2 | No-Show-Penalty stapelte sich pro Feedback-Geber | ✅ Fix: idempotent (`logic/noshow.js`) |
| 3 | No-Show behielt Attend-Bonus/Treffen-Zähler | ✅ Fix: Revert im selben Modul |
| 4 | Status `cancelled` unerreichbar (kein Host-Absage-Weg) | ✅ Fix: `POST /events/:id/host-cancel` (API-only, kein Screen im Design) |
| 5 | Host bekam nie +1/Treffen-Zähler/Feedback-Reminder | ✅ Fix im Tick |
| 6 | Erstellen ohne Validierung (skillLevel/recurrence/maxSpots/datetime → 500er) | ✅ Fix: 400er |
| 7 | Unbekannte Nutzer-ID → 500 | ✅ Fix: globale 401 |
| 8 | Kein Geo-Fallback ohne gespeicherte Orte | ✅ Fix: Nutzer-Standort + 25 km |
| 9 | bio/photo nie serialisiert; Hobby-Input unvalidiert | ✅ Fix |
| 10 | Chat-Thread: Stale-Closure-Race beim WS-Empfang | ✅ Fix: funktionales Update |
| 11 | Danke-Banner wurde nie zurückgesetzt (Prototyp: verschwindet beim Verlassen) | ✅ Fix + verifiziert |
| 12 | Chat pro Serie statt pro Event-Instanz | ⚪ Bewusst: Prototyp setzt Serien-Chat voraus (dokumentiert in README) |
| 13 | Filter-Chips 36 px statt 44-px-Touchtarget | ⚪ Bewusst: Prototyp-Maße sind die Referenz |

## Runde 3 (maschineller Logik-Reviewer)

| # | Befund | Status |
|---|---|---|
| 14 | Host-No-Show revertierte den Host-Bonus nicht (netto −9 statt −11) | ✅ Fix in `logic/noshow.js` |
| 15 | Feedback (inkl. No-Show-Strafe) für per host-cancel abgesagte Events möglich | ✅ Fix: 409 bei `status='cancelled'` |
| 16 | Teilnehmer-Absage von abgesagtem/beendetem Event kostete −3 | ✅ Fix: straffreier Austritt bzw. 409 |
| 17 | Skill-Matching hatte keine Testabdeckung | ✅ 6 neue Assertions |
| 18 | Recurrence nicht DST-fest (ms-Addition verschob lokale Uhrzeit) | ✅ Fix: Kalenderarithmetik + Test |
| 19 | Host-Absage < 24 h ohne −3 (Timewaster-Schlupfloch) | ✅ Fix: 24-h-Regel gilt auch für Hosts |
| 20 | Tick nicht transaktional (Host-Bonus bei Crash doppelbar) | ✅ Fix: BEGIN/COMMIT je Event |
| 21 | Toter Code `buildNextInstance` mit irreführendem Kommentar | ✅ Entfernt |
| 22 | Exakte Grenzwerte ungetestet (24 h, Score 80, Fenster-Kanten, Radius-Default) | ✅ 4 neue Tests |
| 23 | Fehlende Tests: Downtime-Catch-up, No-Show vor Tick, Host-No-Show | ✅ 3 neue Tests |

Testsuite nach Runde 3: **26/26 grün**; Routen-Fixes zusätzlich per Live-API
verifiziert (Host-Late-Cancel 96→93, Austritt aus abgesagtem Event delta 0,
Feedback auf abgesagtes Event 409).

## Runde 4 (maschinelle UX- und Frontend-Reviewer)

| # | Befund | Status |
|---|---|---|
| 24 | Chat-Thread-Initialen „JO"/„HE" statt Wortinitialen „JK"/„HB" | ✅ Fix in `chats.js` |
| 25/26 | Absage-Modal deckte Tab-Bar nicht ab; Tab-Wechsel bei offenem Modal; Android-Back schloss Screen statt Modal | ✅ RN-`<Modal transparent>` mit `onRequestClose` |
| 27 | Join/Cancel-Fehler stumm; volle Events zeigten „Mitmachen" | ✅ Fehleranzeige + „Ausgebucht"-Zustand |
| 28 | Veröffentlichen-Fehler stumm (leerer catch) | ✅ Fehleranzeige |
| 29 | useApi-Race: alte Antwort konnte neuere überschreiben (Filterwechsel) | ✅ Sequenz-Token |
| 30 | iOS-Tastatur verdeckte Eingaben (Erstellen/Feedback) | ✅ `automaticallyAdjustKeyboardInsets` |
| 31 | Tab-Bar festes `paddingBottom: 26` statt Safe-Area; `TAB_BAR_HEIGHT` hart kopiert | ✅ `tabBarHeight(insets)`-Helper überall |
| 32 | Detail-Screen bei Ladefehler dauerhaft leer ohne Back/Retry | ✅ Fehler-Fallback mit Retry |
| 33 | Info-Card-Werte 800 statt 700 (`<b>` im Prototyp) | ✅ |
| 34 | Banner-Pfeile 14 px statt 16 px | ✅ |
| 35 | Kein Terracotta-Fokus-Rahmen auf Inputs (Prototyp `input:focus`) | ✅ `Input`-Komponente |
| 36 | „(1 Hobby)" statt Prototyp-„(N Hobbys)" | ⚪ Bewusst: grammatisch korrekt (README) |
| 37 | Zusätzliche Zustands-Copy ohne Design-Abnahme | ⚪ Bewusst dokumentiert (README) |
| 38 | WS-Reconnect: Timer-Leak + kein Nachladen nach Downtime | ✅ Cleanup + `ws:open`-Reload |
| 39 | Danke-Banner verschwand schon bei Filterwechsel (Effekt-Deps) | ✅ separater Effekt mit leeren Deps |
| 40 | a11y: Datum/Uhrzeit ohne Label; VerifiedBadge ohne `accessible` | ✅ |

Hinweis: Die Verify-Agenten dieser Runde scheiterten am Subagenten-Limit —
alle 17 Befunde wurden stattdessen manuell am Code verifiziert (15 bestätigt
und gefixt, 2 als bewusste Entscheidungen eingestuft).

## Offen / außerhalb der Demo-Reife

Siehe `docs/launch-checklist.md` — echte Auth, PostGIS/Supabase, FCM/APNs,
SMS-/Video-Ident-Provider, echte Karte, Stores. Ein erneuter maschineller
Review-Pass (3 Rollen + adversarialer Verify) ist vorbereitet und kann bei
verfügbarem Subagenten-Kontingent wiederholt werden.
