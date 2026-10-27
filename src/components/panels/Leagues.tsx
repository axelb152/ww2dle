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
  ranksOf,
  Standing,
  standings,
  summarize,
} from "../../domain/leagues";
import { Guess } from "../../domain/guess";
import { UseLeagues } from "../../hooks/useLeagues";
import { Panel } from "./Panel";

const MAX_TRY_COUNT = 6;

// The app has no token layer, so these four strings are it. Keeping them in one
// place is what stops the panel drifting from the guess grid's vocabulary:
// 2px square borders, red-600 for primary/rank state, slate in dark mode.
const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900";
// opacity-60 put small text under 4.5:1 on both themes; name the colour instead.
const MUTED = "text-gray-600 dark:text-slate-400";
const LABEL = `text-[11px] font-semibold uppercase tracking-wide ${MUTED}`;
const BTN = `border-2 px-3 py-2 font-bold uppercase tracking-wide transition-colors hover:bg-gray-100 dark:hover:bg-slate-800 ${FOCUS}`;
const BTN_PRIMARY = `border-2 border-red-600 bg-red-600 px-3 py-2 font-bold uppercase tracking-wide text-white transition-colors hover:bg-red-500 disabled:border-gray-300 disabled:bg-gray-200 disabled:text-gray-600 disabled:hover:bg-gray-200 dark:disabled:border-slate-700 dark:disabled:bg-slate-800 dark:disabled:text-slate-400 dark:disabled:hover:bg-slate-800 ${FOCUS}`;
const FIELD = `w-full border-2 px-2 py-2 placeholder:text-gray-500 dark:bg-slate-800 dark:placeholder:text-slate-400 ${FOCUS}`;

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

// Daily podium places as a medal ribbon. One graphic to screen readers, not a
// stream of "first place medal, second place medal, …".
function Places({ places }: { places: number[] }) {
  const { t } = useTranslation();
  const shown = places.slice(0, 5);
  const rest = places.length - shown.length;
  return (
    <span
      role="img"
      aria-label={`${t("leagues.medalsLabel")}: ${places.length}`}
      className="flex items-center gap-1 text-sm leading-none"
    >
      {/* The medals truncate under pressure; the count is what you actually
          read, so it sits outside them and never shrinks. */}
      <span aria-hidden="true" className="truncate">
        {shown.map((place, i) => (
          <span key={i}>{RANK_MEDALS[place - 1]}</span>
        ))}
      </span>
      {rest > 0 && (
        <span aria-hidden="true" className={`shrink-0 text-xs ${MUTED}`}>
          +{rest}
        </span>
      )}
    </span>
  );
}

