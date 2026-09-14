import { DateTime } from "luxon";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { battles, getBattleName, sanitizeBattleName } from "../domain/battles";
import { useGuesses } from "../hooks/useGuesses";
import { BattleInput } from "./BattleInput";
import * as geolib from "geolib";
import { Share } from "./Share";
import { Guesses } from "./Guesses";
import { useTranslation } from "react-i18next";
import { SettingsData } from "../hooks/useSettings";
import { useMode } from "../hooks/useMode";
import { useBattle } from "../hooks/useBattle";
import { getHint } from "../domain/hints";
import battlePhotos from "../domain/battlePhotos.json";
import { todayResult, useLeagues } from "../hooks/useLeagues";

function getDayString() {
  return DateTime.now().toFormat("yyyy-MM-dd");
}

const MAX_TRY_COUNT = 6;

interface GameProps {
  settingsData: SettingsData;
}

export function Game({ settingsData }: GameProps) {
  const { t, i18n } = useTranslation();
  const dayString = useMemo(getDayString, []);

  const [battle, randomAngle, imageScale] = useBattle(dayString);

  const [currentGuess, setCurrentGuess] = useState("");
  const [guesses, addGuess] = useGuesses(dayString);
  const [hideImageMode, setHideImageMode] = useMode(
    "hideImageMode",
    dayString,
    settingsData.noImageMode
  );
  const [rotationMode, setRotationMode] = useMode(
    "rotationMode",
    dayString,
    settingsData.rotationMode
  );

  const gameEnded =
    guesses.length === MAX_TRY_COUNT ||
    guesses[guesses.length - 1]?.distance === 0;

  const gameWon = guesses[guesses.length - 1]?.distance === 0;
  const hint = gameEnded ? null : getHint(guesses.length, battle);

  const { joined, myName, submitResult, isConfigured } = useLeagues();

  // On finishing, push today's result to every joined league. Once per day
  // (localStorage marker); newly joined leagues get today's result on join.
  useEffect(() => {
    if (!isConfigured || !gameEnded || !myName.trim() || joined.length === 0) {
      return;
    }
    const today = todayResult();
    if (today == null) {
      return;
    }
    const marker = `leagues.submitted.${today.day}`;
    if (localStorage.getItem(marker)) {
      return;
    }
    localStorage.setItem(marker, "1");
    joined.forEach((j) => submitResult(j.id, myName, today.day, today.guesses));
  }, [gameEnded, isConfigured, joined, myName, submitResult]);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const guessedBattle = battles.find(
        (battle) =>
          sanitizeBattleName(getBattleName(i18n.resolvedLanguage, battle)) ===
          sanitizeBattleName(currentGuess)
      );

      if (guessedBattle == null) {
        toast.error(t("unknownBattle"));
        return;
      }

      const newGuess = {
        name: currentGuess,
        distance: geolib.getDistance(guessedBattle, battle),
        direction: geolib.getCompassDirection(guessedBattle, battle),
      };

      addGuess(newGuess);
      setCurrentGuess("");

      if (newGuess.distance === 0) {
        toast.success(t("welldone"), { delay: 2000 });
      }
    },
    [addGuess, battle, currentGuess, i18n.resolvedLanguage, t]
  );

  useEffect(() => {
    if (
      guesses.length === MAX_TRY_COUNT &&
      guesses[guesses.length - 1].distance > 0
    ) {
      toast.info(getBattleName(i18n.resolvedLanguage, battle).toUpperCase(), {
        autoClose: false,
        delay: 2000,
      });
    }
  }, [battle, guesses, i18n.resolvedLanguage]);

  return (
    <div className="flex-grow flex flex-col mx-2">
      {hideImageMode && !gameEnded && (
        <button
          className="border-2 uppercase my-2 hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-slate-800 dark:active:bg-slate-700"
          type="button"
          onClick={() => setHideImageMode(false)}
        >
          {t("showBattle")}
        </button>
      )}
      <div className="my-1">
        <img
          className={`max-h-52 m-auto transition-transform duration-700 ease-in ${
            hideImageMode && !gameEnded ? "h-0" : "h-full"
          }`}
          alt="battle to guess"
          src={
            (battlePhotos as Record<string, string>)[battle.code] ??
            `images/battles/${battle.code.toLowerCase()}/battle.png`
          }
          style={
            rotationMode && !gameEnded
              ? {
                  transform: `rotate(${randomAngle}deg) scale(${imageScale})`,
                }
              : {}
          }
        />
      </div>
      {rotationMode && !hideImageMode && !gameEnded && (
        <button
          className="border-2 uppercase mb-2 hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-slate-800 dark:active:bg-slate-700"
          type="button"
          onClick={() => setRotationMode(false)}
        >
          {t("cancelRotation")}
        </button>
      )}
      <Guesses
        rowCount={MAX_TRY_COUNT}
        guesses={guesses}
        settingsData={settingsData}
      />
      <div className="my-2">
        {gameEnded ? (
          <>
            <div
              className={`text-center font-bold mb-2 ${
                gameWon ? "text-green-600" : "text-red-600"
              }`}
            >
              {getBattleName(i18n.resolvedLanguage, battle)} ({battle.year},{" "}
              {battle.theater})
            </div>
            <Share
              guesses={guesses}
              dayString={dayString}
              settingsData={settingsData}
              hideImageMode={hideImageMode}
              rotationMode={rotationMode}
            />
            <a
              className="underline w-full text-center block mt-4"
              href={`https://en.wikipedia.org/wiki/Special:Search?search=Battle+of+${encodeURIComponent(
                getBattleName(i18n.resolvedLanguage, battle)
              )}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("showOnWikipedia")}
            </a>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            {hint != null && (
              <div className="text-center text-sm my-1">
                {hint.type === "year"
                  ? t("hintYear", { year: hint.value })
                  : t("hintTheater", { theater: hint.value })}
              </div>
            )}
            <div className="flex flex-col">
              <BattleInput
                currentGuess={currentGuess}
                setCurrentGuess={setCurrentGuess}
              />
              <button
                className="border-2 uppercase my-0.5 hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-slate-800 dark:active:bg-slate-700"
                type="submit"
              >
                ⚔️ {t("guess")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
