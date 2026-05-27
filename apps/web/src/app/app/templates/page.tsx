"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase/client";

type TemplateRow = {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  is_public: boolean;
  created_at: string;
};

type TemplateItemRow = {
  id: string;
  template_id: string;
  sequence: number;
  name: string;
  description: string | null;
  recommended_percent: number | null;
};

export default function TemplatesPage() {
  const { user, profile } = useAuth();
  const isAdmin = Boolean(profile?.is_admin);
  if (!user?.id) return null;
  return <TemplatesLoader userId={user.id} isAdmin={isAdmin} />;
}

function TemplatesLoader({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [items, setItems] = useState<TemplateItemRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) ?? null,
    [selectedTemplateId, templates],
  );

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      const { data, error: listError } = await supabase
        .from("milestone_templates")
        .select("id,name,description,created_by,is_public,created_at")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(200);
      if (!isMounted) return;
      if (listError) throw listError;
      const rows = (data ?? []) as TemplateRow[];
      setTemplates(rows);
      setSelectedTemplateId((prev) => prev ?? (rows[0]?.id ?? null));
    };

    run()
      .catch((e) => {
        if (!isMounted) return;
        setError(e instanceof Error ? e.message : "Failed to load templates.");
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      if (!selectedTemplateId) {
        setItems([]);
        return;
      }
      const { data, error: listError } = await supabase
        .from("milestone_template_items")
        .select("id,template_id,sequence,name,description,recommended_percent")
        .eq("template_id", selectedTemplateId)
        .is("deleted_at", null)
        .order("sequence", { ascending: true });
      if (!isMounted) return;
      if (listError) throw listError;
      setItems((data ?? []) as TemplateItemRow[]);
    };

    run().catch((e) => {
      if (!isMounted) return;
      setError(e instanceof Error ? e.message : "Failed to load template items.");
    });

    return () => {
      isMounted = false;
    };
  }, [selectedTemplateId]);

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemPercent, setItemPercent] = useState("");

  const percentSum = useMemo(() => {
    return items.reduce((sum, i) => sum + (typeof i.recommended_percent === "number" ? i.recommended_percent : 0), 0);
  }, [items]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Milestone templates</h1>
        <p className="text-sm text-zinc-600">Create reusable milestone structures for bids and contracts.</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-black/5 bg-white">
          <div className="border-b border-black/5 px-6 py-4 text-sm font-semibold">Your templates</div>
          <div className="divide-y divide-black/5">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`w-full px-6 py-4 text-left hover:bg-zinc-50 ${
                  t.id === selectedTemplateId ? "bg-zinc-50" : ""
                }`}
                onClick={() => setSelectedTemplateId(t.id)}
                disabled={isSaving}
              >
                <div className="text-sm font-semibold">{t.name}</div>
                <div className="mt-1 text-xs text-zinc-600">
                  {t.is_public ? "Public" : t.created_by === userId ? "Private" : "Shared"} •{" "}
                  {new Date(t.created_at).toLocaleString()}
                </div>
                {t.description ? <div className="mt-2 text-sm text-zinc-700">{t.description}</div> : null}
              </button>
            ))}
            {!isLoading && templates.length === 0 ? (
              <div className="px-6 py-10 text-sm text-zinc-600">No templates yet.</div>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-black/5 bg-white p-6">
          <h2 className="text-sm font-semibold">Create template</h2>
          <form
            className="mt-4 space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newName.trim()) return;
              setIsSaving(true);
              setError(null);
              try {
                const now = new Date().toISOString();
                const { data, error: insertError } = await supabase
                  .from("milestone_templates")
                  .insert({
                    name: newName.trim(),
                    description: newDescription.trim() ? newDescription.trim() : null,
                    created_by: userId,
                    is_public: false,
                    updated_at: now,
                    updated_by: userId,
                  })
                  .select("id,name,description,created_by,is_public,created_at")
                  .single();
                if (insertError) throw insertError;
                setTemplates((prev) => [data as TemplateRow, ...prev]);
                setSelectedTemplateId((data as TemplateRow).id);
                setNewName("");
                setNewDescription("");
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to create template.");
              } finally {
                setIsSaving(false);
              }
            }}
          >
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Name</label>
              <input
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={isSaving}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description (optional)</label>
              <input
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                disabled={isSaving}
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                disabled={isSaving || !newName.trim()}
              >
                Create
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="rounded-2xl border border-black/5 bg-white">
        <div className="border-b border-black/5 px-6 py-4 text-sm font-semibold">
          Template items {selectedTemplate ? `• ${selectedTemplate.name}` : ""}
        </div>
        <div className="px-6 py-5">
          {selectedTemplate ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-zinc-600">
                Recommended percent total: {percentSum.toFixed(2)}%
              </div>
              {isAdmin || selectedTemplate.created_by === userId ? (
                <button
                  type="button"
                  className="rounded-lg border border-black/10 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60"
                  disabled={isSaving}
                  onClick={async () => {
                    setIsSaving(true);
                    setError(null);
                    try {
                      const now = new Date().toISOString();
                      const { error: updateError } = await supabase
                        .from("milestone_templates")
                        .update({ is_public: !selectedTemplate.is_public, updated_at: now, updated_by: userId })
                        .eq("id", selectedTemplate.id);
                      if (updateError) throw updateError;
                      setTemplates((prev) =>
                        prev.map((t) => (t.id === selectedTemplate.id ? { ...t, is_public: !t.is_public } : t)),
                      );
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Failed to update template.");
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                >
                  {selectedTemplate.is_public ? "Make private" : "Make public"}
                </button>
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-zinc-600">Select a template to view items.</div>
          )}
        </div>

        {selectedTemplate && (isAdmin || selectedTemplate.created_by === userId) ? (
          <form
            className="grid gap-3 border-t border-black/5 px-6 py-5 md:grid-cols-6"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!selectedTemplateId) return;
              const pct = itemPercent.trim() ? Number(itemPercent) : null;
              if (!itemName.trim()) {
                setError("Item name is required.");
                return;
              }
              if (pct !== null && (!Number.isFinite(pct) || pct <= 0 || pct > 100)) {
                setError("Recommended percent must be between 0 and 100.");
                return;
              }
              setIsSaving(true);
              setError(null);
              try {
                const now = new Date().toISOString();
                const nextSequence = items.length === 0 ? 1 : items[items.length - 1].sequence + 1;
                const { data, error: insertError } = await supabase
                  .from("milestone_template_items")
                  .insert({
                    template_id: selectedTemplateId,
                    sequence: nextSequence,
                    name: itemName.trim(),
                    description: itemDescription.trim() ? itemDescription.trim() : null,
                    recommended_percent: pct,
                    updated_at: now,
                    updated_by: userId,
                  })
                  .select("id,template_id,sequence,name,description,recommended_percent")
                  .single();
                if (insertError) throw insertError;
                setItems((prev) => [...prev, data as TemplateItemRow]);
                setItemName("");
                setItemDescription("");
                setItemPercent("");
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to add template item.");
              } finally {
                setIsSaving(false);
              }
            }}
          >
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium">Name</label>
              <input
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                disabled={isSaving}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium">Description</label>
              <input
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                disabled={isSaving}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Recommended %</label>
              <input
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                value={itemPercent}
                onChange={(e) => setItemPercent(e.target.value)}
                inputMode="decimal"
                disabled={isSaving}
                placeholder="e.g. 20"
              />
            </div>
            <div className="flex items-end justify-end">
              <button
                type="submit"
                className="w-full rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                disabled={isSaving || !itemName.trim()}
              >
                Add item
              </button>
            </div>
          </form>
        ) : null}

        <div className="divide-y divide-black/5">
          {items.map((i) => (
            <div key={i.id} className="px-6 py-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold">
                    {i.sequence}. {i.name}
                  </div>
                  <div className="mt-1 text-xs text-zinc-600">
                    {typeof i.recommended_percent === "number" ? `${i.recommended_percent.toFixed(2)}%` : "—"}
                  </div>
                  {i.description ? <div className="mt-2 text-sm text-zinc-700">{i.description}</div> : null}
                </div>
              </div>
            </div>
          ))}
          {selectedTemplate && items.length === 0 ? (
            <div className="px-6 py-10 text-sm text-zinc-600">No items yet.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

