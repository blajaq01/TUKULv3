"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase/client";

type OutboxRow = {
  id: number;
  notification_id: string;
  recipient_id: string;
  channel: "email" | "sms";
  to_address: string;
  status: "pending" | "sent" | "failed";
  last_error: string | null;
  created_at: string;
  sent_at: string | null;
};

export default function AdminOutboxPage() {
  const { user, profile, permissions } = useAuth();
  if (!user?.id) return null;
  if (!profile?.is_admin && !permissions.includes("notifications.outbox.read")) return null;
  return <OutboxLoader />;
}

function OutboxLoader() {
  const [rows, setRows] = useState<OutboxRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      const { data, error: listError } = await supabase
        .from("notification_outbox")
        .select("id,notification_id,recipient_id,channel,to_address,status,last_error,created_at,sent_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (!isMounted) return;
      if (listError) throw listError;
      setRows((data ?? []) as OutboxRow[]);
    };

    run()
      .catch((e) => {
        if (!isMounted) return;
        setError(e instanceof Error ? e.message : "Failed to load outbox.");
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Notification outbox</h1>
        <p className="text-sm text-zinc-600">Email/SMS jobs created from in-app notifications.</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="rounded-2xl border border-black/5 bg-white">
        <div className="border-b border-black/5 px-6 py-4 text-sm font-medium text-zinc-700">
          {isLoading ? "Loading…" : `${rows.length} job(s)`}
        </div>
        <div className="divide-y divide-black/5">
          {rows.map((r) => (
            <div key={r.id} className="px-6 py-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold">
                    {r.channel} • {r.status} • {r.to_address}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {new Date(r.created_at).toLocaleString()} • recipient {r.recipient_id}
                  </div>
                  {r.last_error ? (
                    <div className="mt-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-700">{r.last_error}</div>
                  ) : null}
                </div>
                <div className="text-xs text-zinc-500">#{r.id}</div>
              </div>
            </div>
          ))}
          {!isLoading && rows.length === 0 ? (
            <div className="px-6 py-10 text-sm text-zinc-600">No outbox jobs yet.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
