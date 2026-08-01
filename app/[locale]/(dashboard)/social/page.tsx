import { getSocialGeneratorData } from "@/features/social/data";
import {
  socialTemplateKinds,
  type SocialTemplateKind,
} from "@/features/social/model";
import type { AppLocale } from "@/i18n/routing";
import { SocialGenerator } from "@/features/social/social-generator";

export default async function SocialPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: AppLocale }>;
  searchParams: Promise<{
    season?: string;
    match?: string;
    template?: string;
  }>;
}) {
  await params;
  const { season, match, template } = await searchParams;
  const data = await getSocialGeneratorData(season, match);
  const initialTemplate: SocialTemplateKind = socialTemplateKinds.includes(
    template as SocialTemplateKind,
  )
    ? (template as SocialTemplateKind)
    : data.selectedMatch?.status === "scheduled"
      ? "upcoming"
      : "result";

  return <SocialGenerator data={data} initialTemplate={initialTemplate} />;
}
