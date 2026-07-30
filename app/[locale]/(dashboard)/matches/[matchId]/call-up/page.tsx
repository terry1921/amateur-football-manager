import { notFound } from "next/navigation";
import { CallupEditor } from "@/features/callups/callup-editor";
import { getCallupData } from "@/features/callups/data";
import type { AppLocale } from "@/i18n/routing";

function value(input: string | string[] | undefined) {
  return Array.isArray(input) ? input[0] : input;
}

export default async function MatchCallupPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: AppLocale; matchId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ matchId }, query] = await Promise.all([params, searchParams]);
  const data = await getCallupData(matchId);
  if (!data) notFound();

  return (
    <CallupEditor
      match={data.match}
      players={data.players}
      lastUpdated={data.lastUpdated}
      notice={value(query.notice) === "saved" ? "saved" : undefined}
      rosterTruncated={data.rosterTruncated}
    />
  );
}
