import { Guesses } from "../Guesses";
import { Panel } from "./Panel";
import React from "react";
import { WW2dle } from "../WW2dle";
import {
  computeProximityPercent,
  formatDistance,
} from "../../domain/geography";
import { SettingsData } from "../../hooks/useSettings";

interface InfosProps {
  isOpen: boolean;
  close: () => void;
  settingsData: SettingsData;
}

export function Infos({ isOpen, close, settingsData }: InfosProps) {
  return (
    <Panel title="How to play" isOpen={isOpen} close={close}>
      <div className="space-y-3 text-justify border-b-2 border-gray-200 pb-3 mb-3">
        <div>
          Guess the <WW2dle /> battle in 6 guesses.
        </div>
        <div>
          Each guess is a World War II battle or military operation. The map
          shows the coastline around the battle location.
        </div>
        <div>
          After each guess, you will have the distance, the direction and the
          proximity from your guess to the target battle.
        </div>
      </div>
      <div className="space-y-3 text-justify border-b-2 border-gray-200 pb-3 mb-3">
        <div className="font-bold">Examples</div>
        <div>
          <Guesses
            rowCount={1}
            guesses={[
              {
                name: "Midway",
                direction: "W",
                distance: 9_700_000,
              },
            ]}
            settingsData={settingsData}
          />
          <div className="my-2">
            Your guess <span className="uppercase font-bold">Midway</span> is{" "}
            {formatDistance(9700000, settingsData.distanceUnit)} away from the
            target battle, the target battle is in the West direction and you
            have only {computeProximityPercent(9_700_000)}% of proximity because
            it&apos;s quite far away!
          </div>
        </div>
        <div>
          <Guesses
            rowCount={1}
            guesses={[
              {
                name: "El Alamein",
                direction: "NNE",
                distance: 2_350_000,
              },
            ]}
            settingsData={settingsData}
          />
          <div className="my-2">
            Your second guess{" "}
            <span className="uppercase font-bold">El Alamein</span> is getting
            closer! {formatDistance(2350000, settingsData.distanceUnit)} away,
            North-North-East direction and {computeProximityPercent(2_350_000)}
            %!
          </div>
        </div>
        <div>
          <Guesses
            rowCount={1}
            guesses={[
              {
                name: "Kursk",
                direction: "N",
                distance: 0,
              },
            ]}
            settingsData={settingsData}
          />
          <div className="my-2">
            Next guess, <span className="uppercase font-bold">Kursk</span>,
            it&apos;s the correct battle. Well done ⚔️
          </div>
        </div>
      </div>
      <div className="space-y-3 text-justify border-b-2 border-gray-200 pb-3 mb-3 font-bold">
        A new <WW2dle /> battle will be available every day
      </div>
      <div className="space-y-3 text-justify border-b-2 border-gray-200 pb-3 mb-3">
        <div className="font-bold">About distance</div>
        <div>
          The distances displayed correspond to the distances between the
          selected and the approximate battlefield coordinates. These are simply
          an approximate for the purposes of the game.
        </div>
      </div>
      <div className="space-y-3 text-justify border-b-2 border-gray-200 pb-3 mb-3">
        <WW2dle /> has been <span className="font-bold">heavily</span> inspired
        by{" "}
        <a
          className="underline"
          href="https://worldle.teuteuf.fr/"
          target="_blank"
          rel="noopener noreferrer"
        >
          🌍 Worldle
        </a>{" "}
        created by{" "}
        <a
          className="underline"
          href="https://twitter.com/teuteuf"
          target="_blank"
          rel="noopener noreferrer"
        >
          @teuteuf
        </a>
        .
      </div>
      <div className="space-y-3 text-justify pb-3">
        <div>
          Forked by{" "}
          <a
            className="underline"
            href="https://github.com/axelb152"
            target="_blank"
            rel="noopener noreferrer"
          >
            @axelb152
          </a>
        </div>
      </div>
    </Panel>
  );
}
