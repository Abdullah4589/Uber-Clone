import 'dotenv/config';
import { execSync } from 'node:child_process';
import { createClient } from '@libsql/client';

/**
 * Pushes the Prisma schema to the Turso (libSQL) database.
 *
 * Prisma's own `db push` / `migrate` can't authenticate against a `libsql://`
 * URL with an auth token, so instead we:
 *   1. Let Prisma generate the CREATE TABLE/INDEX SQL from schema.prisma.
 *   2. Make it idempotent (IF NOT EXISTS) so re-running is safe.
 *   3. Apply it to Turso over the libSQL client.
 */
async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) throw new Error('TURSO_DATABASE_URL is not set (check server/.env)');

  console.log('Generating schema SQL from prisma/schema.prisma…');
  const raw = execSync(
    'npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script',
    { encoding: 'utf8' }
  );

  // Make it non-destructive / re-runnable.
  const sql = raw
    .replace(/CREATE TABLE "/g, 'CREATE TABLE IF NOT EXISTS "')
    .replace(/CREATE UNIQUE INDEX "/g, 'CREATE UNIQUE INDEX IF NOT EXISTS "')
    .replace(/CREATE INDEX "/g, 'CREATE INDEX IF NOT EXISTS "');

  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  console.log(`Applying schema to ${url} …`);
  await client.executeMultiple(sql);
  client.close();
  console.log('Turso schema is up to date.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
