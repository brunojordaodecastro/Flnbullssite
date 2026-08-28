import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const projectDir = process.cwd();
const d1Dir = join(projectDir, ".wrangler", "state", "v3", "d1", "miniflare-D1DatabaseObject");
const files = readdirSync(d1Dir).filter(f => f.endsWith(".sqlite") && f !== "metadata.sqlite");

console.log("Found D1 databases:", files);

for (const file of files) {
  const dbPath = join(d1Dir, file);
  console.log(`Applying migrations to: ${file}`);
  const db = new DatabaseSync(dbPath);

  // Read migrations
  const migrations = [
    "0000_watery_apocalypse.sql",
    "0001_broad_iceman.sql",
    "0002_add_dominant_foot.sql",
    "0002_strange_xavin.sql",
  ];
  for (const mig of migrations) {
    const sqlPath = join(projectDir, "drizzle", mig);
    const content = readFileSync(sqlPath, "utf8");
    const statements = content.split("--> statement-breakpoint");
    for (const stmt of statements) {
      const clean = stmt.trim();
      if (!clean) continue;
      try {
        db.exec(clean);
        console.log(`  Executed: ${clean.slice(0, 50).replace(/\n/g, " ")}...`);
      } catch (err) {
        console.log(`  Skipped/Notice: ${err.message}`);
      }
    }
  }

  // Check tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log("Tables in database:", tables);

  const columns = db.prepare("PRAGMA table_info(users)").all();
  console.log("Columns in users:", columns.map(c => c.name));
}
