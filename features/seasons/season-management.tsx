"use client";

import { Archive, CalendarDays, Eye, Pencil, Play, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { activateSeasonAction, completeSeasonAction } from "./actions";
import type { AppLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import type { CurrentSeason } from "./current-season";
import type { SeasonWithUsage } from "./data";
import { SeasonLifecycleButton } from "./season-lifecycle-button";

function formatDate(value: string | null, locale: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function DateRange({
  start,
  end,
}: {
  start: string | null;
  end: string | null;
}) {
  const locale = useLocale();
  return (
    <span>
      {formatDate(start, locale)} – {formatDate(end, locale)}
    </span>
  );
}

function StatusBadge({ status }: { status: SeasonWithUsage["status"] }) {
  const t = useTranslations("Seasons.status");
  const styles = {
    active: "border-pitch/40 bg-pitch/8 text-pitch",
    draft: "border-[#cbd5df] bg-[#f4f7f9] text-ink",
    completed: "border-[#cbd5df] bg-white text-muted",
  }[status];

  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-bold ${styles}`}
    >
      {t(status)}
    </span>
  );
}

function SeasonRow({ season }: { season: SeasonWithUsage }) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("Seasons");
  const activate = activateSeasonAction.bind(null, locale, season.id);
  const complete = completeSeasonAction.bind(null, locale, season.id);

  return (
    <li className="grid gap-3 border-t border-line px-5 py-5 first:border-t-0 md:grid-cols-[minmax(10rem,1.2fr)_minmax(12rem,1.2fr)_8rem_minmax(16rem,auto)] md:items-center md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <CalendarDays
          aria-hidden="true"
          className="size-5 shrink-0 text-pitch"
        />
        <div className="min-w-0">
          <p className="truncate font-black text-ink">{season.name}</p>
          {season.matchCount > 0 ? (
            <p className="mt-0.5 text-xs text-muted">
              {t("matches", { count: season.matchCount })}
            </p>
          ) : null}
        </div>
      </div>
      <p className="pl-8 text-sm text-muted md:pl-0">
        <DateRange start={season.start_date} end={season.end_date} />
      </p>
      <div className="pl-8 md:pl-0">
        <StatusBadge status={season.status} />
      </div>
      <div className="flex flex-wrap items-center gap-1 border-t border-line pt-3 md:justify-end md:border-t-0 md:pt-0">
        <Link
          href={`/seasons/${season.id}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold text-ink transition hover:bg-[#f1f6f3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
        >
          <Eye aria-hidden="true" className="size-4" />
          {t("actions.view")}
        </Link>
        {season.editable ? (
          <Link
            href={`/seasons/${season.id}/edit`}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold text-pitch transition hover:bg-pitch/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
          >
            <Pencil aria-hidden="true" className="size-4" />
            {t("actions.edit")}
          </Link>
        ) : null}
        {season.status === "draft" ? (
          <SeasonLifecycleButton
            action={activate}
            label={t("actions.activate")}
            icon={Play}
            primary
          />
        ) : null}
        {season.status !== "completed" ? (
          <SeasonLifecycleButton
            action={complete}
            label={
              season.status === "active"
                ? t("actions.complete")
                : t("actions.archive")
            }
            icon={Archive}
          />
        ) : null}
      </div>
    </li>
  );
}

function EmptySeasons() {
  const t = useTranslations("Seasons.empty");
  return (
    <section className="rounded-2xl border border-line bg-white px-5 py-12 text-center shadow-[0_14px_44px_rgba(7,26,54,0.04)] sm:px-8">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-pitch/8 text-pitch">
        <CalendarDays aria-hidden="true" className="size-7" />
      </span>
      <h2 className="mt-5 text-2xl font-black tracking-[-0.03em] text-ink">
        {t("title")}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
        {t("description")}
      </p>
      <Link
        href="/seasons/new"
        className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-pitch px-5 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
      >
        <Plus aria-hidden="true" className="size-4" />
        {t("action")}
      </Link>
    </section>
  );
}

export function SeasonManagement({
  seasons,
  activeSeason,
}: {
  seasons: SeasonWithUsage[];
  activeSeason: CurrentSeason | null;
}) {
  const t = useTranslations("Seasons");

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-[-0.04em] text-ink sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-2 max-w-2xl text-base leading-7 text-muted">
            {t("description")}
          </p>
        </div>
        <Link
          href="/seasons/new"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-pitch px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(0,163,49,0.16)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
        >
          <Plus aria-hidden="true" className="size-4" />
          {t("create")}
        </Link>
      </header>

      {seasons.length === 0 ? (
        <EmptySeasons />
      ) : (
        <>
          {activeSeason ? (
            <section className="grid gap-4 rounded-2xl border border-pitch/35 bg-white p-5 shadow-[0_14px_44px_rgba(7,26,54,0.035)] sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:p-6">
              <span className="grid size-12 place-items-center rounded-full bg-pitch/8 text-pitch">
                <CalendarDays aria-hidden="true" className="size-6" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-pitch">
                  {t("activeSeason")}
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.03em] text-ink">
                  {activeSeason.name}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  <DateRange
                    start={activeSeason.start_date}
                    end={activeSeason.end_date}
                  />
                </p>
              </div>
              <StatusBadge status="active" />
            </section>
          ) : null}

          <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_14px_44px_rgba(7,26,54,0.04)]">
            <div className="border-b border-line px-5 py-5 sm:px-6">
              <h2 className="text-xl font-black tracking-[-0.03em] text-ink">
                {t("history")}
              </h2>
            </div>
            <div className="hidden grid-cols-[minmax(10rem,1.2fr)_minmax(12rem,1.2fr)_8rem_minmax(16rem,auto)] border-b border-line bg-[#f8faf9] px-6 py-3 text-xs font-black uppercase tracking-[0.08em] text-muted md:grid">
              <span>{t("columns.season")}</span>
              <span>{t("columns.dates")}</span>
              <span>{t("columns.status")}</span>
              <span className="text-right">{t("columns.actions")}</span>
            </div>
            <ul>
              {seasons.map((season) => (
                <SeasonRow key={season.id} season={season} />
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
