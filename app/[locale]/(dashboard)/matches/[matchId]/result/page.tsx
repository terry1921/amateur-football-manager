import { ArrowLeft, CalendarDays, Flag, MapPin, Trophy } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { getMatchDetails } from "@/features/matches/data";
import { getManagedScore, getMatchResult } from "@/features/matches/model";
import { MatchDateTime } from "@/features/matches/match-date-time";
import { MatchTimeline } from "@/features/timeline/timeline";
import type { TimelineEvent } from "@/features/timeline/model";
import { completeMatchAction } from "@/features/results/actions";
import { ResultForm } from "@/features/results/result-form";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

export default async function MatchResultPage({
  params,
}: {
  params: Promise<{ locale: AppLocale; matchId: string }>;
}) {
  const { locale, matchId } = await params;
  const [details, t] = await Promise.all([
    getMatchDetails(matchId),
    getTranslations({ locale, namespace: "Results" }),
  ]);
  if (!details) notFound();

  const { match, season } = details;
  const score = getManagedScore(match);
  const result = getMatchResult(match);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/matches/${match.id}`}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-pitch focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {t("back")}
      </Link>

      <section className="mt-4 overflow-hidden rounded-2xl border border-line bg-white shadow-[0_18px_52px_rgba(7,26,54,0.05)]">
        <header className="border-b border-line p-5 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-pitch/8 text-pitch">
              {match.status === "scheduled" ? (
                <Flag aria-hidden="true" className="size-6" />
              ) : (
                <Trophy aria-hidden="true" className="size-6" />
              )}
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-pitch">
                {t(`status.${match.status}`)} · {season.name}
              </p>
              <h1 className="mt-1 text-3xl font-black tracking-[-0.035em] text-ink sm:text-4xl">
                {match.opponent_name}
              </h1>
            </div>
          </div>
          <div className="mt-5 grid gap-2 text-sm text-muted sm:grid-cols-2">
            <p className="flex items-center gap-2">
              <CalendarDays aria-hidden="true" className="size-4 text-pitch" />
              <MatchDateTime value={match.kickoff_at} />
            </p>
            <p className="flex items-center gap-2">
              <MapPin aria-hidden="true" className="size-4 text-pitch" />
              {t(`location.${match.home_away}`)}
              {match.venue ? ` · ${match.venue}` : null}
            </p>
          </div>
        </header>

        {match.status === "scheduled" ? (
          <div className="p-5 sm:p-8">
            <h2 className="text-2xl font-black tracking-[-0.03em] text-ink">
              {t("form.title")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {t("form.description")}
            </p>
            <div className="mt-6">
              <ResultForm
                action={completeMatchAction.bind(null, locale, match.id)}
                teamName={details.team.name}
                opponentName={match.opponent_name}
                location={match.home_away}
                cancelHref={`/matches/${match.id}`}
                players={details.callupPlayers}
                initialEvents={details.events}
              />
            </div>
          </div>
        ) : (
          <div className="p-5 sm:p-8">
            <p className="text-sm font-bold text-muted">
              {match.status === "completed"
                ? t("readOnly.completedDescription")
                : t("readOnly.cancelledDescription")}
            </p>
            {score ? (
              <div className="mt-6 flex flex-wrap items-end gap-x-5 gap-y-2">
                <p className="text-5xl font-black tracking-[-0.05em] text-ink">
                  {score.team}–{score.opponent}
                </p>
                {result ? (
                  <p className="pb-1 text-sm font-black uppercase tracking-[0.1em] text-pitch">
                    {t(`result.${result}`)}
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="mt-8 border-t border-line pt-7">
              <MatchTimeline
                events={details.events.map((event): TimelineEvent => ({
                  id: event.id,
                  playerId: event.player_id,
                  type: event.type,
                  minute: event.minute,
                  stoppageTime: event.stoppage_time,
                  notes: event.notes,
                  createdAt: event.created_at,
                  playerName: event.player_name,
                  playerShirtNumber: event.player_shirt_number,
                }))}
              />
            </div>
            <Link
              href={`/matches/${match.id}/call-up`}
              className="mt-6 inline-flex min-h-11 items-center rounded-lg border border-pitch px-4 text-sm font-bold text-pitch focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
            >
              {t("readOnly.viewCallup")}
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
