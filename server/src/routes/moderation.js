import { Router } from 'express';
import { blockUser, unblockUser, getBlockedIds, createReport } from '../logic/moderation.js';

export function moderationRouter(db) {
  const r = Router();

  r.post('/reports', (req, res) => {
    try {
      const id = createReport(db, req.userId, req.body ?? {});
      res.status(201).json({ ok: true, id });
    } catch (e) {
      res.status(e.status ?? 500).json({ error: e.message });
    }
  });

  r.get('/blocks', (req, res) => {
    res.json([...getBlockedIds(db, req.userId)]);
  });

  r.post('/blocks', (req, res) => {
    try {
      blockUser(db, req.userId, req.body?.userId);
      res.status(201).json({ ok: true });
    } catch (e) {
      res.status(e.status ?? 500).json({ error: e.message });
    }
  });

  r.delete('/blocks/:userId', (req, res) => {
    unblockUser(db, req.userId, req.params.userId);
    res.json({ ok: true });
  });

  return r;
}
