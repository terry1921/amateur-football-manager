import { ArrowLeft, CalendarDays, Pencil, UsersRound } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { MatchActions } from "@/features/matches/match-actions";
import { MatchDateTime } from "@/features/matches/match-date-time";
import { getMatchDetails } from "@/features/matches/data";
import { canDeleteMatch, getManagedScore } from "@/features/matches/model";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

function value(input: string | string[] | undefined) {
  return Array.isArray(input) ? input[0] : input;
}

export default async function MatchDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: AppLocale; matchId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ locale, matchId }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const [details, t] = await Promise.all([
    getMatchDetails(matchId),
    getTranslations({ locale, namespace: "Matches" }),
  ]);
  if (!details) notFound();
  const { match, season } = details;
  const score = match.status === "completed" ? getManagedScore(match) : null;
  const notice = value(query.notice);
  const safeNotice =
    notice === "updated" || notice === "cancelled" ? notice : undefined;

  const fields = [
    [
      t("details.kickoff"),
      <MatchDateTime key="kickoff" value={match.kickoff_at} />,
    ],
    [t("details.season"), season.name],
    [t("details.location"), t(`location.${match.home_away}`)],
    [t("details.venue"), match.venue || t("details.notProvided")],
    [t("details.status"), t(`status.${match.status}`)],
    [
      t("details.score"),
      score ? `${score.team}–${score.opponent}` : t("details.scheduledScore"),
    ],
  ] as const;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/matches"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-pitch focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {t("details.back")}
      </Link>
      {safeNotice ? (
        <p
          role="status"
          className="mt-4 rounded-xl border border-pitch/30 bg-pitch/8 px-4 py-3 text-sm font-bold text-pitch"
        >
          {t(`feedback.${safeNotice}`)}
        </p>
      ) : null}
      <section className="mt-4 overflow-hidden rounded-2xl border border-line bg-white shadow-[0_18px_52px_rgba(7,26,54,0.05)]">
        <header className="flex flex-col gap-5 border-b border-line p-5 sm:flex-row sm:items-start sm:justify-between sm:p-8">
          <div className="flex gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-pitch/8 text-pitch">
              <CalendarDays aria-hidden="true" className="size-6" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-pitch">
                {t(`status.${match.status}`)} ·{" "}
                {t(`location.${match.home_away}`)}
              </p>
              <h1 className="mt-1 text-3xl font-black tracking-[-0.035em] text-ink sm:text-4xl">
                {match.opponent_name}
              </h1>
            </div>
          </div>
          <div className="flex flex-col gap-2 min-[430px]:flex-row">
            <Link
              href={`/matches/${match.id}/call-up`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-pitch px-4 text-sm font-bold text-white"
            >
              <UsersRound aria-hidden="true" className="size-4" />
              {t(
                match.status === "scheduled"
                  ? "actions.manageCallup"
                  : "actions.viewCallup",
              )}
            </Link>
            {match.status === "scheduled" ? (
              <Link
                href={`/matches/${match.id}/edit`}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-pitch px-4 text-sm font-bold text-pitch"
              >
                <Pencil aria-hidden="true" className="size-4" />
                {t("actions.edit")}
              </Link>
            ) : null}
          </div>
        </header>
        <dl className="grid sm:grid-cols-2">
          {fields.map(([label, fieldValue], index) => (
            <div
              key={label}
              className={`border-b border-line p-5 sm:p-6 ${
                index % 2 === 0 ? "sm:border-r" : ""
              }`}
            >
              <dt className="text-xs font-black uppercase tracking-[0.08em] text-muted">
                {label}
              </dt>
              <dd className="mt-2 font-bold text-ink">{fieldValue}</dd>
            </div>
          ))}
        </dl>
        <div className="p-5 sm:p-6">
          <h2 className="text-xs font-black uppercase tracking-[0.08em] text-muted">
            {t("details.notes")}
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink">
            {match.notes || t("details.notProvided")}
          </p>
        </div>
        <div className="flex flex-col gap-4 border-t border-line bg-[#f8faf9] p-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="max-w-xl text-sm leading-6 text-muted">
            {t("details.historyProtected")}
          </p>
          <MatchActions
            matchId={match.id}
            opponent={match.opponent_name}
            kickoffAt={match.kickoff_at}
            canCancel={match.status === "scheduled"}
            canDelete={canDeleteMatch(match)}
          />
        </div>
      </section>
    </div>
  );
}
