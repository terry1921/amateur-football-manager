"use client";

import {
  CalendarDays,
  Eye,
  MapPin,
  Pencil,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import type { MatchSeason } from "./data";
import { MatchDateTime } from "./match-date-time";
import {
  filterMatches,
  getManagedScore,
  groupMatches,
  matchGroupIds,
  matchLocations,
  matchStatuses,
  type Match,
  type MatchFilters,
  type MatchGroupId,
  type MatchLocation,
  type MatchStatus,
} from "./model";

type MatchNotice = "created" | "updated" | "cancelled" | "deleted";

function StatusBadge({ status }: { status: MatchStatus }) {
  const t = useTranslations("Matches.status");
  const styles = {
    scheduled: "border-sky-200 bg-sky-50 text-sky-800",
    completed: "border-pitch/35 bg-pitch/8 text-pitch",
    cancelled: "border-slate-300 bg-slate-50 text-slate-600",
  }[status];
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-bold ${styles}`}
    >
      {t(status)}
    </span>
  );
}

function MatchCard({ match }: { match: Match }) {
  const t = useTranslations("Matches");
  const score = match.status === "completed" ? getManagedScore(match) : null;

  return (
    <li className="grid gap-4 border-t border-line px-5 py-5 first:border-t-0 md:grid-cols-[minmax(13rem,1.2fr)_minmax(12rem,1fr)_9rem_8rem_minmax(11rem,auto)] md:items-center md:px-6">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid min-w-10 place-items-center rounded-lg bg-pitch/8 px-2 py-2 text-sm font-black text-pitch">
            {score ? `${score.team}–${score.opponent}` : t("score.versus")}
          </span>
          <div className="min-w-0">
            <p className="truncate font-black text-ink">
              {match.opponent_name}
            </p>
            <p className="mt-0.5 text-xs font-bold text-muted">
              {t(`location.${match.home_away}`)}
            </p>
          </div>
        </div>
        {match.venue ? (
          <p className="mt-3 flex items-center gap-2 pl-[3.25rem] text-xs text-muted md:hidden">
            <MapPin aria-hidden="true" className="size-3.5 text-pitch" />
            {match.venue}
          </p>
        ) : null}
      </div>
      <div className="space-y-1 pl-[3.25rem] text-sm md:pl-0">
        <p className="font-bold text-ink">
          <MatchDateTime value={match.kickoff_at} />
        </p>
        {match.venue ? (
          <p className="hidden truncate text-xs text-muted md:block">
            {match.venue}
          </p>
        ) : null}
      </div>
      <p className="truncate pl-[3.25rem] text-sm text-muted md:pl-0">
        {match.season_name}
      </p>
      <div className="pl-[3.25rem] md:pl-0">
        <StatusBadge status={match.status} />
      </div>
      <div className="flex items-center gap-1 border-t border-line pt-3 md:justify-end md:border-t-0 md:pt-0">
        <Link
          href={`/matches/${match.id}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold text-ink transition hover:bg-[#f1f6f3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
        >
          <Eye aria-hidden="true" className="size-4" />
          {t("actions.view")}
        </Link>
        {match.status === "scheduled" ? (
          <Link
            href={`/matches/${match.id}/edit`}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold text-pitch transition hover:bg-pitch/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
          >
            <Pencil aria-hidden="true" className="size-4" />
            {t("actions.edit")}
          </Link>
        ) : null}
      </div>
    </li>
  );
}

function EmptyMatches() {
  const t = useTranslations("Matches.empty");
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
        href="/matches/new"
        className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-pitch px-5 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
      >
        <Plus aria-hidden="true" className="size-4" />
        {t("action")}
      </Link>
    </section>
  );
}

