import { DateTime } from "luxon";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  dayNumber,
  encodeLeague,
  League,
  MAX_MEMBERS,
  monthsOf,
  parseShareResult,
  Standing,
  standings,
} from "../../domain/leagues";
import { Guess } from "../../domain/guess";
import { UseLeagues } from "../../hooks/useLeagues";
import { Panel } from "./Panel";

const MAX_TRY_COUNT = 6;

// Today's own result, read straight from the game's localStorage — no prop
// threading needed. Null unless today's game is actually over: a half-played
// day used to be recorded as a loss.
function todayOwnResult(): { day: number; guessCount: number } | null {
  const dayString = DateTime.now().toFormat("yyyy-MM-dd");
  const all: Record<string, Guess[]> = JSON.parse(
    localStorage.getItem("guesses") ?? "{}"
  );
  const guesses = all[dayString] ?? [];
  const solved = guesses[guesses.length - 1]?.distance === 0;
  if (!solved && guesses.length < MAX_TRY_COUNT) {
    return null;
  }
  return {
    day: dayNumber(dayString),
    guessCount: solved ? guesses.length : 0,
  };
}

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

function todayNumber(): number {
  return dayNumber(DateTime.now().toFormat("yyyy-MM-dd"));
}

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

function MemberCard({
  standing,
  rank,
  onRemove,
}: {
  standing: Standing;
  rank: number;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const { member, total, daysPlayed, wins, avgGuesses, streak, today, places } =
    standing;

  return (
    <li className="border-2 p-2">
      <div className="flex items-baseline gap-2">
        <span className="w-10 shrink-0">
          {RANK_MEDALS[rank - 1] ?? ""}#{rank}
        </span>
        <span className="font-bold truncate">{member}</span>
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
        <button
          type="button"
          className="shrink-0"
          title={t("leagues.removeMember")}
          onClick={onRemove}
        >
          ✖️
        </button>
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

interface LeaguesProps extends UseLeagues {
  isOpen: boolean;
  close: () => void;
}

export function Leagues({
  isOpen,
  close,
  leagues,
  createLeague,
  deleteLeague,
  removeMember,
  recordResult,
}: LeaguesProps) {
  const { t } = useTranslation();

  const [openId, setOpenId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("");
  const [member, setMember] = useState("");
  const [shareText, setShareText] = useState("");
  // Worldle-style: the current month is the default view, all-time is opt-in.
  const [month, setMonth] = useState<string | null>(
    DateTime.now().toFormat("yyyy-MM")
  );

  const league = leagues.find((l) => l.id === openId) ?? null;
  const today = todayOwnResult();
  const isFull = (l: League) => l.members.length >= MAX_MEMBERS;

  const handleAdd = () => {
    if (league == null || member.trim() === "") {
      return;
    }
    if (isFull(league) && !league.members.includes(member.trim())) {
      toast(t("leagues.full", { max: MAX_MEMBERS }));
      return;
    }
    const parsed = shareText.trim()
      ? parseShareResult(shareText)
      : todayOwnResult();
    if (parsed == null) {
      toast(t("leagues.badResult"));
      return;
    }
    recordResult(league.id, member.trim(), parsed.day, parsed.guessCount);
    setShareText("");
    toast(t("leagues.added"));
  };

  const handleShare = () => {
    if (league == null) {
      return;
    }
    const url = `${window.location.origin}${
      window.location.pathname
    }?league=${encodeLeague(league)}`;
    navigator.clipboard.writeText(url).then(() => toast(t("leagues.copied")));
  };

  return (
    <Panel title={t("leagues.title")} isOpen={isOpen} close={close}>
      {league == null ? (
        <div className="my-4 space-y-4">
          <p className="text-sm opacity-80">{t("leagues.intro")}</p>
          <ul className="space-y-1">
            {leagues.map((l) => (
              <li key={l.id} className="flex items-center">
                <button
                  type="button"
                  className="flex-auto text-left border-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-slate-800"
                  onClick={() => setOpenId(l.id)}
                >
                  {l.emoji || "🏆"} {l.name}{" "}
                  <span className="opacity-60">
                    ({l.members.length}/{MAX_MEMBERS} {t("leagues.members")})
                  </span>
                </button>
                <button
                  type="button"
                  className="ml-2 px-2"
                  title={t("leagues.delete")}
                  onClick={() => {
                    if (
                      window.confirm(
                        t("leagues.confirmDelete", { name: l.name })
                      )
                    ) {
                      deleteLeague(l.id);
                    }
                  }}
                >
                  🗑️
                </button>
              </li>
            ))}
            {leagues.length === 0 && (
              <li className="opacity-60">{t("leagues.empty")}</li>
            )}
          </ul>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (newName.trim()) {
                setOpenId(
                  createLeague(newName.trim(), newEmoji.trim() || undefined).id
                );
                setNewName("");
                setNewEmoji("");
              }
            }}
          >
            <input
              className="w-10 border-2 px-1 py-1 text-center dark:bg-slate-800"
              maxLength={2}
              placeholder="🏆"
              title={t("leagues.emoji")}
              value={newEmoji}
              onChange={(e) => setNewEmoji(e.target.value)}
            />
            <input
              className="flex-auto border-2 px-2 py-1 dark:bg-slate-800"
              placeholder={t("leagues.namePlaceholder")}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button
              type="submit"
              className="border-2 px-3 uppercase bg-red-600 hover:bg-red-500 text-white"
            >
              {t("leagues.create")}
            </button>
          </form>
        </div>
      ) : (
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
              {league.emoji || "🏆"} {league.name}
            </h3>
            <select
              className="border-2 px-1 py-1 dark:bg-slate-800"
              title={t("leagues.month")}
              value={month ?? ""}
              onChange={(e) => setMonth(e.target.value || null)}
            >
              <option value="">{t("leagues.allTime")}</option>
              {monthsOf(league).map((m) => (
                <option key={m} value={m}>
                  {DateTime.fromISO(`${m}-01`).toFormat("LLL yyyy")}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs opacity-60">
            {league.members.length}/{MAX_MEMBERS} {t("leagues.members")}
          </p>

          <ul className="space-y-2">
            {standings(league, {
              month: month ?? undefined,
              today: todayNumber(),
            }).map((standing, i) => (
              <MemberCard
                key={standing.member}
                standing={standing}
                rank={i + 1}
                onRemove={() => {
                  if (
                    window.confirm(
                      t("leagues.confirmRemoveMember", {
                        name: standing.member,
                      })
                    )
                  ) {
                    removeMember(league.id, standing.member);
                  }
                }}
              />
            ))}
            {league.members.length === 0 && (
              <li className="opacity-60">{t("leagues.noMembers")}</li>
            )}
          </ul>

          <div className="space-y-2 border-t-2 pt-3">
            <h4 className="font-bold">{t("leagues.addResult")}</h4>
            <input
              className="w-full border-2 px-2 py-1 dark:bg-slate-800"
              list="league-members"
              placeholder={t("leagues.memberPlaceholder")}
              value={member}
              onChange={(e) => setMember(e.target.value)}
            />
            <datalist id="league-members">
              {league.members.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            <textarea
              className="w-full border-2 px-2 py-1 dark:bg-slate-800"
              rows={3}
              placeholder={
                today ? t("leagues.pasteOrMine") : t("leagues.pasteFriend")
              }
              value={shareText}
              onChange={(e) => setShareText(e.target.value)}
            />
            <button
              type="button"
              className="border-2 px-3 py-1 uppercase bg-red-600 hover:bg-red-500 text-white disabled:opacity-50"
              disabled={member.trim() === "" || (!shareText.trim() && !today)}
              onClick={handleAdd}
            >
              {shareText.trim() ? t("leagues.add") : t("leagues.addMine")}
            </button>
          </div>

          <div className="border-t-2 pt-3">
            <button
              type="button"
              className="border-2 px-3 py-1 uppercase w-full"
              onClick={handleShare}
            >
              🔗 {t("leagues.share")}
            </button>
            <p className="text-xs opacity-60 mt-1">{t("leagues.shareHint")}</p>
          </div>
        </div>
      )}
    </Panel>
  );
}
