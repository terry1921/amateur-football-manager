import { getTranslations } from "next-intl/server";
import { NotFoundState } from "@/components/feedback/not-found-state";

export default async function PlayerNotFound() {
  const t = await getTranslations("NotFound.player");
  return (
    <NotFoundState
      title={t("title")}
      description={t("description")}
      backHref="/players"
      backLabel={t("back")}
    />
  );
}
