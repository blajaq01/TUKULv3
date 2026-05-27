"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase/client";

type ProjectRow = {
  id: string;
  title: string;
  status: string;
  location: string | null;
  budget: number | null;
  visibility: "public" | "invite_only";
  target_start_date: string | null;
  target_end_date: string | null;
  created_at: string;
  owner_id: string;
};

function ProjectsList({
  userId,
  isContractor,
  isAdmin,
}: {
  userId: string;
  isContractor: boolean;
  isAdmin: boolean;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectRow[]>([]);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      const query = supabase
        .from("projects")
        .select("id,title,status,location,budget,visibility,target_start_date,target_end_date,created_at,owner_id")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      const { data, error: selectError } = isAdmin
        ? await query
        : isContractor
          ? await query.eq("status", "open")
          : await query.eq("owner_id", userId);

      if (!isMounted) return;
      if (selectError) {
        setError(selectError.message);
        setProjects([]);
        return;
      }
      setProjects((data ?? []) as ProjectRow[]);
    };

    run()
      .catch((e) => {
        if (!isMounted) return;
        setError(e instanceof Error ? e.message : "Failed to load projects.");
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isAdmin, isContractor, userId]);

  return (
    <>
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-3xl border border-black/5 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-black/5 px-6 py-4">
          <div className="text-sm font-medium text-zinc-700">{isLoading ? "Loading…" : "Project list"}</div>
          <div className="text-xs text-zinc-500">{isLoading ? "—" : `${projects.length} total`}</div>
        </div>
        <div className="divide-y divide-black/5">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/app/projects/${p.id}`}
              className="block px-6 py-5 transition-colors hover:bg-zinc-50"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold text-zinc-900">{p.title}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-600">
                    <span>{p.location ?? "Location not set"}</span>
                    <span className="text-zinc-300">•</span>
                    <span className="capitalize">{p.status.replaceAll("_", " ")}</span>
                    <span className="text-zinc-300">•</span>
                    <span>{p.visibility === "invite_only" ? "invite-only" : "public"}</span>
                  </div>
                  {p.target_start_date || p.target_end_date ? (
                    <div className="mt-2 text-xs text-zinc-500">
                      Target: {p.target_start_date ? p.target_start_date : "—"} → {p.target_end_date ? p.target_end_date : "—"}
                    </div>
                  ) : null}
                </div>
                <div className="text-right">
                  <div className="text-base font-semibold text-zinc-900">
                  {typeof p.budget === "number" ? `RM ${p.budget.toFixed(2)}` : "—"}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">Budget</div>
                </div>
              </div>
            </Link>
          ))}
          {!isLoading && projects.length === 0 ? (
            <div className="px-6 py-12">
              <div className="text-sm font-semibold text-zinc-900">No projects yet</div>
              <div className="mt-1 text-sm text-zinc-600">Create your first project to start receiving bids.</div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

export default function ProjectsPage() {
  const { user, profile } = useAuth();
  const isContractor = useMemo(
    () => Boolean(profile?.is_contractor),
    [profile?.is_contractor],
  );
  const isAdmin = Boolean(profile?.is_admin);
  const listKey = `${user?.id ?? "anon"}:${isAdmin ? "a" : isContractor ? "c" : "o"}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Projects</h1>
          <p className="text-sm text-zinc-600">
            {isAdmin
              ? "Superadmin view of all projects."
              : isContractor
                ? "Browse open projects to bid on."
                : "Manage your posted projects."}
          </p>
        </div>
        <Link
          href="/app/projects/new"
          className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Post a project
        </Link>
      </div>

      <ProjectsList
        key={listKey}
        userId={user?.id ?? ""}
        isContractor={isContractor}
        isAdmin={isAdmin}
      />
    </div>
  );
}
