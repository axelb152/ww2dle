import { Battle } from "./battles";
import { getHint } from "./hints";

const battle: Battle = {
  code: "midway",
  latitude: 28.2,
  longitude: -177.35,
  name: "Midway",
  year: 1942,
  theater: "Pacific",
};

describe("getHint", () => {
  it("returns no hint before the 3rd wrong guess", () => {
    expect(getHint(0, battle)).toBeNull();
    expect(getHint(1, battle)).toBeNull();
    expect(getHint(2, battle)).toBeNull();
  });

  it("returns the year after the 3rd and 4th wrong guess", () => {
    expect(getHint(3, battle)).toEqual({ type: "year", value: 1942 });
    expect(getHint(4, battle)).toEqual({ type: "year", value: 1942 });
  });

  it("returns the theater after the 5th wrong guess", () => {
    expect(getHint(5, battle)).toEqual({ type: "theater", value: "Pacific" });
    expect(getHint(6, battle)).toEqual({ type: "theater", value: "Pacific" });
  });
});
