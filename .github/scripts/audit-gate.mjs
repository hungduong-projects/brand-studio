#!/usr/bin/env node
// Dependency audit gate: fails when `npm audit` reports any advisory, at any severity and in dev
// dependencies too, unless .github/audit-allowlist.txt names it. The allowlist is for advisories
// with no patched release: one ID per line, then the reason. An allowlisted advisory fails again as
// soon as npm can fix it in range.
// Usage: node .github/scripts/audit-gate.mjs [project-dir]   (run after `npm ci`)
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const dir = process.argv[2] ?? ".";
const listFile = new URL("../audit-allowlist.txt", import.meta.url);
const allow = new Set(
  existsSync(listFile)
    ? readFileSync(listFile, "utf8")
        .split("\n")
        .map((line) => line.trim().split(/\s+/)[0])
        .filter((id) => id && !id.startsWith("#"))
    : [],
);

let out;
try {
  out = execFileSync("npm", ["audit", "--json"], { cwd: dir, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
} catch (err) {
  out = err.stdout; // npm audit exits 1 whenever it finds an advisory
}
let report;
try {
  report = JSON.parse(out);
} catch {
  report = {};
}
if (!report.vulnerabilities) {
  console.error(`npm audit returned no report for ${dir}: ${report.error?.summary ?? "empty or invalid output"}`);
  process.exit(1);
}

const open = new Map();
const seen = new Set();
for (const vuln of Object.values(report.vulnerabilities)) {
  for (const via of vuln.via) {
    if (typeof via !== "object") continue; // a string names the dependency it inherits from
    const id = via.url.split("/").pop();
    seen.add(id);
    const line = `${via.severity} ${via.name} ${via.range} ${id} ${via.title}`;
    if (!allow.has(id)) open.set(id, line);
    else if (vuln.fixAvailable === true) open.set(id, `${line} (allowlisted, but npm can now fix it in range)`);
  }
}
for (const id of allow) if (!seen.has(id)) console.log(`note: allowlist entry ${id} no longer appears in ${dir}`);

if (open.size) {
  console.error(`${open.size} open advisories in ${dir}:\n${[...open.values()].join("\n")}`);
  console.error("Fix each one (in-range update, direct upgrade, or an override to the patched release),");
  console.error("or add it to .github/audit-allowlist.txt only if it has no patched release.");
  process.exit(1);
}
console.log(`${dir}: no open advisories (${allow.size} allowlisted with no patched release)`);
