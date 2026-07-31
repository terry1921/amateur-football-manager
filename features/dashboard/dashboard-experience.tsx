import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  History,
  LockKeyhole,
  MapPin,
  Plus,
  ShieldCheck,
  Trophy,
  UsersRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { MatchDateTime } from "@/features/matches/match-date-time";
import { Link } from "@/i18n/navigation";
import {
  getCallupReadiness,
  getMatchResult,
  type DashboardAttentionItem,
  type DashboardMatch,
  type DashboardSuccessData,
  type SetupStep,
} from "./model";
import { DashboardEmptyState } from "./dashboard-empty-state";

function SetupStepItem({ step, index }: { step: SetupStep; index: number }) {
  const t = useTranslations("FirstTimeDashboard");
  const isNext = !step.completed && step.dependencyMet;

  return (
    <li
      className={`grid gap-3 border-t border-line px-5 py-4 first:border-t-0 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:items-center sm:px-6 ${
        isNext ? "bg-pitch/[0.035]" : "bg-white"
      }`}
    >
      <span
        className={`grid size-9 place-items-center rounded-full border text-sm font-black ${
          step.completed
            ? "border-pitch bg-pitch/8 text-pitch"
            : step.status === "blocked"
              ? "border-[#b8c5d2] bg-[#f6f9f7] text-muted"
              : "border-pitch text-pitch"
        }`}
      >
        {step.completed ? (
          <Check aria-hidden="true" className="size-4" strokeWidth={3} />
        ) : step.status === "blocked" ? (
          <LockKeyhole aria-hidden="true" className="size-4" />
        ) : (
          index + 1
        )}
      </span>

      <div className="min-w-0">
        <h3
          className={`text-sm font-black tracking-[-0.015em] sm:text-base ${
            step.completed ? "text-muted" : "text-ink"
          }`}
        >
          {t(`steps.${step.id}.title`)}
        </h3>
        <p className="mt-1 text-sm leading-5 text-muted">
          {step.status === "blocked"
            ? t(`steps.${step.id}.blocked`)
            : t(`steps.${step.id}.description`)}
        </p>
      </div>

      <div className="pl-12 sm:pl-0 sm:text-right">
        {step.completed ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-pitch">
            <CheckCircle2 aria-hidden="true" className="size-4" />
            {t("status.completed")}
          </span>
        ) : step.status === "available" ? (
          <Link
            href={step.href}
            className="inline-flex min-h-11 items-center rounded-lg bg-pitch px-4 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
          >
            {t(`steps.${step.id}.action`)}
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-muted">
            {step.status === "blocked" ? (
              <LockKeyhole aria-hidden="true" className="size-3.5" />
            ) : null}
            {step.status === "blocked"
              ? t("status.blocked")
              : t(`steps.${step.id}.availability`)}
          </span>
        )}
      </div>
    </li>
  );
}

function SetupChecklist({ data }: { data: DashboardSuccessData }) {
  const t = useTranslations("FirstTimeDashboard");

  return (
    <section
      aria-labelledby="setup-checklist-title"
      className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_14px_44px_rgba(7,26,54,0.04)]"
    >
      <div className="px-5 py-4 sm:px-6">
        <h2
          id="setup-checklist-title"
          className="text-xl font-black tracking-[-0.03em] text-ink"
        >
          {t("setup.title")}
        </h2>
      </div>
      <ol>
        {data.progress.steps.map((step, index) => (
          <SetupStepItem key={step.id} step={step} index={index} />
        ))}
      </ol>
    </section>
  );
}

function Progress({ data }: { data: DashboardSuccessData }) {
  const t = useTranslations("FirstTimeDashboard");
  const { progress } = data;

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="font-black text-ink">
          {t("progress.count", {
            completed: progress.completedCount,
            total: progress.totalCount,
          })}
        </span>
        <span className="font-medium text-muted">
          {t("progress.percentage", { percentage: progress.percentage })}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={t("progress.label")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percentage}
        aria-valuetext={t("progress.count", {
          completed: progress.completedCount,
          total: progress.totalCount,
        })}
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#dfece3]"
      >
        <div
          className="h-full rounded-full bg-pitch transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
    </div>
  );
}

