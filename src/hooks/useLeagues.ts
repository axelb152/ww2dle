import { useCallback, useState } from "react";
import { League, MAX_MEMBERS } from "../domain/leagues";

function loadLeagues(): League[] {
  const stored = localStorage.getItem("leagues");
  return stored != null ? JSON.parse(stored) : [];
}

// Short id; Math.random is fine — collisions only matter within one device's list.
function newId(): string {
  return Math.random().toString(36).slice(2, 8);
}

export function useLeagues() {
  const [leagues, setLeagues] = useState<League[]>(loadLeagues);

  const persist = useCallback((next: League[]) => {
    setLeagues(next);
    localStorage.setItem("leagues", JSON.stringify(next));
  }, []);

  const update = useCallback(
    (id: string, fn: (league: League) => League) =>
      persist(leagues.map((l) => (l.id === id ? fn(l) : l))),
    [leagues, persist]
  );

  const createLeague = useCallback(
    (name: string, emoji?: string): League => {
      const league: League = {
        id: newId(),
        name,
        emoji,
        members: [],
        results: {},
      };
      persist([...leagues, league]);
      return league;
    },
    [leagues, persist]
  );

  const deleteLeague = useCallback(
    (id: string) => persist(leagues.filter((l) => l.id !== id)),
    [leagues, persist]
  );

  const addMember = useCallback(
    (id: string, member: string) =>
      update(id, (l) =>
        l.members.includes(member) || l.members.length >= MAX_MEMBERS
          ? l
          : { ...l, members: [...l.members, member] }
      ),
    [update]
  );

  const removeMember = useCallback(
    (id: string, member: string) =>
      update(id, (l) => {
        const results: League["results"] = {};
        for (const [day, byMember] of Object.entries(l.results)) {
          const { [member]: _removed, ...rest } = byMember;
          results[Number(day)] = rest;
        }
        return {
          ...l,
          members: l.members.filter((m) => m !== member),
          results,
        };
      }),
    [update]
  );

  const recordResult = useCallback(
    (id: string, member: string, day: number, guessCount: number) =>
      update(id, (l) => {
        const known = l.members.includes(member);
        if (!known && l.members.length >= MAX_MEMBERS) {
          return l;
        }
        return {
          ...l,
          members: known ? l.members : [...l.members, member],
          results: {
            ...l.results,
            [day]: { ...l.results[day], [member]: guessCount },
          },
        };
      }),
    [update]
  );

  // Import a league snapshot; overwrites an existing league with the same id.
  const importLeague = useCallback(
    (league: League) =>
      persist([...leagues.filter((l) => l.id !== league.id), league]),
    [leagues, persist]
  );

  return {
    leagues,
    createLeague,
    deleteLeague,
    addMember,
    removeMember,
    recordResult,
    importLeague,
  };
}

export type UseLeagues = ReturnType<typeof useLeagues>;
