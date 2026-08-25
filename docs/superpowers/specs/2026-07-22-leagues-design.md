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

## Update 2026-08-24 — Worldle parity pass

Shipped on top of the above; the scoring rule and storage shape are unchanged,
so no migration. See also
[2026-08-24-leagues-backend.md](./2026-08-24-leagues-backend.md) for what still
needs a server.

- **Monthly scope.** `monthOf(day)` maps a ww2dle day number to `"yyyy-MM"`;
  `monthsOf(league)` lists recorded months newest-first including the current
  one. `standings(league, { month?, today? })` replaced
  `standings(league, today?)`. The panel defaults to the current month, like
  Worldle; all-time is a `<select>` option.
- **Daily medals.** `Standing.places` holds that member's podium places (1..3)
  within the scoped days, newest day first. Equal scores share a place. The UI
  shows up to 5 medals plus an ellipsis.
- **Per-member stats.** `wins`, `daysPlayed`, `avgGuesses` (solves only) and
  `streak` — consecutive recorded days solved, counting back from the *league's*
  latest recorded day, so a member who stops playing loses their streak. Shown
  as WIN / GAMES / STREAK / AVG tiles; the standings table became member cards
  because four stats per member does not fit a phone-width table.
- **Today's delta.** `today` is keyed off the calendar day, not off whether the
  viewer has played.
- **`League.emoji`** (optional) and `MAX_MEMBERS = 25`, enforced in
  `useLeagues` and surfaced as `n/25 members`.

Two bugs fixed in the same pass, both with regression tests in `App.test.tsx`:

- `useLeagues` was instantiated twice (App and the panel), so a league imported
  from a `?league=` link was invisible until a reload. The hook now lives in
  `App.tsx` and is passed down.
- "Add my result" recorded a half-played day as a loss. `todayOwnResult()`
  returns null until the game is solved or out of tries.
