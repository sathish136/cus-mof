import { db } from "./db";
import * as schema from "@shared/schema";
import { sql, getTableName } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";

async function truncateDatabase() {
  console.log("Truncating all tables...");

  try {
    const tableSchemas = Object.values(schema);
    for (const table of tableSchemas) {
      if (table instanceof PgTable) {
        const tableName = getTableName(table);
        console.log(`Truncating ${tableName}...`);
        await db.execute(sql.raw(`TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE;`));
      }
    }

    console.log("Database truncated successfully.");
  } catch (error) {
    console.error("Error truncating database:", error);
  } finally {
    process.exit(0);
  }
}

truncateDatabase();
