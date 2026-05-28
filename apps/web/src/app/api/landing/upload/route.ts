import { NextResponse } from "next/server";

import { createSupabaseAnonServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function isAllowedPath(path: string) {
  if (!path) return false;
  if (path.includes("..")) return false;
  const allowedPrefixes = ["hero/", "sections/"];
  return allowedPrefixes.some((p) => path.startsWith(p));
}

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";
  if (!token) return badRequest("Missing Authorization bearer token.", 401);

  const form = await req.formData();
  const file = form.get("file");
  const path = String(form.get("path") ?? "").trim();

  if (!(file instanceof File)) return badRequest("Missing file.");
  if (!isAllowedPath(path)) return badRequest("Invalid path.");

  const anon = createSupabaseAnonServerClient(token);
  const { data: authData, error: authError } = await anon.auth.getUser(token);
  if (authError || !authData?.user?.id) return badRequest("Invalid session.", 401);

  const { data: profile, error: profileError } = await anon
    .from("users")
    .select("id,is_admin")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profileError) return badRequest("Failed to verify user.", 403);
  if (!profile?.is_admin) {
    const { data: can, error: permError } = await anon.rpc("has_permission", {
      p_code: "landing.manage",
    });
    if (permError) return badRequest("Not allowed.", 403);
    if (!can) return badRequest("Not allowed.", 403);
  }

  const service = createSupabaseServiceClient();

  const { data: buckets, error: bucketsError } = await service.storage.listBuckets();
  if (bucketsError) return badRequest("Failed to list storage buckets.", 500);
  const hasLanding = (buckets ?? []).some((b) => b.id === "landing");
  if (!hasLanding) {
    const { error: createError } = await service.storage.createBucket("landing", { public: true });
    if (createError) return badRequest("Failed to create landing bucket.", 500);
  }

  const bytes = await file.arrayBuffer();
  const blob = new Blob([bytes], { type: file.type || "application/octet-stream" });

  const { error: uploadError } = await service.storage.from("landing").upload(path, blob, {
    upsert: true,
    contentType: file.type || undefined,
  });
  if (uploadError) return badRequest(uploadError.message, 500);

  const { data: publicData } = service.storage.from("landing").getPublicUrl(path);
  const publicUrl = (publicData?.publicUrl ?? "").trim();
  if (!publicUrl) return badRequest("Failed to resolve public URL.", 500);

  return NextResponse.json({ publicUrl: `${publicUrl}?v=${Date.now()}` });
}
