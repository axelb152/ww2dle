import { ToastContainer, Flip } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Game } from "./components/Game";
import React, { useEffect, useState } from "react";
import { Infos } from "./components/panels/Infos";
import { useTranslation } from "react-i18next";
import { InfosFr } from "./components/panels/InfosFr";
import { Settings } from "./components/panels/Settings";
import { Leagues } from "./components/panels/Leagues";
import { useSettings } from "./hooks/useSettings";
import { LeaguesProvider, useLeagues } from "./hooks/useLeagues";
import { WW2dle } from "./components/WW2dle";

function AppInner() {
  const { t, i18n } = useTranslation();

  const [infoOpen, setInfoOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [leaguesOpen, setLeaguesOpen] = useState(false);

  const [settingsData, updateSettings] = useSettings();
  const { joinLeague } = useLeagues();

  // Auto-join from a ?join=<league_id> link, then clean the URL.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("join");
    if (id == null) {
      return;
    }
    window.history.replaceState(null, "", window.location.pathname);
    joinLeague(id).then((league) => {
      if (league != null) {
        setLeaguesOpen(true);
      }
    });
  }, [joinLeague]);

  useEffect(() => {
    if (settingsData.theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [settingsData.theme]);

  return (
    <>
      <ToastContainer
        hideProgressBar
        position="top-center"
        transition={Flip}
        theme={settingsData.theme}
        autoClose={2000}
        bodyClassName="font-bold text-center"
      />
      {i18n.resolvedLanguage === "fr" ? (
        <InfosFr
          isOpen={infoOpen}
          close={() => setInfoOpen(false)}
          settingsData={settingsData}
        />
      ) : (
        <Infos
          isOpen={infoOpen}
          close={() => setInfoOpen(false)}
          settingsData={settingsData}
        />
      )}
      <Settings
        isOpen={settingsOpen}
        close={() => setSettingsOpen(false)}
        settingsData={settingsData}
        updateSettings={updateSettings}
      />
      <Leagues isOpen={leaguesOpen} close={() => setLeaguesOpen(false)} />
      <div className="flex justify-center flex-auto dark:bg-slate-900 dark:text-slate-50">
        <div className="w-full max-w-lg flex flex-col">
          <header className="border-b-2 border-gray-200 flex">
            <button
              className="mx-3 text-xl"
              type="button"
              onClick={() => setInfoOpen(true)}
            >
              ❔
            </button>
            <h1 className="text-4xl font-bold uppercase tracking-wide text-center my-1 flex-auto">
              WW<span className="text-red-600">2</span>dle
            </h1>
            <button
              className="ml-3 text-xl"
              type="button"
              title={t("leagues.title")}
              onClick={() => setLeaguesOpen(true)}
            >
              🏆
            </button>
            <button
              className="mx-3 text-xl"
              type="button"
              onClick={() => setSettingsOpen(true)}
            >
              ⚙️
            </button>
          </header>
          <Game settingsData={settingsData} />
          <footer className="flex justify-center text-sm mt-8 mb-1">
            ❤️ <WW2dle /> ? -
            <a
              className="underline pl-1"
              href="https://worldle.teuteuf.fr/"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("Check out Worldle 🌍")}
            </a>
          </footer>
        </div>
      </div>
    </>
  );
}

function App() {
  return (
    <LeaguesProvider>
      <AppInner />
    </LeaguesProvider>
  );
}

export default App;
