import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { Faq } from "@/components/landing/Faq";
import { HeroWorkflow } from "@/components/landing/HeroWorkflow";
import { LandingNav } from "@/components/landing/LandingNav";
import { Reveal } from "@/components/landing/Reveal";
import { supabase } from "@/lib/supabase/client";

type LandingContent = {
  hero?: {
    headline?: string;
    subheadline?: string;
    primaryCtaLabel?: string;
    primaryCtaHref?: string;
    secondaryCtaLabel?: string;
    secondaryCtaHref?: string;
    backgroundUrl?: string;
    mockupUrl?: string;
    videoUrl?: string;
    videoPosterUrl?: string;
    steps?: string[];
    stepImageUrls?: string[];
    testimonialPhotoUrl?: string;
    testimonialQuote?: string;
    testimonialAuthorName?: string;
    testimonialAuthorTitle?: string;
    testimonialProjectsFunded?: string;
    testimonialOnTimeRate?: string;
    testimonialAverageRating?: string;
  };
  trust?: {
    verifiedContractors?: string;
    completedProjects?: string;
    ownersServed?: string;
    projectValueProcessed?: string;
    rating?: string;
  };
  sections?: {
    howItWorksMediaUrl?: string;
    marketplaceMediaUrl?: string;
    contractorMediaUrl?: string;
  };
};

async function getLandingContent(): Promise<LandingContent> {
  try {
    const { data, error } = await supabase
      .from("site_content")
      .select("value")
      .eq("key", "landing")
      .maybeSingle();
    if (error) return {};
    return (data?.value as LandingContent) ?? {};
  } catch {
    return {};
  }
}

