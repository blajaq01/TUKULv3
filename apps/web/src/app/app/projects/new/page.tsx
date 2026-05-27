"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase/client";

type CategoryRow = {
  id: number;
  name: string;
};

export default function NewProjectPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [budget, setBudget] = useState("");
  const [visibility, setVisibility] = useState<"public" | "invite_only">("public");
  const [targetStartDate, setTargetStartDate] = useState("");
  const [targetEndDate, setTargetEndDate] = useState("");
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      const { data, error: listError } = await supabase
        .from("categories")
        .select("id,name")
        .order("name", { ascending: true })
        .limit(200);
      if (!isMounted) return;
      if (listError) throw listError;
      setCategories((data ?? []) as CategoryRow[]);
    };

    run().catch((e) => {
      if (!isMounted) return;
      setError(e instanceof Error ? e.message : "Failed to load categories.");
    });

    return () => {
      isMounted = false;
    };
  }, []);

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
            if (!user?.id) {
              setError("You must be signed in to post a project.");
              return;
            }

            const budgetValue = budget.trim() ? Number(budget) : null;
            if (budgetValue !== null && Number.isNaN(budgetValue)) {
              setError("Budget must be a number.");
              return;
            }

            const startDate = targetStartDate ? targetStartDate : null;
            const endDate = targetEndDate ? targetEndDate : null;
            if (startDate && endDate && startDate > endDate) {
              setError("Target end date must be after target start date.");
              return;
            }

            const { data, error: insertError } = await supabase
              .from("projects")
              .insert({
                owner_id: user.id,
                title: title.trim(),
                description: description.trim() ? description.trim() : null,
                location: location.trim() ? location.trim() : null,
                budget: budgetValue,
                status: "open",
                visibility,
                target_start_date: startDate,
                target_end_date: endDate,
                created_by: user.id,
              })
              .select("id")
              .single();

            if (insertError) throw insertError;

            const projectId = (data as { id: string }).id;
            if (selectedCategoryIds.length > 0) {
              const rows = selectedCategoryIds.map((category_id) => ({
                project_id: projectId,
                category_id,
              }));
              const { error: catError } = await supabase.from("project_categories").insert(rows);
              if (catError) throw catError;
            }

            router.replace(`/app/projects/${projectId}`);
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

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Target start date</label>
            <input
              type="date"
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30"
              value={targetStartDate}
              onChange={(e) => setTargetStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Target end date</label>
            <input
              type="date"
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30"
              value={targetEndDate}
              onChange={(e) => setTargetEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Bid visibility</div>
          <div className="grid gap-2 md:grid-cols-2">
            <button
              type="button"
              className={`rounded-lg border px-4 py-2 text-left text-sm ${
                visibility === "public"
                  ? "border-black bg-black text-white"
                  : "border-black/10 bg-white hover:bg-zinc-50"
              }`}
              onClick={() => setVisibility("public")}
              disabled={isSubmitting}
            >
              Public bidding
              <div className={`mt-1 text-xs ${visibility === "public" ? "text-white/80" : "text-zinc-600"}`}>
                Verified contractors can browse and bid.
              </div>
            </button>
            <button
              type="button"
              className={`rounded-lg border px-4 py-2 text-left text-sm ${
                visibility === "invite_only"
                  ? "border-black bg-black text-white"
                  : "border-black/10 bg-white hover:bg-zinc-50"
              }`}
              onClick={() => setVisibility("invite_only")}
              disabled={isSubmitting}
            >
              Invite-only bidding
              <div
                className={`mt-1 text-xs ${
                  visibility === "invite_only" ? "text-white/80" : "text-zinc-600"
                }`}
              >
                Only invited contractors can view and bid.
              </div>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Categories / trades</div>
          <div className="grid gap-2 md:grid-cols-2">
            {categories.map((c) => {
              const checked = selectedCategoryIds.includes(c.id);
              return (
                <label
                  key={c.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm hover:bg-zinc-50"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...selectedCategoryIds, c.id]
                        : selectedCategoryIds.filter((id) => id !== c.id);
                      setSelectedCategoryIds(next);
                    }}
                    disabled={isSubmitting}
                  />
                  <span className="truncate">{c.name}</span>
                </label>
              );
            })}
            {categories.length === 0 ? (
              <div className="rounded-lg border border-black/10 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
                No categories available yet.
              </div>
            ) : null}
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
