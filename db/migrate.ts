import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

config({
  path: ".env.local",
});

const runMigrate = async () => {
  const postgresUrl = process.env.POSTGRES_URL;
  if (!postgresUrl) {
    console.warn("⚠ POSTGRES_URL is not defined — skipping migrations");
    process.exit(0);
  }

  try {
    const connection = postgres(postgresUrl, { max: 1 });
    const db = drizzle(connection);

    console.log("⏳ Running migrations...");

    const start = Date.now();
    await migrate(db, { migrationsFolder: "./lib/drizzle" });
    const end = Date.now();

    console.log("✅ Migrations completed in", end - start, "ms");
  } catch (err) {
    console.warn("⚠ Migration skipped — could not connect to Postgres:", err.message);
  }

  process.exit(0);
};

runMigrate().catch((err) => {
  console.error("❌ Migration failed");
  console.error(err);
  process.exit(1);
});
