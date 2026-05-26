"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/components/AuthProvider";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoading, session } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (session) return;
    const next = encodeURIComponent(pathname ?? "/app");
    router.replace(`/auth?next=${next}`);
  }, [isLoading, pathname, router, session]);

  if (isLoading) return null;
  if (!session) return null;
  return children;
}
