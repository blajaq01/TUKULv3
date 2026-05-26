"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase/client";

type ProjectRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  location: string | null;
  budget: number | null;
  status: string;
  created_at: string;
};

type BidRow = {
  id: string;
  contractor_id: string;
  total_price: number;
  status: string;
  created_at: string;
};

function ProjectDetailLoader({
  projectId,
  userId,
  isContractor,
  isAdmin,
}: {
  projectId: string;
  userId: string;
  isContractor: boolean;
  isAdmin: boolean;
}) {
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [bids, setBids] = useState<BidRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("id,owner_id,title,description,location,budget,status,created_at")
        .eq("id", projectId)
        .is("deleted_at", null)
        .single();

      if (!isMounted) return;
      if (projectError) throw projectError;
      setProject(projectData as ProjectRow);

      const canLoadBids = isAdmin || (!isContractor && projectData?.owner_id === userId);
      if (!canLoadBids) {
        setBids([]);
        return;
      }

      const { data: bidData, error: bidError } = await supabase
        .from("bids")
        .select("id,contractor_id,total_price,status,created_at")
        .eq("project_id", projectId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (!isMounted) return;
      if (bidError) throw bidError;
      setBids((bidData ?? []) as BidRow[]);
    };

    run()
      .catch((e) => {
        if (!isMounted) return;
        setError(e instanceof Error ? e.message : "Failed to load project.");
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isAdmin, isContractor, projectId, userId]);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-black/5 bg-white p-6 text-sm text-zinc-600">
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!project) return null;

  const isOwner = project.owner_id === userId;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-black/5 bg-white p-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{project.title}</h1>
          <div className="text-sm text-zinc-600">
            {project.location ?? "Location not set"} • {project.status}
          </div>
        </div>

        {project.description ? (
          <div className="mt-6 text-sm leading-7 text-zinc-800">
            {project.description}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <div className="rounded-lg bg-zinc-50 px-3 py-2">
            Budget:{" "}
            {typeof project.budget === "number"
              ? `RM ${project.budget.toFixed(2)}`
              : "—"}
          </div>
          <div className="rounded-lg bg-zinc-50 px-3 py-2">
            Project ID: {project.id}
          </div>
        </div>
      </div>

      {isContractor ? (
        <div className="rounded-2xl border border-black/5 bg-white p-6">
          <h2 className="text-sm font-semibold">Bid on this project</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Bid submission and milestone breakdown will be implemented next.
          </p>
        </div>
      ) : null}

      {isOwner || isAdmin ? (
        <div className="rounded-2xl border border-black/5 bg-white">
          <div className="border-b border-black/5 px-6 py-4 text-sm font-semibold">
            Bids
          </div>
          <div className="divide-y divide-black/5">
            {bids.map((b) => (
              <div key={b.id} className="px-6 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      Contractor: {b.contractor_id}
                    </div>
                    <div className="mt-1 text-sm text-zinc-600">{b.status}</div>
                  </div>
                  <div className="text-sm font-semibold">
                    RM {Number(b.total_price).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
            {bids.length === 0 ? (
              <div className="px-6 py-10 text-sm text-zinc-600">
                No bids yet.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function ProjectDetailPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const { user, profile } = useAuth();

  const isContractor = useMemo(
    () => Boolean(profile?.is_contractor),
    [profile?.is_contractor],
  );
  const isAdmin = Boolean(profile?.is_admin);

  const loaderKey = `${projectId}:${user?.id ?? "anon"}:${isAdmin ? "a" : isContractor ? "c" : "o"}`;

  return (
    <ProjectDetailLoader
      key={loaderKey}
      projectId={projectId}
      userId={user?.id ?? ""}
      isContractor={isContractor}
      isAdmin={isAdmin}
    />
  );
}
