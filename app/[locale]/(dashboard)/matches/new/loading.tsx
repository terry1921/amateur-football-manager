export default function NewMatchLoading() {
  return (
    <div role="status" aria-label="Loading match form" className="space-y-6">
      <span className="sr-only">Loading match form</span>
      <div className="h-10 w-56 animate-pulse rounded bg-[#e7eee9] motion-reduce:animate-none" />
      <div className="h-[38rem] animate-pulse rounded-2xl border border-line bg-white motion-reduce:animate-none" />
    </div>
  );
}
