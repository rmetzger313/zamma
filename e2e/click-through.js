// E2E-Smoke: klickt die komplette App headless durch (echte Input-Events) und
// legt Screenshots aller Screens ab. Erwartet frisch geseedete Demo-DB
// (server/data löschen + Server starten) und laufenden Expo-Web-Server.
//
//   npm install && node click-through.js
//   Umgebungsvariablen: E2E_BASE (Default http://localhost:8081),
//                       E2E_OUT  (Default ../docs/screens)
const { chromium } = require('playwright');
const path = require('node:path');

const OUT = process.env.E2E_OUT || path.join(__dirname, '..', 'docs', 'screens');
const BASE = process.env.E2E_BASE || 'http://localhost:8081';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const shot = async (name) => {
    await page.waitForTimeout(450);
    await page.screenshot({ path: path.join(OUT, `${name}.png`) });
    console.log('shot', name);
  };
  const tapText = (t, opts) => page.getByText(t, opts).first().click();
  const tapTab = (name) => page.getByRole('tab', { name }).click();

  await page.goto(BASE);
  await page.getByText('Gemeinsam statt allein.').waitFor({ timeout: 180000 });
  await shot('01-onboarding');

  await page.getByText(/^Los geht's/).click();
  await page.getByText('DEIN UMKREIS').waitFor();
  await page.getByText('Lauftreff Englischer Garten').first().waitFor();
  await shot('02-entdecken-feed');

  await tapText('⊞ Karte');
  await page.getByText('Kartenansicht (Demo)').waitFor();
  await shot('03-entdecken-karte');
  await tapText('☰ Liste');

  await page.getByRole('button', { name: 'Outdoor' }).first().click();
  await page.getByText('Hier ist noch nichts los').waitFor();
  await shot('04-empty-state');
  await page.getByRole('button', { name: 'Alle' }).first().click();

  await tapText('Lauftreff Englischer Garten');
  await page.getByText('DABEI (4)').waitFor();
  await shot('05-detail');

  await tapText('Mitmachen');
  await page.getByText('✓ Du bist dabei').waitFor();
  await tapText('Absagen');
  await page.getByText('Wirklich absagen?').waitFor();
  await shot('06-absage-modal');
  await tapText('Doch dabei');
  await tapText('←');

  await tapText('Wie war der Brettspielabend?');
  await page.getByText('WIE WAR DAS TREFFEN?').waitFor();
  await page.getByRole('button', { name: '5 Sterne' }).click();
  await page.getByRole('button', { name: 'Pünktlich' }).click();
  await page.getByRole('button', { name: 'Freundlich' }).click();
  await shot('07-feedback');
  await tapText('←');

  await tapTab('Chats');
  await page.getByText('Brettspielabend Waldkraiburg').waitFor();
  await shot('08-chats');
  await tapText('Top. Wetter sieht gut aus, ca. 21 Grad.');
  await page.getByText('6 Teilnehmer · Sa 09:00').waitFor();
  await shot('09-chat-thread');
  await tapText('←');

  await tapTab('Profil');
  await page.getByText('ZUVERLÄSSIG').waitFor();
  await shot('10-profil');
  await tapText('›');
  await page.getByText('Du bist voll verifiziert').waitFor();
  await shot('11-verifizierung');
  await tapText('←');

  await tapTab('Erstellen');
  await page.getByText('Neue Verabredung').waitFor();
  await page.getByRole('switch').click(); // Wiederkehrend an
  await shot('12-erstellen');

  await browser.close();
  console.log('FERTIG');
})().catch((e) => { console.error(e); process.exit(1); });
