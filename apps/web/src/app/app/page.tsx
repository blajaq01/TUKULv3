"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase/client";

function getRoleLabel(profile: { is_contractor: boolean; is_admin: boolean } | null) {
  if (profile?.is_admin) return "Superadmin";
  return profile?.is_contractor ? "Contractor" : "Property owner";
}

type NotificationSettingsRow = {
  user_id: string;
  in_app_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
};

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [settings, setSettings] = useState<NotificationSettingsRow | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from("user_notification_settings")
        .select("user_id,in_app_enabled,email_enabled,sms_enabled")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .maybeSingle();
      if (!isMounted) return;
      if (error) throw error;
      if (data) {
        setSettings(data as NotificationSettingsRow);
      } else {
        setSettings({
          user_id: user.id,
          in_app_enabled: true,
          email_enabled: true,
          sms_enabled: false,
        });
      }
    };

    run()
      .catch((e) => {
        if (!isMounted) return;
        setSettingsError(e instanceof Error ? e.message : "Failed to load notification settings.");
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoadingSettings(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-black/5 bg-white p-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-600">
            Signed in as {user?.email} • {getRoleLabel(profile)}
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/app/projects"
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Browse projects
          </Link>
          <Link
            href="/app/notifications"
            className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Notifications
          </Link>
          <Link
            href="/app/projects/new"
            className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Post a project
          </Link>
          <Link
            href="/app/templates"
            className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Templates
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-black/5 bg-white p-6">
        <h2 className="text-sm font-semibold">Notification preferences</h2>
        <p className="mt-2 text-sm text-zinc-600">
          In-app notifications are always stored. Email/SMS creates delivery jobs in the outbox.
        </p>

        {settingsError ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {settingsError}
          </div>
        ) : null}

        {settings ? (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {(
              [
                ["in_app_enabled", "In-app", "Shows in your Notifications page."],
                ["email_enabled", "Email", "Creates an email job in the notification outbox."],
                ["sms_enabled", "SMS", "Creates an SMS job in the notification outbox (requires phone number)."],
              ] as const
            ).map(([key, label, help]) => (
              <label key={key} className="flex items-start gap-3 rounded-xl border border-black/10 bg-white p-4">
                <input
                  type="checkbox"
                  checked={settings[key]}
                  disabled={isLoadingSettings || isSavingSettings}
                  onChange={(e) => setSettings((prev) => (prev ? { ...prev, [key]: e.target.checked } : prev))}
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium">{label}</div>
                  <div className="mt-1 text-xs text-zinc-600">{help}</div>
                </div>
              </label>
            ))}
          </div>
        ) : null}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
            disabled={isLoadingSettings || isSavingSettings || !settings}
            onClick={async () => {
              if (!user?.id || !settings) return;
              setIsSavingSettings(true);
              setSettingsError(null);
              try {
                const now = new Date().toISOString();
                const { error } = await supabase.from("user_notification_settings").upsert({
                  user_id: user.id,
                  in_app_enabled: settings.in_app_enabled,
                  email_enabled: settings.email_enabled,
                  sms_enabled: settings.sms_enabled,
                  updated_at: now,
                  updated_by: user.id,
                });
                if (error) throw error;
              } catch (e) {
                setSettingsError(e instanceof Error ? e.message : "Failed to save notification settings.");
              } finally {
                setIsSavingSettings(false);
              }
            }}
          >
            Save preferences
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-black/5 bg-white p-6">
          <h2 className="text-sm font-semibold">Trust-first workflow</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Projects move from bidding → contract → milestones → escrow releases after approval.
          </p>
        </div>
        <div className="rounded-2xl border border-black/5 bg-white p-6">
          <h2 className="text-sm font-semibold">Verification</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Contractor onboarding is designed around CIDB/SSM and document-backed profiles.
          </p>
        </div>
      </div>
    </div>
  );
}
