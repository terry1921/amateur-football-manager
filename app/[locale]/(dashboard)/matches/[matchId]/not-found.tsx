import { getTranslations } from "next-intl/server";
import { NotFoundState } from "@/components/feedback/not-found-state";

export default async function MatchNotFound() {
  const t = await getTranslations("NotFound.match");
  return (
    <NotFoundState
      title={t("title")}
      description={t("description")}
      backHref="/matches"
      backLabel={t("back")}
    />
  );
}
