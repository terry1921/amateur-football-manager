"use client";

import { Ban, Trash2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActionState, useRef } from "react";
import type { AppLocale } from "@/i18n/routing";
import { cancelMatchAction, deleteMatchAction } from "./actions";
import {
  initialMatchLifecycleState,
  type MatchLifecycleActionState,
} from "./state";
import { useViewerTimeZone } from "./use-viewer-time-zone";

type LifecycleAction = (
  state: MatchLifecycleActionState,
) => Promise<MatchLifecycleActionState>;

function ConfirmAction({
  action,
  kind,
  opponent,
  kickoffAt,
}: {
  action: LifecycleAction;
  kind: "cancel" | "delete";
  opponent: string;
  kickoffAt: string;
}) {
  const locale = useLocale();
  const timeZone = useViewerTimeZone();
  const t = useTranslations("Matches.confirm");
  const [state, formAction, pending] = useActionState(
    action,
    initialMatchLifecycleState,
  );
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const Icon = kind === "cancel" ? Ban : Trash2;
  const date = timeZone
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeZone,
      }).format(new Date(kickoffAt))
    : "—";

  const close = () => {
    dialog.current?.close();
    opener.current?.focus();
  };

  return (
    <>
      <button
        ref={opener}
        type="button"
        onClick={() => dialog.current?.showModal()}
        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 ${
          kind === "delete"
            ? "border-red-200 text-red-700 focus-visible:outline-red-700"
            : "border-amber-300 text-amber-800 focus-visible:outline-amber-700"
        }`}
      >
        <Icon aria-hidden="true" className="size-4" />
        {t(kind === "cancel" ? "cancelConfirm" : "deleteConfirm")}
      </button>
      <dialog
        ref={dialog}
        onClose={() => opener.current?.focus()}
        className="m-auto w-[min(92vw,30rem)] rounded-2xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/45"
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black tracking-[-0.03em]">
                {t(kind === "cancel" ? "cancelTitle" : "deleteTitle")}
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                {t(
                  kind === "cancel" ? "cancelDescription" : "deleteDescription",
                  { opponent, date },
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label={t("close")}
              className="grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-[#f1f6f3] focus-visible:outline-2 focus-visible:outline-pitch"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </div>
          {state.message ? (
            <p role="alert" className="mt-4 text-sm text-red-700">
              {state.message}
            </p>
          ) : null}
          <form
            action={formAction}
            className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"
          >
            <button
              type="button"
              onClick={close}
              disabled={pending}
              className="min-h-11 rounded-lg border border-[#b8c5d2] px-4 text-sm font-bold"
            >
              {t("close")}
            </button>
            <button
              type="submit"
              disabled={pending}
              aria-busy={pending}
              className={`min-h-11 rounded-lg px-4 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60 ${
                kind === "delete" ? "bg-red-700" : "bg-amber-700"
              }`}
            >
              {pending
                ? t("working")
                : t(kind === "cancel" ? "cancelConfirm" : "deleteConfirm")}
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
}

export function MatchActions({
  matchId,
  opponent,
  kickoffAt,
  canCancel,
  canDelete,
}: {
  matchId: string;
  opponent: string;
  kickoffAt: string;
  canCancel: boolean;
  canDelete: boolean;
}) {
  const locale = useLocale() as AppLocale;
  return (
    <div className="flex flex-wrap gap-2">
      {canCancel ? (
        <ConfirmAction
          action={cancelMatchAction.bind(null, locale, matchId)}
          kind="cancel"
          opponent={opponent}
          kickoffAt={kickoffAt}
        />
      ) : null}
      {canDelete ? (
        <ConfirmAction
          action={deleteMatchAction.bind(null, locale, matchId)}
          kind="delete"
          opponent={opponent}
          kickoffAt={kickoffAt}
        />
      ) : null}
    </div>
  );
}
