import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Image
            src="/brand/tukul-written.jpg"
            alt="Tukul.com"
            width={160}
            height={36}
            priority
          />
          <div className="flex items-center gap-3">
            <Link
              href="/auth"
              className="rounded-lg border border-black/10 px-3 py-1.5 text-sm hover:bg-zinc-50"
            >
              Sign in
            </Link>
            <Link
              href="/app"
              className="rounded-lg bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Open dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-14">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="space-y-5">
            <h1 className="text-4xl font-semibold tracking-tight text-black">
              Trust-first construction marketplace for Malaysia
            </h1>
            <p className="text-base leading-7 text-zinc-700">
              Post a detailed scope, receive bids from verified contractors, then run the job with
              milestone approvals and escrow-style releases.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/auth"
                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Post your project
              </Link>
              <Link
                href="/auth"
                className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
              >
                Create contractor profile
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-black/5 bg-white p-6">
            <div className="flex items-center gap-4">
              <Image
                src="/brand/tukul-mark.png"
                alt="Tukul mark"
                width={56}
                height={56}
              />
              <div>
                <div className="text-sm font-semibold">Milestones + escrow flow</div>
                <div className="text-sm text-zinc-600">
                  Funds are released after each phase is approved.
                </div>
              </div>
            </div>
            <div className="mt-6 grid gap-3 text-sm text-zinc-700">
              <div className="rounded-xl bg-zinc-50 p-4">
                Owners post structured scopes with photos and categories.
              </div>
              <div className="rounded-xl bg-zinc-50 p-4">
                Contractors bid with totals and optional phase breakdowns.
              </div>
              <div className="rounded-xl bg-zinc-50 p-4">
                The platform enforces on-platform communication and audit trails.
              </div>
            </div>
          </div>
        </div>

        <Image
          src="/brand/tukul-written.jpg"
          alt="Tukul.com"
          width={220}
          height={48}
          className="opacity-0"
        />
      </main>
    </div>
  );
}
