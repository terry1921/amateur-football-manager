import { getTranslations } from "next-intl/server";
import { NotFoundState } from "@/components/feedback/not-found-state";

export default async function LocaleNotFound() {
  const t = await getTranslations("NotFound");
  return (
    <main className="grid min-h-dvh place-items-center bg-[#f6f9f7] px-5 py-12 text-ink">
      <NotFoundState
        title={t("title")}
        description={t("description")}
        backHref="/dashboard"
        backLabel={t("dashboard")}
      />
    </main>
  );
}
