# Zamma — Lokale Hobby-Verabredungs-App

Implementierung des Design-Handoffs (`design_handoff_zamma/README.md`): Mobile-App
(Expo / React Native, expo-router) + Backend (Node.js / Express / SQLite via `node:sqlite`).
UI-Sprache Deutsch, Demo-Region München & Waldkraiburg.

## Struktur

```
zamma/
  app/      Expo-App (8 Screens, Design-Tokens in src/theme.js)
  server/   Backend: Datenmodell, Logikregeln, REST-API + WebSocket
```

## Starten (Entwicklung)

```bash
# Backend (Port 4000) — seedet beim ersten Start Demo-Daten
cd server && npm install && npm start

# App (Expo; Web unter http://localhost:8081)
cd app && npm install && npm run web        # oder: npm start für iOS/Android
```

Tests: `cd server && npm test` (Logikregeln: Score, Geo, Recurrence,
Feedback-Fenster, Verifizierung, Tick-Integration, Rate-Limit, Konto-Löschung).
E2E-Klickdurchlauf: `cd e2e && npm install && npm run e2e` (beide Server müssen
laufen, Demo-DB frisch — erzeugt Screenshots in `docs/screens/`). CI:
`.github/workflows/ci.yml` (Server-Tests + Web-Export).

Demo-Login: fester Nutzer `u_anna` (Header `X-User-Id`; Produktion: echte Auth).
Native Builds erreichen die API über `EXPO_PUBLIC_API_URL`.

## Screens (App)

Onboarding · Entdecken (Feed + Karten-Demo) · Detail (Join/Absage-Modal) ·
Erstellen · Chats · Chat-Thread · Feedback · Profil · Verifizierung.
Tab-Bar auf allen Screens außer Onboarding, Thread, Feedback (laut Handoff).

## Logikregeln (Server, `src/logic/`)

- **Zuverlässigkeits-Score**: Start 100 · Absage < 24 h −3 · bestätigter No-Show −10 ·
  erfolgreiches Treffen +1 (max. 100). Vorschau fürs Absage-Modal via
  `GET /api/events/:id/cancel-preview`.
- **Verifizierung**: SMS (Stub) → Video-Ident (Stub) → 3 Treffen ohne No-Show.
  Badge-Entzug ab 2 No-Shows; unverifizierte Hosts/Score < 80 werden im Feed
  nachrangig sortiert.
- **Skill-Matching**: „✦ Passt zu dir" bei Event „Alle Level" oder Level-Gleichstand
  (Hobby→Kategorie-Mapping in `serialize.js`).
- **Recurrence**: Tick (minütlich) schließt beendete Events ab (`joined→attended`,
  +1 Score), erzeugt idempotent die nächste Instanz; Teilnahme gilt pro Instanz.
- **Feedback**: Fenster öffnet nach Event-Ende, Reminder-Push nach 2 h, schließt
  nach 7 Tagen; 1× pro Teilnehmer-Paar; No-Show-Tag setzt Score/Zähler.
- **Umkreissuche**: Haversine über alle gespeicherten Orte (Default 25 km).

## API (Auszug)

`GET/POST /api/events`, `POST /api/events/:id/join|cancel|host-cancel`,
`GET /api/events/:id/cancel-preview`, `GET /api/feedback/pending`, `POST /api/feedback`,
`GET /api/chats`, `GET/POST /api/chats/:seriesId/messages`, `GET /api/users/me`,
`PUT /api/users/me/hobbies`, `GET /api/verification`, `POST /api/verification/...`,
`DELETE /api/users/me` (Konto-Löschung: anonymisiert + räumt Inhalte),
`GET /api/notifications`, WebSocket `/ws?userId=` (Chat live + Push-Stub).
Alle Endpunkte hinter einem einfachen Rate-Limit (240 Req/Min pro IP).

## Bewusste Entscheidungen

- **Seed-Termine dynamisch** relativ zu „jetzt", damit Feedback-Fenster, Reminder
  und Recurrence jederzeit live demonstrierbar sind (Format wie im Design).
- **Karte** bleibt die stilisierte Demo-Illustration aus dem Prototyp — die README
  fordert für Produktion explizit OpenStreetMap/Mapbox (`DemoMap.js` ist die
  Austauschstelle; Pin-Positionen kämen dann aus einer Geo-Projektion).
- **Absage-Modal** zeigt bei > 24 h ehrlich „Score bleibt" statt fälschlich −3.
- **Detail-CTA** sitzt über der Tab-Bar (im Prototyp hätten sich beide überlappt).
- **Schafkopf-Runde** auf konsistente „1 / 4 dabei" normalisiert (Prototyp-Demo-
  Daten widersprachen sich: 3 Teilnehmer bei „1 / 4").
- **Waldkraiburg** ist als zweiter gespeicherter Standort modelliert — so sind
  beide Demo-Regionen im 25-km-Feed erklärbar; Distanz-Labels dort zeigen
  Ortsangaben („Zentrum") statt km.
- **Onboarding-CTA** sagt grammatisch korrekt „(1 Hobby)" — die Prototyp-Logik
  hätte „(1 Hobbys)" erzeugt.
- **Zustands-Copy ohne Design-Vorlage** (Fehlermeldungen, „Wird veröffentlicht…",
  Host-CTA, „Ausgebucht", leerer Feedback-Zustand): nötige Zustände, Texte im
  Ton des Handoffs ergänzt.

## Produktions-Migrationspfad

| Demo heute | Produktion |
|---|---|
| SQLite (`node:sqlite`) | PostgreSQL + PostGIS (`ST_DWithin` statt Haversine) oder Supabase |
| `X-User-Id`-Header | Supabase Auth / JWT, Row-Level-Security |
| Push = Notification-Tabelle + WS + Log | FCM/APNs (expo-notifications) |
| SMS-/Video-Ident-Stubs | Twilio Verify / IDnow o. ä. |
| Karten-Demo | react-native-maps (OSM/Mapbox) |
| Unicode-Icons | Icon-Set (Lucide/Phosphor, rounded) |
