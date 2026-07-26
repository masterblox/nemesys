import { Pool, type QueryResultRow } from "pg";

let pool: Pool | undefined;

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

export function database() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
    max: 6
  });
  return pool;
}

export async function query<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  return database().query<T>(text, values);
}

export async function withTransaction<T>(callback: (client: import("pg").PoolClient) => Promise<T>) {
  const client = await database().connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
