import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { openDb, makeId } from './db.js';
import { seedIfEmpty } from './seed.js';
import { runTick } from './logic/tick.js';
import { createRateLimiter } from './logic/ratelimit.js';
import { eventsRouter } from './routes/events.js';
import { feedbackRouter } from './routes/feedback.js';
import { chatsRouter } from './routes/chats.js';
import { usersRouter } from './routes/users.js';
import { verificationRouter } from './routes/verification.js';
import { matchesRouter } from './routes/matches.js';
import { moderationRouter } from './routes/moderation.js';

const PORT = process.env.PORT || 4000;
const IS_PROD = process.env.NODE_ENV === 'production';
const db = openDb(process.env.DB_FILE);

// Demo-Daten NIE unbeabsichtigt in Produktion anlegen — dort nur mit
// ausdrücklichem ZAMMA_SEED=1 (z. B. für eine Staging-Instanz).
const seedingAllowed = !IS_PROD || process.env.ZAMMA_SEED === '1';
if (seedingAllowed) {
  if (seedIfEmpty(db)) console.log('[seed] Demo-Daten (München & Waldkraiburg) angelegt');
} else {
  console.log('[seed] übersprungen (Produktion, ZAMMA_SEED nicht gesetzt)');
}

// ── Push-Stub: Notification-Zeile + WebSocket + Log (Produktion: FCM/APNs) ──
const sockets = new Map(); // userId → Set<ws>
function broadcast(userIds, payload) {
  const msg = JSON.stringify(payload);
  for (const id of userIds) {
    for (const ws of sockets.get(id) ?? []) {
      if (ws.readyState === 1) ws.send(msg);
    }
  }
}
function notify(db_, userId, type, payload, createdAt = new Date().toISOString()) {
  const id = makeId('ntf');
  db_.prepare('INSERT INTO notifications (id, userId, type, payload, createdAt) VALUES (?, ?, ?, ?, ?)')
    .run(id, userId, type, JSON.stringify(payload), createdAt);
  console.log(`[push→${userId}] ${type}: ${JSON.stringify(payload)}`);
  broadcast([userId], { type: 'notification', notification: { id, type, payload, createdAt } });
}

const app = express();
// CORS betrifft nur Browser-Clients (die native App ist nicht betroffen).
// In Produktion muss CORS_ORIGINS gesetzt sein, sonst wird alles geblockt.
const corsOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',').map((s) => s.trim()).filter(Boolean);
if (IS_PROD && corsOrigins.length === 0) {
  console.warn('[cors] CORS_ORIGINS nicht gesetzt — Browser-Anfragen werden abgelehnt.');
}
app.use(cors(corsOrigins.length ? { origin: corsOrigins } : IS_PROD ? { origin: false } : undefined));
app.use(express.json({ limit: '64kb' }));
// Basis-Schutz gegen Abuse (Launch-Checkliste): 240 Requests/Minute pro IP
const allowRequest = createRateLimiter({ limit: 240, windowMs: 60_000 });
app.use((req, res, next) => {
  if (!allowRequest(req.ip ?? 'unknown')) {
    return res.status(429).json({ error: 'Zu viele Anfragen — bitte kurz warten' });
  }
  next();
});
// Demo-Auth: fester Nutzer via Header (Produktion: Supabase Auth / JWT).
// Unbekannte Nutzer-IDs → 401 statt späterer 500er in den Routen.
app.use((req, res, next) => {
  req.userId = req.get('x-user-id') || 'u_anna';
  const known = db.prepare('SELECT 1 AS x FROM users WHERE id = ?').get(req.userId);
  if (!known) return res.status(401).json({ error: 'Unbekannter Nutzer' });
  next();
});

app.get('/api/health', (_req, res) => res.json({ ok: true, name: 'zamma-server' }));
app.use('/api/events', eventsRouter(db, notify));
app.use('/api/feedback', feedbackRouter(db, notify));
app.use('/api/chats', chatsRouter(db, notify, broadcast));
app.use('/api/users', usersRouter(db, notify));
app.use('/api/verification', verificationRouter(db));
app.use('/api/matches', matchesRouter(db));
app.use('/api', moderationRouter(db));
app.get('/api/notifications', (req, res) => {
  res.json(db.prepare('SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 50')
    .all(req.userId).map((n) => ({ ...n, payload: JSON.parse(n.payload) })));
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Interner Fehler' });
});

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws, req) => {
  const userId = new URL(req.url, 'http://x').searchParams.get('userId') || 'u_anna';
  if (!sockets.has(userId)) sockets.set(userId, new Set());
  sockets.get(userId).add(ws);
  ws.on('close', () => sockets.get(userId)?.delete(ws));
});

// Zeitregeln: sofort und dann jede Minute
runTick(db, Date.now(), notify);
setInterval(() => runTick(db, Date.now(), notify), 60_000);

server.listen(PORT, () => console.log(`Zamma-Server läuft auf http://localhost:${PORT}`));
