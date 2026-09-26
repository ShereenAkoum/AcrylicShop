import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';

// Credentials travel through the child environment, never command-line arguments or logs.
const raw = process.env.SUPABASE_DB_URL;
if (!raw)
  throw new Error('Set SUPABASE_DB_URL in .env.local. Do not paste it into a shell command.');
let url;
try {
  url = new URL(raw);
} catch {
  throw new Error(
    'SUPABASE_DB_URL is not a valid connection URL. Check URL encoding without sharing the value.',
  );
}
if (!['postgres:', 'postgresql:'].includes(url.protocol))
  throw new Error('Expected a PostgreSQL connection URL.');
const env = {
  ...process.env,
  PGHOST: url.hostname,
  PGPORT: url.port || '5432',
  PGUSER: decodeURIComponent(url.username),
  PGPASSWORD: decodeURIComponent(url.password),
  PGDATABASE: url.pathname.slice(1) || 'postgres',
  PGSSLMODE: url.searchParams.get('sslmode') || 'verify-full',
  PGCONNECT_TIMEOUT: '10',
  ...(process.env.SUPABASE_DB_SSLROOTCERT
    ? { PGSSLROOTCERT: process.env.SUPABASE_DB_SSLROOTCERT }
    : {}),
};
function sql(statement) {
  const result = spawnSync(
    process.env.PSQL_PATH || 'psql',
    ['-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=sqlstate'],
    {
      input: statement,
      env,
      encoding: 'utf8',
      timeout: 120000,
    },
  );
  if (result.error || result.status !== 0) {
    // SQLSTATE and connection categories are useful without exposing connection details.
    const detail = result.stderr || '';
    const category = /certificate|root certificate/i.test(detail)
      ? 'TLS certificate verification failed. Configure SUPABASE_DB_SSLROOTCERT.'
      : /password authentication/i.test(detail)
        ? 'Database password authentication failed.'
        : /could not translate|timeout|could not connect|Network is unreachable/i.test(detail)
          ? 'Database host could not be reached. Use the Supabase session pooler if IPv6 is unavailable.'
          : result.error?.code === 'ENOENT'
            ? 'psql is not installed or PSQL_PATH is not configured.'
            : `Database command failed${detail.match(/ERROR:\s+([A-Z0-9]{5})/)?.[1] ? ' (SQLSTATE ' + detail.match(/ERROR:\s+([A-Z0-9]{5})/)[1] + ')' : ''}.`;
    throw new Error(category);
  }
  return result.stdout.trim();
}
const mode = process.argv[2] || 'inspect';
if (!['inspect', 'apply'].includes(mode)) throw new Error('Use inspect or apply.');
const inspect = sql(
  `select json_build_object('public_tables',(select coalesce(json_agg(tablename order by tablename),'[]') from pg_tables where schemaname='public'),'migration_history',to_regclass('supabase_migrations.schema_migrations') is not null,'auth_available',to_regclass('auth.users') is not null,'storage_available',to_regclass('storage.objects') is not null);`,
);
const state = JSON.parse(inspect);
console.log(JSON.stringify(state));
if (!state.auth_available || !state.storage_available)
  throw new Error('This is not an initialized Supabase database.');
const applied = state.migration_history
  ? sql('select version from supabase_migrations.schema_migrations order by version;')
      .split('\n')
      .filter(Boolean)
  : [];
const files = readdirSync('supabase/migrations')
  .filter((file) => /^\d+_.+\.sql$/.test(file))
  .sort();
const pending = files.filter((file) => !applied.includes(file.split('_')[0]));
console.log(`Applied migrations: ${applied.length}. Pending: ${pending.join(', ') || 'none'}.`);
if (mode === 'inspect') process.exit(0);
// Do not silently merge a fresh schema into an unrelated existing application.
if (!applied.length && state.public_tables.length)
  throw new Error('Existing public tables require review before the initial migration.');
if (applied.some((version) => !files.some((file) => file.startsWith(`${version}_`))))
  throw new Error(
    'The database has migrations missing from this repository. Review before continuing.',
  );
if (!pending.length) process.exit(0);
const quote = (value) => `'${value.replaceAll("'", "''")}'`;
// One transaction: either the entire pending batch and its history commit, or none does.
const statements = [
  'begin;',
  "select pg_advisory_xact_lock(hashtextextended('yaqeen-migrations',0));",
  'create schema if not exists supabase_migrations;',
  'create table if not exists supabase_migrations.schema_migrations(version text primary key, statements text[], name text);',
];
for (const file of pending) {
  const version = file.split('_')[0];
  const name = file.slice(version.length + 1, -4);
  const migration = readFileSync(`supabase/migrations/${file}`, 'utf8');
  statements.push(
    migration,
    `insert into supabase_migrations.schema_migrations(version,name,statements) values(${quote(version)},${quote(name)},array[${quote(migration)}]);`,
  );
}
statements.push('commit;');
sql(statements.join('\n'));
console.log(
  `Applied ${pending.length} migrations transactionally. Development seed was not applied.`,
);
