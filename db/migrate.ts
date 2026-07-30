import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const runMigrate = async () => {
  const postgresUrl = process.env.DATABASE_URL_UNPOOLED;
  if (!postgresUrl) {
    throw new Error(
      "DATABASE_URL_UNPOOLED is not defined — cannot run migrations",
    );
  }

  const connection = postgres(postgresUrl, { max: 1 });
  const db = drizzle(connection);

  console.log("⏳ Running migrations...");

  const start = Date.now();
  await migrate(db, { migrationsFolder: "./lib/drizzle" });
  const end = Date.now();

  console.log("✅ Migrations completed in", end - start, "ms");
};

runMigrate().catch((err) => {
  console.error("❌ Migration failed");
  console.error(err);
  process.exit(1);
});
