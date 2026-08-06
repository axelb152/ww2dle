import { useMemo } from "react";
import CopyToClipboard from "react-copy-to-clipboard";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  computeProximityPercent,
  generateSquareCharacters,
} from "../domain/geography";
import { Guess } from "../domain/guess";
import { dayNumber } from "../domain/leagues";
import React from "react";
import { SettingsData } from "../hooks/useSettings";

interface ShareProps {
  guesses: Guess[];
  dayString: string;
  settingsData: SettingsData;
  hideImageMode: boolean;
  rotationMode: boolean;
}

export function Share({
  guesses,
  dayString,
  settingsData,
  hideImageMode,
  rotationMode,
}: ShareProps) {
  const { t } = useTranslation();
  const { theme } = settingsData;

  const shareText = useMemo(() => {
    const guessCount =
      guesses[guesses.length - 1]?.distance === 0 ? guesses.length : "X";
    const dayCount = dayNumber(dayString);
    const difficultyModifierEmoji = hideImageMode
      ? " 🙈"
      : rotationMode
      ? " 🌀"
      : "";
    const title = `#WW2dle #${dayCount} ${guessCount}/6${difficultyModifierEmoji}`;

    const guessString = guesses
      .map((guess) => {
        const percent = computeProximityPercent(guess.distance);
        return generateSquareCharacters(percent, theme).join("");
      })
      .join("\n");

    // Swap for a custom domain if one is registered later.
    return [title, guessString, "https://axelb152.github.io/ww2dle"].join("\n");
  }, [dayString, guesses, hideImageMode, rotationMode, theme]);

  return (
    <CopyToClipboard
      text={shareText}
      onCopy={() => toast(t("copy"))}
      options={{
        format: "text/plain",
      }}
    >
      <button className="border-2 px-4 uppercase bg-red-600 hover:bg-red-500 active:bg-red-700 text-white w-full">
        {t("share")}
      </button>
    </CopyToClipboard>
  );
}
