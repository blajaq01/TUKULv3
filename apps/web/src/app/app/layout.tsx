import type { ReactNode } from "react";

import { AppNav } from "@/components/AppNav";
import { RequireAuth } from "@/components/RequireAuth";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <div className="flex min-h-full flex-1 bg-zinc-50">
        <AppNav />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">{children}</main>
        </div>
      </div>
    </RequireAuth>
  );
}
