import { useCallback, useState } from "react";
import { League } from "../domain/leagues";

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
    (name: string): League => {
      const league: League = { id: newId(), name, members: [], results: {} };
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
        l.members.includes(member)
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
      update(id, (l) => ({
        ...l,
        members: l.members.includes(member)
          ? l.members
          : [...l.members, member],
        results: {
          ...l.results,
          [day]: { ...l.results[day], [member]: guessCount },
        },
      })),
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
