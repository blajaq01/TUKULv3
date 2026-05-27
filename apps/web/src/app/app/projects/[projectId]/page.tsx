"use client";

import Link from "next/link";
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
  details: Record<string, unknown> | null;
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
  const [myBid, setMyBid] = useState<BidRow | null>(null);
  const [contractId, setContractId] = useState<string | null>(null);
  const [contractorVerificationStatus, setContractorVerificationStatus] = useState<
    "draft" | "submitted" | "approved" | "rejected" | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwnerSaving, setIsOwnerSaving] = useState(false);

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

      const { data: contractData, error: contractError } = await supabase
        .from("contracts")
        .select("id")
        .eq("project_id", projectId)
        .is("deleted_at", null)
        .maybeSingle();

      if (!isMounted) return;
      if (contractError) throw contractError;
      setContractId(contractData?.id ?? null);

      if (isContractor && !isAdmin) {
        const { data: cp, error: cpError } = await supabase
          .from("contractor_profiles")
          .select("verification_status")
          .eq("contractor_id", userId)
          .maybeSingle();

        if (!isMounted) return;
        if (cpError) throw cpError;
        setContractorVerificationStatus(
          (cp?.verification_status as
            | "draft"
            | "submitted"
            | "approved"
            | "rejected"
            | undefined) ?? null,
        );

        const { data: bidData, error: bidError } = await supabase
          .from("bids")
          .select("id,contractor_id,total_price,status,created_at,details")
          .eq("project_id", projectId)
          .eq("contractor_id", userId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(1);

        if (!isMounted) return;
        if (bidError) throw bidError;
        setMyBid(((bidData ?? [])[0] as BidRow | undefined) ?? null);
        setBids([]);
        return;
      }

      const canLoadBids = isAdmin || (!isContractor && projectData?.owner_id === userId);
      if (!canLoadBids) {
        setBids([]);
        setMyBid(null);
        return;
      }

      const { data: bidData, error: bidError } = await supabase
        .from("bids")
        .select("id,contractor_id,total_price,status,created_at,details")
        .eq("project_id", projectId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (!isMounted) return;
      if (bidError) throw bidError;
      setBids((bidData ?? []) as BidRow[]);
      setMyBid(null);
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
          {contractId ? (
            <Link
              href={`/app/contracts/${contractId}`}
              className="rounded-lg bg-black px-3 py-2 font-medium text-white hover:bg-zinc-800"
            >
              Open contract
            </Link>
          ) : null}
        </div>
      </div>

      {isContractor ? (
        <BidBox
          key={`${myBid?.id ?? "new"}:${contractorVerificationStatus ?? "unknown"}`}
          projectId={projectId}
          contractorId={userId}
          myBid={myBid}
          verificationStatus={contractorVerificationStatus}
        />
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
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-sm font-semibold">RM {Number(b.total_price).toFixed(2)}</div>
                    <button
                      type="button"
                      className="rounded-lg bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                      disabled={
                        isOwnerSaving ||
                        Boolean(contractId) ||
                        b.status !== "pending" ||
                        (!isOwner && !isAdmin)
                      }
                      onClick={async () => {
                        setIsOwnerSaving(true);
                        setError(null);
                        try {
                          const now = new Date().toISOString();

                          const { error: acceptError } = await supabase
                            .from("bids")
                            .update({ status: "selected", updated_at: now, updated_by: userId })
                            .eq("id", b.id);
                          if (acceptError) throw acceptError;

                          const { error: rejectError } = await supabase
                            .from("bids")
                            .update({ status: "rejected", updated_at: now, updated_by: userId })
                            .eq("project_id", projectId)
                            .neq("id", b.id)
                            .eq("status", "pending");
                          if (rejectError) throw rejectError;

                          const { data: createdContract, error: contractCreateError } = await supabase
                            .from("contracts")
                            .insert({
                              project_id: projectId,
                              bid_id: b.id,
                              agreed_price: b.total_price,
                              created_by: userId,
                              updated_by: userId,
                            })
                            .select("id")
                            .single();
                          if (contractCreateError) throw contractCreateError;

                          const { error: projectUpdateError } = await supabase
                            .from("projects")
                            .update({ status: "in_progress", updated_at: now, updated_by: userId })
                            .eq("id", projectId);
                          if (projectUpdateError) throw projectUpdateError;

                          setContractId(createdContract.id);
                          setBids((prev) =>
                            prev.map((x) =>
                              x.id === b.id
                                ? { ...x, status: "selected" }
                                : x.status === "pending"
                                  ? { ...x, status: "rejected" }
                                  : x,
                            ),
                          );
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "Failed to accept bid.");
                        } finally {
                          setIsOwnerSaving(false);
                        }
                      }}
                    >
                      Accept bid
                    </button>
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

function BidBox({
  projectId,
  contractorId,
  myBid,
  verificationStatus,
}: {
  projectId: string;
  contractorId: string;
  myBid: BidRow | null;
  verificationStatus: "draft" | "submitted" | "approved" | "rejected" | null;
}) {
  const [totalPrice, setTotalPrice] = useState(
    myBid?.total_price ? String(myBid.total_price) : "",
  );
  const [coverNote, setCoverNote] = useState(
    typeof myBid?.details?.cover_note === "string" ? (myBid.details.cover_note as string) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isApproved = verificationStatus === "approved";
  const canSubmit = isApproved && (!myBid || myBid.status === "pending");

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6">
      <h2 className="text-sm font-semibold">Bid on this project</h2>
      <p className="mt-2 text-sm text-zinc-600">
        {verificationStatus === "approved"
          ? "Submit a total price and optional note. Milestone breakdown comes next."
          : "Contractor verification must be approved before bidding."}
      </p>

      {myBid ? (
        <div className="mt-4 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-700">
          <div className="font-medium">Your current bid</div>
          <div className="mt-1">
            Status: {myBid.status} • Total: RM {Number(myBid.total_price).toFixed(2)}
          </div>
        </div>
      ) : null}

      <form
        className="mt-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setIsSubmitting(true);
          setError(null);
          try {
            const price = Number(totalPrice);
            if (!Number.isFinite(price) || price <= 0) {
              setError("Total price must be a positive number.");
              return;
            }

            const details = { cover_note: coverNote.trim() ? coverNote.trim() : null };

            if (myBid?.id) {
              const { error: updateError } = await supabase
                .from("bids")
                .update({
                  total_price: price,
                  details,
                  updated_by: contractorId,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", myBid.id);
              if (updateError) throw updateError;
            } else {
              const { error: insertError } = await supabase.from("bids").insert({
                project_id: projectId,
                contractor_id: contractorId,
                total_price: price,
                status: "pending",
                details,
                created_by: contractorId,
                updated_by: contractorId,
              });
              if (insertError) throw insertError;
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to submit bid.");
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Total price (RM)</label>
            <input
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
              value={totalPrice}
              onChange={(e) => setTotalPrice(e.target.value)}
              inputMode="decimal"
              disabled={!canSubmit || isSubmitting}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Bid status</label>
            <input
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm disabled:bg-zinc-50"
              value={myBid?.status ?? "pending"}
              disabled
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Cover note</label>
          <textarea
            className="min-h-24 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
            value={coverNote}
            onChange={(e) => setCoverNote(e.target.value)}
            disabled={!canSubmit || isSubmitting}
          />
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex items-center justify-end">
          <button
            type="submit"
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
            disabled={!canSubmit || isSubmitting}
          >
            {myBid ? "Update bid" : "Submit bid"}
          </button>
        </div>
      </form>
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
