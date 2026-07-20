import { Guesses } from "../Guesses";
import { Panel } from "./Panel";
import React from "react";
import { WW2dle } from "../WW2dle";
import { formatDistance } from "../../domain/geography";
import { SettingsData } from "../../hooks/useSettings";

interface InfosProps {
  isOpen: boolean;
  close: () => void;
  settingsData: SettingsData;
}

export function InfosFr({ isOpen, close, settingsData }: InfosProps) {
  return (
    <Panel title="Comment jouer" isOpen={isOpen} close={close}>
      <div className="space-y-3 text-justify border-b-2 border-gray-200 pb-3 mb-3">
        <div>
          Devinez la bataille <WW2dle /> en 6 essais.
        </div>
        <div>
          Chaque essai est une bataille ou une opération militaire de la Seconde
          Guerre mondiale. La carte montre le littoral autour du lieu de la
          bataille.
        </div>
        <div>
          Après chaque essai, vous obtiendrez la distance, la direction et la
          proximité entre votre essai et la bataille cible.
        </div>
        <div>
          Les noms des batailles sont indiqués en anglais (par exemple « Kursk »
          et non « Koursk »).
        </div>
      </div>
      <div className="space-y-3 text-justify border-b-2 border-gray-200 pb-3 mb-3">
        <div className="font-bold">Exemples</div>
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
            Votre essai <span className="uppercase font-bold">Midway</span> est
            à {formatDistance(9700000, settingsData.distanceUnit)} de la
            bataille cible, la bataille cible est en direction ouest et vous
            avez seulement 52% de proximité car c&apos;est assez loin !
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
            Votre deuxième essai{" "}
            <span className="uppercase font-bold">El Alamein</span> se rapproche
            ! {formatDistance(2350000, settingsData.distanceUnit)} de distance,
            direction nord-nord-est et 88% !
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
            Le prochain essai,{" "}
            <span className="uppercase font-bold">Kursk</span>, c&apos;est la
            bataille correcte. Bien joué ⚔️
          </div>
        </div>
      </div>
      <div className="space-y-3 text-justify border-b-2 border-gray-200 pb-3 mb-3 font-bold">
        Une nouvelle bataille <WW2dle /> sera disponible chaque jour !
      </div>
      <div className="space-y-3 text-justify border-b-2 border-gray-200 pb-3 mb-3">
        <div className="font-bold">À propos de la distance</div>
        <div>
          Les distances affichées correspondent aux distances entre votre
          sélection et les coordonnées approximatives du champ de bataille.
          Celles-ci sont simplement une approximation pour les besoins du jeu.
        </div>
      </div>
      <div className="space-y-3 text-justify border-b-2 border-gray-200 pb-3 mb-3">
        <WW2dle /> a été <span className="font-bold">fortement</span> inspiré
        par{" "}
        <a
          className="underline"
          href="https://worldle.teuteuf.fr/"
          target="_blank"
          rel="noopener noreferrer"
        >
          🌍 Worldle
        </a>{" "}
        créé par{" "}
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
          Forké par{" "}
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
