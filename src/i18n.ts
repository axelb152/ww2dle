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
      leagues: {
        title: "Leagues",
        intro:
          "Compete with friends on your daily scores. Score: 8 points for a 1st-guess solve, −1 per guess, 3 for any attempt. Everything is stored on this device — share a league link to hand out a snapshot.",
        empty: "No leagues yet. Create one below.",
        members: "members",
        namePlaceholder: "League name",
        create: "Create",
        delete: "Delete league",
        confirmDelete: 'Delete league "{{name}}"?',
        back: "Back to leagues",
        member: "Member",
        played: "Played",
        today: "Today",
        total: "Total",
        noMembers: "No results yet. Add one below.",
        removeMember: "Remove member",
        confirmRemoveMember: "Remove {{name}} from this league?",
        addResult: "Add a result",
        memberPlaceholder: "Who? (name)",
        pasteOrMine:
          "Paste a friend's share text — or leave empty to use your own result from today",
        pasteFriend: "Paste a friend's share text",
        add: "Add result",
        addMine: "Add my result",
        badResult: "That doesn't look like a ww2dle result.",
        added: "Result added",
        share: "Copy league link",
        shareHint:
          "Sends a snapshot of the current standings — not a live sync.",
        copied: "League link copied to clipboard",
        importPrompt: 'Import league "{{name}}" onto this device?',
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
      leagues: {
        title: "Ligues",
        intro:
          "Affrontez vos amis sur les scores quotidiens. Score : 8 points si trouvé du 1er coup, −1 par essai, 3 pour toute tentative. Tout est stocké sur cet appareil — partagez un lien de ligue pour envoyer un instantané.",
        empty: "Aucune ligue. Créez-en une ci-dessous.",
        members: "membres",
        namePlaceholder: "Nom de la ligue",
        create: "Créer",
        delete: "Supprimer la ligue",
        confirmDelete: "Supprimer la ligue « {{name}} » ?",
        back: "Retour aux ligues",
        member: "Membre",
        played: "Jouées",
        today: "Auj.",
        total: "Total",
        noMembers: "Aucun résultat. Ajoutez-en un ci-dessous.",
        removeMember: "Retirer le membre",
        confirmRemoveMember: "Retirer {{name}} de cette ligue ?",
        addResult: "Ajouter un résultat",
        memberPlaceholder: "Qui ? (nom)",
        pasteOrMine:
          "Collez le partage d'un ami — ou laissez vide pour utiliser votre résultat du jour",
        pasteFriend: "Collez le partage d'un ami",
        add: "Ajouter",
        addMine: "Ajouter mon résultat",
        badResult: "Cela ne ressemble pas à un résultat ww2dle.",
        added: "Résultat ajouté",
        share: "Copier le lien de la ligue",
        shareHint:
          "Envoie un instantané du classement actuel — pas une synchro en direct.",
        copied: "Lien de la ligue copié",
        importPrompt: "Importer la ligue « {{name}} » sur cet appareil ?",
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
