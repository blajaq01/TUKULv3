"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase/client";

type IntegrationRow = {
  id: string;
  integration_type: "payment_gateway" | "email_provider" | "sms_provider";
  provider: string;
  config: Record<string, unknown>;
  is_active: boolean;
  updated_at: string | null;
};

export default function AdminIntegrationsPage() {
  const { user, profile } = useAuth();
  if (!user?.id) return null;
  if (!profile?.is_admin) return null;
  return <AdminIntegrationsLoader userId={user.id} />;
}

function AdminIntegrationsLoader({ userId }: { userId: string }) {
  const [rows, setRows] = useState<IntegrationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<IntegrationRow["integration_type"]>("payment_gateway");
  const [provider, setProvider] = useState("placeholder");
  const [isActive, setIsActive] = useState(false);

  const [paymentPublicKey, setPaymentPublicKey] = useState("");
  const [paymentSecretKey, setPaymentSecretKey] = useState("");
  const [paymentWebhookSecret, setPaymentWebhookSecret] = useState("");
  const [paymentMerchantId, setPaymentMerchantId] = useState("");
  const [paymentSandboxMode, setPaymentSandboxMode] = useState(true);

  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [fromEmail, setFromEmail] = useState("");

  const [smsAccountSid, setSmsAccountSid] = useState("");
  const [smsAuthToken, setSmsAuthToken] = useState("");
  const [smsFrom, setSmsFrom] = useState("");

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      const { data, error: listError } = await supabase
        .from("platform_integrations")
        .select("id,integration_type,provider,config,is_active,updated_at")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(200);
      if (!isMounted) return;
      if (listError) throw listError;
      setRows((data ?? []) as IntegrationRow[]);
    };

    run()
      .catch((e) => {
        if (!isMounted) return;
        setError(e instanceof Error ? e.message : "Failed to load integrations.");
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  function applySelection(nextType: IntegrationRow["integration_type"], nextProvider: string) {
    const row = rows.find((r) => r.integration_type === nextType && r.provider === nextProvider) ?? null;
    const config = row?.config ?? {};

    setActiveTab(nextType);
    setProvider(nextProvider);
    setIsActive(Boolean(row?.is_active));

    if (nextType === "payment_gateway") {
      setPaymentPublicKey(typeof config.public_key === "string" ? (config.public_key as string) : "");
      setPaymentSecretKey(typeof config.secret_key === "string" ? (config.secret_key as string) : "");
      setPaymentWebhookSecret(typeof config.webhook_secret === "string" ? (config.webhook_secret as string) : "");
      setPaymentMerchantId(typeof config.merchant_id === "string" ? (config.merchant_id as string) : "");
      setPaymentSandboxMode(Boolean(config.sandbox_mode ?? true));
    }

    if (nextType === "email_provider") {
      setSmtpHost(typeof config.smtp_host === "string" ? (config.smtp_host as string) : "");
      setSmtpPort(
        typeof config.smtp_port === "number"
          ? String(config.smtp_port)
          : typeof config.smtp_port === "string"
            ? (config.smtp_port as string)
            : "587",
      );
      setSmtpUser(typeof config.smtp_user === "string" ? (config.smtp_user as string) : "");
      setSmtpPass(typeof config.smtp_pass === "string" ? (config.smtp_pass as string) : "");
      setFromEmail(typeof config.from_email === "string" ? (config.from_email as string) : "");
    }

    if (nextType === "sms_provider") {
      setSmsAccountSid(typeof config.account_sid === "string" ? (config.account_sid as string) : "");
      setSmsAuthToken(typeof config.auth_token === "string" ? (config.auth_token as string) : "");
      setSmsFrom(typeof config.from === "string" ? (config.from as string) : "");
    }
  }

  const providers = useMemo(() => {
    const found = rows
      .filter((r) => r.integration_type === activeTab)
      .map((r) => r.provider);
    const set = new Set(found);
    set.add(provider);
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [activeTab, provider, rows]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-sm text-zinc-600">
          Save provider parameters now, wire up real payment gateway + email/SMS later.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="rounded-2xl border border-black/5 bg-white p-6">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["payment_gateway", "Payment gateway"],
              ["email_provider", "Email provider"],
              ["sms_provider", "SMS provider"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`rounded-lg border px-3 py-2 text-sm ${
                activeTab === key ? "border-black bg-black text-white" : "border-black/10 hover:bg-zinc-50"
              }`}
              disabled={isSaving}
              onClick={() => {
                const firstProvider =
                  rows.find((r) => r.integration_type === key)?.provider ?? provider;
                applySelection(key, firstProvider);
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Provider</label>
            <select
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
              value={provider}
              onChange={(e) => applySelection(activeTab, e.target.value)}
              disabled={isSaving}
            >
              {providers.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              disabled={isSaving}
            />
            Active
          </label>
        </div>

        {activeTab === "payment_gateway" ? (
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Public key</label>
              <input
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                value={paymentPublicKey}
                onChange={(e) => setPaymentPublicKey(e.target.value)}
                disabled={isSaving}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Secret key</label>
              <input
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                value={paymentSecretKey}
                onChange={(e) => setPaymentSecretKey(e.target.value)}
                disabled={isSaving}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Webhook secret</label>
              <input
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                value={paymentWebhookSecret}
                onChange={(e) => setPaymentWebhookSecret(e.target.value)}
                disabled={isSaving}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Merchant ID</label>
              <input
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                value={paymentMerchantId}
                onChange={(e) => setPaymentMerchantId(e.target.value)}
                disabled={isSaving}
              />
            </div>
            <label className="flex items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={paymentSandboxMode}
                onChange={(e) => setPaymentSandboxMode(e.target.checked)}
                disabled={isSaving}
              />
              Sandbox mode
            </label>
          </div>
        ) : null}

        {activeTab === "email_provider" ? (
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">SMTP host</label>
              <input
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                disabled={isSaving}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">SMTP port</label>
              <input
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                inputMode="numeric"
                disabled={isSaving}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">SMTP username</label>
              <input
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                disabled={isSaving}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">SMTP password</label>
              <input
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                disabled={isSaving}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium">From email</label>
              <input
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                disabled={isSaving}
              />
            </div>
          </div>
        ) : null}

        {activeTab === "sms_provider" ? (
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Account SID</label>
              <input
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                value={smsAccountSid}
                onChange={(e) => setSmsAccountSid(e.target.value)}
                disabled={isSaving}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Auth token</label>
              <input
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                value={smsAuthToken}
                onChange={(e) => setSmsAuthToken(e.target.value)}
                disabled={isSaving}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium">From</label>
              <input
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                value={smsFrom}
                onChange={(e) => setSmsFrom(e.target.value)}
                disabled={isSaving}
              />
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="text-xs text-zinc-600">
            Stored in database table platform_integrations. Treat these values as sensitive.
          </div>
          <button
            type="button"
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
            disabled={isLoading || isSaving}
            onClick={async () => {
              setIsSaving(true);
              setError(null);
              try {
                const now = new Date().toISOString();
                let config: Record<string, unknown> = {};
                if (activeTab === "payment_gateway") {
                  config = {
                    public_key: paymentPublicKey.trim() ? paymentPublicKey.trim() : null,
                    secret_key: paymentSecretKey.trim() ? paymentSecretKey.trim() : null,
                    webhook_secret: paymentWebhookSecret.trim() ? paymentWebhookSecret.trim() : null,
                    merchant_id: paymentMerchantId.trim() ? paymentMerchantId.trim() : null,
                    sandbox_mode: paymentSandboxMode,
                  };
                }
                if (activeTab === "email_provider") {
                  config = {
                    smtp_host: smtpHost.trim() ? smtpHost.trim() : null,
                    smtp_port: smtpPort.trim() ? Number(smtpPort) : null,
                    smtp_user: smtpUser.trim() ? smtpUser.trim() : null,
                    smtp_pass: smtpPass.trim() ? smtpPass.trim() : null,
                    from_email: fromEmail.trim() ? fromEmail.trim() : null,
                  };
                }
                if (activeTab === "sms_provider") {
                  config = {
                    account_sid: smsAccountSid.trim() ? smsAccountSid.trim() : null,
                    auth_token: smsAuthToken.trim() ? smsAuthToken.trim() : null,
                    from: smsFrom.trim() ? smsFrom.trim() : null,
                  };
                }

                const { data, error: upsertError } = await supabase
                  .from("platform_integrations")
                  .upsert({
                    integration_type: activeTab,
                    provider,
                    config,
                    is_active: isActive,
                    updated_at: now,
                    updated_by: userId,
                  })
                  .select("id,integration_type,provider,config,is_active,updated_at")
                  .single();
                if (upsertError) throw upsertError;
                const saved = data as IntegrationRow;
                setRows((prev) => {
                  const next = prev.filter((r) => !(r.integration_type === saved.integration_type && r.provider === saved.provider));
                  return [saved, ...next];
                });
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to save integration.");
              } finally {
                setIsSaving(false);
              }
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
