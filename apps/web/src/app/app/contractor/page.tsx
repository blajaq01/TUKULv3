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
};

type DocType = "cidb" | "ssm" | "insurance" | "portfolio" | "other";

type Locations = {
  states: string[];
  districtsByState: Record<string, string[]>;
  areasByStateDistrict: Record<string, Record<string, string[]>>;
};

function toDateInputValue(value: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

export default function ContractorPage() {
  const { user, profile } = useAuth();
  const isContractor = useMemo(() => Boolean(profile?.is_contractor), [profile?.is_contractor]);

  if (!isContractor) {
    return (
      <div className="rounded-2xl border border-black/5 bg-white p-6 text-sm text-zinc-700">
        This page is only available to contractor accounts.
      </div>
    );
  }

  if (!user?.id) return null;

  return <ContractorLoader key={user.id} contractorId={user.id} />;
}

function ContractorLoader({ contractorId }: { contractorId: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [ssmNumber, setSsmNumber] = useState("");
  const [cidbRegNumber, setCidbRegNumber] = useState("");
  const [cidbGrade, setCidbGrade] = useState("");
  const [cidbExpiry, setCidbExpiry] = useState("");
  const [insuranceProvider, setInsuranceProvider] = useState("");
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState("");
  const [insuranceExpiry, setInsuranceExpiry] = useState("");
  const [bio, setBio] = useState("");

  const [locations, setLocations] = useState<Locations | null>(null);
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedArea, setSelectedArea] = useState("");
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);

  const [verificationStatus, setVerificationStatus] = useState<
    ContractorProfileRow["verification_status"] | null
  >(null);
  const [verificationNotes, setVerificationNotes] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        fetch("/api/locations")
          .then((r) => r.json() as Promise<Locations>)
          .then((data) => {
            if (!isMounted) return;
            setLocations(data);
          })
          .catch(() => {
            if (!isMounted) return;
            setLocations(null);
          });

        const { data, error: selectError } = await supabase
          .from("contractor_profiles")
          .select(
            "contractor_id,business_name,ssm_number,cidb_registration_number,cidb_grade,cidb_expiry,insurance_provider,insurance_policy_number,insurance_expiry,bio,verification_status,verification_notes",
          )
          .eq("contractor_id", contractorId)
          .maybeSingle();

        if (!isMounted) return;
        if (selectError) {
          setError(selectError.message);
          return;
        }
        if (!data) {
          setVerificationStatus("draft");
          return;
        }
        const row = data as ContractorProfileRow;
        setBusinessName(row.business_name ?? "");
        setSsmNumber(row.ssm_number ?? "");
        setCidbRegNumber(row.cidb_registration_number ?? "");
        setCidbGrade(row.cidb_grade ?? "");
        setCidbExpiry(toDateInputValue(row.cidb_expiry));
        setInsuranceProvider(row.insurance_provider ?? "");
        setInsurancePolicyNumber(row.insurance_policy_number ?? "");
        setInsuranceExpiry(toDateInputValue(row.insurance_expiry));
        setBio(row.bio ?? "");
        setVerificationStatus(row.verification_status);
        setVerificationNotes(row.verification_notes);

        const { data: userRow } = await supabase
          .from("users")
          .select("state,district,service_areas")
          .eq("id", contractorId)
          .maybeSingle();
        if (!isMounted) return;
        const u = userRow as { state: string | null; district: string | null; service_areas: string[] | null } | null;
        setSelectedState(u?.state ?? "");
        setSelectedDistrict(u?.district ?? "");
        setServiceAreas(Array.isArray(u?.service_areas) ? u?.service_areas ?? [] : []);
      } catch (e) {
        if (!isMounted) return;
        setError(e instanceof Error ? e.message : "Failed to load contractor profile.");
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [contractorId]);

  const canEdit = verificationStatus === "draft" || verificationStatus === "rejected";
  const canSubmit = verificationStatus === "draft" || verificationStatus === "rejected";

  async function saveProfile(nextStatus?: ContractorProfileRow["verification_status"]) {
    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        contractor_id: contractorId,
        business_name: businessName.trim() ? businessName.trim() : null,
        ssm_number: ssmNumber.trim() ? ssmNumber.trim() : null,
        cidb_registration_number: cidbRegNumber.trim() ? cidbRegNumber.trim() : null,
        cidb_grade: cidbGrade.trim() ? cidbGrade.trim() : null,
        cidb_expiry: cidbExpiry ? cidbExpiry : null,
        insurance_provider: insuranceProvider.trim() ? insuranceProvider.trim() : null,
        insurance_policy_number: insurancePolicyNumber.trim()
          ? insurancePolicyNumber.trim()
          : null,
        insurance_expiry: insuranceExpiry ? insuranceExpiry : null,
        bio: bio.trim() ? bio.trim() : null,
        verification_status: nextStatus ?? verificationStatus ?? "draft",
        verification_submitted_at: nextStatus === "submitted" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      const { data, error: upsertError } = await supabase
        .from("contractor_profiles")
        .upsert(payload, { onConflict: "contractor_id" })
        .select("verification_status,verification_notes")
        .single();

      if (upsertError) throw upsertError;
      setVerificationStatus((data as ContractorProfileRow).verification_status);
      setVerificationNotes((data as ContractorProfileRow).verification_notes);

      const { error: userUpdateError } = await supabase
        .from("users")
        .update({
          state: selectedState.trim() ? selectedState.trim() : null,
          district: selectedDistrict.trim() ? selectedDistrict.trim() : null,
          service_areas: serviceAreas.slice(0, 10),
        })
        .eq("id", contractorId);
      if (userUpdateError) throw userUpdateError;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save profile.");
    } finally {
      setIsSaving(false);
    }
  }

  async function uploadDocument(docType: DocType, file: File) {
    setIsSaving(true);
    setError(null);

    try {
      const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
      const safeExt = (ext ?? "bin").replaceAll(/[^a-zA-Z0-9]/g, "");
      const path = `contractors/${contractorId}/${docType}/${crypto.randomUUID()}.${safeExt}`;
      const bucket = "private-files";

      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
        upsert: false,
      });
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("contractor_documents").insert({
        contractor_id: contractorId,
        doc_type: docType,
        bucket,
        path,
        status: "uploaded",
      });
      if (insertError) throw insertError;
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Failed to upload document. Ensure the storage bucket exists.",
      );
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Contractor profile</h1>
        <p className="text-sm text-zinc-600">
          Complete verification details (CIDB, SSM, insurance) before bidding.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-black/5 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Verification status</div>
            <div className="mt-1 text-sm text-zinc-700">{verificationStatus ?? "draft"}</div>
            {verificationNotes ? (
              <div className="mt-2 text-sm text-zinc-600">{verificationNotes}</div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60"
              disabled={isSaving || !canEdit}
              onClick={async () => saveProfile("draft")}
            >
              Save draft
            </button>
            <button
              type="button"
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
              disabled={isSaving || !canSubmit}
              onClick={async () => saveProfile("submitted")}
            >
              Submit for verification
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-black/5 bg-white p-6">
        <h2 className="text-sm font-semibold">Company details</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Business name</label>
            <input
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">SSM number</label>
            <input
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
              value={ssmNumber}
              onChange={(e) => setSsmNumber(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">CIDB registration number</label>
            <input
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
              value={cidbRegNumber}
              onChange={(e) => setCidbRegNumber(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">CIDB grade</label>
            <input
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
              value={cidbGrade}
              onChange={(e) => setCidbGrade(e.target.value)}
              disabled={!canEdit}
              placeholder="G1–G7"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">CIDB expiry</label>
            <input
              type="date"
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
              value={cidbExpiry}
              onChange={(e) => setCidbExpiry(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Insurance provider</label>
            <input
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
              value={insuranceProvider}
              onChange={(e) => setInsuranceProvider(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Insurance policy number</label>
            <input
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
              value={insurancePolicyNumber}
              onChange={(e) => setInsurancePolicyNumber(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Insurance expiry</label>
            <input
              type="date"
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
              value={insuranceExpiry}
              onChange={(e) => setInsuranceExpiry(e.target.value)}
              disabled={!canEdit}
            />
          </div>
        </div>
        <div className="mt-4 space-y-1.5">
          <label className="text-sm font-medium">Bio</label>
          <textarea
            className="min-h-28 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            disabled={!canEdit}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-black/5 bg-white p-6">
        <h2 className="text-sm font-semibold">Service location</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Choose your base district and up to 10 operational areas.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">State</label>
            <select
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedDistrict("");
                setSelectedArea("");
                setServiceAreas([]);
              }}
              disabled={!canEdit || !locations}
            >
              <option value="">Select state</option>
              {(locations?.states ?? []).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">District</label>
            <select
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
              value={selectedDistrict}
              onChange={(e) => {
                setSelectedDistrict(e.target.value);
                setSelectedArea("");
                setServiceAreas([]);
              }}
              disabled={!canEdit || !locations || !selectedState}
            >
              <option value="">Select district</option>
              {(selectedState ? locations?.districtsByState[selectedState] ?? [] : []).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">Add an area</label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                disabled={!canEdit || !locations || !selectedState || !selectedDistrict}
              >
                <option value="">Select area</option>
                {(selectedState && selectedDistrict
                  ? locations?.areasByStateDistrict[selectedState]?.[selectedDistrict] ?? []
                  : []
                ).map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="rounded-lg border border-black/10 bg-white px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60"
                disabled={
                  !canEdit ||
                  !selectedArea ||
                  serviceAreas.includes(selectedArea) ||
                  serviceAreas.length >= 10
                }
                onClick={() => {
                  if (!selectedArea) return;
                  setServiceAreas((prev) => {
                    if (prev.includes(selectedArea)) return prev;
                    if (prev.length >= 10) return prev;
                    return [...prev, selectedArea];
                  });
                  setSelectedArea("");
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {serviceAreas.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {serviceAreas.map((a) => (
              <button
                key={a}
                type="button"
                className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
                onClick={() => setServiceAreas((prev) => prev.filter((x) => x !== a))}
                disabled={!canEdit}
              >
                {a}
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-4 text-sm text-zinc-600">No areas selected yet.</div>
        )}
      </div>

      <div className="rounded-2xl border border-black/5 bg-white p-6">
        <h2 className="text-sm font-semibold">Upload verification documents</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Requires a private storage bucket named <span className="font-medium">private-files</span>.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {(["cidb", "ssm", "insurance", "portfolio"] as DocType[]).map((t) => (
            <div key={t} className="space-y-1.5">
              <div className="text-sm font-medium">{t.toUpperCase()}</div>
              <input
                type="file"
                className="block w-full text-sm"
                disabled={isSaving || !canEdit}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  await uploadDocument(t, f);
                  e.target.value = "";
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
