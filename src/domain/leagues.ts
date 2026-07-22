export interface League {
  id: string;
  name: string;
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
  today: number | null;
}

export function standings(league: League, today?: number): Standing[] {
  return league.members
    .map((member) => {
      let total = 0;
      let daysPlayed = 0;
      let todayScore: number | null = null;
      for (const [day, byMember] of Object.entries(league.results)) {
        const guessCount = byMember[member];
        if (guessCount === undefined) {
          continue;
        }
        const score = scoreOf(guessCount);
        total += score;
        daysPlayed += 1;
        if (today !== undefined && Number(day) === today) {
          todayScore = score;
        }
      }
      return { member, total, daysPlayed, today: todayScore };
    })
    .sort((a, b) => b.total - a.total || a.member.localeCompare(b.member));
}
