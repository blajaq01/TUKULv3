"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase/client";

type NotificationRow = {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

function getLinkForNotification(n: NotificationRow) {
  const projectId = typeof n.data?.project_id === "string" ? (n.data.project_id as string) : null;
  const contractId =
    typeof n.data?.contract_id === "string" ? (n.data.contract_id as string) : null;

  if (contractId) return `/app/contracts/${contractId}`;
  if (projectId) return `/app/projects/${projectId}`;
  return null;
}

export default function NotificationsPage() {
  const { user, profile } = useAuth();
  const userId = user?.id ?? null;
  const isAdmin = Boolean(profile?.is_admin);

  if (!userId) return null;

  return (
    <NotificationsLoader
      key={`${userId}:${isAdmin ? "a" : "u"}`}
      userId={userId}
      isAdmin={isAdmin}
    />
  );
}

function NotificationsLoader({ userId }: { userId: string; isAdmin: boolean }) {
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      const { data, error: listError } = await supabase
        .from("notifications")
        .select("id,recipient_id,type,title,body,data,read_at,created_at")
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (!isMounted) return;
      if (listError) throw listError;
      setRows((data ?? []) as NotificationRow[]);
    };

    run()
      .catch((e) => {
        if (!isMounted) return;
        setError(e instanceof Error ? e.message : "Failed to load notifications.");
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const unreadCount = useMemo(() => rows.filter((r) => !r.read_at).length, [rows]);

  async function markAllRead() {
    setIsSaving(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("notifications")
        .update({ read_at: now })
        .eq("recipient_id", userId)
        .is("read_at", null);
      if (updateError) throw updateError;
      setRows((prev) => prev.map((r) => (r.read_at ? r : { ...r, read_at: now })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to mark all read.");
    } finally {
      setIsSaving(false);
    }
  }

  async function markRead(id: string) {
    setIsSaving(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("notifications")
        .update({ read_at: now })
        .eq("id", id);
      if (updateError) throw updateError;
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, read_at: now } : r)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to mark read.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-sm text-zinc-600">{unreadCount} unread</p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-black/10 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60"
          disabled={isSaving || unreadCount === 0}
          onClick={markAllRead}
        >
          Mark all read
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-black/5 bg-white">
        <div className="border-b border-black/5 px-6 py-4 text-sm font-medium text-zinc-700">
          {isLoading ? "Loading…" : `${rows.length} notification(s)`}
        </div>
        <div className="divide-y divide-black/5">
          {rows.map((n) => {
            const href = getLinkForNotification(n);
            return (
              <div key={n.id} className="px-6 py-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">
                      {n.read_at ? null : <span className="mr-2 text-xs">NEW</span>}
                      {n.title}
                    </div>
                    {n.body ? <div className="mt-2 text-sm text-zinc-700">{n.body}</div> : null}
                    <div className="mt-2 text-xs text-zinc-500">
                      {new Date(n.created_at).toLocaleString()} • {n.type}
                    </div>
                    {href ? (
                      <div className="mt-2">
                        <Link className="text-sm underline" href={href}>
                          Open
                        </Link>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-black/10 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-60"
                      disabled={isSaving || Boolean(n.read_at)}
                      onClick={() => markRead(n.id)}
                    >
                      Mark read
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {!isLoading && rows.length === 0 ? (
            <div className="px-6 py-10 text-sm text-zinc-600">No notifications yet.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
