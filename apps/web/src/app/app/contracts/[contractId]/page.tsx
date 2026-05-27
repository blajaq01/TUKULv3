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
  type: "deposit" | "pending_release" | "release" | "refund";
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
  const [reviews, setReviews] = useState<{ reviewer_id: string; reviewee_id: string }[]>([]);
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
      setMilestones((milestonesData ?? []) as MilestoneRow[]);

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
      setMessages((messageData ?? []) as MessageRow[]);

      const { data: reviewData, error: reviewError } = await supabase
        .from("reviews")
        .select("reviewer_id,reviewee_id")
        .eq("project_id", (projectData as ProjectRow).id);

      if (!isMounted) return;
      if (reviewError) throw reviewError;
      setReviews((reviewData ?? []) as { reviewer_id: string; reviewee_id: string }[]);
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
      <div className="rounded-2xl border border-black/5 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight">Contract</h1>
            <div className="mt-1 text-sm text-zinc-600">
              Project:{" "}
              <Link className="underline" href={`/app/projects/${project.id}`}>
                {project.title}
              </Link>{" "}
              • Status: {project.status}
            </div>
            <div className="mt-3 text-sm text-zinc-700">
              Agreed price: <span className="font-semibold">RM {Number(contract.agreed_price).toFixed(2)}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-sm text-zinc-600">Total milestones: RM {totalMilestones.toFixed(2)}</div>
            <button
              type="button"
              className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
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
          remaining={Math.max(0, contract.agreed_price - totalMilestones)}
          onAdd={addMilestone}
        />
      ) : null}

      <div className="rounded-2xl border border-black/5 bg-white">
        <div className="border-b border-black/5 px-6 py-4 text-sm font-semibold">Milestones</div>
        <div className="divide-y divide-black/5">
          {milestones.map((m) => (
            <MilestoneRowView
              key={`${m.id}:${typeof m.evidence?.note === "string" ? (m.evidence.note as string) : ""}`}
              milestone={m}
              disabled={isSaving}
              canEditMilestones={canEditMilestones}
              canWorkOnMilestones={canWorkOnMilestones}
              onStatusChange={updateMilestoneStatus}
              onSaveEvidence={saveEvidence}
            />
          ))}
          {milestones.length === 0 ? (
            <div className="px-6 py-10 text-sm text-zinc-600">No milestones yet.</div>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-black/5 bg-white">
        <div className="border-b border-black/5 px-6 py-4 text-sm font-semibold">Ledger</div>
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
        onNewMessage={(m) => setMessages((prev) => [...prev, m])}
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

function MilestoneBuilder({
  disabled,
  remaining,
  onAdd,
}: {
  disabled: boolean;
  remaining: number;
  onAdd: (args: { name: string; amount: number; dueDate: string | null; description: string | null }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6">
      <h2 className="text-sm font-semibold">Milestone builder</h2>
      <p className="mt-2 text-sm text-zinc-600">
        Remaining budget: <span className="font-medium">RM {remaining.toFixed(2)}</span>
      </p>

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

function MilestoneRowView({
  milestone,
  disabled,
  canEditMilestones,
  canWorkOnMilestones,
  onStatusChange,
  onSaveEvidence,
}: {
  milestone: MilestoneRow;
  disabled: boolean;
  canEditMilestones: boolean;
  canWorkOnMilestones: boolean;
  onStatusChange: (milestoneId: string, status: MilestoneRow["status"]) => Promise<void>;
  onSaveEvidence: (milestoneId: string, evidenceText: string) => Promise<void>;
}) {
  const [evidenceText, setEvidenceText] = useState(
    typeof milestone.evidence?.note === "string" ? (milestone.evidence.note as string) : "",
  );

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
  onNewMessage,
  onError,
  setSaving,
}: {
  disabled: boolean;
  userId: string;
  projectId: string;
  ownerId: string;
  contractorId: string;
  messages: MessageRow[];
  onNewMessage: (m: MessageRow) => void;
  onError: (msg: string) => void;
  setSaving: (v: boolean) => void;
}) {
  const otherUserId = userId === contractorId ? ownerId : contractorId;
  const [text, setText] = useState("");

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
            <div className="mt-1 text-xs opacity-70">{new Date(m.sent_at).toLocaleString()}</div>
          </div>
        ))}
        {messages.length === 0 ? (
          <div className="text-sm text-zinc-600">No messages yet.</div>
        ) : null}
      </div>
      <form
        className="flex gap-2 border-t border-black/5 px-6 py-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const content = text.trim();
          if (!content) return;
          setSaving(true);
          try {
            const { data, error } = await supabase
              .from("messages")
              .insert({
                sender_id: userId,
                receiver_id: otherUserId,
                project_id: projectId,
                content,
              })
              .select("id,sender_id,receiver_id,project_id,content,sent_at")
              .single();
            if (error) throw error;
            onNewMessage(data as MessageRow);
            setText("");
          } catch (err) {
            onError(err instanceof Error ? err.message : "Failed to send message.");
          } finally {
            setSaving(false);
          }
        }}
      >
        <input
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a message…"
          disabled={disabled}
        />
        <button
          type="submit"
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          disabled={disabled || !text.trim()}
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
