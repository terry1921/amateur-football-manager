"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Check,
  Copy,
  Download,
  Image as ImageIcon,
  Monitor,
  Smartphone,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  getExportFileName,
  getInitials,
  getPlayerDisplayName,
  getSocialCaption,
  getSocialContent,
  getTeamInitials,
  safeSocialColor,
  socialTemplateKinds,
  type SocialGeneratorData,
  type SocialPlatform,
  type SocialTemplateKind,
} from "./model";
import { exportSocialCardAsPng } from "./export";

export function SocialImage({
  src,
  alt,
  fallback,
  background,
  foreground,
}: {
  src: string | null | undefined;
  alt: string;
  fallback: string;
  background: string;
  foreground: string;
}) {
  const [failed, setFailed] = useState(!src);
  if (failed) {
    return (
      <span
        role="img"
        aria-label={alt}
        className="grid size-16 shrink-0 place-items-center rounded-full text-sm font-black"
        style={{ backgroundColor: background, color: foreground }}
      >
        {fallback}
      </span>
    );
  }
  return (
    <img
      src={src ?? ""}
      alt={alt}
      onError={() => setFailed(true)}
      width={64}
      height={64}
      loading="lazy"
      decoding="async"
      className="size-16 shrink-0 rounded-full object-cover"
    />
  );
}

function labelsFor(t: ReturnType<typeof useTranslations<"Social">>) {
  return {
    result: t("templates.result.title"),
    upcoming: t("templates.upcoming.title"),
    topScorer: t("templates.topScorer.title"),
    playerOfMatch: t("templates.playerOfMatch.title"),
    lineup: t("templates.lineup.title"),
  };
}

