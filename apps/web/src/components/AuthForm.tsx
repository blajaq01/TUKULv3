"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { supabase } from "@/lib/supabase/client";

type Mode = "sign_in" | "sign_up";

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = useMemo(() => searchParams.get("next") ?? "/app", [searchParams]);

  const [mode, setMode] = useState<Mode>("sign_in");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"owner" | "contractor">("owner");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

          const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: fullName.trim(), is_contractor: role === "contractor" },
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