export default async function Home() {
  const content = await getLandingContent();
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--background)] text-[var(--foreground)]">
      <LandingNav />

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <LandingHeroBackground content={content} />
          <div className="mx-auto w-full max-w-7xl px-6 pt-14 sm:pt-16 md:pt-20 lg:pt-24 xl:max-w-[86rem]">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.28fr)] lg:items-center">
              <Reveal className="lg:pr-6 xl:pr-10">
                <LandingHero content={content} />
              </Reveal>
              <Reveal delayMs={90} className="lg:pl-6 xl:pl-10">
                <LandingHeroWorkflow content={content} />
              </Reveal>
            </div>
            <Reveal delayMs={170} className="pb-16 md:pb-20">
              <LandingTrust content={content} />
            </Reveal>
          </div>
        </section>

        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="h-px w-full bg-[var(--tukul-border)]" />
        </div>

        <LandingSections content={content} />

        <section className="mx-auto w-full max-w-6xl px-6 pb-24 md:pb-32">
          <Reveal>
            <div className="rounded-[40px] border border-[var(--tukul-border)] bg-[var(--tukul-surface)] p-8 shadow-[0_28px_80px_rgba(0,0,0,0.08)] sm:p-12">
              <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
                <div>
                  <h2 className="text-pretty text-3xl font-semibold tracking-tight leading-[1.05] sm:text-4xl">
                    Ready to start a calmer construction project?
                  </h2>
                  <p className="mt-4 text-pretty text-[17px] leading-8 text-[var(--tukul-muted)]">
                    Post a scope, compare verified bids, and run milestones with clear approvals.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
                  <Link
                    href="/auth"
                    className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--tukul-accent)] px-7 text-base font-semibold text-white"
                  >
                    Get started
                  </Link>
                  <Link
                    href="/app"
                    className="inline-flex h-12 items-center justify-center rounded-full border border-[var(--tukul-border)] bg-[var(--tukul-surface-2)] px-7 text-base font-semibold text-[var(--foreground)]"
                  >
                    Open dashboard
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 pb-24 md:pb-32">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center rounded-full border border-[var(--tukul-border)] bg-[var(--tukul-surface)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--tukul-muted)]">
                FAQ
              </div>
              <h2 className="mt-5 text-pretty text-3xl font-semibold tracking-tight leading-[1.05] sm:text-4xl">
                Answers, kept clean and simple.
              </h2>
              <p className="mt-4 text-pretty text-[17px] leading-8 text-[var(--tukul-muted)]">
                Minimalist accordion styling, smooth transitions, and low text density.
              </p>
            </div>

            <div className="mt-12">
              <Faq
                items={[
                  {
                    question: "Is Tukul a contractor listing site?",
                    answer:
                      "No. Tukul is designed as a modern ecosystem for projects—scopes, bidding, communication, milestones, and approvals live in one workflow.",
                  },
                  {
                    question: "How does verification work?",
                    answer:
                      "Contractor profiles are designed to surface trust signals clearly. Verification can include identity and business checks, plus project history and reviews.",
                  },
                  {
                    question: "What are milestones and approvals?",
                    answer:
                      "Milestones help break a project into phases. Owners can review and approve each phase’s deliverables before the next release—reducing disputes and surprises.",
                  },
                  {
                    question: "Can I manage documents and communication in one place?",
                    answer:
                      "Yes. The core experience is built around on-platform messaging and structured project records to keep communication clear and audit-ready.",
                  },
                  {
                    question: "Does Tukul work well on mobile?",
                    answer:
                      "Yes. The mobile experience is designed intentionally with premium spacing, large typography, and touch-optimized navigation—never a compressed desktop layout.",
                  },
                ]}
              />
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-[var(--tukul-border)] bg-[var(--tukul-surface)]">
        <div className="mx-auto w-full max-w-6xl px-6 py-14">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-4">
              <Image
                src="/brand/tukul-written.jpg"
                alt="Tukul.com"
                width={150}
                height={34}
                className="h-auto w-[140px]"
              />
              <div className="text-sm leading-6 text-[var(--tukul-muted)]">
                Construction projects. Finally simplified.
              </div>
            </div>

            {[
              {
                title: "Product",
                links: [
                  { label: "Marketplace", href: "#marketplace" },
                  { label: "How it works", href: "#how-it-works" },
                  { label: "Pricing", href: "#pricing" },
                ],
              },
              {
                title: "Company",
                links: [
                  { label: "Success stories", href: "#stories" },
                  { label: "Log in", href: "/auth" },
                  { label: "Dashboard", href: "/app" },
                ],
              },
              {
                title: "Legal",
                links: [
                  { label: "Terms", href: "#" },
                  { label: "Privacy", href: "#" },
                  { label: "Contact", href: "#" },
                ],
              },
            ].map((col) => (
              <div key={col.title}>
                <div className="text-sm font-semibold text-[var(--foreground)]">
                  {col.title}
                </div>
                <div className="mt-4 grid gap-3 text-sm text-[var(--tukul-muted)]">
                  {col.links.map((l) => (
                    <a
                      key={l.label}
                      href={l.href}
                      className="transition-colors hover:text-[var(--foreground)]"
                    >
                      {l.label}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col gap-3 border-t border-[var(--tukul-border)] pt-8 text-sm text-[var(--tukul-muted)] sm:flex-row sm:items-center sm:justify-between">
            <div>© Tukul.com. All rights reserved.</div>
            <div className="flex items-center gap-5">
              <a href="#" className="hover:text-[var(--foreground)]">
                LinkedIn
              </a>
              <a href="#" className="hover:text-[var(--foreground)]">
                X
              </a>
              <a href="#" className="hover:text-[var(--foreground)]">
                Email
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function LandingHero({ content }: { content: LandingContent }) {
  const hero = content.hero ?? {};

  const headline = hero.headline ?? "Construction projects,\nfinally simplified.";
  const subheadline =
    hero.subheadline ??
    "A modern marketplace built for property owners and contractors—verified profiles, transparent bidding, and milestone approvals with escrow-style releases.";
  const primaryCtaLabel = hero.primaryCtaLabel ?? "Start your project";
  const primaryCtaHref = hero.primaryCtaHref ?? "/auth";
  const secondaryCtaLabel = hero.secondaryCtaLabel ?? "Explore the marketplace";
  const secondaryCtaHref = hero.secondaryCtaHref ?? "#marketplace";

  const lines = headline.split("\n");

  return (
    <>
      <div className="inline-flex items-center rounded-full border border-[var(--tukul-border)] bg-[color:color-mix(in_oklab,var(--tukul-surface),transparent_10%)] px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--tukul-muted)]">
        Premium construction marketplace • Built on trust
      </div>

      <h1 className="mt-6 text-pretty tracking-tight leading-[0.98] text-[clamp(2.4rem,5.2vw,5.3rem)] font-semibold font-[family:var(--font-serif)]">
        {lines.map((line, idx) => (
          <span key={idx} className="block">
            {renderHeadlineAccent(line)}
          </span>
        ))}
      </h1>

      <p className="mt-5 max-w-[38rem] text-pretty text-[17px] leading-8 text-[var(--tukul-muted)] md:text-[18px]">
        {subheadline}
      </p>
      <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
        <Link
          href={primaryCtaHref}
          className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--tukul-accent)] px-7 text-base font-semibold text-white transition-transform duration-200 ease-out hover:scale-[1.01] active:scale-[0.99]"
        >
          {primaryCtaLabel}
        </Link>
        <a
          href={secondaryCtaHref}
          className="inline-flex h-12 items-center justify-center rounded-full border border-[var(--tukul-border)] bg-[color:color-mix(in_oklab,var(--tukul-surface),transparent_10%)] px-7 text-base font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--tukul-surface-2)]"
        >
          {secondaryCtaLabel}
        </a>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-4">
        {[
          {
            label: "Structured scope\nwith photos",
            icon: (
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
                <path
                  d="M7 3h10v18H7V3Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path
                  d="M9.5 8h5M9.5 11h5M9.5 14h3.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            ),
          },
          {
            label: "Competitive bids\nfrom verified contractors",
            icon: (
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
                <path
                  d="M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M3 21a7 7 0 0 1 13-4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="m19 14 1 2 2 .3-1.5 1.5.4 2.2-1.9-1-1.9 1 .4-2.2L16 16.3l2-.3 1-2Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
            ),
          },
          {
            label: "Milestone approvals\n& escrow protection",
            icon: (
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
                <path
                  d="M12 3 20 7v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path
                  d="m9 12 2 2 4-5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ),
          },
          {
            label: "Transparent,\nsecure & simple",
            icon: (
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
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
        ].map((i) => (
          <div key={i.label} className="flex items-start gap-3 text-[var(--tukul-accent)]">
            <div className="mt-0.5 rounded-2xl border border-[var(--tukul-border)] bg-[color:color-mix(in_oklab,var(--tukul-surface),transparent_10%)] p-3">
              {i.icon}
            </div>
            <div className="text-[12px] font-semibold uppercase tracking-wide text-[var(--tukul-muted)]">
              {i.label.split("\n").map((line, idx) => (
                <span key={idx} className="block">
                  {line}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function LandingHeroWorkflow({ content }: { content: LandingContent }) {
  const hero = content.hero ?? {};
  const labels = (hero.steps ?? []).filter(Boolean);
  const imageUrls = (hero.stepImageUrls ?? []).filter(Boolean);
  return (
    <HeroWorkflow
      labels={labels}
      imageUrls={imageUrls}
      testimonial={{
        photoUrl: hero.testimonialPhotoUrl ?? "",
        quote: hero.testimonialQuote ?? "",
        authorName: hero.testimonialAuthorName ?? "",
        authorTitle: hero.testimonialAuthorTitle ?? "",
        projectsFunded: hero.testimonialProjectsFunded ?? "",
        onTimeRate: hero.testimonialOnTimeRate ?? "",
        averageRating: hero.testimonialAverageRating ?? "",
      }}
    />
  );
}

function LandingHeroBackground({ content }: { content: LandingContent }) {
  const hero = content.hero ?? {};
  const backgroundUrl = hero.backgroundUrl?.trim();

  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(20,83,45,0.10),transparent_55%),radial-gradient(circle_at_80%_20%,rgba(0,0,0,0.06),transparent_58%),linear-gradient(to_bottom,var(--background),rgba(247,247,245,0.75),var(--background))]" />
      {backgroundUrl ? (
        <img
          src={backgroundUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-30 blur-[6px]"
          loading="lazy"
        />
      ) : null}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(247,247,245,0.92)_0%,rgba(247,247,245,0.84)_40%,rgba(247,247,245,0.74)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,0,0,0.04),transparent_45%)]" />
    </div>
  );
}

function renderHeadlineAccent(line: string): ReactNode {
  const open = line.indexOf("{");
  const close = line.indexOf("}", open + 1);
  if (open === -1 || close === -1) return line;
  const before = line.slice(0, open);
  const accent = line.slice(open + 1, close);
  const after = line.slice(close + 1);
  return (
    <>
      {before}
      <span className="text-[var(--tukul-accent)]">{accent}</span>
      {after}
    </>
  );
}

function LandingTrust({ content }: { content: LandingContent }) {
  const trust = content.trust ?? {};

  const trustItems = [
    { label: "Verified contractors", value: trust.verifiedContractors ?? "—" },
    { label: "Completed projects", value: trust.completedProjects ?? "—" },
    { label: "Owners served", value: trust.ownersServed ?? "—" },
    { label: "Project value processed", value: trust.projectValueProcessed ?? "—" },
    { label: "Review ratings", value: trust.rating ?? "—" },
  ];

  return (
    <Reveal delayMs={180} className="py-14 md:py-18">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {trustItems.map((item) => (
          <div
            key={item.label}
            className="rounded-3xl border border-[var(--tukul-border)] bg-[var(--tukul-surface)] px-5 py-5 text-center shadow-[0_14px_40px_rgba(0,0,0,0.06)]"
          >
            <div className="text-lg font-semibold leading-6 text-[var(--foreground)]">
              {item.value}
            </div>
            <div className="mt-2 text-xs font-medium uppercase tracking-wide text-[var(--tukul-muted)]">
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </Reveal>
  );
}

function LandingSections({ content }: { content: LandingContent }) {
  const sections = content.sections ?? {};
  const howItWorksMediaUrl = sections.howItWorksMediaUrl?.trim();
  const marketplaceMediaUrl = sections.marketplaceMediaUrl?.trim();
  const contractorMediaUrl = sections.contractorMediaUrl?.trim();

  return (
    <>
      <section
        id="how-it-works"
        className="mx-auto w-full max-w-6xl px-6 py-24 md:py-32"
      >
        <Reveal>
          <div className="grid gap-14 lg:grid-cols-2 lg:items-start">
            <div>
              <div className="inline-flex items-center rounded-full border border-[var(--tukul-border)] bg-[var(--tukul-surface)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--tukul-muted)]">
                How it works
              </div>
              <h2 className="mt-5 text-pretty text-3xl font-semibold tracking-tight leading-[1.05] sm:text-4xl">
                A clear path from scope to completion.
              </h2>
              <p className="mt-4 text-pretty text-[17px] leading-8 text-[var(--tukul-muted)]">
                Tukul is a modern ecosystem for construction projects—not a classified listing.
                Owners, contractors, and milestones stay connected in one calm workflow.
              </p>
              <div className="mt-10 grid gap-4">
                {[
                  {
                    title: "1) Post your project",
                    desc: "Create a structured scope with categories, photos, and requirements.",
                  },
                  {
                    title: "2) Compare verified bids",
                    desc: "Review proposals clearly—totals, timelines, and optional phase breakdowns.",
                  },
                  {
                    title: "3) Run milestones",
                    desc: "Approve deliverables per phase before the next payment is released.",
                  },
                ].map((step) => (
                  <div
                    key={step.title}
                    className="rounded-3xl border border-[var(--tukul-border)] bg-[var(--tukul-surface)] p-6 shadow-[0_16px_45px_rgba(0,0,0,0.06)]"
                  >
                    <div className="text-base font-semibold">{step.title}</div>
                    <div className="mt-2 text-[15px] leading-7 text-[var(--tukul-muted)]">
                      {step.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[32px] border border-[var(--tukul-border)] bg-[var(--tukul-surface)] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.08)] sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-[var(--foreground)]">
                    Workflow preview
                  </div>
                  <div className="mt-1 text-sm text-[var(--tukul-muted)]">
                    {howItWorksMediaUrl ? "AI-generated photo." : "Upload media in Admin → Landing."}
                  </div>
                </div>
                <div className="inline-flex items-center rounded-full bg-[color:color-mix(in_oklab,var(--tukul-accent),transparent_85%)] px-3 py-1 text-xs font-semibold text-[color:color-mix(in_oklab,var(--tukul-accent),black_18%)]">
                  Premium
                </div>
              </div>

              {howItWorksMediaUrl ? (
                <img
                  src={howItWorksMediaUrl}
                  alt="How it works"
                  className="mt-6 h-auto w-full rounded-2xl border border-[var(--tukul-border)] bg-white object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="mt-6 rounded-2xl border border-[var(--tukul-border)] bg-[var(--tukul-surface-2)] p-5 text-sm leading-6 text-[var(--tukul-muted)]">
                  Add a calm, photoreal construction workflow image that supports the story—no stocky
                  clutter.
                </div>
              )}

              <div className="mt-7 grid gap-3">
                {[
                  { label: "Scope", value: "Kitchen renovation • Subang Jaya" },
                  { label: "Bids", value: "3 shortlisted • 2 verified" },
                  { label: "Milestones", value: "Deposit → Demo → Install → Handover" },
                  { label: "Comms", value: "On-platform messages • Audit trail" },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--tukul-border)] bg-[var(--tukul-surface-2)] px-4 py-4"
                  >
                    <div className="text-sm font-semibold text-[var(--foreground)]">
                      {row.label}
                    </div>
                    <div className="text-sm text-[var(--tukul-muted)]">{row.value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/auth"
                  className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-[var(--tukul-accent)] px-6 text-base font-semibold text-white"
                >
                  Post a project
                </Link>
                <a
                  href="#contractors"
                  className="inline-flex h-12 flex-1 items-center justify-center rounded-full border border-[var(--tukul-border)] bg-[var(--tukul-surface)] px-6 text-base font-semibold text-[var(--foreground)]"
                >
                  See contractor flow
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <section id="marketplace" className="mx-auto w-full max-w-6xl px-6 pb-24 md:pb-32">
        <Reveal>
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div className="rounded-[32px] border border-[var(--tukul-border)] bg-[var(--tukul-surface)] p-7 shadow-[0_28px_80px_rgba(0,0,0,0.08)] sm:p-10">
              <div className="text-sm font-semibold text-[var(--foreground)]">
                Marketplace clarity
              </div>
              <div className="mt-2 text-[15px] leading-7 text-[var(--tukul-muted)]">
                Clean, calm cards—built for quick scanning and confident decisions.
              </div>

              {marketplaceMediaUrl ? (
                <img
                  src={marketplaceMediaUrl}
                  alt="Marketplace"
                  className="mt-6 h-auto w-full rounded-2xl border border-[var(--tukul-border)] bg-white object-cover"
                  loading="lazy"
                />
              ) : null}

              <div className="mt-8 grid gap-3">
                {[
                  {
                    title: "Verified profiles",
                    desc: "Trust signals are placed upfront to reduce anxiety.",
                  },
                  {
                    title: "Transparent comparison",
                    desc: "Compare bid totals, scope fit, and milestones—without clutter.",
                  },
                  {
                    title: "Structured communication",
                    desc: "Keep messages and documents on-platform with audit trails.",
                  },
                ].map((card) => (
                  <div
                    key={card.title}
                    className="rounded-3xl border border-[var(--tukul-border)] bg-[var(--tukul-surface-2)] p-6"
                  >
                    <div className="text-sm font-semibold text-[var(--foreground)]">
                      {card.title}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-[var(--tukul-muted)]">
                      {card.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="inline-flex items-center rounded-full border border-[var(--tukul-border)] bg-[var(--tukul-surface)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--tukul-muted)]">
                Marketplace
              </div>
              <h2 className="mt-5 text-pretty text-3xl font-semibold tracking-tight leading-[1.05] sm:text-4xl">
                Not a listing site—an ecosystem for the job.
              </h2>
              <p className="mt-4 text-pretty text-[17px] leading-8 text-[var(--tukul-muted)]">
                Tukul positions itself as a modern platform for construction projects, contractors,
                and property owners—premium, scalable, and technology-forward.
              </p>
              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {[
                  { k: "Owners", v: "Post scopes, compare bids, approve milestones." },
                  { k: "Contractors", v: "Build credibility, bid clearly, deliver confidently." },
                  { k: "Projects", v: "Documents, approvals, and changes in one place." },
                  { k: "Trust", v: "Verification, reviews, and audit-ready workflows." },
                ].map((i) => (
                  <div
                    key={i.k}
                    className="rounded-3xl border border-[var(--tukul-border)] bg-[var(--tukul-surface)] p-6 shadow-[0_16px_45px_rgba(0,0,0,0.06)]"
                  >
                    <div className="text-sm font-semibold text-[var(--foreground)]">
                      {i.k}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-[var(--tukul-muted)]">
                      {i.v}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <section
        id="contractors"
        className="mx-auto w-full max-w-6xl px-6 pb-24 md:pb-32"
      >
        <Reveal>
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="inline-flex items-center rounded-full border border-[var(--tukul-border)] bg-[var(--tukul-surface)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--tukul-muted)]">
                Contractors
              </div>
              <h2 className="mt-5 text-pretty text-3xl font-semibold tracking-tight leading-[1.05] sm:text-4xl">
                Trust signals built into every decision.
              </h2>
              <p className="mt-4 text-pretty text-[17px] leading-8 text-[var(--tukul-muted)]">
                Reduce contractor trust concerns with verification, clear reviews, and a workflow
                designed to keep everyone aligned.
              </p>
              <div className="mt-10 grid gap-4">
                {[
                  "Verification-first profiles (identity, business details, credibility).",
                  "Cleaner bidding that avoids noise and confusing comparisons.",
                  "Milestone approvals reduce disputes and scope ambiguity.",
                ].map((line) => (
                  <div
                    key={line}
                    className="flex items-start gap-3 rounded-3xl border border-[var(--tukul-border)] bg-[var(--tukul-surface)] p-6 shadow-[0_16px_45px_rgba(0,0,0,0.06)]"
                  >
                    <div className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--tukul-accent)]" />
                    <div className="text-sm leading-6 text-[var(--tukul-muted)]">{line}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[32px] border border-[var(--tukul-border)] bg-[var(--tukul-surface)] p-7 shadow-[0_28px_80px_rgba(0,0,0,0.08)] sm:p-10">
              <div className="text-sm font-semibold text-[var(--foreground)]">
                Contractor experience
              </div>
              <div className="mt-2 text-[15px] leading-7 text-[var(--tukul-muted)]">
                A modern, calm UI with large tap targets and clear hierarchy.
              </div>

              {contractorMediaUrl ? (
                <img
                  src={contractorMediaUrl}
                  alt="Contractors"
                  className="mt-6 h-auto w-full rounded-2xl border border-[var(--tukul-border)] bg-white object-cover"
                  loading="lazy"
                />
              ) : null}

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  { t: "Profile credibility", d: "Verification badges + past work." },
                  { t: "Bid clarity", d: "Totals + optional phase breakdowns." },
                  { t: "On-platform comms", d: "Documents, messages, and approvals." },
                  { t: "Review & reputation", d: "Post-job ratings and story-driven trust." },
                ].map((card) => (
                  <div
                    key={card.t}
                    className="rounded-3xl border border-[var(--tukul-border)] bg-[var(--tukul-surface-2)] p-6"
                  >
                    <div className="text-sm font-semibold text-[var(--foreground)]">
                      {card.t}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-[var(--tukul-muted)]">
                      {card.d}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <section id="pricing" className="mx-auto w-full max-w-6xl px-6 pb-24 md:pb-32">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center rounded-full border border-[var(--tukul-border)] bg-[var(--tukul-surface)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--tukul-muted)]">
              Pricing
            </div>
            <h2 className="mt-5 text-pretty text-3xl font-semibold tracking-tight leading-[1.05] sm:text-4xl">
              Simple, transparent, and built for trust.
            </h2>
            <p className="mt-4 text-pretty text-[17px] leading-8 text-[var(--tukul-muted)]">
              Keep the experience premium and calm—no dense pricing tables or noisy tiers.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {[
              {
                title: "For property owners",
                subtitle: "Start a project with a clear scope and confident milestones.",
                bullets: [
                  "Structured scope posting for better bids.",
                  "Shortlist verified contractors more confidently.",
                  "Milestone approvals before releases.",
                  "On-platform communication and audit trails.",
                ],
                cta: { label: "Post a project", href: "/auth" },
              },
              {
                title: "For contractors",
                subtitle: "Build credibility and win work with clarity, not noise.",
                bullets: [
                  "Verification and trust badges.",
                  "Cleaner bid presentation and breakdowns.",
                  "Documented approvals reduce disputes.",
                  "Reviews that strengthen reputation over time.",
                ],
                cta: { label: "Create a profile", href: "/auth" },
              },
            ].map((plan) => (
              <div
                key={plan.title}
                className="rounded-[32px] border border-[var(--tukul-border)] bg-[var(--tukul-surface)] p-8 shadow-[0_28px_80px_rgba(0,0,0,0.08)]"
              >
                <div className="text-lg font-semibold text-[var(--foreground)]">
                  {plan.title}
                </div>
                <div className="mt-2 text-[15px] leading-7 text-[var(--tukul-muted)]">
                  {plan.subtitle}
                </div>
                <div className="mt-8 grid gap-3">
                  {plan.bullets.map((b) => (
                    <div
                      key={b}
                      className="rounded-3xl border border-[var(--tukul-border)] bg-[var(--tukul-surface-2)] px-5 py-4 text-sm leading-6 text-[var(--tukul-muted)]"
                    >
                      {b}
                    </div>
                  ))}
                </div>
                <div className="mt-8">
                  <Link
                    href={plan.cta.href}
                    className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[var(--tukul-accent)] px-7 text-base font-semibold text-white"
                  >
                    {plan.cta.label}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      <section id="stories" className="mx-auto w-full max-w-6xl px-6 pb-24 md:pb-32">
        <Reveal>
          <div className="grid gap-12 lg:grid-cols-2 lg:items-end">
            <div>
              <div className="inline-flex items-center rounded-full border border-[var(--tukul-border)] bg-[var(--tukul-surface)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--tukul-muted)]">
                Success stories
              </div>
              <h2 className="mt-5 text-pretty text-3xl font-semibold tracking-tight leading-[1.05] sm:text-4xl">
                Confidence replaces construction anxiety.
              </h2>
              <p className="mt-4 text-pretty text-[17px] leading-8 text-[var(--tukul-muted)]">
                The emotional target is calm, safe, and supported—premium UX that helps users move
                forward without stress.
              </p>
            </div>
            <div className="rounded-[32px] border border-[var(--tukul-border)] bg-[var(--tukul-surface)] p-8 shadow-[0_28px_80px_rgba(0,0,0,0.08)]">
              <div className="text-sm font-semibold text-[var(--foreground)]">
                Testimonial highlight
              </div>
              <div className="mt-3 text-[15px] leading-7 text-[var(--tukul-muted)]">
                “We shortlisted faster, compared bids clearly, and approvals stayed organized. The
                whole renovation felt calmer.”
              </div>
              <div className="mt-6 text-sm font-semibold text-[var(--foreground)]">
                Property owner, Klang Valley
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                t: "Transparent bids",
                d: "Clear totals and breakdowns reduce decision fatigue.",
              },
              {
                t: "Milestone clarity",
                d: "Approvals per phase keep scope and expectations aligned.",
              },
              {
                t: "Trust signals",
                d: "Verification and reviews bring confidence to both sides.",
              },
            ].map((c) => (
              <div
                key={c.t}
                className="rounded-[32px] border border-[var(--tukul-border)] bg-[var(--tukul-surface)] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.07)]"
              >
                <div className="text-sm font-semibold text-[var(--foreground)]">{c.t}</div>
                <div className="mt-3 text-[15px] leading-7 text-[var(--tukul-muted)]">
                  {c.d}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>
    </>
  );
}
