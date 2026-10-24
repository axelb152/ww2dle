import { DateTime } from "luxon";
import { battles } from "./battles";
import {
  battleForDay,
  CYCLE_LENGTH,
  dayNumber,
  forcedBattles,
  rotationAngleForDay,
  START_DATE,
} from "./schedule";

function dayStringsFrom(start: DateTime, count: number): string[] {
  return Array.from({ length: count }, (_, offset) =>
    start.plus({ days: offset }).toFormat("yyyy-MM-dd")
  );
}

describe("battleForDay", () => {
  it("does not serve the same battle on consecutive days", () => {
    // The reported bug: alea's weak seed mixing gave sequential date strings
    // near-identical first draws, so 20-23 Sep 2026 all resolved to Taranto and
    // 24-27 Sep all resolved to Lvov. Twenty years of days, no repeat runs.
    const days = dayStringsFrom(START_DATE, 365 * 20);
    const repeats = days
      .map((day, index) => ({ day, previous: days[index - 1] }))
      .slice(1)
      .filter(
        ({ day, previous }) =>
          battleForDay(day).code === battleForDay(previous).code
      );

    expect(repeats).toEqual([]);
  });

  it("serves three different battles across the dates that regressed", () => {
    const codes = ["2026-09-21", "2026-09-22", "2026-09-23"].map(
      (day) => battleForDay(day).code
    );

    expect(new Set(codes).size).toEqual(3);
  });

  it("deals every battle exactly once per cycle", () => {
    for (let cycle = 0; cycle < 20; cycle++) {
      const codes = Array.from({ length: CYCLE_LENGTH }, (_, slot) =>
        battleForDay(
          START_DATE.plus({ days: cycle * CYCLE_LENGTH + slot }).toFormat(
            "yyyy-MM-dd"
          )
        ).code
      );

      expect(new Set(codes).size).toEqual(CYCLE_LENGTH);
    }
  });

  it("lands pinned battles on their anniversaries", () => {
    for (const [day, code] of Object.entries(forcedBattles)) {
      expect([day, battleForDay(day).code]).toEqual([day, code]);
    }
  });

  it("only ever serves battles from the dataset", () => {
    const codes = new Set(battles.map((battle) => battle.code));

    for (const day of dayStringsFrom(START_DATE, 500)) {
      expect(codes.has(battleForDay(day).code)).toBe(true);
    }
  });
});

describe("forcedBattles", () => {
  it("pins each battle at most once", () => {
    const codes = Object.values(forcedBattles);

    expect(new Set(codes).size).toEqual(codes.length);
  });

  it("only pins codes that exist in the dataset", () => {
    const codes = new Set(battles.map((battle) => battle.code));
    const unknown = Object.values(forcedBattles).filter(
      (code) => !codes.has(code)
    );

    expect(unknown).toEqual([]);
  });
});

describe("rotationAngleForDay", () => {
  it("stays inside a single turn", () => {
    for (const day of dayStringsFrom(START_DATE, 200)) {
      const angle = rotationAngleForDay(day);
      expect(angle).toBeGreaterThanOrEqual(0);
      expect(angle).toBeLessThan(360);
    }
  });

  it("does not encode the answer's index in the dataset", () => {
    // Both values used to come from alea(dayString)'s first draw, so the angle
    // was exactly (index / CYCLE_LENGTH) * 360 and gave the battle away.
    const days = dayStringsFrom(START_DATE, 1200);
    const leaks = days.filter((day) => {
      const implied = Math.floor(
        rotationAngleForDay(day) / (360 / CYCLE_LENGTH)
      );
      return (
        implied ===
        battles.findIndex((battle) => battle.code === battleForDay(day).code)
      );
    });

    // Chance alone puts this near 1200 / 120 = 10; the old coupling made it all
    // 1200. Anything under 40 means the two draws are independent.
    expect(leaks.length).toBeLessThan(40);
  });

  it("moves the angle meaningfully from one day to the next", () => {
    const days = dayStringsFrom(START_DATE, 365);
    const deltas = days
      .slice(1)
      .map((day, index) =>
        Math.abs(rotationAngleForDay(day) - rotationAngleForDay(days[index]))
      );
    const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;

    // Weak seed mixing kept consecutive angles within a fraction of a degree.
    // Independent draws average ~120 degrees apart.
    expect(mean).toBeGreaterThan(60);
  });
});

describe("dayNumber", () => {
  it("counts days from the launch date", () => {
    expect(dayNumber("2026-08-01")).toEqual(0);
    expect(dayNumber("2026-08-06")).toEqual(5);
  });

  it("clamps days before launch to zero", () => {
    expect(dayNumber("2026-07-31")).toEqual(0);
  });
});
