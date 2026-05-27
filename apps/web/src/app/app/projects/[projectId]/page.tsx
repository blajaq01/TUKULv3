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
  visibility: "public" | "invite_only";
  target_start_date: string | null;
  target_end_date: string | null;
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

type BidMilestoneRow = {
  id: string;
  bid_id: string;
  sequence: number;
  name: string;
  description: string | null;
  amount: number;
};

type ProjectHealthRow = {
  project_id: string;
  contract_id: string;
  milestone_total: number;
  released_total: number;
  approved_total: number;
  completed_total: number;
  disputed_count: number;
  pending_release_total: number;
  ledger_release_total: number;
  deposit_total: number;
  refund_total: number;
};

type ContractorDirectoryRow = {
  contractor_id: string;
  business_name: string | null;
  full_name: string | null;
  trust_score: number | null;
  avg_rating: number | null;
  review_count: number | null;
  completed_projects: number | null;
  verification_status: string | null;
};

type ProjectCategoryRow = {
  category_id: number;
  categories: { name: string } | { name: string }[] | null;
};

type ProjectInviteRow = {
  id: string;
  project_id: string;
  contractor_id: string;
  invited_by: string;
  status: "invited" | "revoked";
  created_at: string;
};

type ProjectFileRow = {
  id: string;
  project_id: string;
  uploaded_by: string;
  kind: "photo" | "attachment";
  file_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

type MessageRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  project_id: string | null;
  content: string;
  sent_at: string;
};

