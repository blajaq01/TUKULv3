"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase/client";

type ContractRow = {
  id: string;
  project_id: string;
  bid_id: string;
  agreed_price: number;
};

type ProjectRow = {
  id: string;
  owner_id: string;
  title: string;
  status: string;
};

type BidRow = {
  id: string;
  contractor_id: string;
};

type MilestoneRow = {
  id: string;
  contract_id: string;
  name: string;
  description: string | null;
  sequence: number;
  amount: number;
  status:
    | "not_started"
    | "in_progress"
    | "completed"
    | "approved"
    | "payment_released"
    | "disputed";
  due_date: string | null;
  completed_at: string | null;
  evidence: Record<string, unknown> | null;
};

type LedgerRow = {
  id: number;
  milestone_id: string | null;
  contract_id: string | null;
  from_user: string;
  to_user: string;
  amount: number;
  type: "deposit" | "pending_release" | "release" | "refund" | "retention_hold" | "retention_release";
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

type VariationOrderRow = {
  id: string;
  contract_id: string;
  milestone_id: string | null;
  requested_by: string;
  title: string;
  description: string | null;
  amount: number;
  status: "proposed" | "approved" | "rejected" | "cancelled";
  decided_at: string | null;
  decided_by: string | null;
  decision_notes: string | null;
  created_at: string;
};

type DisputeRow = {
  id: string;
  contract_id: string;
  milestone_id: string | null;
  raised_by: string;
  reason: string;
  status:
    | "open"
    | "in_review"
    | "cipaa_claim_sent"
    | "cipaa_response_received"
    | "adjudication_requested"
    | "resolved"
    | "cancelled";
  claim_amount: number | null;
  cipaa_reference: string | null;
  payment_claim_sent_at: string | null;
  payment_response_received_at: string | null;
  adjudication_requested_at: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
};

type MilestoneFileRow = {
  id: string;
  milestone_id: string;
  uploaded_by: string;
  kind: "photo" | "attachment" | "invoice";
  file_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
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

type RetentionTermsRow = {
  contract_id: string;
  retention_percent: number;
  defect_liability_days: number;
  defect_liability_start_at: string | null;
  retention_release_available_at: string | null;
  retention_released_at: string | null;
};

type ContractFinancialsRow = {
  contract_id: string;
  milestone_total: number;
  deposit_total: number;
  released_total: number;
  retention_held_total: number;
  retention_released_total: number;
};

type ContractDocumentRow = {
  id: string;
  contract_id: string;
  doc_type: string;
  title: string;
  content: string;
  created_by: string;
  created_at: string;
};

function toDateInputValue(value: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

export default function ContractPage() {
  const params = useParams<{ contractId: string }>();
  const contractId = params.contractId;
  const { user, profile } = useAuth();

  const isAdmin = Boolean(profile?.is_admin);
  const isContractor = Boolean(profile?.is_contractor);

  if (!user?.id) return null;

  return (
    <ContractLoader
      key={`${contractId}:${user.id}`}
      contractId={contractId}
      userId={user.id}
      isAdmin={isAdmin}
      isContractor={isContractor}
    />
  );
}

function ContractLoader({
  contractId,
  userId,
  isAdmin,
  isContractor,
}: {
  contractId: string;
  userId: string;
  isAdmin: boolean;
  isContractor: boolean;
}) {
  const [contract, setContract] = useState<ContractRow | null>(null);
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [bid, setBid] = useState<BidRow | null>(null);
  const [milestones, setMilestones] = useState<MilestoneRow[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [milestoneFilesById, setMilestoneFilesById] = useState<Record<string, MilestoneFileRow[]>>({});
  const [messageAttachmentsById, setMessageAttachmentsById] = useState<Record<string, MessageAttachmentRow[]>>({});
  const [reviews, setReviews] = useState<{ reviewer_id: string; reviewee_id: string }[]>([]);
  const [platformAdminId, setPlatformAdminId] = useState<string | null>(null);
  const [variationOrders, setVariationOrders] = useState<VariationOrderRow[]>([]);
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [retentionTerms, setRetentionTerms] = useState<RetentionTermsRow | null>(null);
  const [financials, setFinancials] = useState<ContractFinancialsRow | null>(null);
  const [documents, setDocuments] = useState<ContractDocumentRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const isOwner = useMemo(() => project?.owner_id === userId, [project?.owner_id, userId]);
  const contractorId = useMemo(() => bid?.contractor_id ?? null, [bid?.contractor_id]);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      const { data: contractData, error: contractError } = await supabase
        .from("contracts")
        .select("id,project_id,bid_id,agreed_price")
        .eq("id", contractId)
        .is("deleted_at", null)
        .single();
      if (!isMounted) return;
      if (contractError) throw contractError;
      setContract(contractData as ContractRow);

      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("id,owner_id,title,status")
        .eq("id", (contractData as ContractRow).project_id)
        .is("deleted_at", null)
        .single();
      if (!isMounted) return;
      if (projectError) throw projectError;
      setProject(projectData as ProjectRow);

      const { data: bidData, error: bidError } = await supabase
        .from("bids")
        .select("id,contractor_id")
        .eq("id", (contractData as ContractRow).bid_id)
        .is("deleted_at", null)
        .single();
      if (!isMounted) return;
      if (bidError) throw bidError;
      setBid(bidData as BidRow);

      const { data: milestonesData, error: milestonesError } = await supabase
        .from("milestones")
        .select(
          "id,contract_id,name,description,sequence,amount,status,due_date,completed_at,evidence",
        )
        .eq("contract_id", contractId)
        .is("deleted_at", null)
        .order("sequence", { ascending: true });
      if (!isMounted) return;
      if (milestonesError) throw milestonesError;
      const milestoneRows = (milestonesData ?? []) as MilestoneRow[];
      setMilestones(milestoneRows);

      if (milestoneRows.length > 0) {
        const milestoneIds = milestoneRows.map((m) => m.id);
        const { data: mfData, error: mfError } = await supabase
          .from("milestone_files")
          .select("id,milestone_id,uploaded_by,kind,file_path,file_name,mime_type,size_bytes,created_at")
          .in("milestone_id", milestoneIds)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(500);
        if (!isMounted) return;
        if (mfError) throw mfError;
        const grouped: Record<string, MilestoneFileRow[]> = {};
        for (const row of (mfData ?? []) as MilestoneFileRow[]) {
          (grouped[row.milestone_id] ||= []).push(row);
        }
        setMilestoneFilesById(grouped);
      } else {
        setMilestoneFilesById({});
      }

      const { data: ledgerData, error: ledgerError } = await supabase
        .from("ledger_entries")
        .select("id,milestone_id,contract_id,from_user,to_user,amount,type,created_at")
        .eq("contract_id", contractId)
        .order("created_at", { ascending: false });
      if (!isMounted) return;
      if (ledgerError) throw ledgerError;
      setLedgerEntries((ledgerData ?? []) as LedgerRow[]);

      const otherUserId = (bidData as BidRow).contractor_id === userId
        ? (projectData as ProjectRow).owner_id
        : (bidData as BidRow).contractor_id;

      const { data: messageData, error: messageError } = await supabase
        .from("messages")
        .select("id,sender_id,receiver_id,project_id,content,sent_at")
        .eq("project_id", (projectData as ProjectRow).id)
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`,
        )
        .order("sent_at", { ascending: true })
        .limit(200);

      if (!isMounted) return;
      if (messageError) throw messageError;
      const messageRows = (messageData ?? []) as MessageRow[];
      setMessages(messageRows);

      if (messageRows.length > 0) {
        const messageIds = messageRows.map((m) => m.id);
        const { data: maData, error: maError } = await supabase
          .from("message_attachments")
          .select("id,message_id,uploaded_by,file_path,file_name,mime_type,size_bytes,created_at")
          .in("message_id", messageIds)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(500);
        if (!isMounted) return;
        if (maError) throw maError;
        const grouped: Record<string, MessageAttachmentRow[]> = {};
        for (const row of (maData ?? []) as MessageAttachmentRow[]) {
          (grouped[row.message_id] ||= []).push(row);
        }
        setMessageAttachmentsById(grouped);
      } else {
        setMessageAttachmentsById({});
      }

      const { data: reviewData, error: reviewError } = await supabase
        .from("reviews")
        .select("reviewer_id,reviewee_id")
        .eq("project_id", (projectData as ProjectRow).id);

      if (!isMounted) return;
      if (reviewError) throw reviewError;
      setReviews((reviewData ?? []) as { reviewer_id: string; reviewee_id: string }[]);

      const { data: adminIdData, error: adminIdError } = await supabase.rpc("platform_admin_id");
      if (!isMounted) return;
      if (adminIdError) throw adminIdError;
      setPlatformAdminId(typeof adminIdData === "string" ? adminIdData : null);

      const { data: variationData, error: variationError } = await supabase
        .from("variation_orders")
        .select(
          "id,contract_id,milestone_id,requested_by,title,description,amount,status,decided_at,decided_by,decision_notes,created_at",
        )
        .eq("contract_id", contractId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(200);
      if (!isMounted) return;
      if (variationError) throw variationError;
      setVariationOrders((variationData ?? []) as VariationOrderRow[]);

      const { data: disputesData, error: disputesError } = await supabase
        .from("disputes")
        .select(
          "id,contract_id,milestone_id,raised_by,reason,status,claim_amount,cipaa_reference,payment_claim_sent_at,payment_response_received_at,adjudication_requested_at,resolution_notes,resolved_at,resolved_by,created_at",
        )
        .eq("contract_id", contractId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(200);
      if (!isMounted) return;
      if (disputesError) throw disputesError;
      setDisputes((disputesData ?? []) as DisputeRow[]);

      const { data: retentionData, error: retentionError } = await supabase
        .from("contract_retention_terms")
        .select(
          "contract_id,retention_percent,defect_liability_days,defect_liability_start_at,retention_release_available_at,retention_released_at",
        )
        .eq("contract_id", contractId)
        .is("deleted_at", null)
        .maybeSingle();
      if (!isMounted) return;
      if (retentionError) throw retentionError;
      setRetentionTerms((retentionData as RetentionTermsRow | null) ?? null);

      const { data: financialData, error: financialError } = await supabase
        .from("contract_financials_v1")
        .select("contract_id,milestone_total,deposit_total,released_total,retention_held_total,retention_released_total")
        .eq("contract_id", contractId)
        .maybeSingle();
      if (!isMounted) return;
      if (financialError) throw financialError;
      setFinancials((financialData as ContractFinancialsRow | null) ?? null);

      const { data: docData, error: docError } = await supabase
        .from("contract_documents")
        .select("id,contract_id,doc_type,title,content,created_by,created_at")
        .eq("contract_id", contractId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!isMounted) return;
      if (docError) throw docError;
      setDocuments((docData ?? []) as ContractDocumentRow[]);
    };

    run()
      .catch((e) => {
        if (!isMounted) return;
        setError(e instanceof Error ? e.message : "Failed to load contract.");
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [contractId, userId]);

  const totalMilestones = useMemo(
    () => milestones.reduce((sum, m) => sum + Number(m.amount), 0),
    [milestones],
  );

  async function addMilestone({
    name,
    amount,
    dueDate,
    description,
  }: {
    name: string;
    amount: number;
    dueDate: string | null;
    description: string | null;
  }) {
    if (!contract) return;
    setIsSaving(true);
    setError(null);

    try {
      const nextSum = totalMilestones + amount;
      if (nextSum > contract.agreed_price + 0.0001) {
        throw new Error("Milestone total exceeds contract agreed price.");
      }

      const nextSequence = milestones.length === 0 ? 1 : milestones[milestones.length - 1].sequence + 1;
      const { data, error: insertError } = await supabase
        .from("milestones")
        .insert({
          contract_id: contract.id,
          name,
          description,
          sequence: nextSequence,
          amount,
          due_date: dueDate,
          status: "not_started",
          created_by: userId,
          updated_by: userId,
        })
        .select("id,contract_id,name,description,sequence,amount,status,due_date,completed_at,evidence")
        .single();
      if (insertError) throw insertError;
      setMilestones((prev) => [...prev, data as MilestoneRow]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add milestone.");
    } finally {
      setIsSaving(false);
    }
  }

  async function updateMilestoneStatus(milestoneId: string, nextStatus: MilestoneRow["status"]) {
    setIsSaving(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from("milestones")
        .update({
          status: nextStatus,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        })
        .eq("id", milestoneId);
      if (updateError) throw updateError;
      setMilestones((prev) => prev.map((m) => (m.id === milestoneId ? { ...m, status: nextStatus } : m)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update milestone.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveEvidence(milestoneId: string, evidenceText: string) {
    setIsSaving(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from("milestones")
        .update({
          evidence: { note: evidenceText.trim() ? evidenceText.trim() : null },
          updated_at: new Date().toISOString(),
          updated_by: userId,
        })
        .eq("id", milestoneId);
      if (updateError) throw updateError;
      setMilestones((prev) =>
        prev.map((m) => (m.id === milestoneId ? { ...m, evidence: { note: evidenceText.trim() } } : m)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save evidence.");
    } finally {
      setIsSaving(false);
    }
  }

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

  if (!contract || !project || !bid) return null;

  const canEditMilestones = isAdmin || isOwner;
  const canWorkOnMilestones = isAdmin || (isContractor && contractorId === userId);
  const allReleased =
    milestones.length > 0 && milestones.every((m) => m.status === "payment_released");
  const canCompleteProject = (isAdmin || isOwner) && project.status === "in_progress" && allReleased;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-black/5 bg-white p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Contract</h1>
            <div className="mt-2 text-sm text-zinc-600">
              Project:{" "}
              <Link className="underline" href={`/app/projects/${project.id}`}>
                {project.title}
              </Link>{" "}
              • Status: {project.status.replaceAll("_", " ")}
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-zinc-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Agreed price</div>
                <div className="mt-2 text-lg font-semibold text-zinc-900">
                  RM {Number(contract.agreed_price).toFixed(2)}
                </div>
              </div>
              <div className="rounded-2xl bg-zinc-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Milestones total</div>
                <div className="mt-2 text-lg font-semibold text-zinc-900">RM {totalMilestones.toFixed(2)}</div>
              </div>
              <div className="rounded-2xl bg-zinc-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Project</div>
                <div className="mt-2 text-sm font-semibold text-zinc-900">{project.id}</div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
              disabled={isSaving || !canCompleteProject}
              onClick={async () => {
                setIsSaving(true);
                setError(null);
                try {
                  const now = new Date().toISOString();
                  const { error: updateError } = await supabase
                    .from("projects")
                    .update({ status: "completed", updated_at: now, updated_by: userId })
                    .eq("id", project.id);
                  if (updateError) throw updateError;
                  setProject((prev) => (prev ? { ...prev, status: "completed" } : prev));
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Failed to complete project.");
                } finally {
                  setIsSaving(false);
                }
              }}
            >
              Complete project
            </button>
          </div>
        </div>
      </div>

      {canEditMilestones ? (
        <MilestoneBuilder
          disabled={isSaving}
          userId={userId}
          contractId={contract.id}
          contractPrice={contract.agreed_price}
          existingCount={milestones.length}
          remaining={Math.max(0, contract.agreed_price - totalMilestones)}
          onAdd={addMilestone}
          onBulkAdded={(added) => setMilestones((prev) => [...prev, ...added].sort((a, b) => a.sequence - b.sequence))}
        />
      ) : null}

      <div className="rounded-3xl border border-black/5 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-black/5 px-6 py-4">
          <div className="text-sm font-semibold text-zinc-700">Milestones</div>
          <div className="text-xs text-zinc-500">{milestones.length} total</div>
        </div>
        <div className="divide-y divide-black/5">
          {milestones.map((m) => (
            <MilestoneRowView
              key={`${m.id}:${typeof m.evidence?.note === "string" ? (m.evidence.note as string) : ""}`}
              userId={userId}
              milestone={m}
              files={milestoneFilesById[m.id] ?? []}
              disabled={isSaving}
              canEditMilestones={canEditMilestones}
              canWorkOnMilestones={canWorkOnMilestones}
              onStatusChange={updateMilestoneStatus}
              onSaveEvidence={saveEvidence}
              onFilesUpdated={(next) => setMilestoneFilesById((prev) => ({ ...prev, [m.id]: next }))}
              onError={(msg) => setError(msg)}
              setSaving={setIsSaving}
            />
          ))}
          {milestones.length === 0 ? (
            <div className="px-6 py-10 text-sm text-zinc-600">No milestones yet.</div>
          ) : null}
        </div>
      </div>

      <RemindersBox
        disabled={isSaving}
        userId={userId}
        ownerId={project.owner_id}
        contractorId={bid.contractor_id}
        contractId={contract.id}
        projectId={project.id}
        milestones={milestones}
        isOwner={isOwner}
        isAdmin={isAdmin}
        isContractor={isContractor}
        onError={(msg) => setError(msg)}
        setSaving={setIsSaving}
      />

      <div className="rounded-3xl border border-black/5 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-black/5 px-6 py-4">
          <div className="text-sm font-semibold text-zinc-700">Ledger</div>
          <div className="text-xs text-zinc-500">{ledgerEntries.length} entries</div>
        </div>
        <div className="divide-y divide-black/5">
          {ledgerEntries.map((l) => (
            <div key={l.id} className="px-6 py-4 text-sm text-zinc-700">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 truncate">
                  {l.type} • RM {Number(l.amount).toFixed(2)} • milestone {l.milestone_id ?? "—"}
                </div>
                <div className="text-xs text-zinc-500">{new Date(l.created_at).toLocaleString()}</div>
              </div>
            </div>
          ))}
          {ledgerEntries.length === 0 ? (
            <div className="px-6 py-10 text-sm text-zinc-600">No ledger entries yet.</div>
          ) : null}
        </div>
      </div>

      <MessagesBox
        disabled={isSaving}
        userId={userId}
        projectId={project.id}
        ownerId={project.owner_id}
        contractorId={bid.contractor_id}
        messages={messages}
        attachmentsByMessageId={messageAttachmentsById}
        onNewMessage={(m) => setMessages((prev) => [...prev, m])}
        onAttachmentsUpdated={(messageId, next) =>
          setMessageAttachmentsById((prev) => ({ ...prev, [messageId]: next }))
        }
        onError={(msg) => setError(msg)}
        setSaving={setIsSaving}
      />

      <EscrowDepositsBox
        disabled={isSaving}
        userId={userId}
        contractId={contract.id}
        milestones={milestones}
        platformAdminId={platformAdminId}
        canDeposit={isOwner || isAdmin}
        onCreated={(entry) => setLedgerEntries((prev) => [entry, ...prev])}
        onError={(msg) => setError(msg)}
        setSaving={setIsSaving}
      />

      <RetentionBox
        key={`${contract.id}:${retentionTerms?.retention_percent ?? "x"}:${retentionTerms?.defect_liability_days ?? "y"}:${retentionTerms?.defect_liability_start_at ?? "z"}:${retentionTerms?.retention_release_available_at ?? "w"}`}
        disabled={isSaving}
        userId={userId}
        contractId={contract.id}
        projectStatus={project.status}
        isOwner={isOwner}
        isAdmin={isAdmin}
        retentionTerms={retentionTerms}
        financials={financials}
        onUpdatedTerms={(t) => setRetentionTerms(t)}
        onRefresh={async () => {
          const { data: ledgerData } = await supabase
            .from("ledger_entries")
            .select("id,milestone_id,contract_id,from_user,to_user,amount,type,created_at")
            .eq("contract_id", contract.id)
            .order("created_at", { ascending: false });
          setLedgerEntries((ledgerData ?? []) as LedgerRow[]);

          const { data: financialData } = await supabase
            .from("contract_financials_v1")
            .select("contract_id,milestone_total,deposit_total,released_total,retention_held_total,retention_released_total")
            .eq("contract_id", contract.id)
            .maybeSingle();
          setFinancials((financialData as ContractFinancialsRow | null) ?? null);
        }}
        onError={(msg) => setError(msg)}
        setSaving={setIsSaving}
      />

      <ContractDocumentsBox
        disabled={isSaving}
        userId={userId}
        isOwner={isOwner}
        isAdmin={isAdmin}
        contract={contract}
        project={project}
        contractorId={bid.contractor_id}
        milestones={milestones}
        documents={documents}
        onCreated={(d) => setDocuments((prev) => [d, ...prev])}
        onDeleted={(id) => setDocuments((prev) => prev.filter((x) => x.id !== id))}
        onError={(msg) => setError(msg)}
        setSaving={setIsSaving}
      />

      <VariationOrdersBox
        disabled={isSaving}
        userId={userId}
        contractId={contract.id}
        milestones={milestones}
        isOwner={isOwner}
        isAdmin={isAdmin}
        isContractor={isContractor}
        contractorId={bid.contractor_id}
        variationOrders={variationOrders}
        onCreated={(vo) => setVariationOrders((prev) => [vo, ...prev])}
        onUpdated={(vo) =>
          setVariationOrders((prev) => prev.map((x) => (x.id === vo.id ? vo : x)))
        }
        onContractPriceAdjusted={(newPrice) =>
          setContract((prev) => (prev ? { ...prev, agreed_price: newPrice } : prev))
        }
        onError={(msg) => setError(msg)}
        setSaving={setIsSaving}
      />

      <DisputesBox
        disabled={isSaving}
        userId={userId}
        contractId={contract.id}
        milestones={milestones}
        isOwner={isOwner}
        isAdmin={isAdmin}
        isContractor={isContractor}
        contractorId={bid.contractor_id}
        disputes={disputes}
        onCreated={(d) => setDisputes((prev) => [d, ...prev])}
        onUpdated={(d) => setDisputes((prev) => prev.map((x) => (x.id === d.id ? d : x)))}
        onError={(msg) => setError(msg)}
        setSaving={setIsSaving}
      />

      <ReviewsBox
        disabled={isSaving}
        userId={userId}
        projectId={project.id}
        projectStatus={project.status}
        ownerId={project.owner_id}
        contractorId={bid.contractor_id}
        existingReviews={reviews}
        onError={(msg) => setError(msg)}
        setSaving={setIsSaving}
        onCreated={(reviewer_id, reviewee_id) =>
          setReviews((prev) => [...prev, { reviewer_id, reviewee_id }])
        }
      />
    </div>
  );
}

function EscrowDepositsBox({
  disabled,
  userId,
  contractId,
  milestones,
  platformAdminId,
  canDeposit,
  onCreated,
  onError,
  setSaving,
}: {
  disabled: boolean;
  userId: string;
  contractId: string;
  milestones: MilestoneRow[];
  platformAdminId: string | null;
  canDeposit: boolean;
  onCreated: (entry: LedgerRow) => void;
  onError: (msg: string) => void;
  setSaving: (v: boolean) => void;
}) {
  const [amount, setAmount] = useState("");
  const [milestoneId, setMilestoneId] = useState<string>("");

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Escrow deposits</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Records an owner deposit into escrow (to platform admin) for this contract.
          </p>
        </div>
      </div>

      {canDeposit ? (
        <form
          className="mt-4 grid gap-3 md:grid-cols-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const parsedAmount = Number(amount);
            if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
              onError("Deposit amount must be a positive number.");
              return;
            }
            if (!platformAdminId) {
              onError("Platform admin account not found.");
              return;
            }

            setSaving(true);
            try {
              const { data, error } = await supabase
                .from("ledger_entries")
                .insert({
                  contract_id: contractId,
                  milestone_id: milestoneId ? milestoneId : null,
                  from_user: userId,
                  to_user: platformAdminId,
                  amount: parsedAmount,
                  type: "deposit",
                })
                .select("id,milestone_id,contract_id,from_user,to_user,amount,type,created_at")
                .single();
              if (error) throw error;
              onCreated(data as LedgerRow);
              setAmount("");
              setMilestoneId("");
            } catch (err) {
              onError(err instanceof Error ? err.message : "Failed to record deposit.");
            } finally {
              setSaving(false);
            }
          }}
        >
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">Deposit amount (RM)</label>
            <input
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">Apply to milestone (optional)</label>
            <select
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
              value={milestoneId}
              onChange={(e) => setMilestoneId(e.target.value)}
              disabled={disabled}
            >
              <option value="">General deposit</option>
              {milestones.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.sequence}. {m.name} (RM {Number(m.amount).toFixed(2)})
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-4 flex justify-end">
            <button
              type="submit"
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
              disabled={disabled || !amount.trim()}
            >
              Record deposit
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-4 text-sm text-zinc-600">Only the owner can record deposits.</div>
      )}
    </div>
  );
}

function RetentionBox({
  disabled,
  userId,
  contractId,
  projectStatus,
  isOwner,
  isAdmin,
  retentionTerms,
  financials,
  onUpdatedTerms,
  onRefresh,
  onError,
  setSaving,
}: {
  disabled: boolean;
  userId: string;
  contractId: string;
  projectStatus: string;
  isOwner: boolean;
  isAdmin: boolean;
  retentionTerms: RetentionTermsRow | null;
  financials: ContractFinancialsRow | null;
  onUpdatedTerms: (t: RetentionTermsRow | null) => void;
  onRefresh: () => Promise<void>;
  onError: (msg: string) => void;
  setSaving: (v: boolean) => void;
}) {
  const canManage = isAdmin || isOwner;
  const [retentionPercent, setRetentionPercent] = useState(
    retentionTerms ? String(retentionTerms.retention_percent) : "0",
  );
  const [defectDays, setDefectDays] = useState(retentionTerms ? String(retentionTerms.defect_liability_days) : "30");

  const held = financials?.retention_held_total ?? 0;
  const released = financials?.retention_released_total ?? 0;
  const remaining = Math.max(0, Number(held) - Number(released));

  const canStartDefect = canManage && projectStatus === "completed" && !retentionTerms?.defect_liability_start_at;
  const nowIso = new Date().toISOString();
  const isAvailableNow = retentionTerms?.retention_release_available_at
    ? retentionTerms.retention_release_available_at <= nowIso
    : projectStatus === "completed";
  const canReleaseRetention =
    canManage && remaining > 0 && isAvailableNow;

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Retention / holdback</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Applies a retention percentage to each milestone release and keeps it held until the defect liability period ends.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl bg-zinc-50 p-4 text-sm">
          <div className="text-xs font-semibold text-zinc-700">Retention held</div>
          <div className="mt-2 text-lg font-semibold">RM {Number(held).toFixed(2)}</div>
        </div>
        <div className="rounded-xl bg-zinc-50 p-4 text-sm">
          <div className="text-xs font-semibold text-zinc-700">Retention released</div>
          <div className="mt-2 text-lg font-semibold">RM {Number(released).toFixed(2)}</div>
        </div>
        <div className="rounded-xl bg-zinc-50 p-4 text-sm">
          <div className="text-xs font-semibold text-zinc-700">Remaining</div>
          <div className="mt-2 text-lg font-semibold">RM {Number(remaining).toFixed(2)}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Retention % (0–30)</label>
          <input
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
            value={retentionPercent}
            onChange={(e) => setRetentionPercent(e.target.value)}
            inputMode="decimal"
            disabled={disabled || !canManage}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Defect liability days (0–365)</label>
          <input
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
            value={defectDays}
            onChange={(e) => setDefectDays(e.target.value)}
            inputMode="numeric"
            disabled={disabled || !canManage}
          />
        </div>
        <div className="space-y-1.5">
          <div className="text-sm font-medium">Release available</div>
          <div className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-700">
            {retentionTerms?.retention_release_available_at
              ? new Date(retentionTerms.retention_release_available_at).toLocaleString()
              : "—"}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          className="rounded-lg border border-black/10 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60"
          disabled={disabled || !canManage}
          onClick={async () => {
            const rp = Number(retentionPercent);
            const dd = Number(defectDays);
            if (!Number.isFinite(rp) || rp < 0 || rp > 30) {
              onError("Retention percent must be between 0 and 30.");
              return;
            }
            if (!Number.isFinite(dd) || dd < 0 || dd > 365) {
              onError("Defect liability days must be between 0 and 365.");
              return;
            }
            setSaving(true);
            try {
              const now = new Date().toISOString();
              const { data, error } = await supabase
                .from("contract_retention_terms")
                .upsert({
                  contract_id: contractId,
                  retention_percent: rp,
                  defect_liability_days: dd,
                  updated_at: now,
                  updated_by: userId,
                })
                .select(
                  "contract_id,retention_percent,defect_liability_days,defect_liability_start_at,retention_release_available_at,retention_released_at",
                )
                .single();
              if (error) throw error;
              onUpdatedTerms(data as RetentionTermsRow);
            } catch (err) {
              onError(err instanceof Error ? err.message : "Failed to save retention terms.");
            } finally {
              setSaving(false);
            }
          }}
        >
          Save terms
        </button>
        <button
          type="button"
          className="rounded-lg border border-black/10 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60"
          disabled={disabled || !canStartDefect}
          onClick={async () => {
            setSaving(true);
            try {
              const dd = Number(defectDays);
              const start = new Date();
              const available = new Date(start.getTime() + (Number.isFinite(dd) ? dd : 30) * 24 * 60 * 60 * 1000);
              const { data, error } = await supabase
                .from("contract_retention_terms")
                .upsert({
                  contract_id: contractId,
                  defect_liability_start_at: start.toISOString(),
                  retention_release_available_at: available.toISOString(),
                  updated_at: start.toISOString(),
                  updated_by: userId,
                })
                .select(
                  "contract_id,retention_percent,defect_liability_days,defect_liability_start_at,retention_release_available_at,retention_released_at",
                )
                .single();
              if (error) throw error;
              onUpdatedTerms(data as RetentionTermsRow);
            } catch (err) {
              onError(err instanceof Error ? err.message : "Failed to start defect liability period.");
            } finally {
              setSaving(false);
            }
          }}
        >
          Start defect period
        </button>
        <button
          type="button"
          className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          disabled={disabled || !canReleaseRetention}
          onClick={async () => {
            setSaving(true);
            try {
              const { error } = await supabase.rpc("release_contract_retention", { p_contract_id: contractId });
              if (error) throw error;
              await onRefresh();
            } catch (err) {
              onError(err instanceof Error ? err.message : "Failed to release retention.");
            } finally {
              setSaving(false);
            }
          }}
        >
          Release retention
        </button>
      </div>
    </div>
  );
}

function ContractDocumentsBox({
  disabled,
  userId,
  isOwner,
  isAdmin,
  contract,
  project,
  contractorId,
  milestones,
  documents,
  onCreated,
  onDeleted,
  onError,
  setSaving,
}: {
  disabled: boolean;
  userId: string;
  isOwner: boolean;
  isAdmin: boolean;
  contract: ContractRow;
  project: ProjectRow;
  contractorId: string;
  milestones: MilestoneRow[];
  documents: ContractDocumentRow[];
  onCreated: (d: ContractDocumentRow) => void;
  onDeleted: (id: string) => void;
  onError: (msg: string) => void;
  setSaving: (v: boolean) => void;
}) {
  const canGenerate = isAdmin || isOwner;

  return (
    <div className="rounded-2xl border border-black/5 bg-white">
      <div className="border-b border-black/5 px-6 py-4 text-sm font-semibold">Contract documents</div>
      <div className="px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-zinc-600">Generate a draft STCC-RSP aligned contract summary for review.</div>
          {canGenerate ? (
            <button
              type="button"
              className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
              disabled={disabled}
              onClick={async () => {
                setSaving(true);
                try {
                  const lines: string[] = [];
                  lines.push("Tukul.com Contract Draft (STCC-RSP aligned summary)");
                  lines.push("");
                  lines.push(`Project: ${project.title}`);
                  lines.push(`Project ID: ${project.id}`);
                  lines.push(`Contract ID: ${contract.id}`);
                  lines.push(`Owner ID: ${project.owner_id}`);
                  lines.push(`Contractor ID: ${contractorId}`);
                  lines.push("");
                  lines.push(`Agreed price: RM ${Number(contract.agreed_price).toFixed(2)}`);
                  lines.push("");
                  lines.push("Milestones:");
                  if (milestones.length === 0) {
                    lines.push("- (none)");
                  } else {
                    for (const m of milestones) {
                      lines.push(`- ${m.sequence}. ${m.name} — RM ${Number(m.amount).toFixed(2)} — ${m.status}`);
                      if (m.description) lines.push(`  ${m.description}`);
                      if (m.due_date) lines.push(`  Due: ${m.due_date}`);
                    }
                  }
                  lines.push("");
                  lines.push("Key terms (draft placeholders):");
                  lines.push("- Written contract under Malaysian renovation standard terms (STCC-RSP 2015 guidance).");
                  lines.push("- Milestone-based approvals and releases via Tukul workflow.");
                  lines.push("- Variation orders: scope/price changes require owner approval in-app.");
                  lines.push("- Dispute handling: evidence-based review, with CIPAA pathway for payment disputes where applicable.");
                  lines.push("- Pay-when-paid clauses are not allowed (CIPAA Section 35 consideration).");
                  lines.push("");
                  lines.push("This is a draft summary generated by the platform and should be reviewed/edited before use.");

                  const content = lines.join("\n");
                  const title = `STCC-RSP draft • ${new Date().toLocaleString()}`;

                  const { data, error } = await supabase
                    .from("contract_documents")
                    .insert({
                      contract_id: contract.id,
                      doc_type: "stcc_rsp_draft_v1",
                      title,
                      content,
                      created_by: userId,
                    })
                    .select("id,contract_id,doc_type,title,content,created_by,created_at")
                    .single();
                  if (error) throw error;
                  onCreated(data as ContractDocumentRow);
                } catch (err) {
                  onError(err instanceof Error ? err.message : "Failed to generate document.");
                } finally {
                  setSaving(false);
                }
              }}
            >
              Generate draft
            </button>
          ) : null}
        </div>
      </div>

      <div className="divide-y divide-black/5">
        {documents.map((d) => (
          <div key={d.id} className="px-6 py-5 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold">{d.title}</div>
                <div className="mt-1 text-xs text-zinc-500">
                  {d.doc_type} • {new Date(d.created_at).toLocaleString()}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-black/10 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-60"
                  disabled={disabled}
                  onClick={() => {
                    const blob = new Blob([d.content], { type: "text/plain;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${d.title.replaceAll("/", "-")}.txt`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Download
                </button>
                {canGenerate ? (
                  <button
                    type="button"
                    className="rounded-lg border border-black/10 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-60"
                    disabled={disabled}
                    onClick={async () => {
                      setSaving(true);
                      try {
                        const { error } = await supabase.from("contract_documents").delete().eq("id", d.id);
                        if (error) throw error;
                        onDeleted(d.id);
                      } catch (err) {
                        onError(err instanceof Error ? err.message : "Failed to delete document.");
                      } finally {
                        setSaving(false);
                      }
                    }}
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            </div>
            <pre className="mt-3 max-h-[240px] overflow-auto rounded-xl bg-zinc-50 p-4 text-xs text-zinc-800 whitespace-pre-wrap">
              {d.content}
            </pre>
          </div>
        ))}
        {documents.length === 0 ? <div className="px-6 py-10 text-sm text-zinc-600">No documents yet.</div> : null}
      </div>
    </div>
  );
}

function RemindersBox({
  disabled,
  userId,
  ownerId,
  contractorId,
  contractId,
  projectId,
  milestones,
  isOwner,
  isAdmin,
  isContractor,
  onError,
  setSaving,
}: {
  disabled: boolean;
  userId: string;
  ownerId: string;
  contractorId: string;
  contractId: string;
  projectId: string;
  milestones: MilestoneRow[];
  isOwner: boolean;
  isAdmin: boolean;
  isContractor: boolean;
  onError: (msg: string) => void;
  setSaving: (v: boolean) => void;
}) {
  const overdue = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return milestones.filter((m) => {
      if (!m.due_date) return false;
      const due = m.due_date.slice(0, 10);
      const isOpen = m.status === "not_started" || m.status === "in_progress";
      return isOpen && due < today;
    });
  }, [milestones]);

  const awaitingOwner = useMemo(() => milestones.filter((m) => m.status === "completed"), [milestones]);
  const awaitingRelease = useMemo(() => milestones.filter((m) => m.status === "approved"), [milestones]);

  const canRemindContractor = (isOwner || isAdmin) && overdue.length > 0;
  const canRemindOwner = (isContractor && userId === contractorId) && awaitingOwner.length > 0;
  const canRemindRelease = (isOwner || isAdmin) && awaitingRelease.length > 0;

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6">
      <h2 className="text-sm font-semibold">Reminders</h2>
      <div className="mt-2 text-sm text-zinc-600">
        Overdue: {overdue.length} • Awaiting approval: {awaitingOwner.length} • Awaiting payment release:{" "}
        {awaitingRelease.length}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg border border-black/10 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60"
          disabled={disabled || !canRemindContractor}
          onClick={async () => {
            setSaving(true);
            try {
              const body = `You have ${overdue.length} overdue milestone(s). Please review and update progress.`;
              const { error } = await supabase.rpc("notify", {
                p_recipient_id: contractorId,
                p_type: "milestone_overdue_reminder",
                p_title: "Overdue milestones",
                p_body: body,
                p_data: { contract_id: contractId, project_id: projectId, milestone_ids: overdue.map((m) => m.id) },
              });
              if (error) throw error;
            } catch (err) {
              onError(err instanceof Error ? err.message : "Failed to send reminder.");
            } finally {
              setSaving(false);
            }
          }}
        >
          Remind contractor (overdue)
        </button>

        <button
          type="button"
          className="rounded-lg border border-black/10 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60"
          disabled={disabled || !canRemindOwner}
          onClick={async () => {
            setSaving(true);
            try {
              const body = `There are ${awaitingOwner.length} completed milestone(s) awaiting your approval.`;
              const { error } = await supabase.rpc("notify", {
                p_recipient_id: ownerId,
                p_type: "milestone_approval_reminder",
                p_title: "Milestones awaiting approval",
                p_body: body,
                p_data: { contract_id: contractId, project_id: projectId, milestone_ids: awaitingOwner.map((m) => m.id) },
              });
              if (error) throw error;
            } catch (err) {
              onError(err instanceof Error ? err.message : "Failed to send reminder.");
            } finally {
              setSaving(false);
            }
          }}
        >
          Remind owner (approval)
        </button>

        <button
          type="button"
          className="rounded-lg border border-black/10 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60"
          disabled={disabled || !canRemindRelease}
          onClick={async () => {
            setSaving(true);
            try {
              const body = `There are ${awaitingRelease.length} approved milestone(s) awaiting payment release.`;
              const { error } = await supabase.rpc("notify", {
                p_recipient_id: ownerId,
                p_type: "payment_release_reminder",
                p_title: "Payments awaiting release",
                p_body: body,
                p_data: { contract_id: contractId, project_id: projectId, milestone_ids: awaitingRelease.map((m) => m.id) },
              });
              if (error) throw error;
            } catch (err) {
              onError(err instanceof Error ? err.message : "Failed to send reminder.");
            } finally {
              setSaving(false);
            }
          }}
        >
          Remind owner (release)
        </button>
      </div>
    </div>
  );
}

