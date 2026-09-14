import { DateTime } from "luxon";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { League, monthsOf, Standing, standings } from "../../domain/leagues";
import { todayResult, useLeagues } from "../../hooks/useLeagues";
import { Panel } from "./Panel";

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

function Places({ places }: { places: number[] }) {
  const shown = places.slice(0, 5);
  return (
    <span className="whitespace-nowrap">
      {shown.map((place, i) => (
        <span key={i}>{RANK_MEDALS[place - 1]}</span>
      ))}
      {places.length > shown.length && (
        <span className="opacity-60" title={`${places.length}`}>
          …
        </span>
      )}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 px-1 py-1 text-center">
      <div className="text-[10px] uppercase opacity-60">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  );
}

function PlayerCard({ standing, rank }: { standing: Standing; rank: number }) {
  const { t } = useTranslation();
  const { player, total, daysPlayed, wins, avgGuesses, streak, today, places } =
    standing;

  return (
    <li className="border-2 p-2">
      <div className="flex items-baseline gap-2">
        <span className="w-10 shrink-0">
          {RANK_MEDALS[rank - 1] ?? ""}#{rank}
        </span>
        <span className="font-bold truncate">{player}</span>
        <Places places={places} />
        <span className="ml-auto text-right shrink-0">
          {today != null && (
            <span className="text-green-600 text-xs mr-1">+{today}</span>
          )}
          <span className="text-xl font-bold">{total}</span>
          <span className="text-[10px] uppercase opacity-60">
            {" "}
            {t("leagues.pts")}
          </span>
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1 mt-2">
        <Stat
          label={t("leagues.win")}
          value={
            daysPlayed === 0 ? "–" : `${Math.round((100 * wins) / daysPlayed)}%`
          }
        />
        <Stat label={t("leagues.games")} value={String(daysPlayed)} />
        <Stat label={t("leagues.streak")} value={String(streak)} />
        <Stat
          label={t("leagues.avg")}
          value={avgGuesses == null ? "–" : avgGuesses.toFixed(1)}
        />
      </div>
    </li>
  );
}

interface LeaguesProps {
  isOpen: boolean;
  close: () => void;
}

