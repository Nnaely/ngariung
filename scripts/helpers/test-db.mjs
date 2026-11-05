// Postgres sungguhan (PGlite, di memori) untuk tes layanan server.
import { PGlite } from "@electric-sql/pglite";
import { migrate } from "../../lib/server/sql.ts";

function txAdapter(tx) {
  return {
    query: (text, params) => tx.query(text, params),
    transaction: () => {
      throw new Error("Transaksi bersarang tidak didukung.");
    },
  };
}

/** Database baru yang kosong dan sudah dimigrasi. */
export async function createTestDb() {
  const pg = await PGlite.create();
  const db = {
    query: (text, params) => pg.query(text, params),
    transaction: (fn) => pg.transaction((tx) => fn(txAdapter(tx))),
  };
  await migrate(db);
  return { db, close: () => pg.close() };
}
