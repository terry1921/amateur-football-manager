import {
  DashboardExperience,
  DashboardLoadError,
} from "@/features/dashboard/dashboard-experience";
import { getDashboardData } from "@/features/dashboard/data";

export default async function DashboardPage() {
  const data = await getDashboardData();

  if (data.status === "error") return <DashboardLoadError />;

  return <DashboardExperience data={data} />;
}
