import { DateTime, Interval } from "luxon";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  encodeLeague,
  parseShareResult,
  standings,
} from "../../domain/leagues";
import { Guess } from "../../domain/guess";
import { useLeagues } from "../../hooks/useLeagues";
import { Panel } from "./Panel";

const START_DATE = DateTime.fromISO("2026-08-01");

// Today's own result, read straight from the game's localStorage — no prop
// threading needed. Returns null if the player hasn't guessed today.
function todayOwnResult(): { day: number; guessCount: number } | null {
  const dayString = DateTime.now().toFormat("yyyy-MM-dd");
  const all: Record<string, Guess[]> = JSON.parse(
    localStorage.getItem("guesses") ?? "{}"
  );
  const guesses = all[dayString] ?? [];
  if (guesses.length === 0) {
    return null;
  }
  const solved = guesses[guesses.length - 1]?.distance === 0;
  const day = Math.floor(
    Interval.fromDateTimes(START_DATE, DateTime.fromISO(dayString)).length(
      "day"
    )
  );
  return { day, guessCount: solved ? guesses.length : 0 };
}

interface LeaguesProps {
  isOpen: boolean;
  close: () => void;
}

export function Leagues({ isOpen, close }: LeaguesProps) {
  const { t } = useTranslation();
  const { leagues, createLeague, deleteLeague, removeMember, recordResult } =
    useLeagues();

  const [openId, setOpenId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [member, setMember] = useState("");
  const [shareText, setShareText] = useState("");

  const league = leagues.find((l) => l.id === openId) ?? null;
  const today = todayOwnResult();

  const handleAdd = () => {
    if (league == null || member.trim() === "") {
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
                  🏆 {l.name}{" "}
                  <span className="opacity-60">
                    ({l.members.length} {t("leagues.members")})
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
                setOpenId(createLeague(newName.trim()).id);
                setNewName("");
              }
            }}
          >
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
          <h3 className="text-xl font-bold">{league.name}</h3>

          <table className="w-full text-left">
            <thead>
              <tr className="border-b-2">
                <th className="py-1">#</th>
                <th>{t("leagues.member")}</th>
                <th className="text-right">{t("leagues.played")}</th>
                <th className="text-right">{t("leagues.today")}</th>
                <th className="text-right">{t("leagues.total")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {standings(league, today?.day).map((s, i) => (
                <tr key={s.member} className="border-b">
                  <td className="py-1">{i + 1}</td>
                  <td>{s.member}</td>
                  <td className="text-right">{s.daysPlayed}</td>
                  <td className="text-right">{s.today ?? "–"}</td>
                  <td className="text-right font-bold">{s.total}</td>
                  <td className="text-right">
                    <button
                      type="button"
                      title={t("leagues.removeMember")}
                      onClick={() => {
                        if (
                          window.confirm(
                            t("leagues.confirmRemoveMember", { name: s.member })
                          )
                        ) {
                          removeMember(league.id, s.member);
                        }
                      }}
                    >
                      ✖️
                    </button>
                  </td>
                </tr>
              ))}
              {league.members.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-2 opacity-60">
                    {t("leagues.noMembers")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

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
