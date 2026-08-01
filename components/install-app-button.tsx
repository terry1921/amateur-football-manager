"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppButton() {
  const t = useTranslations("DashboardShell");
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(
    null,
  );
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (!promptEvent || installed) return null;

  const install = async () => {
    await promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
  };

  return (
    <button
      type="button"
      onClick={install}
      className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-pitch px-3 text-sm font-bold text-pitch transition hover:bg-pitch/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
    >
      <Download aria-hidden="true" className="size-4" />
      {t("install")}
    </button>
  );
}
