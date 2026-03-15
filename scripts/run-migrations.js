const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

// Load .env.local
const envPath = path.join(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8").split("\n").forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  });
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set in .env.local");
  process.exit(1);
}
// Direct db.* host often doesn't resolve from local networks — use Session pooler (port 6543) instead
if (DATABASE_URL.includes("db.") && DATABASE_URL.includes("supabase.co") && !DATABASE_URL.includes("pooler")) {
  console.warn("Warning: DATABASE_URL looks like the direct DB host. If you get ENOTFOUND, use the Session pooler URI instead:");
  console.warn("  Supabase Dashboard → Project Settings → Database → Connection string → URI (Session pooler, port 6543)");
}

const migrationsDir = path.join(__dirname, "../supabase/migrations");
const files = fs.readdirSync(migrationsDir).sort();

async function run() {
  const client = new Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();
    console.log("Connected to database");

    for (const file of files) {
      if (!file.endsWith(".sql")) continue;
      const filepath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filepath, "utf8");
      console.log(`Running ${file}...`);
      try {
        await client.query(sql);
        console.log(`  OK: ${file}`);
      } catch (err) {
        if (err.message.includes("already exists") || err.message.includes("duplicate key")) {
          console.log(`  Skipped (already applied): ${file}`);
        } else {
          throw err;
        }
      }
    }
    console.log("Migrations complete");
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  if (err.code === "ENOTFOUND" && err.hostname && err.hostname.startsWith("db.")) {
    console.error("Cannot reach database host:", err.hostname);
    console.error("");
    console.error("Use the Session pooler URL instead of the direct DB URL:");
    console.error("  1. Supabase Dashboard → Project Settings → Database");
    console.error("  2. Connection string → URI → choose 'Session pooler' (port 6543)");
    console.error("  3. Put that URI in .env.local as DATABASE_URL=...");
    console.error("");
    console.error("Or run the SQL manually: SQL Editor → paste supabase/full-migration.sql → Run");
  } else {
    console.error(err);
  }
  process.exit(1);
});
