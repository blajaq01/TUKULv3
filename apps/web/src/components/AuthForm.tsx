"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { supabase } from "@/lib/supabase/client";

type Mode = "sign_in" | "sign_up";

type Locations = {
  states: string[];
  districtsByState: Record<string, string[]>;
  areasByStateDistrict: Record<string, Record<string, string[]>>;
};

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = useMemo(() => searchParams.get("next") ?? "/app", [searchParams]);

  const [mode, setMode] = useState<Mode>("sign_in");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"owner" | "contractor">("owner");
  const [locations, setLocations] = useState<Locations | null>(null);
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedArea, setSelectedArea] = useState("");
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (mode !== "sign_up") return;
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
    return () => {
      isMounted = false;
    };
  }, [mode]);

  useEffect(() => {
    setSelectedState("");
    setSelectedDistrict("");
    setSelectedArea("");
    setServiceAreas([]);
  }, [role]);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);
        try {
          if (mode === "sign_in") {
            const { error: signInError } = await supabase.auth.signInWithPassword(
              { email, password },
            );
            if (signInError) throw signInError;
            router.replace(next);
            return;
          }

          if (!fullName.trim()) {
            setError("Full name is required.");
            return;
          }

          if (!selectedState) {
            setError("State is required.");
            return;
          }
          if (!selectedDistrict) {
            setError("District is required.");
            return;
          }
          if (role === "owner" && !selectedArea) {
            setError("Area is required.");
            return;
          }
          if (role === "contractor" && serviceAreas.length === 0) {
            setError("Select at least 1 service area.");
            return;
          }
          if (serviceAreas.length > 10) {
            setError("Contractors can select up to 10 service areas.");
            return;
          }

          const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: fullName.trim(),
                is_contractor: role === "contractor",
                state: selectedState,
                district: selectedDistrict,
                area: role === "owner" ? selectedArea : null,
                service_areas: role === "contractor" ? serviceAreas : [],
              },
            },
          });
          if (signUpError) throw signUpError;
          router.replace(next);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Something went wrong.");
        } finally {
          setIsSubmitting(false);
        }
      }}
    >
      {mode === "sign_up" ? (
        <>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Full name</label>
            <input
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Account type</label>
            <select
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30"
              value={role}
              onChange={(e) => setRole(e.target.value as "owner" | "contractor")}
            >
              <option value="owner">Property owner</option>
              <option value="contractor">Contractor</option>
            </select>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium">Location</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">State</label>
                <select
                  className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                  value={selectedState}
                  onChange={(e) => {
                    const state = e.target.value;
                    setSelectedState(state);
                    setSelectedDistrict("");
                    setSelectedArea("");
                    setServiceAreas([]);
                  }}
                  disabled={isSubmitting || !locations}
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
                  disabled={isSubmitting || !locations || !selectedState}
                >
                  <option value="">Select district</option>
                  {(selectedState ? locations?.districtsByState[selectedState] ?? [] : []).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {role === "owner" ? (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Area</label>
                <select
                  className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                  disabled={isSubmitting || !locations || !selectedState || !selectedDistrict}
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
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">Service areas (up to 10)</label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                    value={selectedArea}
                    onChange={(e) => setSelectedArea(e.target.value)}
                    disabled={isSubmitting || !locations || !selectedState || !selectedDistrict}
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
                      isSubmitting ||
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

                {serviceAreas.length ? (
                  <div className="flex flex-wrap gap-2">
                    {serviceAreas.map((a) => (
                      <button
                        key={a}
                        type="button"
                        className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
                        onClick={() => setServiceAreas((prev) => prev.filter((x) => x !== a))}
                        disabled={isSubmitting}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </>
      ) : null}

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Email</label>
        <input
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          inputMode="email"
          required
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Password</label>
        <input
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "sign_in" ? "current-password" : "new-password"}
          required
          minLength={6}
        />
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        className="w-full rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        disabled={isSubmitting}
      >
        {mode === "sign_in" ? "Sign in" : "Create account"}
      </button>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          className="text-zinc-700 hover:text-black"
          onClick={() => {
            setError(null);
            setMode(mode === "sign_in" ? "sign_up" : "sign_in");
          }}
        >
          {mode === "sign_in" ? "Create an account" : "Already have an account?"}
        </button>
      </div>
    </form>
  );
}
