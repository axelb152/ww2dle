/* eslint-disable no-console */
// Sanity checks for the WW2dle dataset.
// Run with: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/check-battles.ts
import { battles, Theater } from "../src/domain/battles";

let failures = 0;

function check(condition: boolean, message: string) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL: ${message}`);
  }
}

check(battles.length === 120, `expected 120 battles, got ${battles.length}`);

const codes = battles.map((b) => b.code);
check(
  new Set(codes).size === codes.length,
  `duplicate codes: ${codes
    .filter((c, i) => codes.indexOf(c) !== i)
    .join(", ")}`
);

for (const battle of battles) {
  check(/^[a-z0-9-]+$/.test(battle.code), `invalid code slug: ${battle.code}`);
  check(
    battle.year >= 1939 && battle.year <= 1945,
    `${battle.code}: year ${battle.year} out of 1939-1945`
  );
  check(
    battle.latitude >= -90 && battle.latitude <= 90,
    `${battle.code}: bad latitude ${battle.latitude}`
  );
  check(
    battle.longitude >= -180 && battle.longitude <= 180,
    `${battle.code}: bad longitude ${battle.longitude}`
  );
}

const counts = new Map<Theater, number>();
for (const battle of battles) {
  counts.set(battle.theater, (counts.get(battle.theater) ?? 0) + 1);
}
console.log("Battles per theater:");
for (const [theater, count] of counts) {
  console.log(`  ${theater}: ${count}`);
}

const quota: [Theater[], number][] = [
  [["Eastern Front"], 30],
  [["Pacific"], 25],
  [["Western Europe"], 20],
  [["North Africa", "Mediterranean"], 10],
  [["Asia"], 10],
  [["Atlantic"], 1],
  [["Scandinavia"], 1],
];
for (const [theaters, min] of quota) {
  const total = theaters.reduce((sum, t) => sum + (counts.get(t) ?? 0), 0);
  check(
    total >= min,
    `quota not met for ${theaters.join("+")}: ${total} < ${min}`
  );
}

if (failures > 0) {
  console.error(`${failures} check(s) failed`);
  process.exit(1);
}
console.log(`All checks passed (${battles.length} battles).`);
