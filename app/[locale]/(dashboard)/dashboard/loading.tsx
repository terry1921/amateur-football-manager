import { useTranslations } from "next-intl";

export default function DashboardLoading() {
  const t = useTranslations("FirstTimeDashboard.loading");

  return (
    <div role="status" aria-label={t("label")} className="space-y-6">
      <span className="sr-only">{t("label")}</span>
      <div className="h-40 animate-pulse rounded-2xl border border-line bg-white motion-reduce:animate-none" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <div className="h-[30rem] animate-pulse rounded-2xl border border-line bg-white motion-reduce:animate-none" />
        <div className="h-64 animate-pulse rounded-2xl border border-line bg-white motion-reduce:animate-none" />
      </div>
    </div>
  );
}
