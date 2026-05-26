"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase/client";

type ContractorProfileRow = {
  contractor_id: string;
  business_name: string | null;
  ssm_number: string | null;
  cidb_registration_number: string | null;
  cidb_grade: string | null;
  cidb_expiry: string | null;
  insurance_provider: string | null;
  insurance_policy_number: string | null;
  insurance_expiry: string | null;
  bio: string | null;
  verification_status: "draft" | "submitted" | "approved" | "rejected";
  verification_notes: string | null;
  verification_submitted_at: string | null;
};

type ContractorDocRow = {
  id: string;
  contractor_id: string;
  doc_type: string;
  bucket: string;
  path: string;
  status: string;
  notes: string | null;
  created_at: string;
};

export default function AdminContractorsPage() {
  const { user, profile } = useAuth();
  const isAdmin = useMemo(() => Boolean(profile?.is_admin), [profile?.is_admin]);

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-black/5 bg-white p-6 text-sm text-zinc-700">
        This page is only available to Superadmin accounts.
      </div>
    );
  }

  if (!user?.id) return null;

  return <AdminContractorsLoader key={user.id} adminId={user.id} />;
}

function AdminContractorsLoader({ adminId }: { adminId: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ContractorProfileRow[]>([]);
  const [docsByContractor, setDocsByContractor] = useState<Record<string, ContractorDocRow[]>>(
    {},
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      const { data, error: listError } = await supabase
        .from("contractor_profiles")
        .select(
          "contractor_id,business_name,ssm_number,cidb_registration_number,cidb_grade,cidb_expiry,insurance_provider,insurance_policy_number,insurance_expiry,bio,verification_status,verification_notes,verification_submitted_at",
        )
        .is("deleted_at", null)
        .order("verification_submitted_at", { ascending: true });

      if (!isMounted) return;
      if (listError) throw listError;
      const nextRows = (data ?? []) as ContractorProfileRow[];
      setRows(nextRows);

      const contractorIds = nextRows.map((r) => r.contractor_id);
      if (contractorIds.length === 0) {
        setDocsByContractor({});
        return;
      }

      const { data: docs, error: docsError } = await supabase
        .from("contractor_documents")
        .select("id,contractor_id,doc_type,bucket,path,status,notes,created_at")
        .in("contractor_id", contractorIds)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (!isMounted) return;
      if (docsError) throw docsError;

      const map: Record<string, ContractorDocRow[]> = {};
      for (const d of (docs ?? []) as ContractorDocRow[]) {
        (map[d.contractor_id] ??= []).push(d);
      }
      setDocsByContractor(map);
    };

    run()
      .catch((e) => {
        if (!isMounted) return;
        setError(e instanceof Error ? e.message : "Failed to load contractors.");
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function setDecision(contractorId: string, decision: "approved" | "rejected") {
    setIsSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from("contractor_profiles")
        .update({
          verification_status: decision,
          verification_reviewed_at: new Date().toISOString(),
          verification_reviewed_by: adminId,
          updated_at: new Date().toISOString(),
        })
        .eq("contractor_id", contractorId);

      if (updateError) throw updateError;

      setRows((prev) =>
        prev.map((r) =>
          r.contractor_id === contractorId ? { ...r, verification_status: decision } : r,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update contractor.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Contractor verification</h1>
        <p className="text-sm text-zinc-600">
          Review contractor submissions and approve/reject verification.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-black/5 bg-white">
        <div className="border-b border-black/5 px-6 py-4 text-sm font-medium text-zinc-700">
          {isLoading ? "Loading…" : `${rows.length} contractor profile(s)`}
        </div>
        <div className="divide-y divide-black/5">
          {rows.map((r) => (
            <div key={r.contractor_id} className="px-6 py-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">
                    {r.business_name ?? "Unnamed business"}
                  </div>
                  <div className="mt-1 text-sm text-zinc-600">
                    {r.contractor_id} • {r.verification_status}
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-zinc-700 md:grid-cols-2">
                    <div>SSM: {r.ssm_number ?? "—"}</div>
                    <div>CIDB: {r.cidb_grade ?? "—"}</div>
                    <div>CIDB Expiry: {r.cidb_expiry ? r.cidb_expiry.slice(0, 10) : "—"}</div>
                    <div>Insurance: {r.insurance_provider ?? "—"}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-black/10 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-60"
                    disabled={isSaving || r.verification_status !== "submitted"}
                    onClick={async () => setDecision(r.contractor_id, "rejected")}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                    disabled={isSaving || r.verification_status !== "submitted"}
                    onClick={async () => setDecision(r.contractor_id, "approved")}
                  >
                    Approve
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-zinc-50 p-4">
                <div className="text-xs font-semibold text-zinc-700">Documents</div>
                <div className="mt-2 grid gap-2 text-sm text-zinc-700">
                  {(docsByContractor[r.contractor_id] ?? []).map((d) => (
                    <div key={d.id} className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0 truncate">
                        {d.doc_type} • {d.status} • {d.bucket}/{d.path}
                      </div>
                    </div>
                  ))}
                  {(docsByContractor[r.contractor_id] ?? []).length === 0 ? (
                    <div className="text-sm text-zinc-600">No documents uploaded.</div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
          {!isLoading && rows.length === 0 ? (
            <div className="px-6 py-10 text-sm text-zinc-600">
              No contractor profiles yet.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
