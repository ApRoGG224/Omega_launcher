#!/usr/bin/env node
// Omega Launcher — раннер миграций для Supabase.
//
//   node scripts/migrations.mjs            — применить неприменённые миграции
//   node scripts/migrations.mjs new <name> — создать новый файл миграции
//   node scripts/migrations.mjs status     — показать статус миграций
//   node scripts/migrations.mjs import     — пометить все текущие файлы как применённые
//                                           (для БД, где схема уже внесена вручную)
//
// Требует в .env:
//   VITE_SUPABASE_URL        (https://<project-ref>.supabase.co)
//   SUPABASE_ACCESS_TOKEN    (личный токен: https://supabase.com/dashboard/account/tokens)

import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS_DIR = join(ROOT, "supabase", "migrations");
const TRACKING_TABLE = "private.omega_migrations";

let PROJECT_REF = "";
let SUPABASE_ACCESS_TOKEN = "";

function loadEnv() {
  const envFile = join(ROOT, ".env");
  const result = {};
  if (existsSync(envFile)) {
    for (const rawLine of readFileSync(envFile, "utf8").split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      result[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
    }
  }
  return { ...result, ...process.env };
}

function fail(msg) {
  console.error(`\n[Ошибка] ${msg}\n`);
  console.error("Получите токен: https://supabase.com/dashboard/account/tokens");
  console.error("Затем добавьте в .env строку: SUPABASE_ACCESS_TOKEN=<токен>\n");
  process.exit(1);
}

async function supabaseQuery(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Management API ${res.status}: ${body.slice(0, 500)}`);
  }
  return res.json();
}

async function ensureTrackingTable() {
  await supabaseQuery(
    `create schema if not exists private;
     create table if not exists ${TRACKING_TABLE} (
       name text primary key,
       applied_at timestamptz not null default now()
     );`,
  );
}

async function appliedMigrations() {
  const rows = await supabaseQuery(`select name from ${TRACKING_TABLE} order by name;`);
  return new Set((await rows).map((r) => r.name));
}

function listFiles() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d{4}_.+\.sql$/.test(f))
    .sort();
}

const [command = "apply", option] = process.argv.slice(2);

if (command === "new") {
  const name = option?.replace(/[^a-zA-Z0-9_-]/g, "_") || "migration";
  const files = listFiles();
  const nextNum = files.length > 0 ? Number(files[files.length - 1].slice(0, 4)) + 1 : 1;
  const file = join(MIGRATIONS_DIR, `${String(nextNum).padStart(4, "0")}_${name}.sql`);
  writeFileSync(file, `-- ${name}: опишите изменение\n`);
  console.log(`Создана миграция: ${file}`);
  process.exit(0);
}

const env = loadEnv();
PROJECT_REF = (env.VITE_SUPABASE_URL || "").replace(/^https?:\/\//, "").split(".")[0];
SUPABASE_ACCESS_TOKEN = env.SUPABASE_ACCESS_TOKEN;

if (!PROJECT_REF) fail("Не найден VITE_SUPABASE_URL в .env");
if (!SUPABASE_ACCESS_TOKEN) fail("Не найден SUPABASE_ACCESS_TOKEN в .env");

const files = listFiles();
let applied;
try {
  await ensureTrackingTable();
  applied = await appliedMigrations();
} catch (e) {
  console.error(`\n[Ошибка] Не удалось подключиться к Supabase: ${e.message}\n`);
  process.exit(1);
}

if (command === "status") {
  console.log("\nМиграции Supabase:\n");
  for (const f of files) console.log(`  ${applied.has(f) ? "[применена]" : "[    ---   ]"}  ${f}`);
  const pending = files.filter((f) => !applied.has(f));
  console.log(pending.length === 0 ? "\nВсё применено.\n" : `\nНе применено: ${pending.length}\n`);
  process.exit(0);
}

if (command === "import") {
  for (const f of files) await supabaseQuery(`insert into ${TRACKING_TABLE} (name) values ('${f}') on conflict (name) do nothing;`);
  console.log(`Помечено как применённые: ${files.length} файл(ов).`);
  process.exit(0);
}

const pending = files.filter((f) => !applied.has(f));
if (pending.length === 0) {
  console.log("Миграций для применения нет.");
  process.exit(0);
}

console.log(`Применяю ${pending.length} миграцию(и):`);
for (const f of pending) {
  const sql = readFileSync(join(MIGRATIONS_DIR, f), "utf8");
  try {
    await supabaseQuery(sql);
    await supabaseQuery(`insert into ${TRACKING_TABLE} (name) values ('${f}') on conflict (name) do nothing;`);
    console.log(`  [OK] ${f}`);
  } catch (e) {
    console.error(`  [FAIL] ${f}: ${e.message}`);
    console.error("   Миграция не помечена применённой — исправьте и запустите снова.");
    process.exit(1);
  }
}
console.log("Готово.");