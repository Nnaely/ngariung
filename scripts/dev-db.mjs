// Postgres lokal untuk development, tanpa instalasi apa pun: PGlite (Postgres
// versi WebAssembly) yang dibuka lewat protokol Postgres biasa.
//
//   pnpm db:dev                 -> data tersimpan di .data/pglite
//   DEV_DB_DIR=memory:// pnpm db:dev  -> database sementara di memori
import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const HOST = "127.0.0.1";
const PORT = Number(process.env.DEV_DB_PORT ?? 54329);
const DATA_DIR = process.env.DEV_DB_DIR ?? ".data/pglite";

if (!DATA_DIR.startsWith("memory://")) mkdirSync(DATA_DIR, { recursive: true });

const db = await PGlite.create(DATA_DIR);
const server = new PGLiteSocketServer({ db, host: HOST, port: PORT, maxConnections: 4 });
await server.start();

console.log(`Postgres lokal siap (${DATA_DIR}).`);
console.log(`DATABASE_URL=postgres://postgres:postgres@${HOST}:${PORT}/postgres`);

let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await server.stop();
  await db.close();
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
