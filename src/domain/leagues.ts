import { DateTime } from "luxon";

export const START_DATE = DateTime.fromISO("2026-08-01");

// The ww2dle day number for a "yyyy-MM-dd" day string. Clamped at 0: playing
// before START_DATE used to make an invalid Interval, whose length is NaN, and
// "#WW2dle #NaN" leaked into shared results.
export function dayNumber(dayString: string): number {
  return Math.max(
    0,
    Math.floor(DateTime.fromISO(dayString).diff(START_DATE, "day").days)
  );
}

// One player's result for one day, as stored in Supabase.
export interface Result {
  day: number;
  player: string;
  guesses: number; // 1..6 solved in N, 0 = failed (X/6)
}

export interface League {
  id: string;
  name: string;
  results: Result[];
}

// Locally-stored membership: which leagues I've joined + the name I play under.
export interface Membership {
  id: string;
  name: string;
}

// 8 for a 1st-guess solve, -1 per guess, floor of 3 for any attempt.
export function scoreOf(guesses: number): number {
  return guesses === 0 ? 3 : 9 - guesses;
}

export interface Standing {
  player: string;
  total: number;
  daysPlayed: number;
  wins: number;
  avgGuesses: number | null; // over solves only; null if never solved
  streak: number;
  places: number[]; // daily podium places (1..3), most recent day first
  today: number | null;
}

// "2026-08" for the month the given day number falls in.
export function monthOf(day: number): string {
  return START_DATE.plus({ days: day }).toFormat("yyyy-MM");
}

// Months with recorded results, newest first, always including the current one.
export function monthsOf(results: Result[]): string[] {
  const current = DateTime.now().toFormat("yyyy-MM");
  const months = new Set([current]);
  for (const { day } of results) {
    months.add(monthOf(day));
  }
  return Array.from(months).sort().reverse();
}

// results grouped by day: day -> player -> guesses
function byDay(
  results: Result[],
  month?: string
): Map<number, Record<string, number>> {
  const days = new Map<number, Record<string, number>>();
  for (const { day, player, guesses } of results) {
    if (month != null && monthOf(day) !== month) {
      continue;
    }
    const entry = days.get(day) ?? {};
    entry[player] = guesses;
    days.set(day, entry);
  }
  return new Map(Array.from(days.entries()).sort(([a], [b]) => a - b));
}

// Podium place (1..3) per player for one day; equal scores share a place.
function placesOn(dayResults: Record<string, number>): Record<string, number> {
  const scores = Object.entries(dayResults).map(
    ([player, guesses]) => [player, scoreOf(guesses)] as const
  );
  const distinct = Array.from(new Set(scores.map(([, score]) => score))).sort(
    (a, b) => b - a
  );
  const places: Record<string, number> = {};
  for (const [player, score] of scores) {
    const place = distinct.indexOf(score) + 1;
    if (place <= 3) {
      places[player] = place;
    }
  }
  return places;
}

export function standings(
  results: Result[],
  { month, today }: { month?: string; today?: number } = {}
): Standing[] {
  const days = byDay(results, month);
  const dayList = Array.from(days.keys());
  const places = new Map(
    dayList.map((day) => [day, placesOn(days.get(day) ?? {})])
  );
  const players = Array.from(
    new Set(dayList.flatMap((day) => Object.keys(days.get(day) ?? {})))
  );

  return players
    .map((player) => {
      let total = 0;
      let daysPlayed = 0;
      let wins = 0;
      let guessSum = 0;
      let todayScore: number | null = null;
      const playerPlaces: number[] = [];

      for (const day of dayList) {
        const guesses = days.get(day)?.[player];
        if (guesses === undefined) {
          continue;
        }
        total += scoreOf(guesses);
        daysPlayed += 1;
        if (guesses > 0) {
          wins += 1;
          guessSum += guesses;
        }
        const place = places.get(day)?.[player];
        if (place !== undefined) {
          playerPlaces.unshift(place);
        }
        if (day === today) {
          todayScore = scoreOf(guesses);
        }
      }

      // Consecutive recorded days solved, counting back from the league's
      // latest recorded day — a player who stops playing loses their streak.
      let streak = 0;
      for (const day of [...dayList].reverse()) {
        if ((days.get(day)?.[player] ?? 0) > 0) {
          streak += 1;
        } else {
          break;
        }
      }

      return {
        player,
        total,
        daysPlayed,
        wins,
        avgGuesses: wins === 0 ? null : guessSum / wins,
        streak,
        places: playerPlaces,
        today: todayScore,
      };
    })
    .sort((a, b) => b.total - a.total || a.player.localeCompare(b.player));
}
