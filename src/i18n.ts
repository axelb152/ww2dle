import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      placeholder: "Battle, operation...",
      guess: "Guess",
      share: "Share",
      showOnWikipedia: "⚔️ on Wikipedia",
      welldone: "Well done!",
      unknownBattle: "Unknown battle!",
      copy: "Copied results to clipboard",
      showBattle: "🗺️ Show battle map",
      cancelRotation: "🌀 Cancel rotation",
      hintYear: "Hint: {{year}}",
      hintTheater: "Hint: {{theater}} theater",
      settings: {
        title: "Settings",
        distanceUnit: "Unit of distance",
        theme: "Theme",
        difficultyModifiers: "Difficulty modifiers",
        startingNextDay: "Starting the next day!",
        noImageMode: "Hide battle map for more of a challenge.",
        rotationMode: "Rotate randomly battle map.",
      },
      buyMeACoffee: "Enjoying this game? Checkout the original",
    },
  },
  fr: {
    translation: {
      placeholder: "Bataille, opération...",
      guess: "Deviner",
      share: "Partager",
      showOnWikipedia: "⚔️ sur Wikipédia",
      welldone: "Bien joué ⚔️",
      unknownBattle: "Bataille inconnue !",
      copy: "Résultat copié !",
      showBattle: "🗺️ Montrer la carte",
      cancelRotation: "🌀 Annule la rotation",
      hintYear: "Indice : {{year}}",
      hintTheater: "Indice : théâtre {{theater}}",
      settings: {
        title: "Paramètres",
        distanceUnit: "Unité de distance",
        theme: "Thème",
        difficultyModifiers: "Modificateurs de difficulté",
        startingNextDay: "À partir du jour suivant !",
        noImageMode: "Masquer la carte de la bataille pour un plus grand défi.",
        rotationMode: "Faire pivoter la carte de la bataille aléatoirement.",
      },
      buyMeACoffee: "Vous appréciez ce jeu ? Découvrez l'original",
    },
  },
};

i18n
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    resources,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
