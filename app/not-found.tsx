import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#f6f9f7] px-5 py-12 font-sans text-[#071a36]">
      <section className="w-full max-w-md rounded-2xl border border-[#cce2cf] bg-white p-8 text-center">
        <h1 className="text-3xl font-black tracking-[-0.035em]">
          Page not found
        </h1>
        <p className="mt-3 leading-7 text-[#607086]">
          This page is unavailable or no longer exists.
        </p>
        <Link
          href="/en/dashboard"
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#00a331] px-5 text-sm font-bold text-white"
        >
          Go to dashboard
        </Link>
      </section>
    </main>
  );
}
