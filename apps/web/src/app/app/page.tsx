"use client";

import Link from "next/link";

import { useAuth } from "@/components/AuthProvider";

function getRoleLabel(profile: { is_contractor: boolean; is_admin: boolean } | null) {
  if (profile?.is_admin) return "Superadmin";
  return profile?.is_contractor ? "Contractor" : "Property owner";
}

export default function DashboardPage() {
  const { user, profile } = useAuth();

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-black/5 bg-white p-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-600">
            Signed in as {user?.email} • {getRoleLabel(profile)}
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/app/projects"
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Browse projects
          </Link>
          <Link
            href="/app/projects/new"
            className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Post a project
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-black/5 bg-white p-6">
          <h2 className="text-sm font-semibold">Trust-first workflow</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Projects move from bidding → contract → milestones → escrow releases after approval.
          </p>
        </div>
        <div className="rounded-2xl border border-black/5 bg-white p-6">
          <h2 className="text-sm font-semibold">Verification</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Contractor onboarding is designed around CIDB/SSM and document-backed profiles.
          </p>
        </div>
      </div>
    </div>
  );
}