function syncFilters(filters: MatchFilters) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams();
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.season !== "all") params.set("season", filters.season);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.location !== "all") params.set("location", filters.location);
  if (filters.group !== "all") params.set("group", filters.group);
  const query = params.toString();
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${query ? `?${query}` : ""}`,
  );
}

export function MatchManagement({
  matches,
  seasons,
  initialFilters,
  notice,
  truncated = false,
}: {
  matches: Match[];
  seasons: MatchSeason[];
  initialFilters: MatchFilters;
  notice?: MatchNotice;
  truncated?: boolean;
}) {
  const t = useTranslations("Matches");
  const [filters, setFilters] = useState(initialFilters);
  const allGroups = useMemo(() => groupMatches(matches), [matches]);
  const visible = useMemo(
    () => filterMatches(matches, filters),
    [filters, matches],
  );
  const groups = useMemo(() => groupMatches(visible), [visible]);
  const hasFilters = Object.entries(filters).some(
    ([key, value]) => value !== (key === "search" ? "" : "all"),
  );
  const reset = () =>
    setFilters({
      search: "",
      season: "all",
      status: "all",
      location: "all",
      group: "all",
    });

  useEffect(() => syncFilters(filters), [filters]);

  const sections: Array<
    [Exclude<MatchGroupId, "all" | "past"> | "past", Match[]]
  > = [
    ["upcoming", groups.upcoming],
    ["past", groups.pastScheduled],
    ["completed", groups.completed],
    ["cancelled", groups.cancelled],
  ];

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
          href="/matches/new"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-pitch px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(0,163,49,0.16)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
        >
          <Plus aria-hidden="true" className="size-4" />
          {t("create")}
        </Link>
      </header>

      {notice ? (
        <p
          role="status"
          className="rounded-xl border border-pitch/30 bg-pitch/8 px-4 py-3 text-sm font-bold text-pitch"
        >
          {t(`feedback.${notice}`)}
        </p>
      ) : null}

      {matches.length === 0 ? (
        <EmptyMatches />
      ) : (
        <>
          <section
            aria-label={t("summary.label")}
            className="grid grid-cols-3 divide-x divide-line rounded-2xl border border-line bg-white py-5 shadow-[0_14px_44px_rgba(7,26,54,0.035)]"
          >
            {[
              ["upcoming", allGroups.upcoming.length],
              ["completed", allGroups.completed.length],
              ["cancelled", allGroups.cancelled.length],
            ].map(([key, count]) => (
              <div key={key} className="px-2 text-center sm:px-6">
                <p className="text-xs font-bold text-muted">
                  {t(`summary.${key}`)}
                </p>
                <p className="mt-1 text-2xl font-black text-ink">{count}</p>
              </div>
            ))}
          </section>

          {truncated ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {t("truncated")}
            </p>
          ) : null}

          <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_14px_44px_rgba(7,26,54,0.04)]">
            <div className="grid gap-4 border-b border-line p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-[minmax(14rem,1fr)_11rem_10rem_10rem_11rem_auto] lg:items-end">
              <label className="relative block sm:col-span-2 lg:col-span-1">
                <span className="sr-only">{t("filters.search")}</span>
                <Search
                  aria-hidden="true"
                  className="absolute left-3 top-3.5 size-4 text-muted"
                />
                <input
                  value={filters.search}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      search: event.target.value,
                    }))
                  }
                  placeholder={t("filters.search")}
                  className="min-h-11 w-full rounded-lg border border-[#c5d0da] bg-white pl-10 pr-3 text-sm text-ink outline-none focus:border-pitch focus:ring-3 focus:ring-pitch/10"
                />
              </label>
              <label className="text-xs font-bold text-muted">
                {t("filters.season")}
                <select
                  value={filters.season}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      season: event.target.value,
                    }))
                  }
                  className="mt-1 min-h-11 w-full rounded-lg border border-[#c5d0da] bg-white px-3 text-sm text-ink"
                >
                  <option value="all">{t("filters.allSeasons")}</option>
                  {seasons.map((season) => (
                    <option value={season.id} key={season.id}>
                      {season.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold text-muted">
                {t("filters.status")}
                <select
                  value={filters.status}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      status: event.target.value as MatchStatus | "all",
                    }))
                  }
                  className="mt-1 min-h-11 w-full rounded-lg border border-[#c5d0da] bg-white px-3 text-sm text-ink"
                >
                  <option value="all">{t("filters.allStatuses")}</option>
                  {matchStatuses.map((status) => (
                    <option value={status} key={status}>
                      {t(`status.${status}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold text-muted">
                {t("filters.location")}
                <select
                  value={filters.location}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      location: event.target.value as MatchLocation | "all",
                    }))
                  }
                  className="mt-1 min-h-11 w-full rounded-lg border border-[#c5d0da] bg-white px-3 text-sm text-ink"
                >
                  <option value="all">{t("filters.allLocations")}</option>
                  {matchLocations.map((location) => (
                    <option value={location} key={location}>
                      {t(`location.${location}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold text-muted">
                {t("filters.group")}
                <select
                  value={filters.group}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      group: event.target.value as MatchGroupId,
                    }))
                  }
                  className="mt-1 min-h-11 w-full rounded-lg border border-[#c5d0da] bg-white px-3 text-sm text-ink"
                >
                  {matchGroupIds.map((group) => (
                    <option value={group} key={group}>
                      {t(`groups.${group}`)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={reset}
                disabled={!hasFilters}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold text-muted hover:bg-[#f1f6f3] hover:text-ink disabled:opacity-40"
              >
                <X aria-hidden="true" className="size-4" />
                {t("filters.reset")}
              </button>
            </div>

            {visible.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <h2 className="text-xl font-black text-ink">
                  {t("filteredEmpty.title")}
                </h2>
                <p className="mt-2 text-sm text-muted">
                  {t("filteredEmpty.description")}
                </p>
                <button
                  type="button"
                  onClick={reset}
                  className="mt-4 min-h-11 rounded-lg border border-pitch px-4 text-sm font-bold text-pitch"
                >
                  {t("filters.reset")}
                </button>
              </div>
            ) : (
              <div className="divide-y divide-line">
                {sections.map(([group, fixtures]) =>
                  fixtures.length > 0 ? (
                    <section key={group} aria-labelledby={`matches-${group}`}>
                      <div className="border-b border-line bg-[#f8faf9] px-5 py-3 sm:px-6">
                        <h2
                          id={`matches-${group}`}
                          className="text-sm font-black uppercase tracking-[0.08em] text-ink"
                        >
                          {t(`groups.${group}`)}
                        </h2>
                      </div>
                      <ul>
                        {fixtures.map((match) => (
                          <MatchCard key={match.id} match={match} />
                        ))}
                      </ul>
                    </section>
                  ) : null,
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
