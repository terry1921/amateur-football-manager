export default function SeasonDetailLoading() {
  return (
    <div role="status" aria-label="Loading season" className="space-y-6">
      <span className="sr-only">Loading season</span>
      <div className="h-8 w-40 animate-pulse rounded bg-[#e7eee9] motion-reduce:animate-none" />
      <div className="h-44 animate-pulse rounded-2xl border border-line bg-white motion-reduce:animate-none" />
      <div className="h-80 animate-pulse rounded-2xl border border-line bg-white motion-reduce:animate-none" />
    </div>
  );
}
