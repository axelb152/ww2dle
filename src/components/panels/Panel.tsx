import Modal from "react-modal";
import React from "react";
import { useTranslation } from "react-i18next";

interface PanelProps {
  title: string;
  isOpen: boolean;
  close: () => void;
  children?: React.ReactNode;
}

export function Panel({ title, isOpen, close, children }: PanelProps) {
  const { t } = useTranslation();

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={close}
      className="flex justify-center h-full"
      ariaHideApp={false}
    >
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 dark:text-slate-100 text-sm overflow-auto px-2">
        <header className="border-b-2 border-gray-200 mb-3 flex">
          <h2 className="text-2xl font-bold uppercase tracking-wide text-center my-1 flex-auto">
            {title}
          </h2>
          <button
            type="button"
            className="grid h-11 w-11 shrink-0 place-items-center text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
            aria-label={t("close")}
            onClick={close}
          >
            ✕
          </button>
        </header>
        {children}
      </div>
    </Modal>
  );
}