function VariationOrdersBox({
  disabled,
  userId,
  contractId,
  milestones,
  isOwner,
  isAdmin,
  isContractor,
  contractorId,
  variationOrders,
  onCreated,
  onUpdated,
  onContractPriceAdjusted,
  onError,
  setSaving,
}: {
  disabled: boolean;
  userId: string;
  contractId: string;
  milestones: MilestoneRow[];
  isOwner: boolean;
  isAdmin: boolean;
  isContractor: boolean;
  contractorId: string;
  variationOrders: VariationOrderRow[];
  onCreated: (vo: VariationOrderRow) => void;
  onUpdated: (vo: VariationOrderRow) => void;
  onContractPriceAdjusted: (newPrice: number) => void;
  onError: (msg: string) => void;
  setSaving: (v: boolean) => void;
}) {
  const canPropose = isAdmin || (isContractor && userId === contractorId);
  const canDecide = isAdmin || isOwner;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [milestoneId, setMilestoneId] = useState<string>("");

  const [decisionNotesById, setDecisionNotesById] = useState<Record<string, string>>({});

  return (
    <div className="rounded-2xl border border-black/5 bg-white">
      <div className="border-b border-black/5 px-6 py-4 text-sm font-semibold">Variation orders</div>

      {canPropose ? (
        <form
          className="grid gap-3 px-6 py-5 md:grid-cols-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const parsedAmount = Number(amount);
            if (!title.trim()) {
              onError("Variation title is required.");
              return;
            }
            if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
              onError("Variation amount must be a positive number.");
              return;
            }
            setSaving(true);
            try {
              const { data, error } = await supabase
                .from("variation_orders")
                .insert({
                  contract_id: contractId,
                  milestone_id: milestoneId ? milestoneId : null,
                  requested_by: userId,
                  title: title.trim(),
                  description: description.trim() ? description.trim() : null,
                  amount: parsedAmount,
                  status: "proposed",
                  updated_at: new Date().toISOString(),
                  updated_by: userId,
                })
                .select(
                  "id,contract_id,milestone_id,requested_by,title,description,amount,status,decided_at,decided_by,decision_notes,created_at",
                )
                .single();
              if (error) throw error;
              onCreated(data as VariationOrderRow);
              setTitle("");
              setDescription("");
              setAmount("");
              setMilestoneId("");
            } catch (err) {
              onError(err instanceof Error ? err.message : "Failed to create variation order.");
            } finally {
              setSaving(false);
            }
          }}
        >
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">Title</label>
            <input
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">Amount (RM)</label>
            <input
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">Related milestone (optional)</label>
            <select
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
              value={milestoneId}
              onChange={(e) => setMilestoneId(e.target.value)}
              disabled={disabled}
            >
              <option value="">None</option>
              {milestones.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.sequence}. {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">Description (optional)</label>
            <input
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="md:col-span-4 flex justify-end">
            <button
              type="submit"
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
              disabled={disabled || !title.trim() || !amount.trim()}
            >
              Propose variation
            </button>
          </div>
        </form>
      ) : (
        <div className="px-6 py-5 text-sm text-zinc-600">Only the contractor can propose variations.</div>
      )}

      <div className="divide-y divide-black/5">
        {variationOrders.map((vo) => (
          <div key={vo.id} className="px-6 py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold">{vo.title}</div>
                <div className="mt-1 text-sm text-zinc-600">
                  RM {Number(vo.amount).toFixed(2)} • {vo.status}
                  {vo.milestone_id ? ` • milestone ${vo.milestone_id}` : ""}
                </div>
                {vo.description ? <div className="mt-2 text-sm text-zinc-700">{vo.description}</div> : null}
                {vo.decision_notes ? (
                  <div className="mt-2 rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                    Decision notes: {vo.decision_notes}
                  </div>
                ) : null}
              </div>
              {canDecide && vo.status === "proposed" ? (
                <div className="flex flex-col gap-2">
                  <input
                    className="w-[280px] rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                    placeholder="Decision notes (optional)"
                    value={decisionNotesById[vo.id] ?? ""}
                    onChange={(e) =>
                      setDecisionNotesById((prev) => ({ ...prev, [vo.id]: e.target.value }))
                    }
                    disabled={disabled}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                      disabled={disabled}
                      onClick={async () => {
                        setSaving(true);
                        try {
                          const now = new Date().toISOString();
                          const decisionNotes = (decisionNotesById[vo.id] ?? "").trim();

                          const { data: updatedVo, error: updateError } = await supabase
                            .from("variation_orders")
                            .update({
                              status: "approved",
                              decided_at: now,
                              decided_by: userId,
                              decision_notes: decisionNotes ? decisionNotes : null,
                              updated_at: now,
                              updated_by: userId,
                            })
                            .eq("id", vo.id)
                            .select(
                              "id,contract_id,milestone_id,requested_by,title,description,amount,status,decided_at,decided_by,decision_notes,created_at",
                            )
                            .single();
                          if (updateError) throw updateError;
                          onUpdated(updatedVo as VariationOrderRow);

                          const { data: contractData, error: contractError } = await supabase
                            .from("contracts")
                            .select("agreed_price")
                            .eq("id", contractId)
                            .single();
                          if (contractError) throw contractError;

                          const newPrice = Number((contractData as { agreed_price: number }).agreed_price) + Number(vo.amount);
                          const { error: contractUpdateError } = await supabase
                            .from("contracts")
                            .update({ agreed_price: newPrice, updated_at: now, updated_by: userId })
                            .eq("id", contractId);
                          if (contractUpdateError) throw contractUpdateError;
                          onContractPriceAdjusted(newPrice);
                        } catch (err) {
                          onError(err instanceof Error ? err.message : "Failed to approve variation.");
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-black/10 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60"
                      disabled={disabled}
                      onClick={async () => {
                        setSaving(true);
                        try {
                          const now = new Date().toISOString();
                          const decisionNotes = (decisionNotesById[vo.id] ?? "").trim();

                          const { data: updatedVo, error: updateError } = await supabase
                            .from("variation_orders")
                            .update({
                              status: "rejected",
                              decided_at: now,
                              decided_by: userId,
                              decision_notes: decisionNotes ? decisionNotes : null,
                              updated_at: now,
                              updated_by: userId,
                            })
                            .eq("id", vo.id)
                            .select(
                              "id,contract_id,milestone_id,requested_by,title,description,amount,status,decided_at,decided_by,decision_notes,created_at",
                            )
                            .single();
                          if (updateError) throw updateError;
                          onUpdated(updatedVo as VariationOrderRow);
                        } catch (err) {
                          onError(err instanceof Error ? err.message : "Failed to reject variation.");
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ))}
        {variationOrders.length === 0 ? (
          <div className="px-6 py-10 text-sm text-zinc-600">No variation orders yet.</div>
        ) : null}
      </div>
    </div>
  );
}

function DisputesBox({
  disabled,
  userId,
  contractId,
  milestones,
  isOwner,
  isAdmin,
  isContractor,
  contractorId,
  disputes,
  onCreated,
  onUpdated,
  onError,
  setSaving,
}: {
  disabled: boolean;
  userId: string;
  contractId: string;
  milestones: MilestoneRow[];
  isOwner: boolean;
  isAdmin: boolean;
  isContractor: boolean;
  contractorId: string;
  disputes: DisputeRow[];
  onCreated: (d: DisputeRow) => void;
  onUpdated: (d: DisputeRow) => void;
  onError: (msg: string) => void;
  setSaving: (v: boolean) => void;
}) {
  const canRaise = isAdmin || isOwner || (isContractor && userId === contractorId);

  const [reason, setReason] = useState("");
  const [milestoneId, setMilestoneId] = useState<string>("");
  const [resolutionNotesById, setResolutionNotesById] = useState<Record<string, string>>({});
  const [statusById, setStatusById] = useState<Record<string, DisputeRow["status"]>>({});
  const [claimAmountById, setClaimAmountById] = useState<Record<string, string>>({});
  const [cipaaRefById, setCipaaRefById] = useState<Record<string, string>>({});

  return (
    <div className="rounded-2xl border border-black/5 bg-white">
      <div className="border-b border-black/5 px-6 py-4 text-sm font-semibold">Disputes</div>

      {canRaise ? (
        <form
          className="grid gap-3 px-6 py-5 md:grid-cols-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!reason.trim()) {
              onError("Dispute reason is required.");
              return;
            }
            setSaving(true);
            try {
              const now = new Date().toISOString();
              const { data, error } = await supabase
                .from("disputes")
                .insert({
                  contract_id: contractId,
                  milestone_id: milestoneId ? milestoneId : null,
                  raised_by: userId,
                  reason: reason.trim(),
                  status: "open",
                  updated_at: now,
                  updated_by: userId,
                })
                .select(
                  "id,contract_id,milestone_id,raised_by,reason,status,claim_amount,cipaa_reference,payment_claim_sent_at,payment_response_received_at,adjudication_requested_at,resolution_notes,resolved_at,resolved_by,created_at",
                )
                .single();
              if (error) throw error;
              onCreated(data as DisputeRow);
              setReason("");
              setMilestoneId("");
            } catch (err) {
              onError(err instanceof Error ? err.message : "Failed to raise dispute.");
            } finally {
              setSaving(false);
            }
          }}
        >
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">Reason</label>
            <input
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">Related milestone (optional)</label>
            <select
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
              value={milestoneId}
              onChange={(e) => setMilestoneId(e.target.value)}
              disabled={disabled}
            >
              <option value="">None</option>
              {milestones.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.sequence}. {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-4 flex justify-end">
            <button
              type="submit"
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
              disabled={disabled || !reason.trim()}
            >
              Raise dispute
            </button>
          </div>
        </form>
      ) : (
        <div className="px-6 py-5 text-sm text-zinc-600">Only project parties can raise disputes.</div>
      )}

      <div className="divide-y divide-black/5">
        {disputes.map((d) => (
          <div key={d.id} className="px-6 py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold">{d.status}</div>
                <div className="mt-1 text-sm text-zinc-700">{d.reason}</div>
                <div className="mt-2 text-xs text-zinc-500">
                  {new Date(d.created_at).toLocaleString()}
                  {d.milestone_id ? ` • milestone ${d.milestone_id}` : ""}
                </div>
                <div className="mt-2 grid gap-2 text-sm text-zinc-700 md:grid-cols-2">
                  <div>Claim amount: {typeof d.claim_amount === "number" ? `RM ${d.claim_amount.toFixed(2)}` : "—"}</div>
                  <div>CIPAA ref: {d.cipaa_reference ?? "—"}</div>
                  <div>Claim sent: {d.payment_claim_sent_at ? new Date(d.payment_claim_sent_at).toLocaleString() : "—"}</div>
                  <div>
                    Response received:{" "}
                    {d.payment_response_received_at ? new Date(d.payment_response_received_at).toLocaleString() : "—"}
                  </div>
                </div>
                {d.resolution_notes ? (
                  <div className="mt-2 rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                    Resolution: {d.resolution_notes}
                  </div>
                ) : null}
              </div>

              {isAdmin ? (
                <div className="flex flex-col gap-2">
                  <select
                    className="w-[280px] rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                    value={statusById[d.id] ?? d.status}
                    onChange={(e) =>
                      setStatusById((prev) => ({ ...prev, [d.id]: e.target.value as DisputeRow["status"] }))
                    }
                    disabled={disabled}
                  >
                    <option value="open">open</option>
                    <option value="in_review">in_review</option>
                    <option value="cipaa_claim_sent">cipaa_claim_sent</option>
                    <option value="cipaa_response_received">cipaa_response_received</option>
                    <option value="adjudication_requested">adjudication_requested</option>
                    <option value="resolved">resolved</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                  <input
                    className="w-[280px] rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                    placeholder="Claim amount (optional)"
                    value={claimAmountById[d.id] ?? (typeof d.claim_amount === "number" ? String(d.claim_amount) : "")}
                    onChange={(e) => setClaimAmountById((prev) => ({ ...prev, [d.id]: e.target.value }))}
                    disabled={disabled}
                  />
                  <input
                    className="w-[280px] rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                    placeholder="CIPAA reference (optional)"
                    value={cipaaRefById[d.id] ?? (d.cipaa_reference ?? "")}
                    onChange={(e) => setCipaaRefById((prev) => ({ ...prev, [d.id]: e.target.value }))}
                    disabled={disabled}
                  />
                  <input
                    className="w-[280px] rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                    placeholder="Resolution notes (optional)"
                    value={resolutionNotesById[d.id] ?? (d.resolution_notes ?? "")}
                    onChange={(e) => setResolutionNotesById((prev) => ({ ...prev, [d.id]: e.target.value }))}
                    disabled={disabled}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                      disabled={disabled}
                      onClick={async () => {
                        setSaving(true);
                        try {
                          const now = new Date().toISOString();
                          const nextStatus = statusById[d.id] ?? d.status;
                          const claimAmountRaw = (claimAmountById[d.id] ?? "").trim();
                          const claimAmount = claimAmountRaw ? Number(claimAmountRaw) : null;
                          if (claimAmount !== null && (!Number.isFinite(claimAmount) || claimAmount < 0)) {
                            throw new Error("Claim amount must be a non-negative number.");
                          }
                          const cipaaRef = (cipaaRefById[d.id] ?? "").trim();
                          const resolutionNotes = (resolutionNotesById[d.id] ?? "").trim();

                          const patch: Record<string, unknown> = {
                            status: nextStatus,
                            claim_amount: claimAmount,
                            cipaa_reference: cipaaRef ? cipaaRef : null,
                            resolution_notes: resolutionNotes ? resolutionNotes : null,
                            updated_at: now,
                            updated_by: userId,
                          };

                          if (nextStatus === "cipaa_claim_sent" && !d.payment_claim_sent_at) {
                            patch.payment_claim_sent_at = now;
                          }
                          if (nextStatus === "cipaa_response_received" && !d.payment_response_received_at) {
                            patch.payment_response_received_at = now;
                          }
                          if (nextStatus === "adjudication_requested" && !d.adjudication_requested_at) {
                            patch.adjudication_requested_at = now;
                          }
                          if (nextStatus === "resolved") {
                            patch.resolved_at = now;
                            patch.resolved_by = userId;
                          }
                          if (nextStatus === "cancelled") {
                            patch.resolved_at = now;
                            patch.resolved_by = userId;
                          }

                          const { data, error } = await supabase
                            .from("disputes")
                            .update(patch)
                            .eq("id", d.id)
                            .select(
                              "id,contract_id,milestone_id,raised_by,reason,status,claim_amount,cipaa_reference,payment_claim_sent_at,payment_response_received_at,adjudication_requested_at,resolution_notes,resolved_at,resolved_by,created_at",
                            )
                            .single();
                          if (error) throw error;
                          onUpdated(data as DisputeRow);
                        } catch (err) {
                          onError(err instanceof Error ? err.message : "Failed to update dispute.");
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-black/10 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60"
                      disabled={disabled}
                      onClick={async () => {
                        setSaving(true);
                        try {
                          const now = new Date().toISOString();
                          const { data, error } = await supabase
                            .from("disputes")
                            .update({ status: "cipaa_claim_sent", payment_claim_sent_at: now, updated_at: now, updated_by: userId })
                            .eq("id", d.id)
                            .select(
                              "id,contract_id,milestone_id,raised_by,reason,status,claim_amount,cipaa_reference,payment_claim_sent_at,payment_response_received_at,adjudication_requested_at,resolution_notes,resolved_at,resolved_by,created_at",
                            )
                            .single();
                          if (error) throw error;
                          onUpdated(data as DisputeRow);
                        } catch (err) {
                          onError(err instanceof Error ? err.message : "Failed to mark claim sent.");
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      Mark claim sent
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-black/10 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60"
                      disabled={disabled}
                      onClick={async () => {
                        setSaving(true);
                        try {
                          const now = new Date().toISOString();
                          const { data, error } = await supabase
                            .from("disputes")
                            .update({ status: "cipaa_response_received", payment_response_received_at: now, updated_at: now, updated_by: userId })
                            .eq("id", d.id)
                            .select(
                              "id,contract_id,milestone_id,raised_by,reason,status,claim_amount,cipaa_reference,payment_claim_sent_at,payment_response_received_at,adjudication_requested_at,resolution_notes,resolved_at,resolved_by,created_at",
                            )
                            .single();
                          if (error) throw error;
                          onUpdated(data as DisputeRow);
                        } catch (err) {
                          onError(err instanceof Error ? err.message : "Failed to mark response received.");
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      Mark response received
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-black/10 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60"
                      disabled={disabled}
                      onClick={async () => {
                        setSaving(true);
                        try {
                          const now = new Date().toISOString();
                          const { data, error } = await supabase
                            .from("disputes")
                            .update({ status: "adjudication_requested", adjudication_requested_at: now, updated_at: now, updated_by: userId })
                            .eq("id", d.id)
                            .select(
                              "id,contract_id,milestone_id,raised_by,reason,status,claim_amount,cipaa_reference,payment_claim_sent_at,payment_response_received_at,adjudication_requested_at,resolution_notes,resolved_at,resolved_by,created_at",
                            )
                            .single();
                          if (error) throw error;
                          onUpdated(data as DisputeRow);
                        } catch (err) {
                          onError(err instanceof Error ? err.message : "Failed to mark adjudication requested.");
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      Mark adjudication
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ))}
        {disputes.length === 0 ? (
          <div className="px-6 py-10 text-sm text-zinc-600">No disputes yet.</div>
        ) : null}
      </div>
    </div>
  );
}

function MilestoneBuilder({
  disabled,
  userId,
  contractId,
  contractPrice,
  existingCount,
  remaining,
  onAdd,
  onBulkAdded,
}: {
  disabled: boolean;
  userId: string;
  contractId: string;
  contractPrice: number;
  existingCount: number;
  remaining: number;
  onAdd: (args: { name: string; amount: number; dueDate: string | null; description: string | null }) => Promise<void>;
  onBulkAdded: (added: MilestoneRow[]) => void;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Array<{ id: string; name: string }>>([]);
  const [templateId, setTemplateId] = useState<string>("");
  const [templateItems, setTemplateItems] = useState<
    Array<{ sequence: number; name: string; description: string | null; recommended_percent: number | null }>
  >([]);

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
      setTemplates((data ?? []) as Array<{ id: string; name: string }>);
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
      setTemplateItems(
        (data ?? []) as Array<{ sequence: number; name: string; description: string | null; recommended_percent: number | null }>,
      );
    };
    run().catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [templateId]);

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6">
      <h2 className="text-sm font-semibold">Milestone builder</h2>
      <p className="mt-2 text-sm text-zinc-600">
        Remaining budget: <span className="font-medium">RM {remaining.toFixed(2)}</span>
      </p>

      <div className="mt-4 rounded-xl border border-black/10 bg-white p-4">
        <div className="text-sm font-semibold">Apply template</div>
        <div className="mt-1 text-xs text-zinc-600">Applies only when no milestones exist yet.</div>
        <div className="mt-3 grid gap-3 md:grid-cols-6">
          <div className="md:col-span-4">
            <select
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              disabled={disabled || existingCount > 0}
            >
              <option value="">Select template…</option>
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
              className="w-full rounded-lg border border-black/10 px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60"
              disabled={disabled || existingCount > 0 || !templateId}
              onClick={async () => {
                setError(null);
                try {
                  if (existingCount > 0) throw new Error("Cannot apply a template after milestones exist.");
                  if (templateItems.length === 0) throw new Error("Template has no items.");

                  const percentSum = templateItems.reduce(
                    (sum, i) => sum + (typeof i.recommended_percent === "number" ? i.recommended_percent : 0),
                    0,
                  );
                  if (Math.abs(percentSum - 100) > 0.01) {
                    throw new Error("Template recommended percent must sum to 100%.");
                  }

                  const rawAmounts = templateItems.map((i) => {
                    const pct = Number(i.recommended_percent);
                    const amt = round2((Number(contractPrice) * pct) / 100);
                    return amt;
                  });
                  const sumRaw = round2(rawAmounts.reduce((s, a) => s + a, 0));
                  const diff = round2(Number(contractPrice) - sumRaw);
                  if (rawAmounts.length > 0 && Math.abs(diff) > 0.001) {
                    rawAmounts[rawAmounts.length - 1] = round2(rawAmounts[rawAmounts.length - 1] + diff);
                  }

                  const now = new Date().toISOString();
                  const rows = templateItems.map((i, idx) => ({
                    contract_id: contractId,
                    name: i.name,
                    description: i.description,
                    sequence: i.sequence ?? idx + 1,
                    amount: rawAmounts[idx],
                    status: "not_started",
                    created_by: userId,
                    updated_by: userId,
                    updated_at: now,
                  }));

                  const { data, error: insertError } = await supabase
                    .from("milestones")
                    .insert(rows)
                    .select("id,contract_id,name,description,sequence,amount,status,due_date,completed_at,evidence");
                  if (insertError) throw insertError;
                  const added = (data ?? []) as MilestoneRow[];
                  onBulkAdded(added);
                  setTemplateId("");
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to apply template.");
                }
              }}
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      <form
        className="mt-5 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          const parsedAmount = Number(amount);
          if (!name.trim()) {
            setError("Milestone name is required.");
            return;
          }
          if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            setError("Amount must be a positive number.");
            return;
          }
          try {
            await onAdd({
              name: name.trim(),
              amount: parsedAmount,
              dueDate: dueDate ? dueDate : null,
              description: description.trim() ? description.trim() : null,
            });
            setName("");
            setAmount("");
            setDueDate("");
            setDescription("");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to add milestone.");
          }
        }}
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">Name</label>
            <input
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Amount (RM)</label>
            <input
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Due date</label>
            <input
              type="date"
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">Description</label>
            <input
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={disabled}
            />
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
            disabled={disabled}
          >
            Add milestone
          </button>
        </div>
      </form>
    </div>
  );
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function MilestoneRowView({
  userId,
  milestone,
  files,
  disabled,
  canEditMilestones,
  canWorkOnMilestones,
  onStatusChange,
  onSaveEvidence,
  onFilesUpdated,
  onError,
  setSaving,
}: {
  userId: string;
  milestone: MilestoneRow;
  files: MilestoneFileRow[];
  disabled: boolean;
  canEditMilestones: boolean;
  canWorkOnMilestones: boolean;
  onStatusChange: (milestoneId: string, status: MilestoneRow["status"]) => Promise<void>;
  onSaveEvidence: (milestoneId: string, evidenceText: string) => Promise<void>;
  onFilesUpdated: (next: MilestoneFileRow[]) => void;
  onError: (msg: string) => void;
  setSaving: (v: boolean) => void;
}) {
  const [evidenceText, setEvidenceText] = useState(
    typeof milestone.evidence?.note === "string" ? (milestone.evidence.note as string) : "",
  );
  const [fileKind, setFileKind] = useState<MilestoneFileRow["kind"]>("attachment");
  const [file, setFile] = useState<File | null>(null);

  const canStart = canWorkOnMilestones && milestone.status === "not_started";
  const canComplete = canWorkOnMilestones && milestone.status === "in_progress";

  const canApprove = canEditMilestones && milestone.status === "completed";
  const canRelease = canEditMilestones && milestone.status === "approved";

  return (
    <div className="px-6 py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold">
            {milestone.sequence}. {milestone.name}
          </div>
          <div className="mt-1 text-sm text-zinc-600">
            RM {Number(milestone.amount).toFixed(2)} • {milestone.status}
            {milestone.due_date ? ` • due ${toDateInputValue(milestone.due_date)}` : ""}
          </div>
          {milestone.description ? (
            <div className="mt-2 text-sm text-zinc-700">{milestone.description}</div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-black/10 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-60"
            disabled={disabled || !canStart}
            onClick={async () => onStatusChange(milestone.id, "in_progress")}
          >
            Start
          </button>
          <button
            type="button"
            className="rounded-lg border border-black/10 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-60"
            disabled={disabled || !canComplete}
            onClick={async () => onStatusChange(milestone.id, "completed")}
          >
            Mark completed
          </button>
          <button
            type="button"
            className="rounded-lg border border-black/10 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-60"
            disabled={disabled || !canApprove}
            onClick={async () => onStatusChange(milestone.id, "approved")}
          >
            Approve
          </button>
          <button
            type="button"
            className="rounded-lg bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
            disabled={disabled || !canRelease}
            onClick={async () => onStatusChange(milestone.id, "payment_released")}
          >
            Release payment
          </button>
        </div>
      </div>

      {canWorkOnMilestones ? (
        <div className="mt-4 rounded-xl bg-zinc-50 p-4">
          <div className="text-xs font-semibold text-zinc-700">Evidence note</div>
          <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center">
            <input
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-100"
              value={evidenceText}
              onChange={(e) => setEvidenceText(e.target.value)}
              disabled={disabled}
            />
            <button
              type="button"
              className="rounded-lg border border-black/10 px-3 py-2 text-sm hover:bg-white disabled:opacity-60"
              disabled={disabled}
              onClick={async () => onSaveEvidence(milestone.id, evidenceText)}
            >
              Save
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-4 rounded-xl bg-zinc-50 p-4">
        <div className="text-xs font-semibold text-zinc-700">Evidence files</div>
        <div className="mt-3 space-y-2">
          {files.map((f) => (
            <div key={f.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white px-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{f.file_name}</div>
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
          ))}
          {files.length === 0 ? <div className="text-sm text-zinc-600">No files uploaded yet.</div> : null}
        </div>

        {canWorkOnMilestones || canEditMilestones ? (
          <form
            className="mt-4 grid gap-3 md:grid-cols-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!file) {
                onError("Please choose a file to upload.");
                return;
              }
              setSaving(true);
              try {
                const safeName = file.name.replaceAll("\\", "_").replaceAll("/", "_");
                const objectPath = `milestones/${milestone.id}/${crypto.randomUUID()}-${safeName}`;
                const { error: uploadError } = await supabase.storage.from("private-files").upload(objectPath, file, {
                  upsert: false,
                  contentType: file.type || undefined,
                });
                if (uploadError) throw uploadError;

                const now = new Date().toISOString();
                const { data, error: insertError } = await supabase
                  .from("milestone_files")
                  .insert({
                    milestone_id: milestone.id,
                    uploaded_by: userId,
                    kind: fileKind,
                    file_path: objectPath,
                    file_name: file.name,
                    mime_type: file.type || null,
                    size_bytes: typeof file.size === "number" ? file.size : null,
                    updated_at: now,
                    updated_by: userId,
                  })
                  .select("id,milestone_id,uploaded_by,kind,file_path,file_name,mime_type,size_bytes,created_at")
                  .single();
                if (insertError) throw insertError;
                onFilesUpdated([data as MilestoneFileRow, ...files]);
                setFile(null);
              } catch (err) {
                onError(err instanceof Error ? err.message : "Failed to upload evidence file.");
              } finally {
                setSaving(false);
              }
            }}
          >
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Type</label>
              <select
                className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                value={fileKind}
                onChange={(e) => setFileKind(e.target.value as MilestoneFileRow["kind"])}
                disabled={disabled}
              >
                <option value="attachment">Attachment</option>
                <option value="photo">Photo</option>
                <option value="invoice">Invoice</option>
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
      </div>
    </div>
  );
}

function MessagesBox({
  disabled,
  userId,
  projectId,
  ownerId,
  contractorId,
  messages,
  attachmentsByMessageId,
  onNewMessage,
  onAttachmentsUpdated,
  onError,
  setSaving,
}: {
  disabled: boolean;
  userId: string;
  projectId: string;
  ownerId: string;
  contractorId: string;
  messages: MessageRow[];
  attachmentsByMessageId: Record<string, MessageAttachmentRow[]>;
  onNewMessage: (m: MessageRow) => void;
  onAttachmentsUpdated: (messageId: string, next: MessageAttachmentRow[]) => void;
  onError: (msg: string) => void;
  setSaving: (v: boolean) => void;
}) {
  const otherUserId = userId === contractorId ? ownerId : contractorId;
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="rounded-2xl border border-black/5 bg-white">
      <div className="border-b border-black/5 px-6 py-4 text-sm font-semibold">Messages</div>
      <div className="max-h-[420px] space-y-3 overflow-auto px-6 py-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[80%] rounded-xl px-4 py-2 text-sm ${
              m.sender_id === userId ? "ml-auto bg-black text-white" : "bg-zinc-100 text-zinc-900"
            }`}
          >
            <div className="whitespace-pre-wrap leading-6">{m.content}</div>
            {(attachmentsByMessageId[m.id] ?? []).length > 0 ? (
              <div className="mt-2 space-y-1">
                {(attachmentsByMessageId[m.id] ?? []).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className={`block w-full truncate rounded-lg px-3 py-2 text-left text-xs ${
                      m.sender_id === userId ? "bg-white/10 hover:bg-white/15" : "bg-white hover:bg-zinc-50"
                    }`}
                    onClick={async () => {
                      setSaving(true);
                      try {
                        const { data, error } = await supabase.storage
                          .from("private-files")
                          .createSignedUrl(a.file_path, 60);
                        if (error) throw error;
                        if (!data?.signedUrl) throw new Error("Failed to create signed URL.");
                        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
                      } catch (err) {
                        onError(err instanceof Error ? err.message : "Failed to download attachment.");
                      } finally {
                        setSaving(false);
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
        {messages.length === 0 ? (
          <div className="text-sm text-zinc-600">No messages yet.</div>
        ) : null}
      </div>
      <form
        className="grid gap-2 border-t border-black/5 px-6 py-4 md:grid-cols-6"
        onSubmit={async (e) => {
          e.preventDefault();
          const content = text.trim();
          if (!content && !file) return;
          setSaving(true);
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
            onNewMessage(data as MessageRow);
            if (objectPath && fileMeta) {
              const { data: attachment, error: attachmentError } = await supabase
                .from("message_attachments")
                .insert({
                  message_id: (data as MessageRow).id,
                  uploaded_by: userId,
                  file_path: objectPath,
                  file_name: fileMeta.file_name,
                  mime_type: fileMeta.mime_type,
                  size_bytes: fileMeta.size_bytes,
                })
                .select("id,message_id,uploaded_by,file_path,file_name,mime_type,size_bytes,created_at")
                .single();
              if (attachmentError) throw attachmentError;
              onAttachmentsUpdated((data as MessageRow).id, [
                attachment as MessageAttachmentRow,
                ...(attachmentsByMessageId[(data as MessageRow).id] ?? []),
              ]);
              setFile(null);
            }
            setText("");
          } catch (err) {
            onError(err instanceof Error ? err.message : "Failed to send message.");
          } finally {
            setSaving(false);
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

function ReviewsBox({
  disabled,
  userId,
  projectId,
  projectStatus,
  ownerId,
  contractorId,
  existingReviews,
  onError,
  setSaving,
  onCreated,
}: {
  disabled: boolean;
  userId: string;
  projectId: string;
  projectStatus: string;
  ownerId: string;
  contractorId: string;
  existingReviews: { reviewer_id: string; reviewee_id: string }[];
  onError: (msg: string) => void;
  setSaving: (v: boolean) => void;
  onCreated: (reviewer_id: string, reviewee_id: string) => void;
}) {
  const isCompleted = projectStatus === "completed";
  const canReview = isCompleted && (userId === ownerId || userId === contractorId);

  const targetId = userId === ownerId ? contractorId : ownerId;
  const alreadyReviewed = existingReviews.some(
    (r) => r.reviewer_id === userId && r.reviewee_id === targetId,
  );

  const [rating, setRating] = useState("5");
  const [comments, setComments] = useState("");

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6">
      <h2 className="text-sm font-semibold">Reviews</h2>
      <p className="mt-2 text-sm text-zinc-600">
        Reviews can be submitted after the project is completed.
      </p>

      {!canReview ? (
        <div className="mt-4 text-sm text-zinc-700">Not available yet.</div>
      ) : alreadyReviewed ? (
        <div className="mt-4 text-sm text-zinc-700">You already submitted a review.</div>
      ) : (
        <form
          className="mt-4 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            try {
              const parsedRating = Number(rating);
              if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
                onError("Rating must be between 1 and 5.");
                return;
              }
              const { error } = await supabase.from("reviews").insert({
                project_id: projectId,
                reviewer_id: userId,
                reviewee_id: targetId,
                rating: parsedRating,
                comments: comments.trim() ? comments.trim() : null,
              });
              if (error) throw error;
              onCreated(userId, targetId);
              setComments("");
            } catch (err) {
              onError(err instanceof Error ? err.message : "Failed to create review.");
            } finally {
              setSaving(false);
            }
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Rating</label>
              <select
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                disabled={disabled}
              >
                <option value="5">5</option>
                <option value="4">4</option>
                <option value="3">3</option>
                <option value="2">2</option>
                <option value="1">1</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Reviewee</label>
              <input
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm disabled:bg-zinc-50"
                value={targetId}
                disabled
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Comments</label>
            <textarea
              className="min-h-24 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              disabled={disabled}
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
              disabled={disabled}
            >
              Submit review
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
