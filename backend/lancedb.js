import * as lancedb from "@lancedb/lancedb";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const db = await lancedb.connect(path.join(projectRoot, "lancedb-data"));

export async function getTable() {

  try {

    return await db.openTable(
      "knowledge"
    );

  } catch {

    return null;

  }
}
