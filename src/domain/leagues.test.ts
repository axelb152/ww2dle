import { DateTime } from "luxon";
import {
  dayNumber,
  monthOf,
  monthsOf,
  Result,
  scoreOf,
  standings,
} from "./leagues";

describe("scoreOf", () => {
  it("scores 8 down to 3 for solves in 1..6 guesses", () => {
    expect([1, 2, 3, 4, 5, 6].map(scoreOf)).toEqual([8, 7, 6, 5, 4, 3]);
  });

  it("gives 3 for a failed attempt", () => {
    expect(scoreOf(0)).toBe(3);
  });
});

describe("standings", () => {
  const results: Result[] = [
    { day: 1, player: "Ada", guesses: 1 }, // 8
    { day: 1, player: "Bob", guesses: 6 }, // 3
    { day: 2, player: "Ada", guesses: 4 }, // 5
  ];

  it("totals scores per player and sorts by total desc", () => {
    expect(standings(results)).toMatchObject([
      { player: "Ada", total: 13, daysPlayed: 2 },
      { player: "Bob", total: 3, daysPlayed: 1 },
    ]);
  });

  it("reports today's score when the day is given", () => {
    expect(standings(results, { today: 2 })[0]).toMatchObject({
      player: "Ada",
      today: 5,
    });
    expect(standings(results, { today: 2 })[1]).toMatchObject({
      player: "Bob",
      today: null,
    });
  });

  it("counts wins, average guesses and streaks", () => {
    const r: Result[] = [
      { day: 1, player: "Ada", guesses: 2 },
      { day: 2, player: "Ada", guesses: 0 },
      { day: 3, player: "Ada", guesses: 4 },
      { day: 4, player: "Ada", guesses: 2 },
    ];
    expect(standings(r)[0]).toMatchObject({
      daysPlayed: 4,
      wins: 3,
      avgGuesses: (2 + 4 + 2) / 3,
      streak: 2, // days 3 and 4; day 2 was a fail
    });
  });

  it("has no average and no streak for a player who never solved", () => {
    expect(standings([{ day: 1, player: "Bob", guesses: 0 }])[0]).toMatchObject(
      { avgGuesses: null, streak: 0 }
    );
  });

  it("awards daily places, sharing a place on a tie", () => {
    const r: Result[] = [
      { day: 1, player: "Ada", guesses: 1 },
      { day: 1, player: "Bob", guesses: 1 },
      { day: 1, player: "Cy", guesses: 3 },
      { day: 1, player: "Di", guesses: 6 },
    ];
    const byPlayer = Object.fromEntries(
      standings(r).map((s) => [s.player, s.places])
    );
    expect(byPlayer).toEqual({ Ada: [1], Bob: [1], Cy: [2], Di: [3] });
  });

  it("keeps places newest-day-first", () => {
    const r: Result[] = [
      { day: 1, player: "Ada", guesses: 6 },
      { day: 1, player: "Bob", guesses: 1 },
      { day: 2, player: "Ada", guesses: 1 },
      { day: 2, player: "Bob", guesses: 6 },
    ];
    expect(standings(r)[0].places).toEqual([1, 2]); // day 2 first
  });

  it("scopes totals to one month", () => {
    // day 0 = 2026-08-01, day 40 = 2026-09-10
    const r: Result[] = [
      { day: 0, player: "Ada", guesses: 1 },
      { day: 40, player: "Ada", guesses: 2 },
    ];
    expect(standings(r, { month: "2026-08" })[0]).toMatchObject({
      total: 8,
      daysPlayed: 1,
    });
    expect(standings(r, { month: "2026-09" })[0]).toMatchObject({
      total: 7,
      daysPlayed: 1,
    });
  });
});

describe("months", () => {
  it("maps day numbers to their month", () => {
    expect(monthOf(0)).toBe("2026-08");
    expect(monthOf(30)).toBe("2026-08");
    expect(monthOf(31)).toBe("2026-09");
  });

  it("lists recorded months newest first, incl. the current one", () => {
    const now = DateTime.now().toFormat("yyyy-MM");
    const r: Result[] = [
      { day: 0, player: "Ada", guesses: 1 },
      { day: 40, player: "Ada", guesses: 1 },
    ];
    expect(monthsOf(r)).toEqual(
      Array.from(new Set([now, "2026-09", "2026-08"]))
        .sort()
        .reverse()
    );
  });
});

describe("dayNumber", () => {
  it("counts days from launch", () => {
    expect(dayNumber("2026-08-01")).toEqual(0);
    expect(dayNumber("2026-08-06")).toEqual(5);
  });

  it("clamps pre-launch days to 0 instead of NaN", () => {
    expect(dayNumber("2026-07-31")).toEqual(0);
    expect(dayNumber("2020-01-01")).toEqual(0);
  });
});
