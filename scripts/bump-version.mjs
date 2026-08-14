#!/usr/bin/env node
// Бамп patch-версии во всех файлах проекта (package.json, package-lock.json, tauri.conf.json).
//   node scripts/bump-version.mjs [major|minor|patch]

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PART = process.argv[2] || "patch";

const readJson = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const writeJson = (p, data) => writeFileSync(join(ROOT, p), JSON.stringify(data, null, 2) + "\n");

const pkgPath = join(ROOT, "package.json");
const pkg = read(pkgPath);
const [major, minor, patch] = pkg.version.split(".").map(Number);
const next =
  PART === "major" ? `${major + 1}.0.0` : PART === "minor" ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`;

pkg.version = next;
write(pkgPath, pkg);

const lockPath = join(ROOT, "package-lock.json");
if (existsSync(lockPath)) {
  const lock = read(lockPath);
  lock.version = next;
  if (lock.packages?.[""]) lock.packages[""].version = next;
  write(lockPath, lock);
}

const tauriPath = join(ROOT, "src-tauri", "tauri.conf.json");
if (existsSync(tauriPath)) {
  const conf = read(tauriPath);
  conf.version = next;
  write(tauriPath, conf);
}

function read(p) {
  return JSON.parse(readFileSync(p, "utf8"));
}

function write(p, data) {
  writeFileSync(p, JSON.stringify(data, null, 2) + "\n");
}

console.log(next);