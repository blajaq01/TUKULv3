"use client";

import { useMemo, useState } from "react";

type Props = {
  labels: string[];
  imageUrls: string[];
  testimonial: {
    photoUrl: string;
    quote: string;
    authorName: string;
    authorTitle: string;
    projectsFunded: string;
    onTimeRate: string;
    averageRating: string;
  };
};

export function HeroWorkflow({ labels, imageUrls, testimonial }: Props) {
  const normalized = useMemo(() => {
    const fallback = [
      "/landing/hero/step-1.png",
      "/landing/hero/step-2.png",
      "/landing/hero/step-3.png",
      "/landing/hero/step-4.png",
      "/landing/hero/step-5.png",
    ];
    const l =
      labels.length >= 5
        ? labels.slice(0, 5)
        : ["Post scope", "Receive bids", "Compare", "Approve milestones", "Release payments"];
    const urls = imageUrls.length >= 5 ? imageUrls.slice(0, 5) : fallback;
    return { labels: l, urls };
  }, [imageUrls, labels]);

  const [active, setActive] = useState(0);

  const t = useMemo(() => {
    const quote = testimonial.quote?.trim() || "“Tukul made our renovation simple, transparent, and stress-free.”";
    const authorName = testimonial.authorName?.trim() || "Sarah M.";
    const authorTitle = testimonial.authorTitle?.trim() || "Homeowner";
    const projectsFunded = testimonial.projectsFunded?.trim() || "$2.4M+";
    const onTimeRate = testimonial.onTimeRate?.trim() || "98%";
    const averageRating = testimonial.averageRating?.trim() || "4.8★";
    const photoUrl = testimonial.photoUrl?.trim() || "";
    return { quote, authorName, authorTitle, projectsFunded, onTimeRate, averageRating, photoUrl };
  }, [testimonial]);

  return (
    <div className="relative overflow-hidden rounded-[36px] border border-[var(--tukul-border)] bg-[color:color-mix(in_oklab,var(--tukul-surface),transparent_10%)] shadow-[0_40px_120px_rgba(0,0,0,0.10)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,color-mix(in_oklab,var(--tukul-accent),transparent_86%),transparent_58%),radial-gradient(circle_at_85%_10%,rgba(0,0,0,0.06),transparent_58%),linear-gradient(to_bottom,rgba(247,247,245,0.94),rgba(247,247,245,0.54),rgba(247,247,245,0.82))]" />

      <div className="relative p-6 sm:p-8">
        <div className="relative">
          <div className="absolute left-8 right-8 top-[22px] hidden h-px border-t border-dashed border-black/20 sm:block" />
          <div className="grid grid-cols-5 gap-3">
            {normalized.labels.map((label, idx) => {
              const isActive = idx === active;
              return (
                <button
                  key={`${idx}-${label}`}
                  type="button"
                  className="group relative flex flex-col items-center gap-2 text-center"
                  onMouseEnter={() => setActive(idx)}
                  onFocus={() => setActive(idx)}
                >
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full border text-sm font-semibold transition-all ${
                      isActive
                        ? "border-[var(--tukul-accent)] bg-[var(--tukul-accent)] text-white shadow-[0_0_0_8px_color-mix(in_oklab,var(--tukul-accent),transparent_84%)]"
                        : "border-black/20 bg-[color:color-mix(in_oklab,var(--tukul-surface),transparent_6%)] text-[var(--foreground)] group-hover:shadow-[0_0_0_8px_rgba(0,0,0,0.04)]"
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div
                    className={`text-[12px] font-semibold uppercase tracking-wide transition-colors ${
                      isActive ? "text-[var(--foreground)]" : "text-[var(--tukul-muted)]"
                    }`}
                  >
                    {label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid gap-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5 sm:gap-5">
            {normalized.urls.map((url, idx) => {
              const isActive = idx === active;
              return (
                <button
                  key={`${idx}-${url}`}
                  type="button"
                  className={`group relative overflow-hidden rounded-[28px] border bg-white transition-all ${
                    isActive
                      ? "border-[var(--tukul-accent)] shadow-[0_26px_80px_rgba(20,83,45,0.22)]"
                      : "border-[var(--tukul-border)] shadow-[0_18px_60px_rgba(0,0,0,0.10)] hover:shadow-[0_26px_80px_rgba(0,0,0,0.12)]"
                  }`}
                  onMouseEnter={() => setActive(idx)}
                  onFocus={() => setActive(idx)}
                  aria-label={normalized.labels[idx] ?? `Step ${idx + 1}`}
                >
                  <div
                    className={`absolute inset-0 opacity-0 transition-opacity ${
                      isActive ? "opacity-100" : "group-hover:opacity-60"
                    }`}
                    style={{
                      background:
                        "radial-gradient(circle at 30% 20%, rgba(20,83,45,0.22), transparent 55%), radial-gradient(circle at 80% 30%, rgba(20,83,45,0.10), transparent 60%)",
                    }}
                  />
                  <img
                    src={url}
                    alt={normalized.labels[idx] ?? `Step ${idx + 1}`}
                    className={`relative h-auto w-full object-cover transition-transform duration-200 ease-out ${
                      isActive ? "scale-[1.01]" : "group-hover:scale-[1.01]"
                    }`}
                    loading="lazy"
                  />
                </button>
              );
            })}
          </div>

          <div className="rounded-[28px] border border-[var(--tukul-border)] bg-[color:color-mix(in_oklab,var(--tukul-surface),transparent_6%)] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.08)] sm:p-6">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)_minmax(0,0.85fr)] lg:items-center">
              <div className="overflow-hidden rounded-2xl border border-[var(--tukul-border)] bg-[var(--tukul-surface)]">
                {t.photoUrl ? (
                  <img
                    src={t.photoUrl}
                    alt="Project photo"
                    className="aspect-[16/10] w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="aspect-[16/10] w-full bg-[linear-gradient(to_bottom,rgba(0,0,0,0.06),rgba(0,0,0,0.02))]" />
                )}
              </div>

              <div className="px-1">
                <div className="text-[15px] leading-7 text-[var(--foreground)]">
                  {t.quote}
                </div>
                <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-[var(--tukul-muted)]">
                  {t.authorName} • {t.authorTitle}
                </div>
              </div>

              <div className="grid gap-2">
                {[
                  {
                    label: "Projects funded",
                    value: t.projectsFunded,
                    icon: (
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                        <path
                          d="M7 10V8a5 5 0 0 1 10 0v2"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                        <path
                          d="M6 10h12v10H6V10Z"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ),
                  },
                  {
                    label: "On-time milestone rate",
                    value: t.onTimeRate,
                    icon: (
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                        <path
                          d="M12 22a10 10 0 1 0-10-10 10 10 0 0 0 10 10Z"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        />
                        <path
                          d="m8 12 2.5 2.5L16 9"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ),
                  },
                  {
                    label: "Average contractor rating",
                    value: t.averageRating,
                    icon: (
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                        <path
                          d="m12 3 2.6 5.4 6 .9-4.3 4.2 1 6-5.3-2.8-5.3 2.8 1-6L3.4 9.3l6-.9L12 3Z"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ),
                  },
                ].map((m) => (
                  <div
                    key={m.label}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--tukul-border)] bg-[var(--tukul-surface)] px-4 py-3"
                  >
                    <div className="flex items-center gap-2 text-[var(--tukul-accent)]">
                      {m.icon}
                      <div className="text-xs text-[var(--tukul-muted)]">{m.label}</div>
                    </div>
                    <div className="text-sm font-semibold text-[var(--foreground)]">{m.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
