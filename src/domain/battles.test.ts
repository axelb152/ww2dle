import * as fs from "fs";
import * as path from "path";
import { battles, battleCodesWithImage } from "./battles";

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
