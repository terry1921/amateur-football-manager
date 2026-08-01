export default function LeaderboardsLoading() {
  return (
    <div
      className="grid gap-6"
      aria-busy="true"
      aria-label="Loading leaderboards"
    >
      <div className="h-28 animate-pulse rounded-2xl bg-[#e8f1ea]" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-64 animate-pulse rounded-2xl bg-[#e8f1ea]"
          />
        ))}
      </div>
    </div>
  );
}
