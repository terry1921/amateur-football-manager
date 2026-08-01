export default function NewSeasonLoading() {
  return (
    <div role="status" aria-label="Loading season form" className="space-y-6">
      <span className="sr-only">Loading season form</span>
      <div className="h-10 w-52 animate-pulse rounded bg-[#e7eee9] motion-reduce:animate-none" />
      <div className="h-[28rem] animate-pulse rounded-2xl border border-line bg-white motion-reduce:animate-none" />
    </div>
  );
}