type MessageAttachmentRow = {
  id: string;
  message_id: string;
  uploaded_by: string;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

type MilestoneTemplateRow = {
  id: string;
  name: string;
};

type MilestoneTemplateItemRow = {
  sequence: number;
  name: string;
  description: string | null;
  recommended_percent: number | null;
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
  const [categoryNames, setCategoryNames] = useState<string[]>([]);
  const [projectFiles, setProjectFiles] = useState<ProjectFileRow[]>([]);
  const [invites, setInvites] = useState<ProjectInviteRow[]>([]);
  const [approvedContractors, setApprovedContractors] = useState<ContractorDirectoryRow[]>([]);
  const [contractorInfoById, setContractorInfoById] = useState<Record<string, ContractorDirectoryRow>>({});
  const [contractId, setContractId] = useState<string | null>(null);
  const [projectHealth, setProjectHealth] = useState<ProjectHealthRow | null>(null);
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
        .select(
          "id,owner_id,title,description,location,budget,status,visibility,target_start_date,target_end_date,created_at",
        )
        .eq("id", projectId)
        .is("deleted_at", null)
        .single();

      if (!isMounted) return;
      if (projectError) throw projectError;
      setProject(projectData as ProjectRow);

      const { data: categoryData, error: categoryError } = await supabase
        .from("project_categories")
        .select("category_id,categories(name)")
        .eq("project_id", projectId);
      if (!isMounted) return;
      if (categoryError) throw categoryError;
      const names = ((categoryData ?? []) as ProjectCategoryRow[])
        .flatMap((r) => {
          if (!r.categories) return [];
          if (Array.isArray(r.categories)) return r.categories.map((c) => c.name);
          return [r.categories.name];
        })
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0);
      setCategoryNames(names);

      const { data: fileData, error: fileError } = await supabase
        .from("project_files")
        .select("id,project_id,uploaded_by,kind,file_path,file_name,mime_type,size_bytes,created_at")
        .eq("project_id", projectId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(200);
      if (!isMounted) return;
      if (fileError) throw fileError;
      setProjectFiles((fileData ?? []) as ProjectFileRow[]);

      const { data: contractData, error: contractError } = await supabase
        .from("contracts")
        .select("id")
        .eq("project_id", projectId)
        .is("deleted_at", null)
        .maybeSingle();

      if (!isMounted) return;
      if (contractError) throw contractError;
      setContractId(contractData?.id ?? null);

      if (contractData?.id) {
        const { data: healthData, error: healthError } = await supabase
          .from("project_health_v1")
          .select(
            "project_id,contract_id,milestone_total,released_total,approved_total,completed_total,disputed_count,pending_release_total,ledger_release_total,deposit_total,refund_total",
          )
          .eq("project_id", projectId)
          .maybeSingle();
        if (!isMounted) return;
        if (healthError) throw healthError;
        setProjectHealth((healthData as ProjectHealthRow | null) ?? null);
      } else {
        setProjectHealth(null);
      }

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
      const bidRows = (bidData ?? []) as BidRow[];
      setBids(bidRows);
      setMyBid(null);

      const contractorIds = [...new Set(bidRows.map((b) => b.contractor_id))].filter(Boolean);
      if (contractorIds.length > 0) {
        const { data: contractorData, error: contractorError } = await supabase
          .from("contractor_directory")
          .select(
            "contractor_id,business_name,full_name,trust_score,avg_rating,review_count,completed_projects,verification_status",
          )
          .in("contractor_id", contractorIds)
          .limit(200);
        if (!isMounted) return;
        if (contractorError) throw contractorError;
        const map: Record<string, ContractorDirectoryRow> = {};
        for (const row of (contractorData ?? []) as ContractorDirectoryRow[]) {
          map[row.contractor_id] = row;
        }
        setContractorInfoById(map);
      } else {
        setContractorInfoById({});
      }

      if (isAdmin || (!isContractor && projectData?.owner_id === userId)) {
        const { data: inviteData, error: inviteError } = await supabase
          .from("project_invites")
          .select("id,project_id,contractor_id,invited_by,status,created_at")
          .eq("project_id", projectId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(200);
        if (!isMounted) return;
        if (inviteError) throw inviteError;
        setInvites((inviteData ?? []) as ProjectInviteRow[]);

        const { data: contractorsData, error: contractorsError } = await supabase
          .from("contractor_directory")
          .select("contractor_id,business_name,full_name,trust_score,avg_rating,review_count,completed_projects,verification_status")
          .eq("verification_status", "approved")
          .order("trust_score", { ascending: false })
          .limit(200);
        if (!isMounted) return;
        if (contractorsError) throw contractorsError;
        setApprovedContractors((contractorsData ?? []) as ContractorDirectoryRow[]);
      }
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
            {project.location ?? "Location not set"} • {project.status} •{" "}
            {project.visibility === "invite_only" ? "invite-only" : "public"}
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
            Target: {project.target_start_date ?? "—"} → {project.target_end_date ?? "—"}
          </div>
          <div className="rounded-lg bg-zinc-50 px-3 py-2">
            Categories: {categoryNames.length > 0 ? categoryNames.join(", ") : "—"}
          </div>
          {projectHealth ? (
            <div className="rounded-lg bg-zinc-50 px-3 py-2">
              Health: deposit RM {Number(projectHealth.deposit_total).toFixed(2)} • released RM{" "}
              {Number(projectHealth.ledger_release_total).toFixed(2)} • pending RM{" "}
              {Number(projectHealth.pending_release_total).toFixed(2)} • disputes {projectHealth.disputed_count}
            </div>
          ) : null}
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

      <ProjectFilesBox
        disabled={isOwnerSaving}
        userId={userId}
        projectId={projectId}
        canUpload={isOwner || isAdmin}
        files={projectFiles}
        onCreated={(f) => setProjectFiles((prev) => [f, ...prev])}
        onError={(msg) => setError(msg)}
        setSaving={setIsOwnerSaving}
      />

      {isContractor ? (
        <BidBox
          key={`${myBid?.id ?? "new"}:${contractorVerificationStatus ?? "unknown"}`}
          projectId={projectId}
          contractorId={userId}
          myBid={myBid}
          verificationStatus={contractorVerificationStatus}
          ownerId={project.owner_id}
          onBidUpserted={(b) => setMyBid(b)}
          onError={(msg) => setError(msg)}
        />
      ) : null}

      {isOwner || isAdmin ? (
        <>
          <ProjectInvitesBox
            disabled={isOwnerSaving}
            userId={userId}
            projectId={projectId}
            visibility={project.visibility}
            canManage={isOwner || isAdmin}
            invites={invites}
            contractors={approvedContractors}
            onVisibilityUpdated={(next) => setProject((prev) => (prev ? { ...prev, visibility: next } : prev))}
            onInvitesChanged={(next) => setInvites(next)}
            onError={(msg) => setError(msg)}
            setSaving={setIsOwnerSaving}
          />

          <BidsDecisionEngine
            bids={bids}
            contractorInfoById={contractorInfoById}
          />

          <BidsBox
            disabled={isOwnerSaving}
            userId={userId}
            projectId={projectId}
            contractId={contractId}
            isOwner={isOwner}
            isAdmin={isAdmin}
            bids={bids}
            contractorInfoById={contractorInfoById}
            onContractCreated={(id) => setContractId(id)}
            onBidsUpdated={(next) => setBids(next)}
            onError={(msg) => setError(msg)}
            setSaving={setIsOwnerSaving}
          />
        </>
      ) : null}
    </div>
  );
}

function BidBox({
  projectId,
  contractorId,
  myBid,
  verificationStatus,
  ownerId,
  onBidUpserted,
  onError,
}: {
  projectId: string;
  contractorId: string;
  myBid: BidRow | null;
  verificationStatus: "draft" | "submitted" | "approved" | "rejected" | null;
  ownerId: string;
  onBidUpserted: (b: BidRow) => void;
  onError: (msg: string) => void;
}) {
  const [totalPrice, setTotalPrice] = useState(
    myBid?.total_price ? String(myBid.total_price) : "",
  );
  const [coverNote, setCoverNote] = useState(
    typeof myBid?.details?.cover_note === "string" ? (myBid.details.cover_note as string) : "",
  );
  const [milestones, setMilestones] = useState<Array<{ name: string; description: string; amount: string }>>([]);
  const [templates, setTemplates] = useState<MilestoneTemplateRow[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [templateItems, setTemplateItems] = useState<MilestoneTemplateItemRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isApproved = verificationStatus === "approved";
  const canSubmit =
    isApproved &&
    (!myBid || myBid.status === "pending" || myBid.status === "shortlisted" || myBid.status === "withdrawn");

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      if (!myBid?.id) {
        setMilestones([]);
        return;
      }
      const { data, error: loadError } = await supabase
        .from("bid_milestones")
        .select("id,bid_id,sequence,name,description,amount")
        .eq("bid_id", myBid.id)
        .is("deleted_at", null)
        .order("sequence", { ascending: true });
      if (!isMounted) return;
      if (loadError) throw loadError;
      setMilestones(
        ((data ?? []) as BidMilestoneRow[]).map((m) => ({
          name: m.name,
          description: m.description ?? "",
          amount: String(m.amount),
        })),
      );
    };

    run().catch((e) => {
      if (!isMounted) return;
      setError(e instanceof Error ? e.message : "Failed to load bid milestones.");
    });

    return () => {
      isMounted = false;
    };
  }, [myBid?.id]);

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      const { data, error: listError } = await supabase
        .from("milestone_templates")
        .select("id,name")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(200);
      if (!isMounted) return;
      if (listError) throw listError;
      setTemplates((data ?? []) as MilestoneTemplateRow[]);
    };
    run().catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      if (!templateId) {
        setTemplateItems([]);
        return;
      }
      const { data, error: listError } = await supabase
        .from("milestone_template_items")
        .select("sequence,name,description,recommended_percent")
        .eq("template_id", templateId)
        .is("deleted_at", null)
        .order("sequence", { ascending: true });
      if (!isMounted) return;
      if (listError) throw listError;
      setTemplateItems((data ?? []) as MilestoneTemplateItemRow[]);
    };
    run().catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [templateId]);

  const breakdownSum = useMemo(() => {
    return milestones.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
  }, [milestones]);

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6">
      <h2 className="text-sm font-semibold">Bid on this project</h2>
      <p className="mt-2 text-sm text-zinc-600">
        {verificationStatus === "approved"
          ? "Submit a total price and optional note. You can also include an optional phase-by-phase milestone breakdown."
          : "Contractor verification must be approved before bidding."}
      </p>

      {myBid ? (
        <div className="mt-4 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-700">
          <div className="font-medium">Your current bid</div>
          <div className="mt-1">
            Status: {myBid.status} • Total: RM {Number(myBid.total_price).toFixed(2)}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg border border-black/10 px-3 py-1.5 text-sm hover:bg-white disabled:opacity-60"
              disabled={
                !canSubmit || isSubmitting || !(myBid.status === "pending" || myBid.status === "shortlisted")
              }
              onClick={async () => {
                setIsSubmitting(true);
                setError(null);
                try {
                  const now = new Date().toISOString();
                  const { data, error: updateError } = await supabase
                    .from("bids")
                    .update({ status: "withdrawn", updated_at: now, updated_by: contractorId })
                    .eq("id", myBid.id)
                    .select("id,contractor_id,total_price,status,created_at,details")
                    .single();
                  if (updateError) throw updateError;
                  onBidUpserted(data as BidRow);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to withdraw bid.");
                } finally {
                  setIsSubmitting(false);
                }
              }}
            >
              Withdraw bid
            </button>
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

            const normalized = milestones
              .map((m) => ({
                name: m.name.trim(),
                description: m.description.trim() ? m.description.trim() : null,
                amount: Number(m.amount),
              }))
              .filter((m) => m.name.length > 0 || Number.isFinite(m.amount));

            for (const m of normalized) {
              if (!m.name) {
                setError("Each milestone in the breakdown must have a name.");
                return;
              }
              if (!Number.isFinite(m.amount) || m.amount <= 0) {
                setError("Each milestone amount must be a positive number.");
                return;
              }
            }

            if (normalized.length > 0) {
              const sum = normalized.reduce((s, m) => s + m.amount, 0);
              if (Math.abs(sum - price) > 0.01) {
                setError("Milestone breakdown total must equal the bid total price.");
                return;
              }
            }

            let bidId = myBid?.id ?? null;
            if (myBid?.id) {
              const nextStatus = myBid.status === "withdrawn" ? "pending" : myBid.status;
              const { error: updateError } = await supabase
                .from("bids")
                .update({
                  total_price: price,
                  details,
                  status: nextStatus,
                  updated_by: contractorId,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", myBid.id);
              if (updateError) throw updateError;
              onBidUpserted({
                id: myBid.id,
                contractor_id: contractorId,
                total_price: price,
                status: nextStatus,
                created_at: myBid.created_at,
                details,
              });
              bidId = myBid.id;
            } else {
              const now = new Date().toISOString();
              const { data: createdBid, error: insertError } = await supabase
                .from("bids")
                .insert({
                  project_id: projectId,
                  contractor_id: contractorId,
                  total_price: price,
                  status: "pending",
                  details,
                  created_by: contractorId,
                  updated_by: contractorId,
                  updated_at: now,
                })
                .select("id,contractor_id,total_price,status,created_at,details")
                .single();
              if (insertError) throw insertError;
              const created = createdBid as BidRow;
              bidId = created.id;
              onBidUpserted(created);
            }

            if (bidId) {
              const { error: deleteError } = await supabase.from("bid_milestones").delete().eq("bid_id", bidId);
              if (deleteError) throw deleteError;

              if (normalized.length > 0) {
                const rows = normalized.map((m, idx) => ({
                  bid_id: bidId,
                  sequence: idx + 1,
                  name: m.name,
                  description: m.description,
                  amount: m.amount,
                  created_by: contractorId,
                  updated_by: contractorId,
                  updated_at: new Date().toISOString(),
                }));
                const { error: insertMilestonesError } = await supabase.from("bid_milestones").insert(rows);
                if (insertMilestonesError) throw insertMilestonesError;
              }
            }

            onError("");
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to submit bid.";
            setError(msg);
            onError(msg);
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

        <div className="rounded-xl border border-black/10 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">Milestone breakdown (optional)</div>
              <div className="mt-1 text-xs text-zinc-600">
                If you add a breakdown, the total must match your bid total.
              </div>
            </div>
            <div className="text-xs text-zinc-600">
              Breakdown total: RM {breakdownSum.toFixed(2)}
            </div>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-6">
            <div className="md:col-span-4">
              <select
                className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                disabled={!canSubmit || isSubmitting}
              >
                <option value="">Apply template…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 flex items-center justify-end">
              <button
                type="button"
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60"
                disabled={!canSubmit || isSubmitting || !templateId}
                onClick={() => {
                  try {
                    const price = Number(totalPrice);
                    if (!Number.isFinite(price) || price <= 0) {
                      setError("Enter a valid total price before applying a template.");
                      return;
                    }
                    if (templateItems.length === 0) {
                      setError("Selected template has no items.");
                      return;
                    }
                    const percentSum = templateItems.reduce(
                      (sum, i) => sum + (typeof i.recommended_percent === "number" ? i.recommended_percent : 0),
                      0,
                    );
                    if (Math.abs(percentSum - 100) > 0.01) {
                      setError("Template recommended percent must sum to 100%.");
                      return;
                    }

                    const rawAmounts = templateItems.map((i) => {
                      const pct = Number(i.recommended_percent);
                      const amt = round2((price * pct) / 100);
                      return amt;
                    });
                    const sumRaw = round2(rawAmounts.reduce((s, a) => s + a, 0));
                    const diff = round2(price - sumRaw);
                    if (rawAmounts.length > 0 && Math.abs(diff) > 0.001) {
                      rawAmounts[rawAmounts.length - 1] = round2(rawAmounts[rawAmounts.length - 1] + diff);
                    }

                    setMilestones(
                      templateItems.map((i, idx) => ({
                        name: i.name,
                        description: i.description ?? "",
                        amount: String(rawAmounts[idx] ?? ""),
                      })),
                    );
                    setTemplateId("");
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Failed to apply template.");
                  }
                }}
              >
                Apply
              </button>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {milestones.map((m, idx) => (
              <div key={idx} className="grid gap-2 md:grid-cols-12">
                <div className="md:col-span-4">
                  <input
                    className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                    placeholder={`Phase ${idx + 1} name`}
                    value={m.name}
                    onChange={(e) =>
                      setMilestones((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)),
                      )
                    }
                    disabled={!canSubmit || isSubmitting}
                  />
                </div>
                <div className="md:col-span-5">
                  <input
                    className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                    placeholder="Description (optional)"
                    value={m.description}
                    onChange={(e) =>
                      setMilestones((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)),
                      )
                    }
                    disabled={!canSubmit || isSubmitting}
                  />
                </div>
                <div className="md:col-span-2">
                  <input
                    className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                    placeholder="Amount"
                    value={m.amount}
                    onChange={(e) =>
                      setMilestones((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, amount: e.target.value } : x)),
                      )
                    }
                    inputMode="decimal"
                    disabled={!canSubmit || isSubmitting}
                  />
                </div>
                <div className="md:col-span-1 flex items-center justify-end">
                  <button
                    type="button"
                    className="rounded-lg border border-black/10 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60"
                    disabled={!canSubmit || isSubmitting}
                    onClick={() => setMilestones((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <div className="flex justify-end">
              <button
                type="button"
                className="rounded-lg border border-black/10 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60"
                disabled={!canSubmit || isSubmitting}
                onClick={() => setMilestones((prev) => [...prev, { name: "", description: "", amount: "" }])}
              >
                Add phase
              </button>
            </div>
          </div>
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

      <div className="mt-6">
        <ProjectChatBox
          disabled={isSubmitting}
          title="Messages with owner"
          projectId={projectId}
          userId={contractorId}
          otherUserId={ownerId}
          onError={(msg) => {
            setError(msg);
            onError(msg);
          }}
        />
      </div>
    </div>
  );
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
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

function ProjectFilesBox({
  disabled,
  userId,
  projectId,
  canUpload,
  files,
  onCreated,
  onError,
  setSaving,
}: {
  disabled: boolean;
  userId: string;
  projectId: string;
  canUpload: boolean;
  files: ProjectFileRow[];
  onCreated: (f: ProjectFileRow) => void;
  onError: (msg: string) => void;
  setSaving: (v: boolean) => void;
}) {
  const [kind, setKind] = useState<ProjectFileRow["kind"]>("attachment");
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="rounded-2xl border border-black/5 bg-white">
      <div className="border-b border-black/5 px-6 py-4 text-sm font-semibold">Project files</div>
      <div className="divide-y divide-black/5">
        {canUpload ? (
          <form
            className="grid gap-3 px-6 py-5 md:grid-cols-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!file) {
                onError("Please choose a file to upload.");
                return;
              }
              setSaving(true);
              try {
                const safeName = file.name.replaceAll("\\", "_").replaceAll("/", "_");
                const objectPath = `projects/${projectId}/${crypto.randomUUID()}-${safeName}`;
                const { error: uploadError } = await supabase.storage.from("private-files").upload(objectPath, file, {
                  upsert: false,
                  contentType: file.type || undefined,
                });
                if (uploadError) throw uploadError;

                const { data: row, error: insertError } = await supabase
                  .from("project_files")
                  .insert({
                    project_id: projectId,
                    uploaded_by: userId,
                    kind,
                    file_path: objectPath,
                    file_name: file.name,
                    mime_type: file.type || null,
                    size_bytes: typeof file.size === "number" ? file.size : null,
                    updated_at: new Date().toISOString(),
                    updated_by: userId,
                  })
                  .select("id,project_id,uploaded_by,kind,file_path,file_name,mime_type,size_bytes,created_at")
                  .single();
                if (insertError) throw insertError;
                onCreated(row as ProjectFileRow);
                setFile(null);
              } catch (err) {
                onError(err instanceof Error ? err.message : "Failed to upload file.");
              } finally {
                setSaving(false);
              }
            }}
          >
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Type</label>
              <select
                className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                value={kind}
                onChange={(e) => setKind(e.target.value as ProjectFileRow["kind"])}
                disabled={disabled}
              >
                <option value="attachment">Attachment</option>
                <option value="photo">Photo</option>
              </select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium">File</label>
              <input
                className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                disabled={disabled}
              />
            </div>
            <div className="flex items-end justify-end md:col-span-1">
              <button
                type="submit"
                className="w-full rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                disabled={disabled}
              >
                Upload
              </button>
            </div>
          </form>
        ) : null}

        {files.map((f) => (
          <div key={f.id} className="px-6 py-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-medium">{f.file_name}</div>
                <div className="mt-1 text-xs text-zinc-500">
                  {f.kind} • {f.mime_type ?? "—"} •{" "}
                  {typeof f.size_bytes === "number" ? `${Math.round(f.size_bytes / 1024)} KB` : "—"} •{" "}
                  {new Date(f.created_at).toLocaleString()}
                </div>
              </div>
              <button
                type="button"
                className="rounded-lg border border-black/10 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-60"
                disabled={disabled}
                onClick={async () => {
                  setSaving(true);
                  try {
                    const { data, error } = await supabase.storage.from("private-files").createSignedUrl(f.file_path, 60);
                    if (error) throw error;
                    if (!data?.signedUrl) throw new Error("Failed to create signed URL.");
                    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
                  } catch (err) {
                    onError(err instanceof Error ? err.message : "Failed to download file.");
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                Download
              </button>
            </div>
          </div>
        ))}
        {files.length === 0 ? (
          <div className="px-6 py-10 text-sm text-zinc-600">No files uploaded yet.</div>
        ) : null}
      </div>
    </div>
  );
}

function ProjectInvitesBox({
  disabled,
  userId,
  projectId,
  visibility,
  canManage,
  invites,
  contractors,
  onVisibilityUpdated,
  onInvitesChanged,
  onError,
  setSaving,
}: {
  disabled: boolean;
  userId: string;
  projectId: string;
  visibility: "public" | "invite_only";
  canManage: boolean;
  invites: ProjectInviteRow[];
  contractors: ContractorDirectoryRow[];
  onVisibilityUpdated: (next: "public" | "invite_only") => void;
  onInvitesChanged: (next: ProjectInviteRow[]) => void;
  onError: (msg: string) => void;
  setSaving: (v: boolean) => void;
}) {
  const [selectedContractorId, setSelectedContractorId] = useState("");

  const invitedSet = useMemo(() => new Set(invites.filter((i) => i.status === "invited").map((i) => i.contractor_id)), [invites]);
  const available = useMemo(() => contractors.filter((c) => !invitedSet.has(c.contractor_id)), [contractors, invitedSet]);

  return (
    <div className="rounded-2xl border border-black/5 bg-white">
      <div className="border-b border-black/5 px-6 py-4 text-sm font-semibold">Invite-only bidding</div>
      <div className="px-6 py-5">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <div className="text-sm font-medium">Visibility</div>
            <div className="flex gap-2">
              <button
                type="button"
                className={`rounded-lg border px-3 py-2 text-sm ${
                  visibility === "public" ? "border-black bg-black text-white" : "border-black/10 hover:bg-zinc-50"
                }`}
                disabled={disabled || !canManage}
                onClick={async () => {
                  setSaving(true);
                  try {
                    const now = new Date().toISOString();
                    const { error } = await supabase
                      .from("projects")
                      .update({ visibility: "public", updated_at: now, updated_by: userId })
                      .eq("id", projectId);
                    if (error) throw error;
                    onVisibilityUpdated("public");
                  } catch (err) {
                    onError(err instanceof Error ? err.message : "Failed to update visibility.");
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                Public
              </button>
              <button
                type="button"
                className={`rounded-lg border px-3 py-2 text-sm ${
                  visibility === "invite_only" ? "border-black bg-black text-white" : "border-black/10 hover:bg-zinc-50"
                }`}
                disabled={disabled || !canManage}
                onClick={async () => {
                  setSaving(true);
                  try {
                    const now = new Date().toISOString();
                    const { error } = await supabase
                      .from("projects")
                      .update({ visibility: "invite_only", updated_at: now, updated_by: userId })
                      .eq("id", projectId);
                    if (error) throw error;
                    onVisibilityUpdated("invite_only");
                  } catch (err) {
                    onError(err instanceof Error ? err.message : "Failed to update visibility.");
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                Invite-only
              </button>
            </div>
          </div>

          <form
            className="space-y-1.5"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!selectedContractorId) return;
              setSaving(true);
              try {
                const now = new Date().toISOString();
                const { data, error } = await supabase
                  .from("project_invites")
                  .insert({
                    project_id: projectId,
                    contractor_id: selectedContractorId,
                    invited_by: userId,
                    status: "invited",
                    updated_at: now,
                    updated_by: userId,
                  })
                  .select("id,project_id,contractor_id,invited_by,status,created_at")
                  .single();
                if (error) throw error;
                onInvitesChanged([data as ProjectInviteRow, ...invites]);
                setSelectedContractorId("");
              } catch (err) {
                onError(err instanceof Error ? err.message : "Failed to invite contractor.");
              } finally {
                setSaving(false);
              }
            }}
          >
            <div className="text-sm font-medium">Invite a contractor</div>
            <div className="flex gap-2">
              <select
                className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                value={selectedContractorId}
                onChange={(e) => setSelectedContractorId(e.target.value)}
                disabled={disabled || !canManage || visibility !== "invite_only"}
              >
                <option value="">Select contractor…</option>
                {available.map((c) => (
                  <option key={c.contractor_id} value={c.contractor_id}>
                    {(c.business_name ?? c.full_name ?? "Unnamed") + (typeof c.trust_score === "number" ? ` (trust ${c.trust_score.toFixed(2)})` : "")}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                disabled={disabled || !canManage || visibility !== "invite_only" || !selectedContractorId}
              >
                Invite
              </button>
            </div>
            {visibility !== "invite_only" ? (
              <div className="text-xs text-zinc-600">Switch visibility to invite-only to enable invites.</div>
            ) : null}
          </form>
        </div>
      </div>

      <div className="divide-y divide-black/5">
        {invites.map((i) => (
          <div key={i.id} className="px-6 py-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-medium">{i.contractor_id}</div>
                <div className="mt-1 text-xs text-zinc-500">
                  {i.status} • {new Date(i.created_at).toLocaleString()}
                </div>
              </div>
              {canManage && i.status === "invited" ? (
                <button
                  type="button"
                  className="rounded-lg border border-black/10 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-60"
                  disabled={disabled}
                  onClick={async () => {
                    setSaving(true);
                    try {
                      const now = new Date().toISOString();
                      const { error } = await supabase
                        .from("project_invites")
                        .update({ status: "revoked", updated_at: now, updated_by: userId })
                        .eq("id", i.id);
                      if (error) throw error;
                      onInvitesChanged(invites.map((x) => (x.id === i.id ? { ...x, status: "revoked" } : x)));
                    } catch (err) {
                      onError(err instanceof Error ? err.message : "Failed to revoke invite.");
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  Revoke
                </button>
              ) : null}
            </div>
          </div>
        ))}
        {invites.length === 0 ? (
          <div className="px-6 py-10 text-sm text-zinc-600">No invites yet.</div>
        ) : null}
      </div>
    </div>
  );
}

function BidsDecisionEngine({
  bids,
  contractorInfoById,
}: {
  bids: BidRow[];
  contractorInfoById: Record<string, ContractorDirectoryRow>;
}) {
  const lowest = useMemo(() => {
    const nums = bids.map((b) => Number(b.total_price)).filter((n) => Number.isFinite(n) && n > 0);
    return nums.length ? Math.min(...nums) : null;
  }, [bids]);

  const highestTrust = useMemo(() => {
    const scores = bids
      .map((b) => contractorInfoById[b.contractor_id]?.trust_score)
      .filter((n): n is number => typeof n === "number");
    return scores.length ? Math.max(...scores) : null;
  }, [bids, contractorInfoById]);

  return (
    <div className="rounded-2xl border border-black/5 bg-white">
      <div className="border-b border-black/5 px-6 py-4 text-sm font-semibold">Compare bids</div>
      <div className="overflow-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-black/5 text-xs text-zinc-600">
            <tr>
              <th className="px-6 py-3 font-medium">Contractor</th>
              <th className="px-6 py-3 font-medium">Total price</th>
              <th className="px-6 py-3 font-medium">Trust score</th>
              <th className="px-6 py-3 font-medium">Avg rating</th>
              <th className="px-6 py-3 font-medium">Completed</th>
              <th className="px-6 py-3 font-medium">Label</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {bids.map((b) => {
              const info = contractorInfoById[b.contractor_id];
              const label =
                typeof lowest === "number" && Number(b.total_price) === lowest
                  ? "Best price"
                  : typeof highestTrust === "number" && info?.trust_score === highestTrust
                    ? "Lowest risk"
                    : "";
              return (
                <tr key={b.id}>
                  <td className="px-6 py-4">
                    <div className="font-medium">{info?.business_name ?? info?.full_name ?? b.contractor_id}</div>
                    <div className="mt-1 text-xs text-zinc-500">{b.contractor_id}</div>
                  </td>
                  <td className="px-6 py-4 font-semibold">RM {Number(b.total_price).toFixed(2)}</td>
                  <td className="px-6 py-4">{typeof info?.trust_score === "number" ? info.trust_score.toFixed(2) : "—"}</td>
                  <td className="px-6 py-4">
                    {typeof info?.avg_rating === "number" ? info.avg_rating.toFixed(2) : "—"}{" "}
                    <span className="text-xs text-zinc-500">({info?.review_count ?? 0})</span>
                  </td>
                  <td className="px-6 py-4">{info?.completed_projects ?? 0}</td>
                  <td className="px-6 py-4">
                    {label ? <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700">{label}</span> : "—"}
                  </td>
                </tr>
              );
            })}
            {bids.length === 0 ? (
              <tr>
                <td className="px-6 py-10 text-sm text-zinc-600" colSpan={6}>
                  No bids yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BidsBox({
  disabled,
  userId,
  projectId,
  contractId,
  isOwner,
  isAdmin,
  bids,
  contractorInfoById,
  onContractCreated,
  onBidsUpdated,
  onError,
  setSaving,
}: {
  disabled: boolean;
  userId: string;
  projectId: string;
  contractId: string | null;
  isOwner: boolean;
  isAdmin: boolean;
  bids: BidRow[];
  contractorInfoById: Record<string, ContractorDirectoryRow>;
  onContractCreated: (id: string) => void;
  onBidsUpdated: (next: BidRow[]) => void;
  onError: (msg: string) => void;
  setSaving: (v: boolean) => void;
}) {
  const [expandedBidId, setExpandedBidId] = useState<string | null>(null);
  const [milestonesByBidId, setMilestonesByBidId] = useState<Record<string, BidMilestoneRow[]>>({});
  const [chatBidderId, setChatBidderId] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-black/5 bg-white">
      <div className="border-b border-black/5 px-6 py-4 text-sm font-semibold">Bids</div>
      <div className="divide-y divide-black/5">
        {bids.map((b) => {
          const info = contractorInfoById[b.contractor_id];
          const isExpanded = expandedBidId === b.id;
          return (
            <div key={b.id} className="px-6 py-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">
                    {info?.business_name ?? info?.full_name ?? b.contractor_id}
                  </div>
                  <div className="mt-1 text-sm text-zinc-600">
                    {b.status} • RM {Number(b.total_price).toFixed(2)}
                    {typeof info?.trust_score === "number" ? ` • trust ${info.trust_score.toFixed(2)}` : ""}
                  </div>
                  {typeof b.details?.cover_note === "string" ? (
                    <div className="mt-2 text-sm text-zinc-700 whitespace-pre-wrap">{b.details.cover_note as string}</div>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-black/10 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-60"
                    disabled={disabled}
                    onClick={async () => {
                      if (isExpanded) {
                        setExpandedBidId(null);
                        return;
                      }
                      setSaving(true);
                      try {
                        const { data, error } = await supabase
                          .from("bid_milestones")
                          .select("id,bid_id,sequence,name,description,amount")
                          .eq("bid_id", b.id)
                          .is("deleted_at", null)
                          .order("sequence", { ascending: true });
                        if (error) throw error;
                        setMilestonesByBidId((prev) => ({ ...prev, [b.id]: (data ?? []) as BidMilestoneRow[] }));
                        setExpandedBidId(b.id);
                      } catch (err) {
                        onError(err instanceof Error ? err.message : "Failed to load bid breakdown.");
                      } finally {
                        setSaving(false);
                      }
                    }}
                  >
                    {isExpanded ? "Hide breakdown" : "View breakdown"}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-black/10 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-60"
                    disabled={disabled}
                    onClick={() => setChatBidderId((prev) => (prev === b.contractor_id ? null : b.contractor_id))}
                  >
                    {chatBidderId === b.contractor_id ? "Hide chat" : "Message"}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-black/10 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-60"
                    disabled={disabled || Boolean(contractId) || (!isOwner && !isAdmin) || b.status === "rejected"}
                    onClick={async () => {
                      setSaving(true);
                      try {
                        const now = new Date().toISOString();
                        const nextStatus = b.status === "shortlisted" ? "pending" : "shortlisted";
                        if (!(b.status === "pending" || b.status === "shortlisted")) return;
                        const { data, error } = await supabase
                          .from("bids")
                          .update({ status: nextStatus, updated_at: now, updated_by: userId })
                          .eq("id", b.id)
                          .select("id,contractor_id,total_price,status,created_at,details")
                          .single();
                        if (error) throw error;
                        onBidsUpdated(bids.map((x) => (x.id === b.id ? (data as BidRow) : x)));
                      } catch (err) {
                        onError(err instanceof Error ? err.message : "Failed to update shortlist.");
                      } finally {
                        setSaving(false);
                      }
                    }}
                  >
                    {b.status === "shortlisted" ? "Unshortlist" : "Shortlist"}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                    disabled={
                      disabled ||
                      Boolean(contractId) ||
                      !(b.status === "pending" || b.status === "shortlisted") ||
                      (!isOwner && !isAdmin)
                    }
                    onClick={async () => {
                      setSaving(true);
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
                          .in("status", ["pending", "shortlisted"]);
                        if (rejectError) throw rejectError;

                        const { data: createdContract, error: contractCreateError } = await supabase
                          .from("contracts")
                          .insert({
                            project_id: projectId,
                            bid_id: b.id,
                            agreed_price: b.total_price,
                            created_by: userId,
                            updated_by: userId,
                            updated_at: now,
                          })
                          .select("id")
                          .single();
                        if (contractCreateError) throw contractCreateError;

                        const { data: breakdownRows, error: breakdownError } = await supabase
                          .from("bid_milestones")
                          .select("sequence,name,description,amount")
                          .eq("bid_id", b.id)
                          .is("deleted_at", null)
                          .order("sequence", { ascending: true });
                        if (breakdownError) throw breakdownError;

                        const breakdown = (breakdownRows ?? []) as Array<Pick<BidMilestoneRow, "sequence" | "name" | "description" | "amount">>;
                        if (breakdown.length > 0) {
                          const rows = breakdown.map((m) => ({
                            contract_id: createdContract.id,
                            name: m.name,
                            description: m.description ?? null,
                            sequence: m.sequence,
                            amount: m.amount,
                            status: "not_started",
                            created_by: userId,
                            updated_by: userId,
                            updated_at: now,
                          }));
                          const { error: milestonesInsertError } = await supabase.from("milestones").insert(rows);
                          if (milestonesInsertError) throw milestonesInsertError;
                        }

                        const { error: projectUpdateError } = await supabase
                          .from("projects")
                          .update({ status: "in_progress", updated_at: now, updated_by: userId })
                          .eq("id", projectId);
                        if (projectUpdateError) throw projectUpdateError;

                        onContractCreated(createdContract.id as string);
                        onBidsUpdated(
                          bids.map((x) =>
                            x.id === b.id
                              ? { ...x, status: "selected" }
                              : x.status === "pending" || x.status === "shortlisted"
                                ? { ...x, status: "rejected" }
                                : x,
                          ),
                        );
                      } catch (err) {
                        onError(err instanceof Error ? err.message : "Failed to accept bid.");
                      } finally {
                        setSaving(false);
                      }
                    }}
                  >
                    Accept bid
                  </button>
                </div>
              </div>

              {isExpanded ? (
                <div className="mt-4 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-700">
                  {(milestonesByBidId[b.id] ?? []).length > 0 ? (
                    <div className="space-y-2">
                      {(milestonesByBidId[b.id] ?? []).map((m) => (
                        <div key={m.id} className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-medium">
                              {m.sequence}. {m.name}
                            </div>
                            {m.description ? <div className="mt-1 text-xs text-zinc-600">{m.description}</div> : null}
                          </div>
                          <div className="font-semibold">RM {Number(m.amount).toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div>No breakdown provided.</div>
                  )}
                </div>
              ) : null}

              {chatBidderId === b.contractor_id ? (
                <div className="mt-4">
                  <ProjectChatBox
                    disabled={disabled}
                    title="Messages"
                    projectId={projectId}
                    userId={userId}
                    otherUserId={b.contractor_id}
                    onError={onError}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
        {bids.length === 0 ? <div className="px-6 py-10 text-sm text-zinc-600">No bids yet.</div> : null}
      </div>
    </div>
  );
}

function ProjectChatBox({
  disabled,
  title,
  projectId,
  userId,
  otherUserId,
  onError,
}: {
  disabled: boolean;
  title: string;
  projectId: string;
  userId: string;
  otherUserId: string;
  onError: (msg: string) => void;
}) {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [attachmentsById, setAttachmentsById] = useState<Record<string, MessageAttachmentRow[]>>({});
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id,sender_id,receiver_id,project_id,content,sent_at")
        .eq("project_id", projectId)
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`,
        )
        .order("sent_at", { ascending: true })
        .limit(200);
      if (!isMounted) return;
      if (error) throw error;
      const messageRows = (data ?? []) as MessageRow[];
      setMessages(messageRows);

      if (messageRows.length > 0) {
        const messageIds = messageRows.map((m) => m.id);
        const { data: aData, error: aError } = await supabase
          .from("message_attachments")
          .select("id,message_id,uploaded_by,file_path,file_name,mime_type,size_bytes,created_at")
          .in("message_id", messageIds)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(500);
        if (!isMounted) return;
        if (aError) throw aError;
        const grouped: Record<string, MessageAttachmentRow[]> = {};
        for (const row of (aData ?? []) as MessageAttachmentRow[]) {
          (grouped[row.message_id] ||= []).push(row);
        }
        setAttachmentsById(grouped);
      } else {
        setAttachmentsById({});
      }
    };

    run()
      .catch((e) => {
        if (!isMounted) return;
        onError(e instanceof Error ? e.message : "Failed to load messages.");
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [otherUserId, projectId, userId, onError]);

  return (
    <div className="rounded-2xl border border-black/5 bg-white">
      <div className="border-b border-black/5 px-6 py-4 text-sm font-semibold">{title}</div>
      <div className="max-h-[360px] space-y-3 overflow-auto px-6 py-4">
        {isLoading ? <div className="text-sm text-zinc-600">Loading…</div> : null}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[80%] rounded-xl px-4 py-2 text-sm ${
              m.sender_id === userId ? "ml-auto bg-black text-white" : "bg-zinc-100 text-zinc-900"
            }`}
          >
            <div className="whitespace-pre-wrap leading-6">{m.content}</div>
            {(attachmentsById[m.id] ?? []).length > 0 ? (
              <div className="mt-2 space-y-1">
                {(attachmentsById[m.id] ?? []).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className={`block w-full truncate rounded-lg px-3 py-2 text-left text-xs ${
                      m.sender_id === userId ? "bg-white/10 hover:bg-white/15" : "bg-white hover:bg-zinc-50"
                    }`}
                    onClick={async () => {
                      try {
                        const { data, error } = await supabase.storage.from("private-files").createSignedUrl(a.file_path, 60);
                        if (error) throw error;
                        if (!data?.signedUrl) throw new Error("Failed to create signed URL.");
                        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
                      } catch (err) {
                        onError(err instanceof Error ? err.message : "Failed to download attachment.");
                      }
                    }}
                  >
                    {a.file_name}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="mt-1 text-xs opacity-70">{new Date(m.sent_at).toLocaleString()}</div>
          </div>
        ))}
        {!isLoading && messages.length === 0 ? <div className="text-sm text-zinc-600">No messages yet.</div> : null}
      </div>
      <form
        className="grid gap-2 border-t border-black/5 px-6 py-4 md:grid-cols-6"
        onSubmit={async (e) => {
          e.preventDefault();
          const content = text.trim();
          if (!content && !file) return;
          try {
            let objectPath: string | null = null;
            let fileMeta:
              | { file_name: string; mime_type: string | null; size_bytes: number | null }
              | null = null;

            if (file) {
              const safeName = file.name.replaceAll("\\", "_").replaceAll("/", "_");
              objectPath = `messages/${projectId}/${crypto.randomUUID()}-${safeName}`;
              const { error: uploadError } = await supabase.storage.from("private-files").upload(objectPath, file, {
                upsert: false,
                contentType: file.type || undefined,
              });
              if (uploadError) throw uploadError;
              fileMeta = {
                file_name: file.name,
                mime_type: file.type || null,
                size_bytes: typeof file.size === "number" ? file.size : null,
              };
            }

            const { data, error } = await supabase
              .from("messages")
              .insert({
                sender_id: userId,
                receiver_id: otherUserId,
                project_id: projectId,
                content: content ? content : "Attachment",
              })
              .select("id,sender_id,receiver_id,project_id,content,sent_at")
              .single();
            if (error) throw error;
            const msg = data as MessageRow;
            setMessages((prev) => [...prev, msg]);
            if (objectPath && fileMeta) {
              const { data: attachment, error: attachmentError } = await supabase
                .from("message_attachments")
                .insert({
                  message_id: msg.id,
                  uploaded_by: userId,
                  file_path: objectPath,
                  file_name: fileMeta.file_name,
                  mime_type: fileMeta.mime_type,
                  size_bytes: fileMeta.size_bytes,
                })
                .select("id,message_id,uploaded_by,file_path,file_name,mime_type,size_bytes,created_at")
                .single();
              if (attachmentError) throw attachmentError;
              setAttachmentsById((prev) => ({
                ...prev,
                [msg.id]: [attachment as MessageAttachmentRow, ...(prev[msg.id] ?? [])],
              }));
              setFile(null);
            }
            setText("");
          } catch (err) {
            onError(err instanceof Error ? err.message : "Failed to send message.");
          }
        }}
      >
        <input
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50 md:col-span-4"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a message…"
          disabled={disabled}
        />
        <input
          className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50 md:col-span-2"
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          disabled={disabled}
        />
        <button
          type="submit"
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 md:col-span-6"
          disabled={disabled || (!text.trim() && !file)}
        >
          Send
        </button>
      </form>
    </div>
  );
}
