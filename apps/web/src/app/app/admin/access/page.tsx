"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase/client";

type RoleRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
};

type AssignmentRow = {
  id: string;
  user_id: string;
  role_id: string;
  created_at: string;
  users: { email: string; full_name: string } | null;
  access_roles: { code: string; name: string } | null;
};

export default function AdminAccessPage() {
  const { user, profile } = useAuth();
  if (!user?.id) return null;
  if (!profile?.is_admin) return null;
  return <AdminAccessLoader adminId={user.id} />;
}

function AdminAccessLoader({ adminId }: { adminId: string }) {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roleOptions = useMemo(() => roles.sort((a, b) => a.name.localeCompare(b.name)), [roles]);

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      const { data: rolesData, error: rolesError } = await supabase
        .from("access_roles")
        .select("id,code,name,description")
        .is("deleted_at", null)
        .order("name", { ascending: true })
        .limit(200);
      if (!isMounted) return;
      if (rolesError) throw rolesError;
      const nextRoles = (rolesData ?? []) as RoleRow[];
      setRoles(nextRoles);
      setRoleId((prev) => prev || nextRoles[0]?.id || "");

      const { data: assignmentData, error: assignmentError } = await supabase
        .from("user_role_assignments")
        .select("id,user_id,role_id,created_at,users(email,full_name),access_roles(code,name)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(200);
      if (!isMounted) return;
      if (assignmentError) throw assignmentError;
      setAssignments((assignmentData ?? []) as AssignmentRow[]);
    };

    run()
      .catch((e) => {
        if (!isMounted) return;
        setError(e instanceof Error ? e.message : "Failed to load access controls.");
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
        <h1 className="text-xl font-semibold tracking-tight">Access control</h1>
        <p className="text-sm text-zinc-600">Assign roles to staff accounts (Superadmin can do everything).</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="rounded-2xl border border-black/5 bg-white p-6">
        <h2 className="text-sm font-semibold">Assign role</h2>
        <form
          className="mt-4 grid gap-3 md:grid-cols-6"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            const trimmed = email.trim().toLowerCase();
            if (!trimmed) return;
            if (!roleId) return;
            setIsSaving(true);
            try {
              const { data: userRow, error: userError } = await supabase
                .from("users")
                .select("id,email,full_name")
                .eq("email", trimmed)
                .is("deleted_at", null)
                .maybeSingle();
              if (userError) throw userError;
              if (!userRow?.id) {
                throw new Error("No user found with that email.");
              }

              const { data: inserted, error: insertError } = await supabase
                .from("user_role_assignments")
                .upsert({
                  user_id: userRow.id,
                  role_id: roleId,
                  created_by: adminId,
                })
                .select("id,user_id,role_id,created_at,users(email,full_name),access_roles(code,name)")
                .single();
              if (insertError) throw insertError;
              setAssignments((prev) => [inserted as AssignmentRow, ...prev]);
              setEmail("");
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to assign role.");
            } finally {
              setIsSaving(false);
            }
          }}
        >
          <div className="space-y-1.5 md:col-span-3">
            <label className="text-sm font-medium">User email</label>
            <input
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@example.com"
              disabled={isLoading || isSaving}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">Role</label>
            <select
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              disabled={isLoading || isSaving}
            >
              {roleOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end justify-end md:col-span-1">
            <button
              type="submit"
              className="w-full rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
              disabled={isLoading || isSaving || !email.trim() || !roleId}
            >
              Assign
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-black/5 bg-white">
        <div className="border-b border-black/5 px-6 py-4 text-sm font-medium text-zinc-700">
          {isLoading ? "Loading…" : `${assignments.length} assignment(s)`}
        </div>
        <div className="divide-y divide-black/5">
          {assignments.map((a) => (
            <div key={a.id} className="px-6 py-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold">
                    {a.users?.full_name ?? a.users?.email ?? a.user_id}
                  </div>
                  <div className="mt-1 text-xs text-zinc-600">
                    {a.users?.email ?? "—"} • {a.access_roles?.name ?? a.role_id}
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-lg border border-black/10 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-60"
                  disabled={isSaving}
                  onClick={async () => {
                    setIsSaving(true);
                    setError(null);
                    try {
                      const { error: delError } = await supabase.from("user_role_assignments").delete().eq("id", a.id);
                      if (delError) throw delError;
                      setAssignments((prev) => prev.filter((x) => x.id !== a.id));
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Failed to remove assignment.");
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          {!isLoading && assignments.length === 0 ? (
            <div className="px-6 py-10 text-sm text-zinc-600">No assignments yet.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

