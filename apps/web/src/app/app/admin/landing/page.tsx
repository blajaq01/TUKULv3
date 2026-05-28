"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase/client";

type LandingContent = {
  hero: {
    headline: string;
    subheadline: string;
    primaryCtaLabel: string;
    primaryCtaHref: string;
    secondaryCtaLabel: string;
    secondaryCtaHref: string;
    backgroundUrl: string;
    mockupUrl: string;
    videoUrl: string;
    videoPosterUrl: string;
    steps: string[];
  };
  trust: {
    verifiedContractors: string;
    completedProjects: string;
    ownersServed: string;
    projectValueProcessed: string;
    rating: string;
  };
  sections: {
    howItWorksMediaUrl: string;
    marketplaceMediaUrl: string;
    contractorMediaUrl: string;
  };
};

const defaultContent: LandingContent = {
  hero: {
    headline: "Construction projects, finally simplified.",
    subheadline:
      "A modern marketplace built for property owners and contractors—verified profiles, transparent bidding, and milestone approvals with escrow-style releases.",
    primaryCtaLabel: "Start your project",
    primaryCtaHref: "/auth",
    secondaryCtaLabel: "Explore the marketplace",
    secondaryCtaHref: "#marketplace",
    backgroundUrl: "",
    mockupUrl: "",
    videoUrl: "",
    videoPosterUrl: "",
    steps: ["Post project", "Receive bids", "Compare", "Approve milestones", "Release payments"],
  },
  trust: {
    verifiedContractors: "—",
    completedProjects: "—",
    ownersServed: "—",
    projectValueProcessed: "—",
    rating: "—",
  },
  sections: {
    howItWorksMediaUrl: "",
    marketplaceMediaUrl: "",
    contractorMediaUrl: "",
  },
};

function isLandingContent(value: unknown): value is LandingContent {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<LandingContent>;
  return Boolean(v.hero && v.trust && v.sections);
}