function MatchSelector({ data }: { data: SocialGeneratorData }) {
  const t = useTranslations("Social");
  const date = (value: string) =>
    new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
      new Date(value),
    );
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <nav
        aria-label={t("filters.seasonLabel")}
        className="mobile-chip-row flex flex-wrap gap-2"
      >
        {[
          { id: "current", name: t("filters.current") },
          { id: "all", name: t("filters.all") },
          ...data.seasons.filter(({ id }) => id !== data.activeSeason?.id),
        ].map((season) => (
          <Link
            key={season.id}
            href={"/social?season=" + encodeURIComponent(season.id)}
            aria-current={
              data.selectedFilter === season.id ? "page" : undefined
            }
            className={
              "inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-bold " +
              (data.selectedFilter === season.id
                ? "bg-pitch text-white"
                : "border border-line text-muted hover:border-pitch hover:text-pitch")
            }
          >
            {season.name}
          </Link>
        ))}
      </nav>
      <form
        method="get"
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
      >
        <input type="hidden" name="season" value={data.selectedFilter} />
        <label className="min-w-0 flex-1 text-sm font-bold text-ink">
          {t("filters.match")}
          <select
            name="match"
            defaultValue={data.selectedMatch?.id ?? ""}
            className="mt-1 min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/15"
          >
            <option value="">{t("filters.chooseMatch")}</option>
            {data.matches.map((match) => (
              <option key={match.id} value={match.id}>
                {match.opponent_name + " · " + date(match.kickoff_at)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-pitch px-4 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
        >
          {t("filters.apply")}
        </button>
      </form>
    </div>
  );
}

function TemplateSelector({
  selected,
  data,
  onChange,
}: {
  selected: SocialTemplateKind;
  data: SocialGeneratorData;
  onChange: (value: SocialTemplateKind) => void;
}) {
  const t = useTranslations("Social");
  const content = getSocialContent(
    selected,
    data.team,
    data.selectedSeason,
    data.selectedMatch,
    data.selectedDetail,
    data.players,
    data.snapshot,
    labelsFor(t),
  );
  const isAvailable = (kind: SocialTemplateKind) => {
    if (kind === "result") return data.selectedMatch?.status === "completed";
    if (kind === "upcoming") return data.selectedMatch?.status === "scheduled";
    if (kind === "topScorer") return Boolean(content.topScorer);
    if (kind === "playerOfMatch") {
      return (
        data.selectedMatch?.status === "completed" &&
        Boolean(content.playerOfMatch)
      );
    }
    return content.lineup.length > 0;
  };
  return (
    <fieldset>
      <legend className="text-sm font-black text-ink">
        {t("templates.label")}
      </legend>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {socialTemplateKinds.map((kind) => (
          <button
            key={kind}
            type="button"
            disabled={!isAvailable(kind)}
            aria-pressed={selected === kind}
            onClick={() => onChange(kind)}
            className={
              "min-h-20 rounded-xl border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch " +
              (selected === kind
                ? "border-pitch bg-pitch/[0.06] text-pitch"
                : "border-line bg-white text-ink hover:border-pitch") +
              " disabled:cursor-not-allowed disabled:opacity-45"
            }
          >
            <span className="block text-sm font-black">
              {t("templates." + kind + ".title")}
            </span>
            <span className="mt-1 block text-xs leading-4 text-muted">
              {t("templates." + kind + ".description")}
            </span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function SocialCardPreview({
  data,
  content,
  mobile,
}: {
  data: SocialGeneratorData;
  content: ReturnType<typeof getSocialContent>;
  mobile: boolean;
}) {
  const t = useTranslations("Social");
  const primary = safeSocialColor(data.team.primary_color, "#00a331");
  const secondary = safeSocialColor(data.team.secondary_color, "#071a36");
  const scorerProfile = content.topScorer
    ? data.players.find(({ id }) => id === content.topScorer?.player_id)
    : null;
  const photo = content.playerOfMatch;
  return (
    <div
      className={
        "mx-auto w-full " + (mobile ? "max-w-[22rem]" : "max-w-[34rem]")
      }
    >
      <div
        aria-label={t("preview.cardLabel", { template: content.title })}
        className="relative aspect-square overflow-hidden rounded-[1.5rem] border border-line bg-[#f6f9f7] shadow-[0_18px_60px_rgba(7,26,54,0.12)]"
      >
        <div
          className="h-[22%] px-[10%] py-[7%] text-white"
          style={{ backgroundColor: secondary }}
        >
          <div className="flex items-center gap-3">
            <SocialImage
              src={data.team.logo_url}
              alt={t("fallback.teamLogo", { team: data.team.name })}
              fallback={getTeamInitials(data.team)}
              background={primary}
              foreground="#ffffff"
            />
            <div className="min-w-0">
              <p className="truncate text-[clamp(.7rem,1.8vw,1.15rem)] font-black">
                {data.team.name}
              </p>
              <p className="mt-1 text-[clamp(.55rem,1.2vw,.8rem)] font-bold text-[#cce2cf]">
                {content.title}
              </p>
            </div>
          </div>
        </div>
        <div className="h-[1.7%]" style={{ backgroundColor: primary }} />
        <div className="px-[10%] pt-[9%]">
          <div className="flex items-start justify-between gap-3 text-[clamp(.65rem,1.5vw,1rem)] font-black text-ink">
            <span className="max-w-[40%] truncate">{content.eyebrow}</span>
            <span className="flex max-w-[45%] items-center justify-end gap-2 text-right">
              {data.selectedMatch ? (
                <SocialImage
                  src={data.selectedMatch.opponent_logo_url}
                  alt={t("fallback.opponentLogo", {
                    opponent: content.opponent,
                  })}
                  fallback={getInitials(content.opponent, "OP")}
                  background="#dfece3"
                  foreground={secondary}
                />
              ) : null}
              <span className="truncate">{content.opponent || "—"}</span>
            </span>
          </div>
          <p
            className="mt-[4%] text-center text-[clamp(2.6rem,9vw,5.5rem)] font-black tracking-[-0.08em]"
            style={{ color: primary }}
          >
            {content.score ?? "VS"}
          </p>
          <div className="mt-[5%] space-y-2 text-[clamp(.6rem,1.35vw,.9rem)] text-muted">
            {content.competition || content.venue ? (
              <p>
                {[content.competition, content.venue]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : null}
            {content.kind === "result" ? (
              <div>
                <p className="font-black text-ink">
                  {t("content.goalScorers")}
                </p>
                <p>
                  {content.goalScorers.length
                    ? content.goalScorers
                        .map(
                          ({ player, goals }) =>
                            getPlayerDisplayName(player) + " " + goals + "×",
                        )
                        .join(" · ")
                    : t("content.noScorers")}
                </p>
              </div>
            ) : null}
            {content.kind === "topScorer" && content.topScorer ? (
              <div className="flex items-center gap-3">
                {scorerProfile ? (
                  <SocialImage
                    src={scorerProfile.photo_url}
                    alt={t("fallback.playerPhoto", {
                      player: getPlayerDisplayName(scorerProfile),
                    })}
                    fallback={getTeamInitials({
                      name: getPlayerDisplayName(scorerProfile),
                      short_name: null,
                    })}
                    background={primary}
                    foreground="#ffffff"
                  />
                ) : null}
                <p>
                  <span className="block font-black text-ink">
                    {t("content.topScorer")}
                  </span>
                  {getPlayerDisplayName(content.topScorer)} ·{" "}
                  {content.topScorer.goals} {t("content.goals")}
                </p>
              </div>
            ) : null}
            {content.kind === "playerOfMatch" && photo ? (
              <div className="flex items-center gap-3">
                <SocialImage
                  src={photo.photo_url}
                  alt={t("fallback.playerPhoto", {
                    player: getPlayerDisplayName(photo),
                  })}
                  fallback={getTeamInitials({
                    name: getPlayerDisplayName(photo),
                    short_name: null,
                  })}
                  background={primary}
                  foreground="#ffffff"
                />
                <p>
                  <span className="block font-black text-ink">
                    {t("content.playerOfMatch")}
                  </span>
                  {getPlayerDisplayName(photo)}
                </p>
              </div>
            ) : null}
            {content.kind === "lineup" ? (
              <div>
                <p className="font-black text-ink">{t("content.lineup")}</p>
                <p>{content.lineup.length + " " + t("content.players")}</p>
                <p className="mt-2 line-clamp-2">
                  {content.lineup.map(getPlayerDisplayName).join(" · ")}
                </p>
              </div>
            ) : null}
          </div>
        </div>
        <p className="absolute bottom-[5%] left-[10%] text-[clamp(.55rem,1.25vw,.8rem)] font-bold text-muted">
          {content.season}
        </p>
      </div>
    </div>
  );
}

export function SocialGenerator({
  data,
  initialTemplate = "result",
}: {
  data: SocialGeneratorData;
  initialTemplate?: SocialTemplateKind;
}) {
  const t = useTranslations("Social");
  const [template, setTemplate] = useState<SocialTemplateKind>(initialTemplate);
  const [mobilePreview, setMobilePreview] = useState(false);
  const [platform, setPlatform] = useState<SocialPlatform>("instagram");
  const [copied, setCopied] = useState(false);
  const [exported, setExported] = useState(false);
  const [exportError, setExportError] = useState(false);
  const labels = labelsFor(t);
  const content = useMemo(
    () =>
      getSocialContent(
        template,
        data.team,
        data.selectedSeason,
        data.selectedMatch,
        data.selectedDetail,
        data.players,
        data.snapshot,
        labels,
      ),
    [data, labels, template],
  );
  const caption = getSocialCaption(content, platform, {
    ...labels,
    vs: t("captions.vs"),
    goals: t("content.goalScorers"),
    goal: t("content.goal"),
    topScorerLine: t("captions.topScorerLine", { player: "{player}" }),
    playerOfMatchLine: t("captions.playerOfMatchLine", { player: "{player}" }),
    lineupLine: t("captions.lineupLine", { count: "{count}" }),
  });
  const unavailable =
    !data.selectedMatch ||
    (template === "result" && data.selectedMatch.status !== "completed") ||
    (template === "upcoming" && data.selectedMatch.status !== "scheduled") ||
    (template === "topScorer" && !content.topScorer) ||
    (template === "playerOfMatch" &&
      (data.selectedMatch.status !== "completed" || !content.playerOfMatch)) ||
    (template === "lineup" && content.lineup.length === 0);
  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  const exportCard = async () => {
    setExportError(false);
    setExported(false);
    try {
      await exportSocialCardAsPng(
        {
          branding: data.team,
          content,
          opponentLogoUrl: data.selectedMatch?.opponent_logo_url,
          highlightPhotoUrl: content.playerOfMatch?.photo_url,
          labels: {
            competition: t("content.competition"),
            venue: t("content.venue"),
            goalScorers: t("content.goalScorers"),
            topScorer: t("content.topScorer"),
            playerOfMatch: t("content.playerOfMatch"),
            lineup: t("content.lineup"),
            noScorers: t("content.noScorers"),
          },
        },
        getExportFileName(data.team.name, template, data.selectedMatch?.id),
      );
      setExported(true);
    } catch {
      setExportError(true);
    }
  };
  return (
    <div className="space-y-8">
      <header className="max-w-3xl">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-pitch">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-ink sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-3 text-base leading-7 text-muted">
          {t("description")}
        </p>
      </header>
      <section className="space-y-5 rounded-2xl border border-line bg-white p-5 shadow-[0_14px_44px_rgba(7,26,54,0.04)] sm:p-6">
        <MatchSelector data={data} />
        <TemplateSelector
          selected={template}
          data={data}
          onChange={setTemplate}
        />
      </section>
      {data.matches.length === 0 ? (
        <section className="rounded-2xl border border-line bg-white p-8 text-center">
          <ImageIcon aria-hidden="true" className="mx-auto size-8 text-pitch" />
          <h2 className="mt-4 text-xl font-black text-ink">
            {t("empty.noMatches")}
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted">
            {t("empty.description")}
          </p>
        </section>
      ) : unavailable ? (
        <section className="rounded-2xl border border-line bg-white p-8 text-center">
          <h2 className="text-xl font-black text-ink">
            {t("empty.templateUnavailable")}
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted">
            {t("empty.templateDescription")}
          </p>
        </section>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,25rem)] xl:items-start">
          <section className="rounded-2xl border border-line bg-white p-5 shadow-[0_14px_44px_rgba(7,26,54,0.04)] sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-black text-ink">
                {t("preview.title")}
              </h2>
              <div
                className="flex rounded-lg border border-line p-1"
                role="group"
                aria-label={t("preview.sizeLabel")}
              >
                <button
                  type="button"
                  aria-pressed={!mobilePreview}
                  onClick={() => setMobilePreview(false)}
                  className={
                    "inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-bold " +
                    (!mobilePreview ? "bg-pitch text-white" : "text-muted")
                  }
                >
                  <Monitor aria-hidden="true" className="size-4" />
                  {t("preview.desktop")}
                </button>
                <button
                  type="button"
                  aria-pressed={mobilePreview}
                  onClick={() => setMobilePreview(true)}
                  className={
                    "inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-bold " +
                    (mobilePreview ? "bg-pitch text-white" : "text-muted")
                  }
                >
                  <Smartphone aria-hidden="true" className="size-4" />
                  {t("preview.mobile")}
                </button>
              </div>
            </div>
            <div className="mt-6 rounded-xl bg-[#f6f9f7] p-4 sm:p-8">
              <SocialCardPreview
                data={data}
                content={content}
                mobile={mobilePreview}
              />
            </div>
            <button
              type="button"
              onClick={exportCard}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-pitch px-5 text-sm font-black text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
            >
              <Download aria-hidden="true" className="size-4" />
              {t("preview.export")}
            </button>
            {exported ? (
              <p
                role="status"
                className="mt-3 flex items-center justify-center gap-2 text-sm font-bold text-pitch"
              >
                <Check aria-hidden="true" className="size-4" />
                {t("preview.exported")}
              </p>
            ) : null}
            {exportError ? (
              <p
                role="alert"
                className="mt-3 text-center text-sm font-bold text-red-700"
              >
                {t("preview.exportFailed")}
              </p>
            ) : null}
          </section>
          <aside className="space-y-5 rounded-2xl border border-line bg-white p-5 shadow-[0_14px_44px_rgba(7,26,54,0.04)] sm:p-6">
            <div>
              <h2 className="text-xl font-black text-ink">
                {t("captions.title")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                {t("captions.description")}
              </p>
            </div>
            <div
              className="flex flex-wrap gap-2"
              role="tablist"
              aria-label={t("captions.platformLabel")}
            >
              {(["facebook", "instagram", "x"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={platform === item}
                  onClick={() => setPlatform(item)}
                  className={
                    "min-h-10 rounded-lg px-3 text-sm font-bold " +
                    (platform === item
                      ? "bg-pitch text-white"
                      : "border border-line text-muted")
                  }
                >
                  {t("captions.platforms." + item)}
                </button>
              ))}
            </div>
            <label className="block text-sm font-bold text-ink">
              {t("captions.label", {
                platform: t("captions.platforms." + platform),
              })}
              <textarea
                readOnly
                value={caption}
                rows={8}
                className="mt-2 w-full resize-none rounded-xl border border-line bg-[#f6f9f7] p-3 text-sm leading-6 text-ink outline-none"
              />
            </label>
            <button
              type="button"
              onClick={copyCaption}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-line px-4 text-sm font-bold text-ink hover:border-pitch hover:text-pitch focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
            >
              {copied ? (
                <Check aria-hidden="true" className="size-4" />
              ) : (
                <Copy aria-hidden="true" className="size-4" />
              )}
              {copied ? t("captions.copied") : t("captions.copy")}
            </button>
            <p className="text-xs leading-5 text-muted">
              {t("captions.noPublishing")}
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
