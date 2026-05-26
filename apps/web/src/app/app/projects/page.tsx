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
  created_at: string;
  owner_id: string;
};

export default function ProjectsPage() {
  const { user } = useAuth();
  const isContractor = useMemo(
    () => Boolean(user?.user_metadata?.is_contractor),
    [user],
  );

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectRow[]>([]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const run = async () => {
      const query = supabase
        .from("projects")
        .select("id,title,status,location,budget,created_at,owner_id")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      const { data, error: selectError } = isContractor
        ? await query.eq("status", "open")
        : await query.eq("owner_id", user?.id ?? "");

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
  }, [isContractor, user?.id]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-zinc-600">
            {isContractor ? "Browse open projects to bid on." : "Manage your posted projects."}
          </p>
        </div>
        <Link
          href="/app/projects/new"
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Post a project
        </Link>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-black/5 bg-white">
        <div className="border-b border-black/5 px-6 py-4 text-sm font-medium text-zinc-700">
          {isLoading ? "Loading…" : `${projects.length} project(s)`}
        </div>
        <div className="divide-y divide-black/5">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/app/projects/${p.id}`}
              className="block px-6 py-4 hover:bg-zinc-50"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{p.title}</div>
                  <div className="mt-1 text-sm text-zinc-600">
                    {p.location ?? "Location not set"} • {p.status}
                  </div>
                </div>
                <div className="text-sm font-medium text-zinc-900">
                  {typeof p.budget === "number" ? `RM ${p.budget.toFixed(2)}` : "—"}
                </div>
              </div>
            </Link>
          ))}
          {!isLoading && projects.length === 0 ? (
            <div className="px-6 py-10 text-sm text-zinc-600">
              No projects yet.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
