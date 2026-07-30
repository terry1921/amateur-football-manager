import { getTranslations } from "next-intl/server";

export default async function MatchesLoading() {
  const t = await getTranslations("Matches.loading");
  return (
    <div
      aria-label={t("label")}
      aria-busy="true"
      className="animate-pulse space-y-6"
    >
      <div className="h-20 rounded-2xl bg-[#e7eee9]" />
      <div className="h-28 rounded-2xl bg-[#e7eee9]" />
      <div className="h-96 rounded-2xl bg-[#e7eee9]" />
    </div>
  );
}
