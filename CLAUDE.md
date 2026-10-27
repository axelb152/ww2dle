# WW2dle

## Possible follow-ups

### Flags for naval battles (undecided)

Every battle shows the flag of its present-day country (`battleCountry` in
`src/domain/battles.ts`). Sea battles use the nearest coastal country, so the
flag suggests the fight was on land there. These 10 are genuinely at sea:

| Battle code      | Flag now | ~km from coast |
| ---------------- | -------- | -------------- |
| `philippine-sea` | PH       | 646            |
| `coral-sea`      | AU       | 473            |
| `barents-sea`    | NO       | 258            |
| `denmark-strait` | IS       | 162            |
| `north-cape`     | NO       | 151            |
| `cape-matapan`   | GR       | 112            |
| `bismarck-sea`   | PG       | 97             |
| `java-sea`       | ID       | 66             |
| `channel-dash`   | FR       | 45             |
| `river-plate`    | UY       | 25             |

Options discussed (no decision yet):

1. Leave as is.
2. Show 🌊 instead of a flag, searchable by ocean ("Pacific", "Atlantic").
   Downside: typing "Norway" would no longer find North Cape.
3. Show 🌊, but keep them searchable by their nearest country (recommended).
4. Two flags for battles between two coasts (Channel Dash GB+FR, Denmark
   Strait GL+IS, River Plate UY+AR). Doesn't help the mid-ocean ones.

Country search (typing a country lists its battles) uses `countryNames` and
`filterBattles` in the same file, so any change here must keep it working.
