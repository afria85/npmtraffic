import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-full px-6 py-16">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          Package not found
        </h1>
        <p className="mt-3 text-sm text-slate-400">
          We could not find that package on npm.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 transition hover:border-white/20 hover:bg-white/10"
        >
          Back home
        </Link>
      </div>
    </main>
  );
}
