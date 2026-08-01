import { getTranslations } from "next-intl/server";
import { NotFoundState } from "@/components/feedback/not-found-state";

export default async function SeasonNotFound() {
  const t = await getTranslations("NotFound.season");
  return (
    <NotFoundState
      title={t("title")}
      description={t("description")}
      backHref="/seasons"
      backLabel={t("back")}
    />
  );
}
