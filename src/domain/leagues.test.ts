import { DateTime } from "luxon";
import {
  Standing,
  dayNumber,
  decodeLeague,
  encodeLeague,
  League,
  parseShareResult,
  scoreOf,
  standings,
  monthOf,
  monthsOf,
  summarize,
  ranksOf,
} from "./leagues";

describe("parseShareResult", () => {
  it("parses a solved result", () => {
    expect(parseShareResult("#WW2dle #12 3/6\n🟩🟩\nhttps://x")).toEqual({
      day: 12,
      guessCount: 3,
    });
  });

  it("parses a failed result (X)", () => {
    expect(parseShareResult("#WW2dle #7 X/6 🙈")).toEqual({
      day: 7,
      guessCount: 0,
    });
  });

  it("ignores difficulty modifier emoji in the title", () => {
    expect(parseShareResult("#WW2dle #99 1/6 🌀")).toEqual({
      day: 99,
      guessCount: 1,
    });
  });

  it("rejects non-ww2dle text", () => {
    expect(parseShareResult("#Worldle #12 3/6")).toBeNull();
    expect(parseShareResult("just some text")).toBeNull();
  });
});

describe("scoreOf", () => {
  it("scores 8 down to 3 for solves in 1..6 guesses", () => {
    expect([1, 2, 3, 4, 5, 6].map(scoreOf)).toEqual([8, 7, 6, 5, 4, 3]);
  });

  it("gives 3 for a failed attempt", () => {
    expect(scoreOf(0)).toBe(3);
  });
});

describe("encode/decode round-trip", () => {
  it("survives a round-trip incl. non-latin1 names", () => {
    const league: League = {
      id: "x1",
      name: "Café Brigade ⚔️",
      members: ["Zoë", "Bob"],
      results: { 3: { Zoë: 2, Bob: 0 } },
    };
    expect(decodeLeague(encodeLeague(league))).toEqual(league);
  });

  it("returns null on garbage", () => {
    expect(decodeLeague("not-base64!!")).toBeNull();
    expect(decodeLeague(btoa("{}"))).toBeNull();
  });
});

describe("standings", () => {
  const league: League = {
    id: "a",
    name: "Test",
    members: ["Ada", "Bob"],
    results: {
      1: { Ada: 1, Bob: 6 }, // Ada 8, Bob 3
      2: { Ada: 4 }, // Ada 5, Bob absent
    },
  };

  it("totals scores and sorts by total desc", () => {
    expect(standings(league)).toMatchObject([
      { member: "Ada", total: 13, daysPlayed: 2 },
      { member: "Bob", total: 3, daysPlayed: 1 },
    ]);
  });

  it("reports today's score when the day is given", () => {
    expect(standings(league, { today: 2 })[0]).toMatchObject({
      member: "Ada",
      today: 5,
    });
    expect(standings(league, { today: 2 })[1]).toMatchObject({
      member: "Bob",
      today: null,
    });
  });

  it("counts wins, average guesses and streaks", () => {
    const l: League = {
      id: "b",
      name: "T",
      members: ["Ada"],
      results: { 1: { Ada: 2 }, 2: { Ada: 0 }, 3: { Ada: 4 }, 4: { Ada: 2 } },
    };
    expect(standings(l)[0]).toMatchObject({
      daysPlayed: 4,
      wins: 3,
      avgGuesses: (2 + 4 + 2) / 3,
      streak: 2, // days 3 and 4; day 2 was a fail
    });
  });

  it("has no average and no streak for a member who never solved", () => {
    const l: League = {
      id: "c",
      name: "T",
      members: ["Bob"],
      results: { 1: { Bob: 0 } },
    };
    expect(standings(l)[0]).toMatchObject({ avgGuesses: null, streak: 0 });
  });

  it("awards daily places, sharing a place on a tie", () => {
    const l: League = {
      id: "d",
      name: "T",
      members: ["Ada", "Bob", "Cy", "Di"],
      results: { 1: { Ada: 1, Bob: 1, Cy: 3, Di: 6 } },
    };
    const byMember = Object.fromEntries(
      standings(l).map((s) => [s.member, s.places])
    );
    expect(byMember).toEqual({ Ada: [1], Bob: [1], Cy: [2], Di: [3] });
  });

  it("keeps places newest-day-first", () => {
    const l: League = {
      id: "e",
      name: "T",
      members: ["Ada", "Bob"],
      results: { 1: { Ada: 6, Bob: 1 }, 2: { Ada: 1, Bob: 6 } },
    };
    expect(standings(l)[0].places).toEqual([1, 2]); // day 2 first
  });

  it("scopes totals to one month", () => {
    const l: League = {
      id: "f",
      name: "T",
      members: ["Ada"],
      // day 0 = 2026-08-01, day 40 = 2026-09-10
      results: { 0: { Ada: 1 }, 40: { Ada: 2 } },
    };
    expect(standings(l, { month: "2026-08" })[0]).toMatchObject({
      total: 8,
      daysPlayed: 1,
    });
    expect(standings(l, { month: "2026-09" })[0]).toMatchObject({
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
    const l: League = {
      id: "g",
      name: "T",
      members: [],
      results: { 0: {}, 40: {} },
    };
    expect(monthsOf(l)).toEqual(
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
    // Regression: an invalid Interval gave NaN, shipping "#WW2dle #NaN 6/6".
    expect(dayNumber("2026-07-31")).toEqual(0);
    expect(dayNumber("2020-01-01")).toEqual(0);
  });

  it("produces a day number that parseShareResult can read back", () => {
    const text = `#WW2dle #${dayNumber("2026-07-31")} 6/6`;
    expect(parseShareResult(text)).toEqual({ day: 0, guessCount: 6 });
  });
});

describe("summarize", () => {
  it("totals games and points and takes the longest streak", () => {
    const league: League = {
      id: "s",
      name: "T",
      members: ["Ada", "Bob"],
      // Ada solves both days (streak 2), Bob fails day 1 then solves day 2.
      results: { 0: { Ada: 1, Bob: 0 }, 1: { Ada: 2, Bob: 3 } },
    };
    // Ada 8 + 7 = 15, Bob 3 + 6 = 9.
    expect(summarize(standings(league))).toEqual({
      games: 4,
      points: 24,
      bestStreak: 2,
    });
  });

  it("is all zeros for an empty league", () => {
    expect(summarize([])).toEqual({ games: 0, points: 0, bestStreak: 0 });
  });
});

describe("ranksOf", () => {
  const row = (member: string, total: number) =>
    ({ member, total } as Standing);

  it("shares a rank between equal totals and closes up after them", () => {
    expect(
      ranksOf([row("Ada", 40), row("Bob", 40), row("Cy", 31), row("Di", 12)])
    ).toEqual([1, 1, 2, 3]);
  });

  it("ranks a clean run 1..n", () => {
    expect(ranksOf([row("Ada", 9), row("Bob", 8), row("Cy", 7)])).toEqual([
      1, 2, 3,
    ]);
  });

  it("gives every member rank 1 when nobody has played", () => {
    expect(ranksOf([row("Ada", 0), row("Bob", 0)])).toEqual([1, 1]);
  });
});
