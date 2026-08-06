const MAX_DISTANCE_ON_EARTH = 20_000_000;

export type Direction =
  | "S"
  | "W"
  | "NNE"
  | "NE"
  | "ENE"
  | "E"
  | "ESE"
  | "SE"
  | "SSE"
  | "SSW"
  | "SW"
  | "WSW"
  | "WNW"
  | "NW"
  | "NNW"
  | "N";

export function computeProximityPercent(distance: number): number {
  if (distance <= 0) {
    return 100;
  }

  // ponytail: sqrt curve instead of linear. Battles cluster by theatre, so on a
  // linear half-Earth scale every in-theatre guess read 90-100%.
  const ratio =
    Math.min(distance, MAX_DISTANCE_ON_EARTH) / MAX_DISTANCE_ON_EARTH;
  const percent = Math.round((1 - Math.sqrt(ratio)) * 100);

  // 100% is reserved for the correct battle.
  return Math.min(percent, 99);
}

export function generateSquareCharacters(
  proximity: number,
  theme: "light" | "dark"
): string[] {
  const characters = new Array<string>(5);
  const greenSquareCount = Math.floor(proximity / 20);
  const yellowSquareCount = proximity - greenSquareCount * 20 >= 10 ? 1 : 0;

  characters.fill("🟩", 0, greenSquareCount);
  characters.fill("🟨", greenSquareCount, greenSquareCount + yellowSquareCount);
  characters.fill(
    theme === "light" ? "⬜" : "⬛",
    greenSquareCount + yellowSquareCount
  );

  return characters;
}

export function formatDistance(
  distanceInMeters: number,
  distanceUnit: "km" | "miles"
) {
  const distanceInKm = distanceInMeters / 1000;

  return distanceUnit === "km"
    ? `${Math.round(distanceInKm)}km`
    : `${Math.round(distanceInKm * 0.621371)}mi`;
}
