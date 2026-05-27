"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/AuthProvider";

export function AppNav() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();

  return (
    <header className="border-b border-black/5 bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Tukul.com
          </Link>
          <nav className="flex items-center gap-3 text-sm text-zinc-700">
            <Link href="/app">Dashboard</Link>
            <Link href="/app/notifications">Notifications</Link>
            <Link href="/app/projects">Projects</Link>
            <Link href="/app/contractors">Contractors</Link>
            {profile?.is_contractor ? <Link href="/app/contractor">Contractor</Link> : null}
            {profile?.is_admin ? <Link href="/app/admin/contractors">Admin</Link> : null}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-zinc-600 sm:inline">
            {user?.email}
            {profile?.is_admin ? " (Superadmin)" : ""}
          </span>
          <button
            type="button"
            className="rounded-lg border border-black/10 px-3 py-1.5 text-sm hover:bg-zinc-50"
            onClick={async () => {
              await signOut();
              router.replace("/");
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
