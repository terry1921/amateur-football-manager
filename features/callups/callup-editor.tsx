"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CheckSquare2,
  Save,
  Search,
  UsersRound,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActionState, useMemo, useState } from "react";
import { MatchDateTime } from "@/features/matches/match-date-time";
import {
  getPlayerDisplayName,
  playerPositions,
  playerStatuses,
} from "@/features/players/model";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { saveCallupAction } from "./actions";
import {
  clearCallupSelection,
  filterCallupPlayers,
  groupSelectedPlayers,
  selectAllActivePlayers,
  type CallupMatch,
  type CallupPlayer,
  type CallupPositionFilter,
  type CallupSelectionFilter,
  type CallupStatusFilter,
} from "./model";
import { initialCallupActionState } from "./state";

function PlayerStatusBadge({ status }: Pick<CallupPlayer, "status">) {
  const t = useTranslations("Callups");
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
      {t(`playerStatus.${status}`)}
    </span>
  );
}

export function CallupEditor({
  match,
  players,
  lastUpdated,
  notice,
  rosterTruncated = false,
}: {
  match: CallupMatch;
  players: CallupPlayer[];
  lastUpdated: string | null;
  notice?: "saved";
  rosterTruncated?: boolean;
}) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("Callups");
  const editable = match.status === "scheduled";
  const [selectedIds, setSelectedIds] = useState(
    () =>
      new Set(players.filter(({ selected }) => selected).map(({ id }) => id)),
  );
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState<CallupPositionFilter>("all");
  const [status, setStatus] = useState<CallupStatusFilter>("all");
  const [selection, setSelection] = useState<CallupSelectionFilter>("all");
  const action = saveCallupAction.bind(null, locale, match.id);
  const [actionState, formAction, pending] = useActionState(
    action,
    initialCallupActionState,
  );

  const currentPlayers = useMemo(
    () =>
      players.map((player) => ({
        ...player,
        selected: selectedIds.has(player.id),
      })),
    [players, selectedIds],
  );
  const visiblePlayers = useMemo(
    () =>
      filterCallupPlayers(currentPlayers, {
        search,
        position,
        status,
        selection,
      }),
    [currentPlayers, position, search, selection, status],
  );
  const selectedGroups = useMemo(
    () => groupSelectedPlayers(currentPlayers),
    [currentPlayers],
  );
  const unavailable = currentPlayers.filter(
    ({ status }) => status !== "active",
  );

  const togglePlayer = (player: CallupPlayer) => {
    if (!editable || player.status !== "active") return;
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(player.id)) next.delete(player.id);
      else next.add(player.id);
      return next;
    });
  };

  const clearFilters = () => {
    setSearch("");
    setPosition("all");
    setStatus("all");
    setSelection("all");
  };
  const hasFilters =
    Boolean(search) ||
    position !== "all" ||
    status !== "all" ||
    selection !== "all";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href={`/matches/${match.id}`}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-pitch focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {t("back")}
      </Link>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-pitch">
            {match.season_name} · {t(`matchStatus.${match.status}`)}
          </p>
          <h1 className="mt-1 text-4xl font-black tracking-[-0.04em] text-ink sm:text-5xl">
            {editable ? t("title.manage") : t("title.view")}
          </h1>
          <p className="mt-2 text-base text-muted">
            {t("against", { opponent: match.opponent_name })} ·{" "}
            <MatchDateTime value={match.kickoff_at} />
          </p>
        </div>
        <div className="rounded-xl border border-line bg-white px-4 py-3 text-sm">
          <span className="font-bold text-muted">
            {t("selectedCount", { count: selectedIds.size })}
          </span>
        </div>
      </header>

      {notice === "saved" ? (
        <p
          role="status"
          className="rounded-xl border border-pitch/30 bg-pitch/8 px-4 py-3 text-sm font-bold text-pitch"
        >
          {t("feedback.saved")}
        </p>
      ) : null}
      {!editable ? (
        <p className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
          <AlertTriangle aria-hidden="true" className="size-4" />
          {t("readOnly")}
        </p>
      ) : null}
      {rosterTruncated ? (
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("truncated")}
        </p>
      ) : null}

      {players.length === 0 ? (
        <section className="rounded-2xl border border-line bg-white px-5 py-12 text-center shadow-[0_14px_44px_rgba(7,26,54,0.04)]">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-pitch/8 text-pitch">
            <UsersRound aria-hidden="true" className="size-7" />
          </span>
          <h2 className="mt-5 text-2xl font-black text-ink">
            {t("empty.noPlayers")}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
            {t("empty.noPlayersDescription")}
          </p>
          <Link
            href="/players"
            className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-pitch px-5 text-sm font-bold text-white"
          >
            {t("empty.playersAction")}
          </Link>
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-line bg-white p-5 shadow-[0_14px_44px_rgba(7,26,54,0.04)] sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-ink">
                  {t("selected.title")}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {lastUpdated ? (
                    <>
                      {t("selected.lastUpdated")}{" "}
                      <MatchDateTime value={lastUpdated} />
                    </>
                  ) : (
                    t("selected.notSaved")
                  )}
                </p>
              </div>
            </div>
            {selectedGroups.length === 0 ? (
              <p className="mt-5 rounded-xl bg-[#f6f9f7] px-4 py-5 text-sm text-muted">
                {t("empty.noCallup")}
              </p>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {selectedGroups.map((group) => (
                  <div
                    key={group.position}
                    className="rounded-xl border border-line p-4"
                  >
                    <h3 className="text-xs font-black uppercase tracking-[0.08em] text-pitch">
                      {t(`positionGroup.${group.position}`)}
                    </h3>
                    <ul className="mt-3 space-y-2">
                      {group.players.map((player) => (
                        <li
                          key={player.id}
                          className="flex items-center justify-between gap-3 text-sm font-bold text-ink"
                        >
                          <span>
                            {player.shirt_number === null
                              ? "—"
                              : `#${player.shirt_number}`}{" "}
                            · {getPlayerDisplayName(player)}
                          </span>
                          {player.status !== "active" ? (
                            <PlayerStatusBadge status={player.status} />
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          {unavailable.length > 0 ? (
            <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
              <h2 className="text-xl font-black text-ink">
                {t("unavailable.title")}
              </h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {unavailable.map((player) => (
                  <li
                    key={player.id}
                    className="rounded-xl bg-[#f8faf9] px-4 py-3 text-sm"
                  >
                    <p className="font-bold text-ink">
                      {getPlayerDisplayName(player)}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {t("unavailable.reason", {
                        status: t(`playerStatus.${player.status}`),
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <form
            action={formAction}
            className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_14px_44px_rgba(7,26,54,0.04)]"
          >
            {[...selectedIds].map((id) => (
              <input key={id} type="hidden" name="playerIds" value={id} />
            ))}
            <div className="border-b border-line p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-black text-ink">
                  {editable ? t("editor.title") : t("editor.readOnlyTitle")}
                </h2>
                {editable ? (
                  <div className="flex flex-col gap-2 min-[430px]:flex-row">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedIds(selectAllActivePlayers(currentPlayers))
                      }
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-pitch px-4 text-sm font-bold text-pitch"
                    >
                      <CheckSquare2 aria-hidden="true" className="size-4" />
                      {t("bulk.selectAll")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedIds(clearCallupSelection())}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#b8c5d2] px-4 text-sm font-bold text-muted"
                    >
                      <X aria-hidden="true" className="size-4" />
                      {t("bulk.clear")}
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-[minmax(13rem,1fr)_10rem_10rem_10rem_auto] md:items-end">
                <label className="relative block">
                  <span className="sr-only">{t("filters.search")}</span>
                  <Search
                    aria-hidden="true"
                    className="absolute left-3 top-3.5 size-4 text-muted"
                  />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t("filters.search")}
                    className="min-h-11 w-full rounded-lg border border-[#c5d0da] pl-10 pr-3 text-sm"
                  />
                </label>
                <label className="text-xs font-bold text-muted">
                  {t("filters.position")}
                  <select
                    value={position}
                    onChange={(event) =>
                      setPosition(event.target.value as CallupPositionFilter)
                    }
                    className="mt-1 min-h-11 w-full rounded-lg border border-[#c5d0da] px-3 text-sm text-ink"
                  >
                    <option value="all">{t("filters.allPositions")}</option>
                    {playerPositions.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-bold text-muted">
                  {t("filters.status")}
                  <select
                    value={status}
                    onChange={(event) =>
                      setStatus(event.target.value as CallupStatusFilter)
                    }
                    className="mt-1 min-h-11 w-full rounded-lg border border-[#c5d0da] px-3 text-sm text-ink"
                  >
                    <option value="all">{t("filters.allStatuses")}</option>
                    {playerStatuses.map((value) => (
                      <option key={value} value={value}>
                        {t(`playerStatus.${value}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-bold text-muted">
                  {t("filters.selection")}
                  <select
                    value={selection}
                    onChange={(event) =>
                      setSelection(event.target.value as CallupSelectionFilter)
                    }
                    className="mt-1 min-h-11 w-full rounded-lg border border-[#c5d0da] px-3 text-sm text-ink"
                  >
                    <option value="all">{t("filters.allSelections")}</option>
                    <option value="selected">{t("filters.selected")}</option>
                    <option value="unselected">
                      {t("filters.unselected")}
                    </option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={!hasFilters}
                  className="min-h-11 rounded-lg px-3 text-sm font-bold text-muted disabled:opacity-40"
                >
                  {t("filters.clear")}
                </button>
              </div>
            </div>

            {visiblePlayers.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-muted">
                {t("empty.filtered")}
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {visiblePlayers.map((player) => {
                  const selectable = editable && player.status === "active";
                  return (
                    <li key={player.id} className="p-4 sm:px-5">
                      <label
                        className={`flex min-h-11 items-center gap-3 ${selectable ? "cursor-pointer" : "cursor-not-allowed"}`}
                      >
                        <input
                          type="checkbox"
                          aria-label={getPlayerDisplayName(player)}
                          checked={selectedIds.has(player.id)}
                          disabled={!selectable}
                          onChange={() => togglePlayer(player)}
                          className="size-5 accent-pitch"
                        />
                        <span className="grid min-w-9 place-items-center rounded-lg bg-[#f1f6f3] px-2 py-2 text-sm font-black text-pitch">
                          {player.shirt_number ?? "—"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold text-ink">
                            {getPlayerDisplayName(player)}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted">
                            {player.position}
                          </span>
                        </span>
                        <PlayerStatusBadge status={player.status} />
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}

            {actionState.message ? (
              <p role="alert" className="mx-5 mt-4 text-sm text-red-700">
                {actionState.message}
              </p>
            ) : null}
            {editable ? (
              <div className="flex flex-col gap-3 border-t border-line bg-[#f8faf9] p-5 min-[430px]:flex-row min-[430px]:items-center min-[430px]:justify-between">
                <p className="text-xs leading-5 text-muted">
                  {t("editor.help")}
                </p>
                <button
                  type="submit"
                  disabled={pending}
                  aria-busy={pending}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-pitch px-5 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60"
                >
                  <Save aria-hidden="true" className="size-4" />
                  {pending ? t("actions.saving") : t("actions.save")}
                </button>
              </div>
            ) : null}
          </form>
        </>
      )}
    </div>
  );
}
