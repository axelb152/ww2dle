import {
  decodeLeague,
  encodeLeague,
  League,
  parseShareResult,
  scoreOf,
  standings,
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
    expect(standings(league)).toEqual([
      { member: "Ada", total: 13, daysPlayed: 2, today: null },
      { member: "Bob", total: 3, daysPlayed: 1, today: null },
    ]);
  });

  it("reports today's score when the day is given", () => {
    expect(standings(league, 2)[0]).toMatchObject({ member: "Ada", today: 5 });
    expect(standings(league, 2)[1]).toMatchObject({
      member: "Bob",
      today: null,
    });
  });
});
