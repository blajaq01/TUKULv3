"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useAuth } from "@/components/AuthProvider";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  isVisible: (args: { isContractor: boolean; isAdmin: boolean; permissions: string[] }) => boolean;
};

export function AppNav() {
  const { user, profile, permissions, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      if (typeof window === "undefined") return false;
      return window.localStorage.getItem("tukul.sidebar.collapsed") === "1";
    } catch {
      return false;
    }
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isContractor = Boolean(profile?.is_contractor);
  const isAdmin = Boolean(profile?.is_admin);

  const items = useMemo<NavItem[]>(
    () => [
      {
        label: "Dashboard",
        href: "/app",
        icon: (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            <path
              d="M4 4h7v7H4V4Zm9 0h7v4h-7V4ZM4 13h7v7H4v-7Zm9-3h7v10h-7V10Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        ),
        isVisible: () => true,
      },
      {
        label: "Projects",
        href: "/app/projects",
        icon: (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            <path
              d="M4 7h16M8 4h8M6 7v13h12V7"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ),
        isVisible: () => true,
      },
      {
        label: "Contractors",
        href: "/app/contractors",
        icon: (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            <path
              d="M16 11a4 4 0 1 0-8 0m-3 9a7 7 0 0 1 14 0"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        ),
        isVisible: () => true,
      },
      {
        label: "Templates",
        href: "/app/templates",
        icon: (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            <path
              d="M7 4h10v4H7V4Zm-2 6h14v10H5V10Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        ),
        isVisible: () => true,
      },
      {
        label: "Notifications",
        href: "/app/notifications",
        icon: (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            <path
              d="M12 22a2.5 2.5 0 0 0 2.5-2.5h-5A2.5 2.5 0 0 0 12 22ZM6 9a6 6 0 1 1 12 0v5l2 2H4l2-2V9Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        ),
        isVisible: () => true,
      },
      {
        label: "Contractor",
        href: "/app/contractor",
        icon: (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            <path
              d="M12 3v6m0 0 2-2m-2 2-2-2M6 21h12m-9-4v-5a3 3 0 0 1 6 0v5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ),
        isVisible: ({ isContractor: ic }) => ic,
      },
      {
        label: "Verification",
        href: "/app/admin/contractors",
        icon: (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
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
        isVisible: ({ permissions: p }) => isAdmin || p.includes("verification.manage"),
      },
      {
        label: "Integrations",
        href: "/app/admin/integrations",
        icon: (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            <path
              d="M10 13a3 3 0 0 1 0-6h1m2 0h1a3 3 0 1 1 0 6h-1m-4 0h6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        ),
        isVisible: ({ permissions: p }) => isAdmin || p.includes("integrations.manage"),
      },
      {
        label: "Outbox",
        href: "/app/admin/outbox",
        icon: (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            <path
              d="M4 4h16v10H4V4Zm0 10 4 6h8l4-6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        ),
        isVisible: ({ permissions: p }) => isAdmin || p.includes("notifications.outbox.read"),
      },
      {
        label: "Access",
        href: "/app/admin/access",
        icon: (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            <path
              d="M12 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 10a7 7 0 0 1 14 0"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M19 8v4m2-2h-4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        ),
        isVisible: () => isAdmin,
      },
      {
        label: "Landing",
        href: "/app/admin/landing",
        icon: (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            <path
              d="M4 6h16v12H4V6Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M8 10h8M8 13h6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        ),
        isVisible: ({ permissions: p }) => isAdmin || p.includes("landing.manage"),
      },
    ],
    [isAdmin],
  );

  const visibleItems = items.filter((i) => i.isVisible({ isContractor, isAdmin, permissions }));
  const grouped = useMemo(() => {
    const core = visibleItems.filter((i) => !i.href.startsWith("/app/admin"));
    const admin = visibleItems.filter((i) => i.href.startsWith("/app/admin"));
    return { core, admin };
  }, [visibleItems]);

  const roleLabel = isAdmin ? "Superadmin" : isContractor ? "Contractor" : "Property owner";

  const isActive = (href: string) => {
    if (href === "/app") return pathname === "/app";
    return pathname.startsWith(href);
  };

  return (
    <>
      <button
        type="button"
        className="fixed left-4 top-4 z-50 rounded-xl border border-black/10 bg-white/90 px-3 py-2 text-sm text-zinc-800 backdrop-blur hover:bg-white md:hidden"
        onClick={() => setIsMobileOpen(true)}
      >
        <span className="sr-only">Open navigation</span>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <path
            d="M4 6h16M4 12h16M4 18h16"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <div
        className={`fixed inset-0 z-30 bg-black/30 backdrop-blur-[1px] md:hidden ${
          isMobileOpen ? "" : "hidden"
        }`}
        onClick={() => setIsMobileOpen(false)}
      />

      <aside
        className={`fixed left-0 top-0 z-40 h-screen shrink-0 border-r border-black/5 bg-white transition-all duration-200 ease-in-out md:sticky md:top-0 ${
          isCollapsed ? "w-20" : "w-72"
        } ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        <div className="relative flex h-full flex-col">
          <button
            type="button"
            className="absolute -right-3 top-6 z-50 hidden h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white shadow-sm hover:bg-zinc-50 md:flex"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => {
              const next = !isCollapsed;
              setIsCollapsed(next);
              try {
                window.localStorage.setItem("tukul.sidebar.collapsed", next ? "1" : "0");
              } catch {}
            }}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
              <path
                d={isCollapsed ? "M10 7l5 5-5 5" : "M14 7l-5 5 5 5"}
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div className="flex items-center justify-between gap-2 px-4 py-4">
            <Link
              href="/app"
              className="flex items-center gap-3"
              onClick={() => setIsMobileOpen(false)}
            >
              <Image
                src={isCollapsed ? "/brand/tukul-mark.png" : "/brand/tukul-written.jpg"}
                alt="Tukul.com"
                width={isCollapsed ? 36 : 156}
                height={36}
                priority
                className="h-9 w-auto"
              />
            </Link>

            <button
              type="button"
              className="rounded-lg border border-black/10 px-2.5 py-2 text-sm hover:bg-zinc-50 md:hidden"
              onClick={() => setIsMobileOpen(false)}
            >
              Close
            </button>
          </div>

        <div className="px-4 pb-3">
          <Link
            href="/app/projects/new"
            className={`flex items-center justify-center gap-2 rounded-xl bg-black px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 ${
              isCollapsed ? "px-0" : ""
            }`}
            title={isCollapsed ? "Post a project" : undefined}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
              <path
                d="M12 5v14m7-7H5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <span className={`${isCollapsed ? "hidden" : ""}`}>Post project</span>
          </Link>
        </div>

        <nav className="flex-1 overflow-auto px-3 pb-4">
          <div className="space-y-1">
            {isCollapsed ? null : (
              <div className="px-3 pb-2 pt-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Workspace
              </div>
            )}
            {grouped.core.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={isCollapsed ? item.label : undefined}
                  onClick={() => setIsMobileOpen(false)}
                  className={`group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-sm transition-all duration-200 ease-in-out ${
                    active
                      ? "bg-zinc-100 text-zinc-900"
                      : "text-zinc-600 hover:border-black/5 hover:bg-zinc-50 hover:text-zinc-900"
                  }`}
                >
                  <span
                    className={`grid place-items-center ${
                      active ? "text-zinc-900" : "text-zinc-500 group-hover:text-zinc-900"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span
                    className={`truncate transition-opacity duration-200 ease-in-out ${
                      isCollapsed ? "pointer-events-none w-0 opacity-0" : "opacity-100"
                    }`}
                  >
                    {item.label}
                  </span>
                  <span className={`ml-auto h-6 w-1 rounded-full bg-black/80 ${active ? "" : "opacity-0"}`} />
                </Link>
              );
            })}
          </div>

          {grouped.admin.length > 0 ? (
            <div className="mt-5 space-y-1">
              {isCollapsed ? null : (
                <div className="px-3 pb-2 pt-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Admin
                </div>
              )}
              {grouped.admin.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isCollapsed ? item.label : undefined}
                    onClick={() => setIsMobileOpen(false)}
                    className={`group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-sm transition-all duration-200 ease-in-out ${
                      active
                        ? "bg-zinc-100 text-zinc-900"
                        : "text-zinc-600 hover:border-black/5 hover:bg-zinc-50 hover:text-zinc-900"
                    }`}
                  >
                    <span
                      className={`grid place-items-center ${
                        active ? "text-zinc-900" : "text-zinc-500 group-hover:text-zinc-900"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span
                      className={`truncate transition-opacity duration-200 ease-in-out ${
                        isCollapsed ? "pointer-events-none w-0 opacity-0" : "opacity-100"
                      }`}
                    >
                      {item.label}
                    </span>
                    <span className={`ml-auto h-6 w-1 rounded-full bg-black/80 ${active ? "" : "opacity-0"}`} />
                  </Link>
                );
              })}
            </div>
          ) : null}
        </nav>

        <div className="border-t border-black/5 px-4 py-4">
          <div className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-800">
              {(profile?.full_name?.trim()?.[0] ?? user?.email?.trim()?.[0] ?? "U").toUpperCase()}
            </div>
            <div className={`${isCollapsed ? "hidden" : ""} min-w-0`}>
              <div className="truncate text-sm font-semibold text-zinc-900">
                {profile?.full_name ?? user?.email ?? "Account"}
              </div>
              <div className="truncate text-xs text-zinc-600">{roleLabel}</div>
            </div>
          </div>
          <div className={`mt-3 ${isCollapsed ? "grid place-items-center" : ""}`}>
            <button
              type="button"
              className={`rounded-lg border border-black/10 px-3 py-2 text-sm hover:bg-zinc-50 ${
                isCollapsed ? "px-2.5" : "w-full"
              }`}
              title={isCollapsed ? "Sign out" : undefined}
              onClick={async () => {
                await signOut();
                router.replace("/");
              }}
            >
              <span className={`${isCollapsed ? "hidden" : ""}`}>Sign out</span>
              <span className={`${isCollapsed ? "" : "hidden"}`}>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                  <path
                    d="M10 7V5a2 2 0 0 1 2-2h7v18h-7a2 2 0 0 1-2-2v-2"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M15 12H3m0 0 3-3m-3 3 3 3"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </button>
          </div>
        </div>
        </div>
      </aside>
    </>
  );
}