export function Leagues({ isOpen, close }: LeaguesProps) {
  const { t } = useTranslation();
  const {
    myName,
    joined,
    isConfigured,
    setMyName,
    createLeague,
    joinLeague,
    leaveLeague,
    loadLeague,
    submitResult,
  } = useLeagues();

  const [openId, setOpenId] = useState<string | null>(null);
  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  // Worldle-style: the current month is the default view, all-time is opt-in.
  const [month, setMonth] = useState<string | null>(
    DateTime.now().toFormat("yyyy-MM")
  );

  const refresh = useCallback(
    async (id: string) => {
      setLoading(true);
      setLeague(await loadLeague(id));
      setLoading(false);
    },
    [loadLeague]
  );

  // Load standings when a league is opened, and refetch whenever the panel
  // is reopened so friends' new results show up.
  // ponytail: refetch-on-open; add a supabase realtime subscription if
  // friends want truly live updates.
  useEffect(() => {
    if (openId != null && isOpen) {
      refresh(openId);
    } else if (openId == null) {
      setLeague(null);
    }
  }, [openId, isOpen, refresh]);

  if (!isConfigured) {
    return (
      <Panel title={t("leagues.title")} isOpen={isOpen} close={close}>
        <p className="my-4 opacity-80">{t("leagues.unavailable")}</p>
      </Panel>
    );
  }

  const handleCreate = async () => {
    if (!newName.trim() || !myName.trim()) {
      return;
    }
    const created = await createLeague(newName.trim());
    if (created == null) {
      toast(t("leagues.error"));
      return;
    }
    setNewName("");
    const today = todayResult();
    if (today) {
      await submitResult(created.id, myName, today.day, today.guesses);
    }
    setOpenId(created.id);
  };

  const handleJoin = async () => {
    if (!joinCode.trim() || !myName.trim()) {
      return;
    }
    const joinedLeague = await joinLeague(joinCode.trim());
    if (joinedLeague == null) {
      toast(t("leagues.notFound"));
      return;
    }
    setJoinCode("");
    const today = todayResult();
    if (today) {
      await submitResult(joinedLeague.id, myName, today.day, today.guesses);
    }
    setOpenId(joinedLeague.id);
  };

  const handleShare = () => {
    if (league == null) {
      return;
    }
    const url = `${window.location.origin}${window.location.pathname}?join=${league.id}`;
    navigator.clipboard.writeText(url).then(() => toast(t("leagues.copied")));
  };

  const nameField = (
    <label className="block text-sm">
      {t("leagues.yourName")}
      <input
        className="w-full border-2 px-2 py-1 dark:bg-slate-800 mt-1"
        placeholder={t("leagues.namePlaceholder")}
        defaultValue={myName}
        onBlur={(e) => setMyName(e.target.value)}
      />
    </label>
  );

  const today = todayResult();

  return (
    <Panel title={t("leagues.title")} isOpen={isOpen} close={close}>
      {league != null && openId != null ? (
        <div className="my-4 space-y-4">
          <button
            type="button"
            className="text-sm underline"
            onClick={() => setOpenId(null)}
          >
            ← {t("leagues.back")}
          </button>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold flex-auto truncate">
              🏆 {league.name}
            </h3>
            <select
              className="border-2 px-1 py-1 dark:bg-slate-800"
              title={t("leagues.month")}
              value={month ?? ""}
              onChange={(e) => setMonth(e.target.value || null)}
            >
              <option value="">{t("leagues.allTime")}</option>
              {monthsOf(league.results).map((m) => (
                <option key={m} value={m}>
                  {DateTime.fromISO(`${m}-01`).toFormat("LLL yyyy")}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <p className="opacity-60">{t("leagues.loading")}</p>
          ) : (
            <ul className="space-y-2">
              {standings(league.results, {
                month: month ?? undefined,
                today: today?.day,
              }).map((standing, i) => (
                <PlayerCard
                  key={standing.player}
                  standing={standing}
                  rank={i + 1}
                />
              ))}
              {league.results.length === 0 && (
                <li className="opacity-60">{t("leagues.noResults")}</li>
              )}
            </ul>
          )}

          <div className="border-t-2 pt-3 space-y-2">
            <button
              type="button"
              className="border-2 px-3 py-1 uppercase w-full"
              onClick={handleShare}
            >
              🔗 {t("leagues.share")}
            </button>
            <p className="text-xs opacity-60 break-all">
              {t("leagues.codeLabel")}: <strong>{league.id}</strong>
            </p>
            <button
              type="button"
              className="text-sm underline opacity-70"
              onClick={() => {
                if (window.confirm(t("leagues.confirmLeave"))) {
                  leaveLeague(league.id);
                  setOpenId(null);
                }
              }}
            >
              {t("leagues.leave")}
            </button>
          </div>
        </div>
      ) : (
        <div className="my-4 space-y-4">
          <p className="text-sm opacity-80">{t("leagues.intro")}</p>
          {nameField}

          <ul className="space-y-1">
            {joined.map((j) => (
              <li key={j.id}>
                <button
                  type="button"
                  className="w-full text-left border-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-slate-800"
                  onClick={() => setOpenId(j.id)}
                >
                  🏆 {j.name}
                </button>
              </li>
            ))}
            {joined.length === 0 && (
              <li className="opacity-60">{t("leagues.empty")}</li>
            )}
          </ul>

          <form
            className="flex gap-2 border-t-2 pt-3"
            onSubmit={(e) => {
              e.preventDefault();
              handleCreate();
            }}
          >
            <input
              className="flex-auto border-2 px-2 py-1 dark:bg-slate-800"
              placeholder={t("leagues.newPlaceholder")}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button
              type="submit"
              className="border-2 px-3 uppercase bg-red-600 hover:bg-red-500 text-white disabled:opacity-50"
              disabled={!newName.trim() || !myName.trim()}
            >
              {t("leagues.create")}
            </button>
          </form>

          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              handleJoin();
            }}
          >
            <input
              className="flex-auto border-2 px-2 py-1 dark:bg-slate-800"
              placeholder={t("leagues.joinPlaceholder")}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
            />
            <button
              type="submit"
              className="border-2 px-3 uppercase disabled:opacity-50"
              disabled={!joinCode.trim() || !myName.trim()}
            >
              {t("leagues.join")}
            </button>
          </form>
          {!myName.trim() && (
            <p className="text-xs opacity-60">{t("leagues.nameFirst")}</p>
          )}
        </div>
      )}
    </Panel>
  );
}
