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
  console.error(err);
  process.exit(1);
});
