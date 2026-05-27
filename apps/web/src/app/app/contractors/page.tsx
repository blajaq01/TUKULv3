"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase/client";

type ContractorDirectoryRow = {
  contractor_id: string;
  full_name: string | null;
  business_name: string | null;
  cidb_grade: string | null;
  specialties: string[] | null;
  service_areas: string[] | null;
  verification_status: string | null;
  avg_rating: number | null;
  review_count: number | null;
  completed_projects: number | null;
  trust_score: number | null;
};

export default function ContractorsPage() {
  const { user } = useAuth();
  if (!user?.id) return null;
  return <ContractorsLoader />;
}

function ContractorsLoader() {
  const [rows, setRows] = useState<ContractorDirectoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [verification, setVerification] = useState<"any" | "approved">("approved");
  const [cidbGrade, setCidbGrade] = useState<string>("any");
  const [serviceArea, setServiceArea] = useState<string>("any");
  const [specialty, setSpecialty] = useState<string>("any");
  const [minRating, setMinRating] = useState<string>("any");

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      const { data, error: listError } = await supabase
        .from("contractor_directory")
        .select(
          "contractor_id,full_name,business_name,cidb_grade,specialties,service_areas,verification_status,avg_rating,review_count,completed_projects,trust_score",
        )
        .order("trust_score", { ascending: false })
        .limit(200);
      if (!isMounted) return;
      if (listError) throw listError;
      setRows((data ?? []) as ContractorDirectoryRow[]);
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

  const filterOptions = {
    cidbGrades: Array.from(
      new Set(rows.map((r) => r.cidb_grade).filter((x): x is string => typeof x === "string" && x.trim().length > 0)),
    ).sort((a, b) => a.localeCompare(b)),
    serviceAreas: Array.from(
      new Set(
        rows
          .flatMap((r) => r.service_areas ?? [])
          .filter((x): x is string => typeof x === "string" && x.trim().length > 0),
      ),
    ).sort((a, b) => a.localeCompare(b)),
    specialties: Array.from(
      new Set(
        rows
          .flatMap((r) => r.specialties ?? [])
          .filter((x): x is string => typeof x === "string" && x.trim().length > 0),
      ),
    ).sort((a, b) => a.localeCompare(b)),
  };

  const filteredRows = rows.filter((c) => {
    if (verification === "approved" && c.verification_status !== "approved") return false;
    if (cidbGrade !== "any" && (c.cidb_grade ?? "") !== cidbGrade) return false;
    if (serviceArea !== "any" && !(c.service_areas ?? []).includes(serviceArea)) return false;
    if (specialty !== "any" && !(c.specialties ?? []).includes(specialty)) return false;
    if (minRating !== "any") {
      const min = Number(minRating);
      if (!Number.isFinite(min)) return false;
      const rating = typeof c.avg_rating === "number" ? c.avg_rating : 0;
      if (rating < min) return false;
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const hay = [
        c.business_name ?? "",
        c.full_name ?? "",
        c.cidb_grade ?? "",
        ...(c.specialties ?? []),
        ...(c.service_areas ?? []),
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Contractors</h1>
        <p className="text-sm text-zinc-600">
          Browse verified contractors with trust score signals.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-black/5 bg-white p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">Search</label>
            <input
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Business name, specialty, area…"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Verification</label>
            <select
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
              value={verification}
              onChange={(e) => setVerification(e.target.value as typeof verification)}
              disabled={isLoading}
            >
              <option value="approved">Approved only</option>
              <option value="any">Any status</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">CIDB grade</label>
            <select
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
              value={cidbGrade}
              onChange={(e) => setCidbGrade(e.target.value)}
              disabled={isLoading}
            >
              <option value="any">Any</option>
              {filterOptions.cidbGrades.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Service area</label>
            <select
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
              value={serviceArea}
              onChange={(e) => setServiceArea(e.target.value)}
              disabled={isLoading}
            >
              <option value="any">Any</option>
              {filterOptions.serviceAreas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Specialty</label>
            <select
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              disabled={isLoading}
            >
              <option value="any">Any</option>
              {filterOptions.specialties.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Min rating</label>
            <select
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
              disabled={isLoading}
            >
              <option value="any">Any</option>
              <option value="4">4.0+</option>
              <option value="4.5">4.5+</option>
              <option value="5">5.0</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-black/5 bg-white">
        <div className="border-b border-black/5 px-6 py-4 text-sm font-medium text-zinc-700">
          {isLoading ? "Loading…" : `${filteredRows.length} contractor(s)`}
        </div>
        <div className="divide-y divide-black/5">
          {filteredRows.map((c) => (
            <div key={c.contractor_id} className="px-6 py-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">
                    {c.business_name ?? c.full_name ?? "Unnamed contractor"}
                  </div>
                  <div className="mt-1 text-sm text-zinc-600">
                    Trust score: {typeof c.trust_score === "number" ? c.trust_score.toFixed(2) : "—"} •
                    Rating: {typeof c.avg_rating === "number" ? c.avg_rating.toFixed(2) : "—"} (
                    {c.review_count ?? 0}) • Completed: {c.completed_projects ?? 0}
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-zinc-700 md:grid-cols-2">
                    <div>Verification: {c.verification_status ?? "—"}</div>
                    <div>CIDB grade: {c.cidb_grade ?? "—"}</div>
                    <div>Specialties: {c.specialties?.join(", ") || "—"}</div>
                    <div>Service areas: {c.service_areas?.join(", ") || "—"}</div>
                  </div>
                </div>
                <div className="text-xs text-zinc-500">{c.contractor_id}</div>
              </div>
            </div>
          ))}
          {!isLoading && filteredRows.length === 0 ? (
            <div className="px-6 py-10 text-sm text-zinc-600">No contractors yet.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
