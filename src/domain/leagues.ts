import { DateTime } from "luxon";

const START_DATE = DateTime.fromISO("2026-08-01");

// The ww2dle day number for a "yyyy-MM-dd" day string. Clamped at 0: playing
// before START_DATE used to make an invalid Interval, whose length is NaN, and
// "#WW2dle #NaN" leaked into shared results.
export function dayNumber(dayString: string): number {
  return Math.max(
    0,
    Math.floor(DateTime.fromISO(dayString).diff(START_DATE, "day").days)
  );
}

// Worldle caps a league at 25; same cap keeps standings readable on a phone.
export const MAX_MEMBERS = 25;

export interface League {
  id: string;
  name: string;
  emoji?: string;
  members: string[];
  // keyed by ww2dle day number; value = guessCount 1..6, 0 = failed (X/6)
  results: Record<number, Record<string, number>>;
}

export interface ParsedResult {
  day: number;
  guessCount: number; // 0 = failed
}

const SHARE_RE = /#WW2dle #(\d+) ([1-6]|X)\/6/;

export function parseShareResult(text: string): ParsedResult | null {
  const match = text.match(SHARE_RE);
  if (match == null) {
    return null;
  }
  return {
    day: parseInt(match[1], 10),
    guessCount: match[2] === "X" ? 0 : parseInt(match[2], 10),
  };
}

// 8 for a 1st-guess solve, -1 per guess, floor of 3 for any attempt.
export function scoreOf(guessCount: number): number {
  return guessCount === 0 ? 3 : 9 - guessCount;
}

// base64 round-trip via UTF-8, so league/member names with non-latin1 chars survive.
export function encodeLeague(league: League): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(league))));
}

export function decodeLeague(code: string): League | null {
  try {
    const league = JSON.parse(decodeURIComponent(escape(atob(code))));
    if (
      typeof league?.id === "string" &&
      typeof league?.name === "string" &&
      Array.isArray(league?.members) &&
      typeof league?.results === "object"
    ) {
      return league;
    }
  } catch {
    // fall through
  }
  return null;
}

export interface Standing {
  member: string;
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
export function monthsOf(league: League): string[] {
  const current = DateTime.now().toFormat("yyyy-MM");
  const months = new Set([current]);
  for (const day of Object.keys(league.results)) {
    months.add(monthOf(Number(day)));
  }
  return Array.from(months).sort().reverse();
}

function scopedDays(league: League, month?: string): number[] {
  return Object.keys(league.results)
    .map(Number)
    .filter((day) => month == null || monthOf(day) === month)
    .sort((a, b) => a - b);
}

// Podium place (1..3) per member for one day; equal scores share a place.
function placesOn(league: League, day: number): Record<string, number> {
  const scores = Object.entries(league.results[day] ?? {}).map(
    ([member, guessCount]) => [member, scoreOf(guessCount)] as const
  );
  const distinct = Array.from(new Set(scores.map(([, score]) => score))).sort(
    (a, b) => b - a
  );
  const places: Record<string, number> = {};
  for (const [member, score] of scores) {
    const place = distinct.indexOf(score) + 1;
    if (place <= 3) {
      places[member] = place;
    }
  }
  return places;
}

export function standings(
  league: League,
  { month, today }: { month?: string; today?: number } = {}
): Standing[] {
  const days = scopedDays(league, month);
  const places = new Map(days.map((day) => [day, placesOn(league, day)]));

  return league.members
    .map((member) => {
      let total = 0;
      let daysPlayed = 0;
      let wins = 0;
      let guessSum = 0;
      let todayScore: number | null = null;
      const memberPlaces: number[] = [];

      for (const day of days) {
        const guessCount = league.results[day][member];
        if (guessCount === undefined) {
          continue;
        }
        total += scoreOf(guessCount);
        daysPlayed += 1;
        if (guessCount > 0) {
          wins += 1;
          guessSum += guessCount;
        }
        const place = places.get(day)?.[member];
        if (place !== undefined) {
          memberPlaces.unshift(place);
        }
        if (day === today) {
          todayScore = scoreOf(guessCount);
        }
      }

      // Consecutive recorded days solved, counting back from the league's
      // latest recorded day — a member who stops playing loses their streak.
      let streak = 0;
      for (const day of [...days].reverse()) {
        if ((league.results[day][member] ?? 0) > 0) {
          streak += 1;
        } else {
          break;
        }
      }

      return {
        member,
        total,
        daysPlayed,
        wins,
        avgGuesses: wins === 0 ? null : guessSum / wins,
        streak,
        places: memberPlaces,
        today: todayScore,
      };
    })
    .sort((a, b) => b.total - a.total || a.member.localeCompare(b.member));
}

export interface LeagueSummary {
  games: number;
  points: number;
  bestStreak: number;
}

// League-wide totals over already-scoped standings, for the detail header strip.
export function summarize(rows: Standing[]): LeagueSummary {
  return {
    games: rows.reduce((sum, s) => sum + s.daysPlayed, 0),
    points: rows.reduce((sum, s) => sum + s.total, 0),
    bestStreak: rows.reduce((best, s) => Math.max(best, s.streak), 0),
  };
}

// Overall rank per standing, positionally aligned with the input. Equal totals
// share a rank and the next distinct total takes the following one (1,1,2), the
// same dense scheme `placesOn` uses for the daily podium.
export function ranksOf(rows: Standing[]): number[] {
  const distinct = Array.from(new Set(rows.map((s) => s.total))).sort(
    (a, b) => b - a
  );
  return rows.map((s) => distinct.indexOf(s.total) + 1);
}
