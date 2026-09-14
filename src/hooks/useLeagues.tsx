import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { DateTime } from "luxon";
import { League, Membership, Result, dayNumber } from "../domain/leagues";
import { Guess } from "../domain/guess";
import { isConfigured, supabase } from "../lib/supabase";

const STORE_KEY = "leagues.v2";
const MAX_TRY_COUNT = 6;

interface Store {
  myName: string;
  joined: Membership[];
}

function load(): Store {
  const raw = localStorage.getItem(STORE_KEY);
  const parsed = raw != null ? JSON.parse(raw) : null;
  return {
    myName: parsed?.myName ?? "",
    joined: Array.isArray(parsed?.joined) ? parsed.joined : [],
  };
}

// Today's own result from the game's localStorage. Null unless today's game
// is actually over: a half-played day used to be recorded as a loss.
export function todayResult(): { day: number; guesses: number } | null {
  const iso = DateTime.now().toFormat("yyyy-MM-dd");
  const all: Record<string, Guess[]> = JSON.parse(
    localStorage.getItem("guesses") ?? "{}"
  );
  const guesses = all[iso] ?? [];
  const solved = guesses[guesses.length - 1]?.distance === 0;
  if (!solved && guesses.length < MAX_TRY_COUNT) {
    return null;
  }
  return { day: dayNumber(iso), guesses: solved ? guesses.length : 0 };
}

export interface LeaguesState {
  myName: string;
  joined: Membership[];
  isConfigured: boolean;
  setMyName: (name: string) => void;
  createLeague: (name: string) => Promise<League | null>;
  joinLeague: (id: string) => Promise<League | null>;
  leaveLeague: (id: string) => void;
  loadLeague: (id: string) => Promise<League | null>;
  submitResult: (
    leagueId: string,
    player: string,
    day: number,
    guesses: number
  ) => Promise<void>;
}

// One store for the whole app. App (join link), Game (auto-submit) and the
// Leagues panel all read the same membership state, so a league joined in
// one place is visible to the others without a reload.
function useLeaguesState(): LeaguesState {
  const [store, setStore] = useState<Store>(load);

  const persist = useCallback((next: Store) => {
    setStore(next);
    localStorage.setItem(STORE_KEY, JSON.stringify(next));
  }, []);

  const setMyName = useCallback(
    (myName: string) => persist({ ...load(), myName: myName.trim() }),
    [persist]
  );

  // Fetch a league's name + results by id, or null if the id is unknown.
  const loadLeague = useCallback(async (id: string): Promise<League | null> => {
    if (!isConfigured) {
      return null;
    }
    const { data, error } = await supabase.rpc("get_league", { p_id: id });
    if (error || data == null) {
      return null;
    }
    return {
      id: data.id,
      name: data.name,
      results: (data.results ?? []) as Result[],
    };
  }, []);

  const rememberJoined = useCallback(
    (m: Membership) => {
      const current = load();
      if (current.joined.some((j) => j.id === m.id)) {
        return;
      }
      persist({ ...current, joined: [...current.joined, m] });
    },
    [persist]
  );

  const createLeague = useCallback(
    async (name: string): Promise<League | null> => {
      if (!isConfigured) {
        return null;
      }
      const { data: id, error } = await supabase.rpc("create_league", {
        p_name: name.trim(),
      });
      if (error || !id) {
        return null;
      }
      rememberJoined({ id, name: name.trim() });
      return { id, name: name.trim(), results: [] };
    },
    [rememberJoined]
  );

  // Join by id: validate it exists, then remember it locally.
  const joinLeague = useCallback(
    async (id: string): Promise<League | null> => {
      const league = await loadLeague(id.trim());
      if (league == null) {
        return null;
      }
      rememberJoined({ id: league.id, name: league.name });
      return league;
    },
    [loadLeague, rememberJoined]
  );

  const leaveLeague = useCallback(
    (id: string) => {
      const current = load();
      persist({
        ...current,
        joined: current.joined.filter((j) => j.id !== id),
      });
    },
    [persist]
  );

  const submitResult = useCallback(
    async (leagueId: string, player: string, day: number, guesses: number) => {
      if (!isConfigured || !player.trim()) {
        return;
      }
      await supabase.rpc("submit_result", {
        p_league_id: leagueId,
        p_player: player.trim(),
        p_day: day,
        p_guesses: guesses,
      });
    },
    []
  );

  return useMemo(
    () => ({
      myName: store.myName,
      joined: store.joined,
      isConfigured,
      setMyName,
      createLeague,
      joinLeague,
      leaveLeague,
      loadLeague,
      submitResult,
    }),
    [
      store,
      setMyName,
      createLeague,
      joinLeague,
      leaveLeague,
      loadLeague,
      submitResult,
    ]
  );
}

const LeaguesContext = createContext<LeaguesState | null>(null);

export function LeaguesProvider({ children }: { children: React.ReactNode }) {
  const state = useLeaguesState();
  return (
    <LeaguesContext.Provider value={state}>{children}</LeaguesContext.Provider>
  );
}

export function useLeagues(): LeaguesState {
  const ctx = useContext(LeaguesContext);
  if (ctx == null) {
    throw new Error("useLeagues must be used inside <LeaguesProvider>");
  }
  return ctx;
}
