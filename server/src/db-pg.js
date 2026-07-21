// Postgres-Datenschicht (Supabase). Ersetzt schrittweise das synchrone
// node:sqlite-Setup aus db.js — alle Aufrufe hier sind asynchron.
//
// Verbindung kommt aus DATABASE_URL (server/.env, NICHT eingecheckt):
//   Supabase Dashboard -> Settings -> Database -> Connection string
// Empfohlen ist der Pooler-String. Achtung: Im Transaction-Pooling-Modus
// haften sitzungsweite Einstellungen (z. B. search_path) nicht zuverlässig —
// deshalb werden PostGIS-Funktionen in Queries explizit als
// `extensions.ST_...` qualifiziert und nicht über den Suchpfad aufgelöst.
import pg from 'pg';

const { Pool, types } = pg;

// numeric/int8 als Zahl statt String liefern (avg_rating, radius_km, COUNT)
types.setTypeParser(1700, (v) => (v === null ? null : Number(v))); // numeric
types.setTypeParser(20, (v) => (v === null ? null : Number(v)));   // int8

let pool = null;

export function getPool() {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL fehlt. Lege server/.env an mit:\n' +
      '  DATABASE_URL=postgresql://...\n' +
      '(Supabase: Settings -> Database -> Connection string)'
    );
  }
  pool = new Pool({
    connectionString,
    // Supabase erzwingt TLS; die Kette wird von der verwalteten Instanz gestellt.
    ssl: { rejectUnauthorized: false },
    max: Number(process.env.PG_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    options: '-c search_path=public,extensions',
  });
  pool.on('error', (err) => console.error('[pg] Idle-Client-Fehler:', err.message));
  return pool;
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// snake_case (Postgres-Konvention) -> camelCase (JS-Konvention im Code)
const camelCache = new Map();
function toCamel(key) {
  let v = camelCache.get(key);
  if (v === undefined) {
    v = key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
    camelCache.set(key, v);
  }
  return v;
}

export function mapRow(row) {
  if (!row) return row;
  const out = {};
  for (const k of Object.keys(row)) out[toCamel(k)] = row[k];
  return out;
}

// Führt eine Query aus. `client` erlaubt die Nutzung innerhalb einer Transaktion.
export async function query(text, params = [], client = null) {
  const runner = client ?? getPool();
  return runner.query(text, params);
}

// Genau eine Zeile (oder null)
export async function one(text, params = [], client = null) {
  const res = await query(text, params, client);
  return res.rows.length ? mapRow(res.rows[0]) : null;
}

// Alle Zeilen
export async function many(text, params = [], client = null) {
  const res = await query(text, params, client);
  return res.rows.map(mapRow);
}

// Schreiboperation; liefert die Anzahl betroffener Zeilen
export async function run(text, params = [], client = null) {
  const res = await query(text, params, client);
  return res.rowCount;
}

// Transaktion: fn bekommt den Client, der an one/many/run durchgereicht wird.
// Rollback passiert automatisch bei jedem Fehler.
export async function tx(fn) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch { /* Verbindung ggf. schon tot */ }
    throw e;
  } finally {
    client.release();
  }
}

// Verbindungstest für Start und Health-Check
export async function pingDb() {
  const row = await one('select now() as at, current_setting(\'server_version\') as version');
  return row;
}
