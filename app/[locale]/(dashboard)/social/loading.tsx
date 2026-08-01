export default function SocialLoading() {
  return (
    <div
      className="grid gap-6"
      aria-busy="true"
      aria-label="Loading social generator"
    >
      <div className="h-24 animate-pulse rounded-2xl bg-[#e8f1ea]" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-48 animate-pulse rounded-2xl bg-[#e8f1ea]" />
        <div className="h-[32rem] animate-pulse rounded-2xl bg-[#e8f1ea]" />
      </div>
    </div>
  );
}
