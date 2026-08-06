import { computeProximityPercent } from "./geography";

describe("computeProximityPercent", () => {
  it("only the correct battle scores 100%", () => {
    expect(computeProximityPercent(0)).toEqual(100);
    expect(computeProximityPercent(1)).toBeLessThan(100);
    expect(computeProximityPercent(64_000)).toBeLessThan(100);
  });

  it("spreads in-theatre distances instead of bunching them at 90-100%", () => {
    // The Bir Hakeim round: these all read 90-100% on the old linear scale.
    expect(computeProximityPercent(64_000)).toEqual(94);
    expect(computeProximityPercent(328_000)).toEqual(87);
    expect(computeProximityPercent(1_256_000)).toEqual(75);
    expect(computeProximityPercent(1_962_000)).toEqual(69);
  });

  it("decreases monotonically and bottoms out at 0%", () => {
    let previous = 100;
    for (let km = 0; km <= 20_000; km += 250) {
      const percent = computeProximityPercent(km * 1000);
      expect(percent).toBeLessThanOrEqual(previous);
      previous = percent;
    }
    expect(computeProximityPercent(20_000_000)).toEqual(0);
    expect(computeProximityPercent(30_000_000)).toEqual(0);
  });
});
