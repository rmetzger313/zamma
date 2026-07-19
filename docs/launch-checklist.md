# Zamma — Go-Live-Checkliste

Stand: App + Backend lauffähig und getestet (Demo-Reife). Alles Folgende braucht
**deine Accounts/Freigaben** — nichts davon ist automatisch passiert.

## 1. Backend live nehmen
- [ ] Hosting wählen (Fly.io / Railway / Hetzner + Docker). `server/Dockerfile` liegt bereit.
- [ ] PostgreSQL + PostGIS provisionieren, Datenlayer migrieren (siehe README-Tabelle)
      — oder direkt Supabase (Auth + Realtime + RLS in einem).
- [ ] Echte Auth (Supabase Auth/JWT) statt `X-User-Id`-Header; RLS-Policies je Tabelle.
- [ ] Secrets/Env: `PORT`, `DB_FILE`→`DATABASE_URL`, CORS auf App-Origin einschränken.
- [ ] Push: FCM/APNs-Keys, `expo-notifications`-Integration statt Push-Stub.
- [ ] SMS-Verifizierung: Twilio Verify (o. ä.); Video-Ident: IDnow/POSTIDENT-Vertrag.
- [ ] Monitoring: Health-Endpoint (`/api/health`) an Uptime-Check hängen; Fehler-Tracking (Sentry).

## 2. App in die Stores
- [ ] Expo-Konto anlegen und `eas build` ausführen — `app/eas.json` (development/preview/production) liegt bereit; die `EXPO_PUBLIC_API_URL`-Platzhalter durch deine echten API-Domains ersetzen.
- [ ] Apple Developer Program (99 €/J.) + Google Play Console (25 € einmalig).
- [ ] App-Icons/Splash finalisieren (aktuell Template-Assets), Store-Listings (DE) texten.
- [ ] Datenschutzerklärung + Impressum (DSGVO: Standortdaten, Feedback-Daten,
      Verifizierungsdaten sind personenbezogen — AVV mit Ident-/SMS-Providern).
- [ ] TestFlight / Play Internal Testing mit 5–10 echten Geräten vor Public Release.

## 3. Produkt-Härtung vor echten Nutzern
- [x] Rate-Limiting (in-memory, 240 Req/Min pro IP) — in Produktion auf Gateway/Redis heben.
- [ ] Moderation: Melden-Funktion für Events/Nachrichten, Block-Funktion.
- [x] Konto-Löschung (`DELETE /api/users/me`: anonymisiert, räumt Inhalte, sagt gehostete Events ab) — [ ] Datenexport fehlt noch.
- [ ] Echte Karte (react-native-maps + OSM/Mapbox-Token) statt Demo-Illustration.
- [x] E2E-Klickdurchlauf (Playwright, `e2e/`) für Web — [ ] zusätzlich Maestro/Detox auf echten Geräte-Builds.

## 4. Launch-Betrieb (Woche 1)
- [ ] Seed-Events kuratieren: 10–15 echte Treffen in München + Waldkraiburg vor Launch anlegen
      (leerer Feed killt Retention — der Empty-State hilft, ersetzt aber kein Angebot).
- [ ] Feedback-Loop: Push-Reminder-Quoten und No-Show-Raten wöchentlich anschauen
      (Score-Parameter −3/−10/+1 sind Startwerte, keine Naturgesetze).