async function uploadLandingAsset(args: {
  file: File;
  path: string;
}): Promise<{ publicUrl: string }> {
  const { file, path } = args;
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const token = sessionData.session?.access_token ?? "";
  if (!token) throw new Error("Not signed in.");

  const form = new FormData();
  form.set("file", file);
  form.set("path", path);

  const res = await fetch("/api/landing/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const json = (await res.json()) as { publicUrl?: string; error?: string };
  if (!res.ok) throw new Error(json.error || "Upload failed.");
  const publicUrl = (json.publicUrl ?? "").trim();
  if (!publicUrl) throw new Error("Upload succeeded but no URL returned.");
  return { publicUrl };
}

export default function AdminLandingPage() {
  const { user, profile, permissions } = useAuth();
  const canManage = Boolean(profile?.is_admin || permissions.includes("landing.manage"));

  const [content, setContent] = useState<LandingContent>(defaultContent);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!canManage) return;

    const run = async () => {
      const { data, error: loadError } = await supabase
        .from("site_content")
        .select("value")
        .eq("key", "landing")
        .maybeSingle();
      if (!isMounted) return;
      if (loadError) throw loadError;
      const value = data?.value;
      if (isLandingContent(value)) {
        setContent({
          hero: { ...defaultContent.hero, ...(value.hero ?? {}) },
          trust: { ...defaultContent.trust, ...(value.trust ?? {}) },
          sections: { ...defaultContent.sections, ...(value.sections ?? {}) },
        });
      } else {
        setContent(defaultContent);
      }
    };

    run()
      .catch((e) => {
        if (!isMounted) return;
        setError(e instanceof Error ? e.message : "Failed to load landing settings.");
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [canManage]);

  const generationPrompts = useMemo(
    () => ({
      heroVideo:
        "Generate a premium SaaS-style hero video for a construction marketplace platform. Calm, modern, minimalist enterprise UI. Scene: property owner posts a structured scope (photos + categories), contractors submit bids, owner compares bids, milestone approvals, escrow-style release. Clean typography, soft off-white background, single deep construction green accent. Cinematic but subtle, no busy motion. 8–12 seconds, loopable, 16:9.",
      heroBackground:
        "Photorealistic background image: modern Malaysian house exterior / renovation setting. Soft morning light, warm neutral tones. Slight haze. Clean composition with lots of negative space on the left for marketing text. No busy clutter. 16:9.",
      heroMockup:
        "Generate a premium SaaS product mockup image (not a screenshot) for a construction project workflow: project scope card with photos and categories, bids list with ratings and pricing, milestones with approval states, escrow payment card. Floating layered cards, rounded corners, subtle shadows, calm off-white UI, deep muted green accent only. 16:9 or wide aspect.",
      howItWorksImage:
        "Photorealistic image: modern Malaysian residential renovation site. Warm, authentic, professional. Contractor and property owner reviewing plans/tablet. Clean composition, shallow depth of field, natural light. Avoid cheesy stock look. 16:9, premium tone.",
      contractorImage:
        "Photorealistic image: verified contractor portrait at a clean worksite, modern building background. Confident and trustworthy vibe, subtle smile, professional attire, safety context without heavy PPE focus. Minimal background clutter. 4:3 or 3:4.",
    }),
    [],
  );

  if (!user?.id) return null;
  if (!canManage) return null;

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Landing page</h1>
        <p className="text-sm text-zinc-600">
          Upload hero media, adjust trust metrics, and keep the landing page premium and calm.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {notice}
        </div>
      ) : null}

      <div className="rounded-2xl border border-black/5 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Hero content</h2>
          <button
            type="button"
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
            disabled={isLoading || isSaving}
            onClick={async () => {
              setError(null);
              setNotice(null);
              setIsSaving(true);
              try {
                const { error: saveError } = await supabase.from("site_content").upsert({
                  key: "landing",
                  value: content,
                  updated_by: user.id,
                });
                if (saveError) throw saveError;
                setNotice("Saved.");
              } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to save landing settings.");
              } finally {
                setIsSaving(false);
              }
            }}
          >
            Save changes
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Headline</label>
            <input
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
              value={content.hero.headline}
              onChange={(e) =>
                setContent((c) => ({ ...c, hero: { ...c.hero, headline: e.target.value } }))
              }
              disabled={isLoading || isSaving}
            />
            <div className="text-xs text-zinc-500">
              Tip: wrap the emphasized phrase with {"{ }"} to highlight it in green.
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Primary CTA</label>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                value={content.hero.primaryCtaLabel}
                onChange={(e) =>
                  setContent((c) => ({
                    ...c,
                    hero: { ...c.hero, primaryCtaLabel: e.target.value },
                  }))
                }
                disabled={isLoading || isSaving}
                placeholder="Start your project"
              />
              <input
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                value={content.hero.primaryCtaHref}
                onChange={(e) =>
                  setContent((c) => ({
                    ...c,
                    hero: { ...c.hero, primaryCtaHref: e.target.value },
                  }))
                }
                disabled={isLoading || isSaving}
                placeholder="/auth"
              />
            </div>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">Subheadline</label>
            <textarea
              className="min-h-[92px] w-full resize-y rounded-lg border border-black/10 px-3 py-2 text-sm leading-6 outline-none focus:border-black/30 disabled:bg-zinc-50"
              value={content.hero.subheadline}
              onChange={(e) =>
                setContent((c) => ({ ...c, hero: { ...c.hero, subheadline: e.target.value } }))
              }
              disabled={isLoading || isSaving}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Secondary CTA</label>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                value={content.hero.secondaryCtaLabel}
                onChange={(e) =>
                  setContent((c) => ({
                    ...c,
                    hero: { ...c.hero, secondaryCtaLabel: e.target.value },
                  }))
                }
                disabled={isLoading || isSaving}
              />
              <input
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                value={content.hero.secondaryCtaHref}
                onChange={(e) =>
                  setContent((c) => ({
                    ...c,
                    hero: { ...c.hero, secondaryCtaHref: e.target.value },
                  }))
                }
                disabled={isLoading || isSaving}
              />
            </div>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">Workflow steps (5)</label>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, idx) => (
                <input
                  key={idx}
                  className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                  value={content.hero.steps[idx] ?? ""}
                  onChange={(e) =>
                    setContent((c) => {
                      const next = [...(c.hero.steps ?? [])];
                      next[idx] = e.target.value;
                      return { ...c, hero: { ...c.hero, steps: next } };
                    })
                  }
                  disabled={isLoading || isSaving}
                  placeholder={`Step ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-black/5 bg-zinc-50 p-4">
            <div className="text-sm font-semibold">Hero background image</div>
            <div className="mt-2 text-sm text-zinc-600">
              Upload a calm architectural background. It will be blurred and softened behind the hero.
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={isLoading || isSaving}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setError(null);
                  setNotice(null);
                  setIsSaving(true);
                  try {
                    const { publicUrl } = await uploadLandingAsset({ file, path: "hero/background" });
                    setContent((c) => ({ ...c, hero: { ...c.hero, backgroundUrl: publicUrl } }));
                    setNotice("Background uploaded. Save changes to publish.");
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Upload failed.");
                  } finally {
                    setIsSaving(false);
                    e.target.value = "";
                  }
                }}
              />
              <button
                type="button"
                className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60"
                disabled={isLoading || isSaving}
                onClick={() => {
                  navigator.clipboard?.writeText(generationPrompts.heroBackground).catch(() => {});
                  setNotice("Background prompt copied.");
                }}
              >
                Copy AI prompt
              </button>
            </div>
            {content.hero.backgroundUrl ? (
              <img
                className="mt-4 w-full rounded-xl border border-black/5 bg-white"
                src={content.hero.backgroundUrl}
                alt="Hero background preview"
                loading="lazy"
              />
            ) : null}
          </div>

          <div className="rounded-xl border border-black/5 bg-zinc-50 p-4">
            <div className="text-sm font-semibold">Hero workflow mockup (image)</div>
            <div className="mt-2 text-sm text-zinc-600">
              Upload a wide product-workflow mockup image with floating cards.
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={isLoading || isSaving}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setError(null);
                  setNotice(null);
                  setIsSaving(true);
                  try {
                    const { publicUrl } = await uploadLandingAsset({ file, path: "hero/mockup" });
                    setContent((c) => ({ ...c, hero: { ...c.hero, mockupUrl: publicUrl } }));
                    setNotice("Mockup uploaded. Save changes to publish.");
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Upload failed.");
                  } finally {
                    setIsSaving(false);
                    e.target.value = "";
                  }
                }}
              />
              <button
                type="button"
                className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60"
                disabled={isLoading || isSaving}
                onClick={() => {
                  navigator.clipboard?.writeText(generationPrompts.heroMockup).catch(() => {});
                  setNotice("Mockup prompt copied.");
                }}
              >
                Copy AI prompt
              </button>
            </div>
            {content.hero.mockupUrl ? (
              <img
                className="mt-4 w-full rounded-xl border border-black/5 bg-white"
                src={content.hero.mockupUrl}
                alt="Hero mockup preview"
                loading="lazy"
              />
            ) : null}
          </div>

          <div className="rounded-xl border border-black/5 bg-zinc-50 p-4">
            <div className="text-sm font-semibold">Hero video</div>
            <div className="mt-2 text-sm text-zinc-600">
              Upload an MP4 (recommended 8–12s, loopable, 16:9).
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="file"
                accept="video/mp4,video/webm"
                disabled={isLoading || isSaving}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setError(null);
                  setNotice(null);
                  setIsSaving(true);
                  try {
                    const { publicUrl } = await uploadLandingAsset({ file, path: "hero/video" });
                    setContent((c) => ({ ...c, hero: { ...c.hero, videoUrl: publicUrl } }));
                    setNotice("Video uploaded. Save changes to publish.");
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Upload failed.");
                  } finally {
                    setIsSaving(false);
                    e.target.value = "";
                  }
                }}
              />
              <button
                type="button"
                className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60"
                disabled={isLoading || isSaving}
                onClick={() => {
                  navigator.clipboard?.writeText(generationPrompts.heroVideo).catch(() => {});
                  setNotice("Hero video prompt copied.");
                }}
              >
                Copy AI prompt
              </button>
            </div>
            {content.hero.videoUrl ? (
              <video
                className="mt-4 w-full rounded-xl border border-black/5 bg-black"
                src={content.hero.videoUrl}
                poster={content.hero.videoPosterUrl || undefined}
                controls
              />
            ) : null}
          </div>

          <div className="rounded-xl border border-black/5 bg-zinc-50 p-4">
            <div className="text-sm font-semibold">Hero poster</div>
            <div className="mt-2 text-sm text-zinc-600">
              Optional poster image for faster initial load.
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={isLoading || isSaving}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setError(null);
                  setNotice(null);
                  setIsSaving(true);
                  try {
                    const { publicUrl } = await uploadLandingAsset({
                      file,
                      path: "hero/poster",
                    });
                    setContent((c) => ({ ...c, hero: { ...c.hero, videoPosterUrl: publicUrl } }));
                    setNotice("Poster uploaded. Save changes to publish.");
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Upload failed.");
                  } finally {
                    setIsSaving(false);
                    e.target.value = "";
                  }
                }}
              />
              <button
                type="button"
                className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60"
                disabled={isLoading || isSaving}
                onClick={() => {
                  navigator.clipboard?.writeText(generationPrompts.howItWorksImage).catch(() => {});
                  setNotice("Image prompt copied.");
                }}
              >
                Copy AI prompt
              </button>
            </div>
            {content.hero.videoPosterUrl ? (
              <img
                className="mt-4 w-full rounded-xl border border-black/5 bg-white"
                src={content.hero.videoPosterUrl}
                alt="Hero poster preview"
                loading="lazy"
              />
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-black/5 bg-white p-6">
        <h2 className="text-sm font-semibold">Trust metrics</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { key: "verifiedContractors", label: "Verified contractors" },
            { key: "completedProjects", label: "Completed projects" },
            { key: "ownersServed", label: "Owners served" },
            { key: "projectValueProcessed", label: "Project value processed" },
            { key: "rating", label: "Review ratings" },
          ].map((item) => (
            <div key={item.key} className="space-y-1.5">
              <label className="text-sm font-medium">{item.label}</label>
              <input
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 disabled:bg-zinc-50"
                value={content.trust[item.key as keyof LandingContent["trust"]]}
                onChange={(e) =>
                  setContent((c) => ({
                    ...c,
                    trust: { ...c.trust, [item.key]: e.target.value },
                  }))
                }
                disabled={isLoading || isSaving}
                placeholder="e.g. 1,250+"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-black/5 bg-white p-6">
        <h2 className="text-sm font-semibold">Section media (optional)</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Upload images that match the calm premium style. These appear as media blocks inside
          sections.
        </p>

        <div className="mt-5 grid gap-6 lg:grid-cols-3">
          {[
            {
              label: "How it works",
              key: "howItWorksMediaUrl",
              prompt: generationPrompts.howItWorksImage,
            },
            {
              label: "Marketplace",
              key: "marketplaceMediaUrl",
              prompt: generationPrompts.howItWorksImage,
            },
            {
              label: "Contractors",
              key: "contractorMediaUrl",
              prompt: generationPrompts.contractorImage,
            },
          ].map((i) => (
            <div key={i.key} className="rounded-xl border border-black/5 bg-zinc-50 p-4">
              <div className="text-sm font-semibold">{i.label}</div>
              <div className="mt-3 flex flex-col gap-3">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={isLoading || isSaving}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setError(null);
                    setNotice(null);
                    setIsSaving(true);
                    try {
                      const { publicUrl } = await uploadLandingAsset({
                        file,
                        path: `sections/${i.key}`,
                      });
                      setContent((c) => ({
                        ...c,
                        sections: { ...c.sections, [i.key]: publicUrl },
                      }));
                      setNotice("Image uploaded. Save changes to publish.");
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Upload failed.");
                    } finally {
                      setIsSaving(false);
                      e.target.value = "";
                    }
                  }}
                />
                <button
                  type="button"
                  className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60"
                  disabled={isLoading || isSaving}
                  onClick={() => {
                    navigator.clipboard?.writeText(i.prompt).catch(() => {});
                    setNotice("AI prompt copied.");
                  }}
                >
                  Copy AI prompt
                </button>
              </div>
              {content.sections[i.key as keyof LandingContent["sections"]] ? (
                <img
                  className="mt-4 w-full rounded-xl border border-black/5 bg-white"
                  src={content.sections[i.key as keyof LandingContent["sections"]]}
                  alt={`${i.label} media preview`}
                  loading="lazy"
                />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
