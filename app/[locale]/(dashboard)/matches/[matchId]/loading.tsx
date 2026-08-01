export default function MatchDetailLoading() {
  return (
    <div role="status" aria-label="Loading match" className="space-y-6">
      <span className="sr-only">Loading match</span>
      <div className="h-8 w-36 animate-pulse rounded bg-[#e7eee9] motion-reduce:animate-none" />
      <div className="h-56 animate-pulse rounded-2xl border border-line bg-white motion-reduce:animate-none" />
      <div className="h-72 animate-pulse rounded-2xl border border-line bg-white motion-reduce:animate-none" />
    </div>
  );
}
