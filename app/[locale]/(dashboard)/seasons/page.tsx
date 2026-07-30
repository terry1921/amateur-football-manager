import { getSeasonsData } from "@/features/seasons/data";
import { SeasonManagement } from "@/features/seasons/season-management";

export default async function SeasonsPage() {
  const data = await getSeasonsData();
  return (
    <SeasonManagement seasons={data.seasons} activeSeason={data.activeSeason} />
  );
}
