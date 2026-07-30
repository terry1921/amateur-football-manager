"use client";

import { Eye, Pencil, Plus, Search, UsersRound, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import type { AppLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { changePlayerStatusAction } from "./actions";
import {
  filterPlayers,
  getPlayerDisplayName,
  getSquadSummary,
  playerPositions,
  playerStatuses,
  type Player,
  type PlayerPositionFilter,
  type PlayerStatusFilter,
} from "./model";
import { PlayerLifecycleButton } from "./player-lifecycle-button";

function initials(player: Player) {
  return [player.first_name, player.last_name]
    .filter(Boolean)
    .map((part) => part![0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function StatusBadge({ status }: { status: Player["status"] }) {
  const t = useTranslations("Players.status");
  const styles = {
    active: "border-pitch/35 bg-pitch/8 text-pitch",
    injured: "border-amber-300 bg-amber-50 text-amber-800",
    suspended: "border-red-200 bg-red-50 text-red-700",
    inactive: "border-slate-300 bg-slate-50 text-slate-600",
  }[status];
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-bold ${styles}`}
    >
      {t(status)}
    </span>
  );
}

function PlayerActions({ player }: { player: Player }) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("Players.actions");
  const targetStatus = player.status === "inactive" ? "active" : "inactive";
  const lifecycle = changePlayerStatusAction.bind(
    null,
    locale,
    player.id,
    targetStatus,
  );
  return (
    <div className="flex flex-wrap items-center gap-1">
      <Link
        href={`/players/${player.id}`}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold text-ink transition hover:bg-[#f1f6f3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
      >
        <Eye aria-hidden="true" className="size-4" />
        {t("view")}
      </Link>
      <Link
        href={`/players/${player.id}/edit`}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold text-pitch transition hover:bg-pitch/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
      >
        <Pencil aria-hidden="true" className="size-4" />
        {t("edit")}
      </Link>
      <PlayerLifecycleButton
        action={lifecycle}
        label={t(targetStatus === "active" ? "reactivate" : "deactivate")}
        lifecycle={targetStatus === "active" ? "reactivate" : "deactivate"}
      />
    </div>
  );
}

function EmptySquad() {
  const t = useTranslations("Players.empty");
  return (
    <section className="rounded-2xl border border-line bg-white px-5 py-12 text-center shadow-[0_14px_44px_rgba(7,26,54,0.04)] sm:px-8">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-pitch/8 text-pitch">
        <UsersRound aria-hidden="true" className="size-7" />
      </span>
      <h2 className="mt-5 text-2xl font-black tracking-[-0.03em] text-ink">
        {t("title")}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
        {t("description")}
      </p>
      <Link
        href="/players/new"
        className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-pitch px-5 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
      >
        <Plus aria-hidden="true" className="size-4" />
        {t("action")}
      </Link>
    </section>
  );
}

export function PlayerManagement({
  players,
  notice,
}: {
  players: Player[];
  notice?: "created" | "updated" | "deactivated" | "reactivated";
}) {
  const t = useTranslations("Players");
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState<PlayerPositionFilter>("all");
  const [status, setStatus] = useState<PlayerStatusFilter>("current");
  const summary = getSquadSummary(players);
  const visible = useMemo(
    () => filterPlayers(players, { search, position, status }),
    [players, position, search, status],
  );
  const hasFilters =
    Boolean(search) || position !== "all" || status !== "current";
  const clear = () => {
    setSearch("");
    setPosition("all");
    setStatus("current");
  };

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
          href="/players/new"
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
      {players.length === 0 ? (
        <EmptySquad />
      ) : (
        <>
          <section
            aria-label={t("summary.label")}
            className="grid grid-cols-3 divide-x divide-line rounded-2xl border border-line bg-white py-5 shadow-[0_14px_44px_rgba(7,26,54,0.035)]"
          >
            {(["total", "available", "unavailable"] as const).map((key) => (
              <div key={key} className="px-2 text-center sm:px-6">
                <p className="text-xs font-bold text-muted">
                  {t(`summary.${key}`)}
                </p>
                <p
                  className={`mt-1 text-2xl font-black ${key === "available" ? "text-pitch" : key === "unavailable" ? "text-red-700" : "text-ink"}`}
                >
                  {summary[key]}
                </p>
              </div>
            ))}
          </section>
          <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_14px_44px_rgba(7,26,54,0.04)]">
            <div className="grid gap-4 border-b border-line p-4 sm:p-5 lg:grid-cols-[minmax(14rem,1fr)_12rem_12rem_auto] lg:items-end">
              <label className="relative block">
                <span className="sr-only">{t("filters.search")}</span>
                <Search
                  aria-hidden="true"
                  className="absolute left-3 top-3.5 size-4 text-muted"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("filters.search")}
                  className="min-h-11 w-full rounded-lg border border-[#c5d0da] bg-white pl-10 pr-3 text-sm text-ink outline-none focus:border-pitch focus:ring-3 focus:ring-pitch/10"
                />
              </label>
              <label className="text-xs font-bold text-muted">
                {t("filters.position")}
                <select
                  value={position}
                  onChange={(event) =>
                    setPosition(event.target.value as PlayerPositionFilter)
                  }
                  className="mt-1 min-h-11 w-full rounded-lg border border-[#c5d0da] bg-white px-3 text-sm text-ink"
                >
                  <option value="all">{t("filters.allPositions")}</option>
                  {playerPositions.map((value) => (
                    <option value={value} key={value}>
                      {t(`position.${value}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold text-muted">
                {t("filters.status")}
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as PlayerStatusFilter)
                  }
                  className="mt-1 min-h-11 w-full rounded-lg border border-[#c5d0da] bg-white px-3 text-sm text-ink"
                >
                  <option value="current">{t("filters.current")}</option>
                  <option value="all">{t("filters.allStatuses")}</option>
                  {playerStatuses.map((value) => (
                    <option value={value} key={value}>
                      {t(`status.${value}`)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={clear}
                disabled={!hasFilters}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold text-muted hover:bg-[#f1f6f3] hover:text-ink disabled:opacity-40"
              >
                <X aria-hidden="true" className="size-4" />
                {t("filters.clear")}
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
                  onClick={clear}
                  className="mt-4 min-h-11 rounded-lg border border-pitch px-4 text-sm font-bold text-pitch"
                >
                  {t("filters.clear")}
                </button>
              </div>
            ) : (
              <>
                <div className="hidden grid-cols-[minmax(12rem,1.3fr)_5rem_8rem_8rem_minmax(18rem,auto)] border-b border-line bg-[#f8faf9] px-6 py-3 text-xs font-black uppercase tracking-[0.08em] text-muted md:grid">
                  <span>{t("columns.player")}</span>
                  <span>{t("columns.number")}</span>
                  <span>{t("columns.position")}</span>
                  <span>{t("columns.status")}</span>
                  <span className="text-right">{t("columns.actions")}</span>
                </div>
                <ul>
                  {visible.map((player) => (
                    <li
                      key={player.id}
                      className="grid gap-3 border-t border-line px-5 py-5 first:border-t-0 md:grid-cols-[minmax(12rem,1.3fr)_5rem_8rem_8rem_minmax(18rem,auto)] md:items-center md:px-6"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-pitch/8 text-xs font-black text-pitch">
                          {initials(player)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-black text-ink">
                            {getPlayerDisplayName(player)}
                          </p>
                          {player.nickname ? (
                            <p className="truncate text-xs text-muted">
                              “{player.nickname}”
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <p className="pl-[3.25rem] text-sm text-muted md:pl-0">
                        {player.shirt_number ?? "—"}
                      </p>
                      <p className="pl-[3.25rem] text-sm font-bold text-ink md:pl-0">
                        {t(`position.${player.position}`)}
                      </p>
                      <div className="pl-[3.25rem] md:pl-0">
                        <StatusBadge status={player.status} />
                      </div>
                      <div className="border-t border-line pt-3 md:flex md:justify-end md:border-0 md:pt-0">
                        <PlayerActions player={player} />
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
