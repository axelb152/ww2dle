import { DateTime } from "luxon";
import seedrandom from "seedrandom";
import { Battle, battles } from "./battles";

export const START_DATE = DateTime.fromISO("2026-08-01");

// The ww2dle day number for a "yyyy-MM-dd" day string. Clamped at 0: playing
// before START_DATE used to make an invalid Interval, whose length is NaN, and
// "#WW2dle #NaN" leaked into shared results.
export function dayNumber(dayString: string): number {
  return Math.max(
    0,
    Math.floor(DateTime.fromISO(dayString).diff(START_DATE, "day").days)
  );
}

// Anniversary pins: on these dates the daily battle is forced to the given
// battle code, so the puzzle lands on the anniversary of the battle itself
// (e.g. Pearl Harbor on Dec 7, D-Day on Jun 6). Keys are yyyy-MM-dd day
// strings, values are codes from src/domain/battles.ts. Codes must be unique —
// deckForCycle applies a pin by swapping, and two pins on one battle would
// undo each other.
export const forcedBattles: Record<string, string> = {
  "2026-09-01": "westerplatte", // invasion of Poland began 1939-09-01
  "2026-10-23": "el-alamein", // Second El Alamein opened 1942-10-23
  "2026-12-07": "pearl-harbor", // attack on Pearl Harbor 1941-12-07
  "2026-12-16": "bastogne", // Battle of the Bulge began 1944-12-16
  "2027-02-19": "iwo-jima", // Iwo Jima landings 1945-02-19
  "2027-04-01": "okinawa", // Okinawa landings 1945-04-01
  "2027-06-04": "midway", // Battle of Midway began 1942-06-04
  "2027-06-06": "normandy", // D-Day 1944-06-06
  "2027-07-05": "kursk", // Battle of Kursk began 1943-07-05
  "2027-08-23": "stalingrad", // Battle of Stalingrad began 1942-08-23
};

// One cycle deals every battle exactly once, so nothing repeats until the whole
// dataset has been played.
export const CYCLE_LENGTH = battles.length;

// alea barely mixes its seed, so "2026-09-21" and "2026-09-22" produced
// near-identical first draws — which is why the same battle was served four
// days running. Avalanche the seed with FNV-1a first so neighbouring inputs
// land far apart in the output space.
function hashSeed(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function seededRandom(seed: string): () => number {
  return seedrandom.alea(String(hashSeed(seed)));
}

const deckCache = new Map<number, Battle[]>();

// The battle order for one cycle: a deterministic Fisher-Yates shuffle of the
// whole dataset, dealt one per day.
function deckForCycle(cycleIndex: number): Battle[] {
  const cached = deckCache.get(cycleIndex);
  if (cached != null) {
    return cached;
  }

  const random = seededRandom(`cycle-${cycleIndex}`);
  const deck = battles.slice();

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  // Pins are applied as swaps, which keeps the deck a permutation: whatever
  // held the anniversary's slot takes the pinned battle's old place, so the
  // cycle still deals every battle exactly once.
  for (const [pinnedDay, code] of Object.entries(forcedBattles)) {
    const pinnedDayNumber = dayNumber(pinnedDay);
    if (Math.floor(pinnedDayNumber / CYCLE_LENGTH) !== cycleIndex) {
      continue;
    }

    const slot = pinnedDayNumber % CYCLE_LENGTH;
    const dealtAt = deck.findIndex((battle) => battle.code === code);
    if (dealtAt === -1) {
      continue;
    }

    [deck[slot], deck[dealtAt]] = [deck[dealtAt], deck[slot]];
  }

  deckCache.set(cycleIndex, deck);
  return deck;
}

export function battleForDay(dayString: string): Battle {
  const day = dayNumber(dayString);
  return deckForCycle(Math.floor(day / CYCLE_LENGTH))[day % CYCLE_LENGTH];
}

// Rotation mode's angle. Seeded separately from the battle pick: both used to
// read the first value of alea(dayString), which made the displayed angle a
// direct function of the answer's index in the dataset.
export function rotationAngleForDay(dayString: string): number {
  return seededRandom(`rotation-${dayString}`)() * 360;
}
