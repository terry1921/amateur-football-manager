import { getBillingConfig } from "@/features/billing/config";
import { getTeamAccess } from "@/features/teams/access";
import { isAppError } from "@/lib/errors/error-codes";
import { getStatisticsData } from "@/features/statistics/data";
import { StatisticsLockedView } from "@/features/statistics/statistics-locked-view";
import { StatisticsView } from "@/features/statistics/statistics-view";
import {
  filterPlayerStatistics,
  resolvePlayerStatisticsFilters,
} from "@/features/statistics/model";
import type { AppLocale } from "@/i18n/routing";

export default async function StatisticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: AppLocale }>;
  searchParams: Promise<{
    season?: string;
    q?: string;
    position?: string;
    status?: string;
  }>;
}) {
  await params;
  const { season, q, position, status } = await searchParams;
  let data;
  try {
    data = await getStatisticsData(season, {
      requireAdvancedStatistics: true,
    });
  } catch (error) {
    if (!isAppError(error) || error.code !== "ENTITLEMENT_REQUIRED") {
      throw error;
    }

    const { team } = await getTeamAccess();
    if (!team) throw error;
    let checkoutAvailable = false;
    try {
      getBillingConfig();
      checkoutAvailable = true;
    } catch {
      checkoutAvailable = false;
    }
    return (
      <StatisticsLockedView
        teamId={team.id}
        checkoutAvailable={checkoutAvailable}
      />
    );
  }
  const filters = resolvePlayerStatisticsFilters(q, position, status);
  return (
    <StatisticsView
      data={{
        ...data,
        players: filterPlayerStatistics(data.snapshot.players, filters),
        filters,
      }}
    />
  );
}
