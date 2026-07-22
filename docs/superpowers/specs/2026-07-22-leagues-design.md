# WW2dle Leagues — Design

## Problem

Add a "league" feature so friends can compete on daily ww2dle scores, inspired
by [Worldle's leagues](https://worldle.teuteuf.fr/leagues).

## Constraint

ww2dle is a **static gh-pages app with no backend** — all state lives in
`localStorage`. A real league (accounts, server-aggregated live leaderboard) is
out of scope. But even the real platforms (LeaderboardLe, which Worldle links
to) ingest scores by **pasting share text**. ww2dle already generates that
share text, so a no-backend league mirrors how the real thing actually works.

## Model: local "keeper" league

A league lives on **one device — the keeper's**. Friends send their daily
ww2dle share text (WhatsApp/etc.); the keeper pastes each one in, tagged to a
member. Standings are computed locally.

There is **no live sync**. A league is portable via an **export/import code** (a
base64-encoded snapshot in a `?league=` URL) — a snapshot to move or hand off a
league, explicitly *not* real-time sync.

Deliberately skipped (YAGNI, no backend to back them): accounts, join codes that
join a live server, charts, real-time updates.

## Scoring

Matches the Worldle 8-point scale, adapted to ww2dle's 6 guesses (no bonus
rounds):

```
points = solved ? (9 - guessCount) : 3
  guess 1 -> 8, 2 -> 7, 3 -> 6, 4 -> 5, 5 -> 4, 6 -> 3
  failed (X/6) -> 3   ("3 points for simply trying")
```

Decrements 1 per guess from 8, floors at 3 for any attempt. A member with no
recorded result for a day scores nothing that day (no entry).

## Data

`localStorage["leagues"]` holds `League[]`:

```ts
interface League {
  id: string;        // short random id; used in the export code
  name: string;
  members: string[];
  results: {         // keyed by ww2dle day number (from share text)
    [day: number]: { [member: string]: number };  // value = guessCount 1..6, 0 = failed (X)
  };
}
```

Storing the raw guess count (not points) keeps the scoring rule in one place and
lets the formula change without a data migration.

## Share-text parsing

ww2dle share text starts with `#WW2dle #<day> <n>/6<modifier>`. Parse with
`/#WW2dle #(\d+) ([1-6]|X)\/6/`:

- day = capture 1
- guessCount = capture 2; `X` -> 0 (failed)

Non-matching paste is rejected with a toast. Re-importing the same member+day
overwrites (idempotent).

## Components (follows existing panel + hook pattern)

- **`src/domain/leagues.ts`** — `League` type, `parseShareResult(text)`,
  `scoreOf(guessCount)`, `standings(league)` (sorted member totals). Pure, no
  React. **`leagues.test.ts`** covers parse / score / dedupe — the only
  non-trivial logic.
- **`src/hooks/useLeagues.ts`** — `localStorage` CRUD: `createLeague`,
  `deleteLeague`, `addMember`, `recordResult`, `importLeague`, mirroring
  `useGuesses` / `useSettings`.
- **`src/components/panels/Leagues.tsx`** — a `<Panel>`:
  - League list + "Create league" (name input).
  - Open a league -> standings table (rank, member, total, days played,
    today's points).
  - "Add result": paste share text + pick/enter member -> parse -> record.
  - "Add my result": one click, uses today's own guesses (passed in), no paste.
  - Export ("Copy league link" -> `?league=<base64>`), delete league, remove
    member.
- **`src/App.tsx`** — 🏆 header button opening the panel; on load, a `?league=`
  query param prompts an import.
- **i18n** — new keys in the en and fr translation resources.

## Testing

`leagues.test.ts` (Jest, already configured via react-scripts): parsing valid /
invalid share text, the scoring table incl. fail = 3, and record dedupe/
overwrite. Matches existing `hints.test.ts` / `battles.test.ts`.
