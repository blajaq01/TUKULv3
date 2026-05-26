"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase/client";

export default function NewProjectPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [budget, setBudget] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Post a project</h1>
        <p className="text-sm text-zinc-600">
          Create a structured scope so contractors can bid accurately.
        </p>
      </div>

      <form
        className="space-y-4 rounded-2xl border border-black/5 bg-white p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setIsSubmitting(true);
          try {
            const budgetValue = budget.trim() ? Number(budget) : null;
            if (budgetValue !== null && Number.isNaN(budgetValue)) {
              setError("Budget must be a number.");
              return;
            }

            const { data, error: insertError } = await supabase
              .from("projects")
              .insert({
                owner_id: user?.id,
                title: title.trim(),
                description: description.trim() ? description.trim() : null,
                location: location.trim() ? location.trim() : null,
                budget: budgetValue,
                status: "open",
                created_by: user?.id,
              })
              .select("id")
              .single();

            if (insertError) throw insertError;
            router.replace(`/app/projects/${data.id}`);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create project.");
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Title</label>
          <input
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Description</label>
          <textarea
            className="min-h-28 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Location</label>
            <input
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Shah Alam, Selangor"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Budget (RM)</label>
            <input
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              inputMode="decimal"
              placeholder="e.g. 25000"
            />
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
            onClick={() => router.back()}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
            disabled={isSubmitting}
          >
            Create project
          </button>
        </div>
      </form>
    </div>
  );
}
