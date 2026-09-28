// Aplica db/schema.sql no banco de DATABASE_URL. Uso: npm run db:migrate
import { readFileSync } from "node:fs";
import { Client } from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Defina DATABASE_URL (veja .env.example).");
  process.exit(1);
}
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
const client = new Client({ connectionString: url, ssl: local ? false : { rejectUnauthorized: true } });
await client.connect();
await client.query(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
const { rows } = await client.query("select table_name from information_schema.tables where table_schema = 'public' order by 1");
console.log("Tabelas:", rows.map((r) => r.table_name).join(", "));
await client.end();
