import * as fs from "fs";
import * as path from "path";
import {
  battles,
  battleCodesWithImage,
  battleCountry,
  countryFlag,
  countryNames,
  filterBattles,
} from "./battles";

const codes = (query: string) =>
  filterBattles("en", query).map((battle) => battle.code);

const THEATERS = [
  "Western Europe",
  "Eastern Front",
  "North Africa",
  "Mediterranean",
  "Pacific",
  "Asia",
  "Atlantic",
  "Scandinavia",
];

describe("battles dataset", () => {
  it("contains 120 battles", () => {
    expect(battles).toHaveLength(120);
  });

  it("has unique codes", () => {
    const codes = battles.map((battle) => battle.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("has valid slug codes", () => {
    for (const battle of battles) {
      expect(battle.code).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("has coordinates in valid ranges", () => {
    for (const battle of battles) {
      expect(battle.latitude).toBeGreaterThanOrEqual(-90);
      expect(battle.latitude).toBeLessThanOrEqual(90);
      expect(battle.longitude).toBeGreaterThanOrEqual(-180);
      expect(battle.longitude).toBeLessThanOrEqual(180);
    }
  });

  it("has years within 1939-1945", () => {
    for (const battle of battles) {
      expect(battle.year).toBeGreaterThanOrEqual(1939);
      expect(battle.year).toBeLessThanOrEqual(1945);
    }
  });

  it("has theaters matching the union type", () => {
    for (const battle of battles) {
      expect(THEATERS).toContain(battle.theater);
    }
  });

  it("lists every code in battleCodesWithImage", () => {
    expect(battleCodesWithImage).toEqual(battles.map((battle) => battle.code));
  });

  it("has a present-day country (alpha-2) for every battle", () => {
    for (const battle of battles) {
      expect(battleCountry[battle.code]).toMatch(/^[A-Z]{2}$/);
    }
  });

  it("has an English name for every battle country", () => {
    for (const iso of Object.values(battleCountry)) {
      expect(countryNames[iso]?.length).toBeGreaterThan(0);
    }
  });

  it("renders a flag emoji from an alpha-2 code", () => {
    expect(countryFlag("US")).toBe("🇺🇸");
  });

  it("has an image file on disk for every battle", () => {
    for (const battle of battles) {
      const imagePath = path.join(
        __dirname,
        "..",
        "..",
        "public",
        "images",
        "battles",
        battle.code,
        "battle.png"
      );
      expect(fs.existsSync(imagePath)).toBe(true);
    }
  });
});

describe("filterBattles", () => {
  it("lists every battle for an empty query", () => {
    expect(filterBattles("en", "")).toEqual(battles);
  });

  it("still matches battle names anywhere in the name", () => {
    expect(codes("alamein")).toEqual(["el-alamein"]);
  });

  it("lists the battles fought in a typed country", () => {
    expect(codes("Japan")).toEqual(["iwo-jima", "okinawa"]);
    expect(codes("JAPAN")).toEqual(["iwo-jima", "okinawa"]);
  });

  it("matches the start of a country name while typing", () => {
    const germany = battles
      .filter((battle) => battleCountry[battle.code] === "DE")
      .map((battle) => battle.code);
    expect(codes("Ger")).toEqual(germany);
  });

  it("matches country aliases", () => {
    expect(codes("Burma")).toEqual(["yenangyaung", "meiktila", "admin-box"]);
  });

  it("puts name matches first and lists each battle once", () => {
    expect(codes("Greece")).toEqual(["greece", "cape-matapan", "crete"]);
    expect(codes("Malta")).toEqual(["malta"]);
  });

  it("ranks an exact country match above a partial one", () => {
    // "uk" is also the start of Ukraine (and inside Tobruk's name).
    expect(codes("UK").slice(0, 3)).toEqual([
      "tobruk",
      "battle-of-britain",
      "kiev-1941",
    ]);
  });

  it("doesn't match a country by the middle of its name", () => {
    expect(codes("many")).toEqual([]);
  });
});
