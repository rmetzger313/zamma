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

Hinweis: Screenshot-Capture der Browser-Umgebung war in der Session defekt —
Verifikation lief über DOM-Text/-Zustände und API-Antworten.

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

## Offen / außerhalb der Demo-Reife

Siehe `docs/launch-checklist.md` — echte Auth, PostGIS/Supabase, FCM/APNs,
SMS-/Video-Ident-Provider, echte Karte, Stores. Ein erneuter maschineller
Review-Pass (3 Rollen + adversarialer Verify) ist vorbereitet und kann bei
verfügbarem Subagenten-Kontingent wiederholt werden.
