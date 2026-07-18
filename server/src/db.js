import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');

export function openDb(file = join(DATA_DIR, 'zamma.db')) {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatarColor TEXT NOT NULL,
      photo TEXT,
      city TEXT,
      lat REAL, lng REAL,
      bio TEXT,
      joinDate TEXT NOT NULL,
      verifiedPhone INTEGER DEFAULT 0, verifiedPhoneAt TEXT,
      verifiedId INTEGER DEFAULT 0, verifiedIdAt TEXT,
      reliabilityScore INTEGER NOT NULL DEFAULT 100,
      meetingsAttended INTEGER NOT NULL DEFAULT 0,
      avgRating REAL,
      noShowCount INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS user_hobbies (
      userId TEXT NOT NULL REFERENCES users(id),
      hobby TEXT NOT NULL,
      skillLevel INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (userId, hobby)
    );
    CREATE TABLE IF NOT EXISTS user_locations (
      userId TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      lat REAL NOT NULL, lng REAL NOT NULL,
      radiusKm REAL NOT NULL DEFAULT 25,
      isPrimary INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (userId, name)
    );
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      seriesId TEXT NOT NULL,
      hostId TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('sport','spiele','kreativ','outdoor','kochen')),
      description TEXT,
      skillLevel INTEGER NOT NULL DEFAULT 1 CHECK (skillLevel IN (1,2,3)),
      datetime TEXT NOT NULL,
      durationMin INTEGER NOT NULL DEFAULT 120,
      recurrence TEXT CHECK (recurrence IN ('weekly','biweekly') OR recurrence IS NULL),
      locationName TEXT,
      city TEXT,
      lat REAL, lng REAL,
      distLabelOverride TEXT,
      mapX TEXT, mapY TEXT,
      maxSpots INTEGER NOT NULL DEFAULT 6,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','full','past','cancelled')),
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS participations (
      userId TEXT NOT NULL REFERENCES users(id),
      eventId TEXT NOT NULL REFERENCES events(id),
      status TEXT NOT NULL DEFAULT 'joined' CHECK (status IN ('joined','cancelled','attended','no_show')),
      joinedAt TEXT,
      cancelledAt TEXT,
      PRIMARY KEY (userId, eventId)
    );
    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      eventId TEXT NOT NULL REFERENCES events(id),
      fromUserId TEXT NOT NULL REFERENCES users(id),
      aboutUserId TEXT NOT NULL REFERENCES users(id),
      stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
      tags TEXT NOT NULL DEFAULT '[]',
      comment TEXT,
      createdAt TEXT NOT NULL,
      UNIQUE (eventId, fromUserId, aboutUserId)
    );
    CREATE TABLE IF NOT EXISTS chat_groups (
      seriesId TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      initials TEXT NOT NULL,
      color TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS chat_members (
      seriesId TEXT NOT NULL REFERENCES chat_groups(seriesId),
      userId TEXT NOT NULL REFERENCES users(id),
      lastReadAt TEXT,
      PRIMARY KEY (seriesId, userId)
    );
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      seriesId TEXT NOT NULL REFERENCES chat_groups(seriesId),
      userId TEXT NOT NULL REFERENCES users(id),
      text TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      createdAt TEXT NOT NULL,
      readAt TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_events_series ON events(seriesId);
    CREATE INDEX IF NOT EXISTS idx_events_datetime ON events(datetime);
    CREATE INDEX IF NOT EXISTS idx_part_event ON participations(eventId);
    CREATE INDEX IF NOT EXISTS idx_msg_series ON chat_messages(seriesId, createdAt);
  `);
  return db;
}

let seq = 0;
export function makeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${(seq++).toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}
