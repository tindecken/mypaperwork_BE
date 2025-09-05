import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '../src/db/schema';

config({ path: '.env' });

const client = createClient({
  url: process.env['TURSO_CONNECTION_URL']!,
  authToken: process.env['TURSO_AUTH_TOKEN']!,
  tls: true,
});

export const db = drizzle(client, { schema });