// One cell of a divided stat strip. Not a card — four bordered boxes inside a
// bordered card is nesting, so the strip carries a single top border and
// vertical dividers instead.
function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-1 text-center">
      <div className={LABEL}>{label}</div>
      <div className="text-base font-bold tabular-nums">{value}</div>
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
  const leader = rank === 1;

  return (
    <li
      className={`animate-reveal border-2 p-2 ${
        leader ? "border-red-600" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="flex w-[3.25rem] shrink-0 items-center gap-1">
          <span
            aria-hidden="true"
            className="w-5 text-center text-base leading-none"
          >
            {RANK_MEDALS[rank - 1] ?? ""}
          </span>
          <span className="text-xs font-bold tabular-nums">#{rank}</span>
        </span>
        <span
          aria-hidden="true"
          className={`grid h-9 w-9 shrink-0 place-items-center border-2 text-base font-bold uppercase ${
            leader
              ? "border-red-600 bg-red-600 text-white"
              : "bg-gray-100 dark:bg-slate-800"
          }`}
        >
          {(Array.from(member)[0] ?? "?").toUpperCase()}
        </span>
        <span className="min-w-0 flex-auto overflow-hidden">
          <span className="block truncate font-bold">{member}</span>
        </span>
        <span className="shrink-0 pl-1 text-right leading-none">
          {today != null && (
            <span className="animate-pop block text-xs font-bold text-green-700 dark:text-green-400">
              +{today}
            </span>
          )}
          <span className="text-2xl font-bold tabular-nums">{total}</span>
          <span className={`block ${LABEL}`}>{t("leagues.pts")}</span>
        </span>
        <button
          type="button"
          className={`-my-1 grid h-10 w-10 shrink-0 place-items-center text-sm opacity-70 transition-opacity hover:opacity-100 ${FOCUS}`}
          title={t("leagues.removeMember")}
          aria-label={`${t("leagues.removeMember")}: ${member}`}
          onClick={onRemove}
        >
          ✕
        </button>
      </div>
      {places.length > 0 && (
        <div className="mt-1">
          <Places places={places} />
        </div>
      )}
      <div className="mt-2 grid grid-cols-4 divide-x-2 border-t-2 pt-2">
        <StatCell
          label={t("leagues.win")}
          value={
            daysPlayed === 0 ? "–" : `${Math.round((100 * wins) / daysPlayed)}%`
          }
        />
        <StatCell label={t("leagues.games")} value={String(daysPlayed)} />
        <StatCell label={t("leagues.streak")} value={String(streak)} />
        <StatCell
          label={t("leagues.avg")}
          value={avgGuesses == null ? "–" : avgGuesses.toFixed(1)}
        />
      </div>
    </li>
  );
}

// Roster capacity + the invite action, which is the only thing you can do about
// an under-filled league. scaleX rather than width so the fill doesn't animate
// layout.
function InviteCard({
  used,
  max,
  onShare,
}: {
  used: number;
  max: number;
  onShare: () => void;
}) {
  const { t } = useTranslation();
  const left = max - used;
  const filled = Math.min(1, used / max);
  const percent = Math.round(100 * filled);

  return (
    <section className="space-y-2 border-2 p-3">
      <h4 className="font-bold uppercase tracking-wide">
        👥 {t("leagues.invite")}
      </h4>
      <p className={`text-pretty text-xs ${MUTED}`}>
        {used === 0
          ? t("leagues.inviteFirst")
          : left > 0
          ? t("leagues.spotsLeft", { n: left, max })
          : t("leagues.isFull")}
      </p>
      <div className="flex items-baseline justify-between text-xs font-bold">
        <span className="tabular-nums">
          {used}/{max} {t("leagues.playersLabel")}
        </span>
        <span className={`tabular-nums ${MUTED}`}>
          {t("leagues.percentFull", { percent })}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={t("leagues.capacityLabel")}
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={max}
        className="h-3 overflow-hidden border-2 bg-gray-100 dark:bg-slate-800"
      >
        <div
          className="h-full origin-left bg-red-600 transition-transform duration-500 ease-out"
          style={{ transform: `scaleX(${filled})` }}
        />
      </div>
      <button
        type="button"
        className={`w-full border-gray-900 dark:border-slate-100 ${BTN}`}
        onClick={onShare}
      >
        🔗 {t("leagues.share")}
      </button>
      <p className={`text-pretty text-[11px] ${MUTED}`}>
        {t("leagues.shareHint")}
      </p>
    </section>
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

  const rows =
    league == null
      ? []
      : standings(league, {
          month: month ?? undefined,
          today: todayNumber(),
        });
  const totals = summarize(rows);
  const ranks = ranksOf(rows);

  return (
    <Panel title={t("leagues.title")} isOpen={isOpen} close={close}>
      {league == null ? (
        <div className="my-4 space-y-4">
          <p className={MUTED}>{t("leagues.intro")}</p>
          <ul className="space-y-2">
            {leagues.map((l) => (
              <li key={l.id} className="flex items-center gap-2">
                <button
                  type="button"
                  className={`flex min-w-0 flex-auto items-center gap-2 border-2 p-2 text-left transition-colors hover:bg-gray-100 dark:hover:bg-slate-800 ${FOCUS}`}
                  onClick={() => setOpenId(l.id)}
                >
                  <span
                    aria-hidden="true"
                    className="grid h-9 w-9 shrink-0 place-items-center border-2 bg-gray-100 text-base dark:bg-slate-800"
                  >
                    {l.emoji || "🏆"}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{l.name}</span>
                    <span className={`block ${LABEL}`}>
                      {l.members.length}/{MAX_MEMBERS} {t("leagues.members")}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  className={`grid h-11 w-11 shrink-0 place-items-center opacity-60 transition-opacity hover:opacity-100 ${FOCUS}`}
                  title={t("leagues.delete")}
                  aria-label={`${t("leagues.delete")}: ${l.name}`}
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
              <li className={`border-2 border-dashed p-4 text-center ${MUTED}`}>
                {t("leagues.empty")}
              </li>
            )}
          </ul>
          <form
            className="flex gap-2 border-t-2 pt-4"
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
              className={`w-12 shrink-0 border-2 px-1 py-2 text-center dark:bg-slate-800 ${FOCUS}`}
              maxLength={2}
              placeholder="🏆"
              title={t("leagues.emoji")}
              aria-label={t("leagues.emoji")}
              value={newEmoji}
              onChange={(e) => setNewEmoji(e.target.value)}
            />
            <input
              className={FIELD}
              placeholder={t("leagues.namePlaceholder")}
              aria-label={t("leagues.namePlaceholder")}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button type="submit" className={`shrink-0 ${BTN_PRIMARY}`}>
              {t("leagues.create")}
            </button>
          </form>
        </div>
      ) : (
        <div className="my-4 space-y-4">
          <button
            type="button"
            className={`-m-1 p-1 text-sm font-bold underline ${FOCUS}`}
            onClick={() => setOpenId(null)}
          >
            ← {t("leagues.back")}
          </button>
          <h3 className="flex items-center gap-2 text-xl font-bold">
            <span aria-hidden="true">{league.emoji || "🏆"}</span>
            <span className="min-w-0 truncate">{league.name}</span>
          </h3>

          <InviteCard
            used={league.members.length}
            max={MAX_MEMBERS}
            onShare={handleShare}
          />

          <div className="flex items-center gap-2">
            <h4 className="flex-auto font-bold uppercase tracking-wide">
              {t("leagues.membersTitle")}
            </h4>
            <select
              className={`shrink-0 border-2 px-2 py-1 text-xs font-bold uppercase tracking-wide dark:bg-slate-800 ${FOCUS}`}
              aria-label={t("leagues.month")}
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

          <ul className="space-y-2">
            {rows.map((standing, i) => (
              <MemberCard
                key={standing.member}
                standing={standing}
                rank={ranks[i]}
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
            {rows.length === 0 && (
              <li className={`border-2 border-dashed p-4 text-center ${MUTED}`}>
                {t("leagues.noMembers")}
              </li>
            )}
          </ul>

          {rows.length > 0 && (
            <div className="grid grid-cols-3 divide-x-2 border-2 py-2">
              <StatCell
                label={t("leagues.totalGames")}
                value={String(totals.games)}
              />
              <StatCell
                label={t("leagues.points")}
                value={String(totals.points)}
              />
              <StatCell
                label={t("leagues.bestStreak")}
                value={String(totals.bestStreak)}
              />
            </div>
          )}

          <div className="space-y-2 border-t-2 pt-4">
            <h4 className="font-bold uppercase tracking-wide">
              {t("leagues.addResult")}
            </h4>
            <input
              className={FIELD}
              list="league-members"
              placeholder={t("leagues.memberPlaceholder")}
              aria-label={t("leagues.memberPlaceholder")}
              value={member}
              onChange={(e) => setMember(e.target.value)}
            />
            <datalist id="league-members">
              {league.members.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            <textarea
              className={FIELD}
              rows={3}
              placeholder={
                today ? t("leagues.pasteOrMine") : t("leagues.pasteFriend")
              }
              aria-label={
                today ? t("leagues.pasteOrMine") : t("leagues.pasteFriend")
              }
              value={shareText}
              onChange={(e) => setShareText(e.target.value)}
            />
            <button
              type="button"
              className={`w-full ${BTN_PRIMARY}`}
              disabled={member.trim() === "" || (!shareText.trim() && !today)}
              onClick={handleAdd}
            >
              {shareText.trim() ? t("leagues.add") : t("leagues.addMine")}
            </button>
          </div>
        </div>
      )}
    </Panel>
  );
}
