export default function StatisticsLoading() {
  return (
    <div
      className="grid gap-6"
      aria-busy="true"
      aria-label="Loading statistics"
    >
      <div className="h-28 animate-pulse rounded-2xl bg-[#e8f1ea]" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-2xl bg-[#e8f1ea]"
          />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-2xl bg-[#e8f1ea]" />
    </div>
  );
}
