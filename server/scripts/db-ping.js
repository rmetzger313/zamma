// Verbindungstest gegen Supabase/Postgres.
//   cd server && npm run db:ping
// Erwartet DATABASE_URL in server/.env. Gibt bewusst KEINE Zugangsdaten aus.
import { pingDb, one, closePool } from '../src/db-pg.js';

try {
  const info = await pingDb();
  console.log(`Verbunden. Serverzeit: ${info.at.toISOString()}`);
  console.log(`Postgres-Version: ${info.version}`);

  const postgis = await one(
    "select extversion as version, n.nspname as schema from pg_extension e join pg_namespace n on n.oid = e.extnamespace where e.extname = 'postgis'"
  );
  console.log(postgis ? `PostGIS ${postgis.version} im Schema "${postgis.schema}"` : 'PostGIS: NICHT installiert');

  const tables = await one(
    "select count(*)::int as anzahl from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'"
  );
  console.log(`Tabellen in public: ${tables.anzahl}`);

  const rls = await one(
    'select count(*)::int as ohne_rls from pg_tables t join pg_class c on c.relname = t.tablename ' +
    "where t.schemaname = 'public' and c.relrowsecurity = false"
  );
  console.log(`Tabellen ohne RLS: ${rls.ohneRls} (soll: 0)`);
} catch (e) {
  console.error(`Verbindung fehlgeschlagen: ${e.message}`);
  process.exitCode = 1;
} finally {
  await closePool();
}