function WelcomePanel({ data }: { data: DashboardSuccessData }) {
  const t = useTranslations("FirstTimeDashboard");
  const { progress, team } = data;
  const nextStep = progress.nextStep;

  if (progress.isOperational) {
    return (
      <section className="grid gap-5 rounded-2xl border border-line bg-white p-5 shadow-[0_14px_44px_rgba(7,26,54,0.04)] sm:p-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center">
        <div className="flex items-center gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-full border border-pitch text-pitch">
            <Check aria-hidden="true" className="size-5" strokeWidth={3} />
          </span>
          <div>
            <h1 className="text-2xl font-black tracking-[-0.035em] text-ink sm:text-3xl">
              {t("welcome.operational", { teamName: team.name })}
            </h1>
            <p className="mt-1 text-sm leading-6 text-muted">
              {data.activeSeason
                ? t("welcome.context", {
                    season: data.activeSeason.name,
                    status: t(`seasonStatus.${data.activeSeason.status}`),
                  })
                : t("welcome.noSeason")}
            </p>
          </div>
        </div>
        <div className="space-y-4">
          <Progress data={data} />
          <Link
            href={data.primaryAction.href}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-pitch px-4 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
          >
            {t(`primaryAction.${data.primaryAction.id}`)}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-[0_14px_44px_rgba(7,26,54,0.04)] sm:p-7">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)_auto] lg:items-center">
        <div>
          <h1 className="text-3xl font-black tracking-[-0.04em] text-ink sm:text-4xl">
            {t("welcome.title")}
          </h1>
          <p className="mt-2 text-base leading-7 text-muted sm:text-lg">
            {t("welcome.description", { teamName: team.name })}
          </p>
        </div>
        <Progress data={data} />
        {nextStep ? (
          <div className="lg:text-right">
            {nextStep.status === "available" ? (
              <Link
                href={nextStep.href}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-pitch px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(0,163,49,0.16)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch lg:w-auto"
              >
                {t(`steps.${nextStep.id}.action`)}
              </Link>
            ) : (
              <>
                <span
                  aria-disabled="true"
                  className="inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center rounded-xl border border-[#b8c5d2] bg-[#f6f9f7] px-5 text-sm font-bold text-muted lg:w-auto"
                >
                  {t(`steps.${nextStep.id}.action`)}
                </span>
                <p className="mt-2 text-xs font-bold text-muted">
                  {nextStep.status === "blocked"
                    ? t(`steps.${nextStep.id}.blocked`)
                    : t(`steps.${nextStep.id}.availability`)}
                </p>
              </>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function safeColor(value: string | null) {
  return value && /^#[0-9A-Fa-f]{6}$/.test(value) ? value : null;
}

function TeamSummary({ data }: { data: DashboardSuccessData }) {
  const t = useTranslations("FirstTimeDashboard");
  const { team } = data;
  const location = [team.city, team.country].filter(Boolean).join(", ");
  const colors = [
    { value: safeColor(team.primary_color), label: t("team.primaryColor") },
    {
      value: safeColor(team.secondary_color),
      label: t("team.secondaryColor"),
    },
  ].filter((color): color is { value: string; label: string } =>
    Boolean(color.value),
  );

  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-[0_14px_44px_rgba(7,26,54,0.04)] sm:p-6">
      <h2 className="text-xl font-black tracking-[-0.03em] text-ink">
        {t("team.title")}
      </h2>
      <div className="mt-5 flex items-center gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-pitch/8 text-pitch">
          <ShieldCheck aria-hidden="true" className="size-6" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-2xl font-black tracking-[-0.03em] text-ink">
            {team.name}
          </p>
          {team.short_name ? (
            <p className="mt-1 text-sm text-muted">{team.short_name}</p>
          ) : null}
        </div>
      </div>
      {location || colors.length > 0 ? (
        <div className="mt-5 space-y-3 border-t border-line pt-4 text-sm text-muted">
          {location ? <p>{location}</p> : null}
          {colors.length > 0 ? (
            <div className="flex flex-wrap gap-4">
              {colors.map((color) => (
                <span
                  key={color.label}
                  className="inline-flex items-center gap-2"
                >
                  <span
                    aria-hidden="true"
                    className="size-4 rounded-full border border-black/10"
                    style={{ backgroundColor: color.value }}
                  />
                  {color.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function DashboardModule({
  title,
  icon: Icon,
  children,
  wide,
}: {
  title: string;
  icon: typeof CalendarDays;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-line bg-white shadow-[0_14px_44px_rgba(7,26,54,0.035)] ${wide ? "lg:col-span-2" : ""}`}
    >
      <div className="flex items-center gap-3 border-b border-line px-5 py-4 sm:px-6">
        <Icon aria-hidden="true" className="size-5 text-pitch" />
        <h2 className="text-lg font-black tracking-[-0.025em] text-ink">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function MatchDetails({ match }: { match: DashboardMatch }) {
  const t = useTranslations("FirstTimeDashboard");
  const readiness = getCallupReadiness(match);
  return (
    <div className="p-5 sm:p-6">
      <Link
        href={`/matches/${match.id}`}
        className="text-2xl font-black tracking-[-0.03em] text-ink underline-offset-4 hover:text-pitch hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
      >
        {match.opponent_name}
      </Link>
      <div className="mt-4 space-y-2 text-sm text-muted">
        <p className="flex items-center gap-2">
          <Clock3 aria-hidden="true" className="size-4 text-pitch" />
          <MatchDateTime value={match.kickoff_at} />
        </p>
        <p className="flex items-center gap-2">
          <ShieldCheck aria-hidden="true" className="size-4 text-pitch" />
          {t(`location.${match.home_away}`)}
          {match.season_name ? ` · ${match.season_name}` : null}
        </p>
        {match.venue ? (
          <p className="flex items-center gap-2">
            <MapPin aria-hidden="true" className="size-4 text-pitch" />
            {match.venue}
          </p>
        ) : null}
      </div>
      <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4 min-[430px]:flex-row min-[430px]:items-center min-[430px]:justify-between">
        <p
          className={`text-sm font-bold ${readiness === "ready" ? "text-pitch" : "text-amber-800"}`}
        >
          {readiness === "ready"
            ? t("modules.upcoming.callupReady", {
                count: match.callup_count,
              })
            : t("modules.upcoming.callupNotStarted")}
        </p>
        <Link
          href={`/matches/${match.id}/call-up`}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-pitch px-4 text-sm font-bold text-pitch"
        >
          {t(
            readiness === "ready"
              ? "modules.upcoming.manageCallup"
              : "modules.upcoming.createCallup",
          )}
        </Link>
      </div>
    </div>
  );
}

function AttentionRequired({ data }: { data: DashboardSuccessData }) {
  const t = useTranslations("FirstTimeDashboard");

  return (
    <DashboardModule title={t("attention.title")} icon={AlertTriangle} wide>
      {data.attentionItems.length > 0 ? (
        <ul className="divide-y divide-line">
          {data.attentionItems.map((item) => (
            <AttentionItem key={item.id} item={item} />
          ))}
        </ul>
      ) : (
        <div className="flex items-center gap-3 p-5 text-sm text-muted sm:p-6">
          <CheckCircle2 aria-hidden="true" className="size-5 text-pitch" />
          <span>{t("attention.clear")}</span>
        </div>
      )}
    </DashboardModule>
  );
}

function AttentionItem({ item }: { item: DashboardAttentionItem }) {
  const t = useTranslations("FirstTimeDashboard");
  const tone =
    item.severity === "warning"
      ? "text-amber-800 bg-amber-50"
      : item.severity === "critical"
        ? "text-red-800 bg-red-50"
        : "text-sky-800 bg-sky-50";

  return (
    <li className="flex items-start gap-4 px-5 py-4 sm:px-6">
      <span
        className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-full ${tone}`}
      >
        <AlertTriangle aria-hidden="true" className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-black text-ink">
          {t(`attention.items.${item.id}.title`)}
        </h3>
        <p className="mt-1 text-sm leading-5 text-muted">
          {t(`attention.items.${item.id}.description`)}
        </p>
      </div>
      <Link
        href={item.href}
        className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-lg border border-pitch px-3 text-xs font-bold text-pitch focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
      >
        {t(`attention.items.${item.id}.action`)}
        <ArrowRight aria-hidden="true" className="size-3.5" />
      </Link>
    </li>
  );
}

function QuickActions({ data }: { data: DashboardSuccessData }) {
  const t = useTranslations("FirstTimeDashboard");
  const actions = [
    data.primaryAction,
    ...(data.upcomingMatch && data.primaryAction.id !== "manage-callup"
      ? [
          {
            id: "manage-callup" as const,
            href: `/matches/${data.upcomingMatch.id}/call-up`,
          },
        ]
      : []),
    { id: "add-player" as const, href: "/players" },
    { id: "schedule-match" as const, href: "/matches/new" },
  ].filter(
    (action, index, all) =>
      all.findIndex((candidate) => candidate.id === action.id) === index,
  );

  return (
    <DashboardModule title={t("quickActions.title")} icon={Plus}>
      <div className="flex flex-wrap gap-3 p-5 sm:p-6">
        {actions.slice(0, 3).map((action, index) => (
          <Link
            key={action.id}
            href={action.href}
            className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch ${
              index === 0
                ? "bg-pitch text-white shadow-[0_8px_20px_rgba(0,163,49,0.14)]"
                : "border border-pitch text-pitch"
            }`}
          >
            {index === 0 ? (
              <Plus aria-hidden="true" className="size-4" />
            ) : null}
            {t(`quickActions.items.${action.id}`)}
          </Link>
        ))}
      </div>
    </DashboardModule>
  );
}

function UpcomingFixtures({ data }: { data: DashboardSuccessData }) {
  const t = useTranslations("FirstTimeDashboard");
  const fixtures = data.upcomingMatches.slice(1);

  return (
    <DashboardModule title={t("modules.fixtures.title")} icon={CalendarDays}>
      {fixtures.length > 0 ? (
        <ul className="divide-y divide-line">
          {fixtures.map((match) => (
            <li
              key={match.id}
              className="flex items-center gap-4 px-5 py-4 sm:px-6"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/matches/${match.id}`}
                  className="font-black text-ink underline-offset-4 hover:text-pitch hover:underline"
                >
                  {match.opponent_name}
                </Link>
                <p className="mt-1 text-sm text-muted">
                  <MatchDateTime value={match.kickoff_at} />
                </p>
              </div>
              <span className="text-right text-xs font-bold text-muted">
                {getCallupReadiness(match) === "ready"
                  ? t("modules.fixtures.ready", { count: match.callup_count })
                  : t("modules.fixtures.notStarted")}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <DashboardEmptyState
          icon={CalendarDays}
          title={t("empty.fixtures.title")}
          description={t("empty.fixtures.description")}
          actionLabel={t(
            data.activeSeason
              ? "modules.fixtures.viewAll"
              : "steps.season.action",
          )}
          actionHref={data.activeSeason ? "/matches" : "/seasons"}
        />
      )}
    </DashboardModule>
  );
}

function DashboardModules({ data }: { data: DashboardSuccessData }) {
  const t = useTranslations("FirstTimeDashboard");
  const operational = data.progress.isOperational && Boolean(data.activeSeason);

  return (
    <div className={`grid gap-5 ${operational ? "lg:grid-cols-2" : ""}`}>
      <DashboardModule title={t("modules.season.title")} icon={CalendarDays}>
        {data.activeSeason ? (
          <div className="p-5 sm:p-6">
            <p className="text-sm font-medium text-muted">
              {t("modules.season.status", {
                status: t(`seasonStatus.${data.activeSeason.status}`),
              })}
            </p>
            <p className="mt-2 text-2xl font-black tracking-[-0.03em] text-ink">
              {data.activeSeason.name}
            </p>
            {data.activeSeason.start_date || data.activeSeason.end_date ? (
              <p className="mt-2 text-sm text-muted">
                {data.activeSeason.start_date ?? "—"} –{" "}
                {data.activeSeason.end_date ?? "—"}
              </p>
            ) : null}
          </div>
        ) : (
          <DashboardEmptyState
            icon={CalendarDays}
            title={t("empty.season.title")}
            description={
              data.seasonCount > 0
                ? t("empty.season.inactiveDescription")
                : t("empty.season.description")
            }
            actionLabel={t("steps.season.action")}
            actionHref="/seasons"
          />
        )}
      </DashboardModule>

      <DashboardModule title={t("modules.squad.title")} icon={UsersRound}>
        {data.playerCount > 0 ? (
          <div className="p-5 sm:p-6">
            <p className="text-sm font-medium text-muted">
              {t("modules.squad.description")}
            </p>
            <p className="mt-2 text-2xl font-black tracking-[-0.03em] text-ink">
              {t("modules.squad.count", { count: data.playerCount })}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line pt-4 text-sm text-muted sm:grid-cols-4">
              <span>
                {t("modules.squad.available", {
                  count: data.squadSummary.available,
                })}
              </span>
              <span>
                {t("modules.squad.injured", {
                  count: data.squadSummary.injured,
                })}
              </span>
              <span>
                {t("modules.squad.suspended", {
                  count: data.squadSummary.suspended,
                })}
              </span>
              <span>
                {t("modules.squad.inactive", {
                  count: data.squadSummary.inactive,
                })}
              </span>
            </div>
          </div>
        ) : (
          <DashboardEmptyState
            icon={UsersRound}
            title={t("empty.players.title")}
            description={t("empty.players.description")}
            actionLabel={t("steps.players.action")}
            actionHref="/players"
          />
        )}
      </DashboardModule>

      <DashboardModule
        title={t("modules.upcoming.title")}
        icon={CalendarDays}
        wide={operational}
      >
        {data.upcomingMatch ? (
          <MatchDetails match={data.upcomingMatch} />
        ) : (
          <DashboardEmptyState
            icon={CalendarDays}
            title={t("empty.upcoming.title")}
            description={t("empty.upcoming.description")}
            actionLabel={t(
              data.activeSeason ? "steps.match.action" : "steps.season.action",
            )}
            actionHref={data.activeSeason ? "/matches/new" : "/seasons"}
            statusLabel={
              data.activeSeason ? undefined : t("steps.match.blocked")
            }
          />
        )}
      </DashboardModule>

      <UpcomingFixtures data={data} />

      <DashboardModule title={t("modules.result.title")} icon={Trophy}>
        {data.recentResult &&
        data.recentResult.team_score !== null &&
        data.recentResult.opponent_score !== null ? (
          <div className="p-5 sm:p-6">
            <p className="text-sm font-medium text-muted">
              <MatchDateTime value={data.recentResult.kickoff_at} dateOnly />
            </p>
            <p className="mt-3 text-2xl font-black tracking-[-0.03em] text-ink">
              {t("modules.result.score", {
                teamName: data.team.name,
                teamScore: data.recentResult.team_score,
                opponentScore: data.recentResult.opponent_score,
                opponent: data.recentResult.opponent_name,
              })}
            </p>
            <p className="mt-2 text-sm font-bold text-pitch">
              {t(`modules.result.outcome.${getMatchResult(data.recentResult)}`)}
            </p>
          </div>
        ) : data.recentFixture ? (
          <div className="p-5 sm:p-6">
            <p className="text-sm font-medium text-muted">
              <MatchDateTime value={data.recentFixture.kickoff_at} dateOnly />
            </p>
            <p className="mt-3 text-lg font-black tracking-[-0.03em] text-ink">
              {data.recentFixture.opponent_name}
            </p>
            <p className="mt-1 text-sm leading-6 text-muted">
              {data.recentFixture.status === "cancelled"
                ? t("modules.result.cancelled")
                : t("modules.result.unresolved")}
            </p>
            <Link
              href={`/matches/${data.recentFixture.id}`}
              className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-pitch"
            >
              {t("modules.result.viewFixture")}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        ) : (
          <DashboardEmptyState
            icon={Trophy}
            title={t("empty.results.title")}
            description={t("empty.results.description")}
            actionLabel={t("steps.result.action")}
            statusLabel={t("steps.result.availability")}
          />
        )}
      </DashboardModule>

      <DashboardModule title={t("modules.activity.title")} icon={History}>
        {data.upcomingMatch || data.recentResult || data.recentFixture ? (
          <ul className="divide-y divide-line px-5 sm:px-6">
            {data.upcomingMatch ? (
              <li className="flex gap-3 py-4 text-sm leading-6 text-ink">
                <CalendarDays
                  aria-hidden="true"
                  className="mt-1 size-4 shrink-0 text-pitch"
                />
                {t("modules.activity.scheduled", {
                  opponent: data.upcomingMatch.opponent_name,
                })}
              </li>
            ) : null}
            {data.recentResult ? (
              <li className="flex gap-3 py-4 text-sm leading-6 text-ink">
                <Trophy
                  aria-hidden="true"
                  className="mt-1 size-4 shrink-0 text-pitch"
                />
                {t("modules.activity.result", {
                  opponent: data.recentResult.opponent_name,
                })}
              </li>
            ) : null}
            {data.recentFixture && !data.recentResult ? (
              <li className="flex gap-3 py-4 text-sm leading-6 text-ink">
                <History
                  aria-hidden="true"
                  className="mt-1 size-4 shrink-0 text-pitch"
                />
                {t("modules.activity.fixture", {
                  opponent: data.recentFixture.opponent_name,
                })}
              </li>
            ) : null}
          </ul>
        ) : (
          <DashboardEmptyState
            icon={History}
            title={t("empty.activity.title")}
            description={t("empty.activity.description")}
          />
        )}
      </DashboardModule>
    </div>
  );
}

export function DashboardLoadError() {
  const t = useTranslations("FirstTimeDashboard.error");

  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-white p-6 shadow-[0_14px_44px_rgba(7,26,54,0.04)] sm:p-8">
      <h1 className="text-3xl font-black tracking-[-0.035em] text-ink">
        {t("title")}
      </h1>
      <p className="mt-3 text-base leading-7 text-muted">{t("description")}</p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-pitch px-5 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
      >
        {t("action")}
      </Link>
    </section>
  );
}

export function DashboardExperience({ data }: { data: DashboardSuccessData }) {
  const t = useTranslations("FirstTimeDashboard");
  const compactSetup =
    data.progress.isOperational && Boolean(data.activeSeason);

  return (
    <div className="space-y-6">
      <WelcomePanel data={data} />
      <AttentionRequired data={data} />

      {compactSetup ? (
        <>
          <DashboardModules data={data} />
          <QuickActions data={data} />
          <details className="group overflow-hidden rounded-2xl border border-line bg-white">
            <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-5 font-black text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch sm:px-6 [&::-webkit-details-marker]:hidden">
              <CheckCircle2 aria-hidden="true" className="size-5 text-pitch" />
              <span className="flex-1">
                {data.progress.isComplete
                  ? t("setup.complete")
                  : t("setup.compact")}
              </span>
              <ChevronDown
                aria-hidden="true"
                className="size-5 transition-transform group-open:rotate-180 motion-reduce:transition-none"
              />
            </summary>
            <div className="border-t border-line p-4 sm:p-5">
              <SetupChecklist data={data} />
            </div>
          </details>
        </>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
            <SetupChecklist data={data} />
            <TeamSummary data={data} />
          </div>
          <DashboardModules data={data} />
          <QuickActions data={data} />
        </>
      )}
    </div>
  );
}
