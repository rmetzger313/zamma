import { Router } from 'express';
import { getUser } from '../repo.js';
import { computeVerification } from '../logic/verification.js';
import { verificationSteps } from './users.js';

// Mock-Provider: SMS und Video-Ident sind Stubs. In Produktion:
// SMS-Provider (z. B. Twilio Verify) und Ident-Dienst (z. B. IDnow) anbinden.
const DEV_SMS_CODE = '246810';

export function verificationRouter(db) {
  const r = Router();

  r.get('/', (req, res) => {
    const user = getUser(db, req.userId);
    res.json({ ...computeVerification(user), steps: verificationSteps(db, user) });
  });

  r.post('/phone/start', (req, res) => {
    if (!req.body?.phone) return res.status(400).json({ error: 'Telefonnummer erforderlich' });
    res.json({ sent: true, devCode: DEV_SMS_CODE }); // Demo: Code in Antwort statt SMS
  });

  r.post('/phone/confirm', (req, res) => {
    if (req.body?.code !== DEV_SMS_CODE) return res.status(400).json({ error: 'Falscher Code' });
    db.prepare('UPDATE users SET verifiedPhone = 1, verifiedPhoneAt = ? WHERE id = ?')
      .run(new Date().toISOString(), req.userId);
    res.json({ ok: true });
  });

  r.post('/ident/start', (req, res) => {
    db.prepare('UPDATE users SET verifiedId = 1, verifiedIdAt = ? WHERE id = ?')
      .run(new Date().toISOString(), req.userId);
    res.json({ ok: true, note: 'Demo-Stub: Video-Ident sofort bestätigt' });
  });

  return r;
}
