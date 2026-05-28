"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type NavItem = { label: string; href: string };

const navItems: NavItem[] = [
  { label: "Marketplace", href: "#marketplace" },
  { label: "Contractors", href: "#contractors" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "Success stories", href: "#stories" },
];

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-[var(--foreground)]"
      aria-hidden="true"
    >
      <path
        d="M4 6h12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        className={`origin-center transition-transform duration-200 ease-out ${
          open ? "translate-y-[4px] rotate-45" : ""
        }`}
      />
      <path
        d="M4 10h12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        className={`transition-opacity duration-200 ease-out ${open ? "opacity-0" : ""}`}
      />
      <path
        d="M4 14h12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        className={`origin-center transition-transform duration-200 ease-out ${
          open ? "-translate-y-[4px] -rotate-45" : ""
        }`}
      />
    </svg>
  );
}

export function LandingNav() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const headerClassName = useMemo(() => {
    const base =
      "sticky top-0 z-50 w-full border-b transition-all duration-200 ease-out";
    const bg =
      "bg-[color:color-mix(in_oklab,var(--tukul-surface),transparent_30%)] backdrop-blur supports-[backdrop-filter]:bg-[color:color-mix(in_oklab,var(--tukul-surface),transparent_42%)]";
    const border = "border-[var(--tukul-border)]";
    const height = isScrolled ? "h-[72px]" : "h-[88px]";
    return `${base} ${bg} ${border} ${height}`;
  }, [isScrolled]);

  return (
    <>
      <header className={headerClassName}>
        <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/brand/tukul-written.jpg"
              alt="Tukul.com"
              width={140}
              height={32}
              priority
              className="h-auto w-[132px] select-none"
            />
          </Link>

          <nav className="hidden lg:flex items-center gap-7 text-sm text-[var(--tukul-muted)]">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full px-1.5 py-1 transition-colors hover:text-[var(--foreground)]"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/auth"
              className="hidden sm:inline-flex rounded-full border border-[var(--tukul-border)] px-4 py-2 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--tukul-surface-2)]"
            >
              Log in
            </Link>
            <Link
              href="/auth"
              className="inline-flex items-center justify-center rounded-full bg-[var(--tukul-accent)] px-4 py-2 text-sm font-semibold text-white transition-transform duration-200 ease-out hover:scale-[1.01] active:scale-[0.99]"
            >
              Get started
            </Link>
            <button
              type="button"
              className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--tukul-border)] bg-[color:color-mix(in_oklab,var(--tukul-surface),transparent_10%)]"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <HamburgerIcon open={menuOpen} />
            </button>
          </div>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-[60] transition-opacity duration-200 ease-out lg:hidden ${
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!menuOpen}
      >
        <div
          className="absolute inset-0 bg-black/20 backdrop-blur"
          onClick={() => setMenuOpen(false)}
        />
        <div
          className={`absolute right-0 top-0 h-full w-[min(92vw,420px)] border-l border-[var(--tukul-border)] bg-[color:color-mix(in_oklab,var(--tukul-surface),transparent_18%)] backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.14)] transition-transform duration-200 ease-out ${
            menuOpen ? "translate-x-0" : "translate-x-full"
          }`}
          role="dialog"
          aria-label="Navigation menu"
        >
          <div className="flex h-[88px] items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <Image
                src="/brand/tukul-mark.png"
                alt="Tukul"
                width={36}
                height={36}
                className="h-9 w-9"
              />
              <div className="text-sm font-semibold text-[var(--foreground)]">
                Tukul
              </div>
            </div>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--tukul-border)]"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            >
              <HamburgerIcon open={true} />
            </button>
          </div>

          <div className="px-6 pb-8">
            <div className="grid gap-2">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between rounded-2xl border border-[var(--tukul-border)] bg-[color:color-mix(in_oklab,var(--tukul-surface),transparent_8%)] px-4 py-4 text-base font-semibold text-[var(--foreground)] transition-colors hover:bg-[color:color-mix(in_oklab,var(--tukul-surface-2),transparent_5%)]"
                >
                  {item.label}
                </a>
              ))}
            </div>

            <div className="mt-7 grid gap-3">
              <Link
                href="/auth"
                onClick={() => setMenuOpen(false)}
                className="inline-flex h-12 items-center justify-center rounded-full border border-[var(--tukul-border)] px-5 text-base font-semibold text-[var(--foreground)]"
              >
                Log in
              </Link>
              <Link
                href="/auth"
                onClick={() => setMenuOpen(false)}
                className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--tukul-accent)] px-5 text-base font-semibold text-white"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
