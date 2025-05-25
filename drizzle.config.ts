import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'turso',
  dbCredentials: {
    authToken: process.env['TURSO_AUTH_TOKEN']!,
    url: process.env['TURSO_CONNECTION_URL']!,
  },
});
