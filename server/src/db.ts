import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

/**
 * Database client backed by Turso (libSQL) via Prisma's driver adapter.
 *
 * At runtime the app talks to the Turso cloud database using TURSO_DATABASE_URL
 * + TURSO_AUTH_TOKEN. The `datasource url` in schema.prisma (a local sqlite file)
 * is only used by the Prisma CLI for `generate` / `migrate diff` — never here.
 */

const url = process.env.TURSO_DATABASE_URL;
if (!url) {
  throw new Error('TURSO_DATABASE_URL is not set (check server/.env)');
}

const libsql = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const adapter = new PrismaLibSQL(libsql);

export const prisma = new PrismaClient({ adapter });
