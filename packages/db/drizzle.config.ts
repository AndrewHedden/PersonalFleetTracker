import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const url = process.env.DATABASE_URL;

if (!url && process.env.NODE_ENV !== 'test') {
  console.warn(
    '[drizzle] DATABASE_URL is not set. db:generate works without it; db:migrate and db:studio need it.',
  );
}

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: url ?? 'postgres://localhost/placeholder',
  },
  strict: true,
  verbose: true,
});
