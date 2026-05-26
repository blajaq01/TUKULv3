import Image from "next/image";
import { Suspense } from "react";

import { AuthForm } from "@/components/AuthForm";

export default function AuthPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-black/5 bg-white p-8">
        <div className="flex items-center justify-center">
          <Image
            src="/brand/tukul-written.jpg"
            alt="Tukul.com"
            width={220}
            height={48}
            priority
          />
        </div>
        <p className="mt-4 text-center text-sm text-zinc-600">
          Sign in to manage projects, bids, milestones, and escrow releases.
        </p>
        <div className="mt-8">
          <Suspense fallback={null}>
            <AuthForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
