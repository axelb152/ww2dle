import { Battle, Theater } from "./battles";

export type Hint =
  | { type: "year"; value: number }
  | { type: "theater"; value: Theater };

// Built-in hints: the battle's year after the 3rd wrong guess, and its
// theater after the 5th. `wrongGuessCount` is the number of guesses made
// so far without finding the answer.
export function getHint(wrongGuessCount: number, battle: Battle): Hint | null {
  if (wrongGuessCount >= 5) {
    return { type: "theater", value: battle.theater };
  }
  if (wrongGuessCount >= 3) {
    return { type: "year", value: battle.year };
  }
  return null;
}
