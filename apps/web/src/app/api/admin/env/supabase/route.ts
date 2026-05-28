import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

import { createSupabaseAnonServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

type Body = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  supabaseProjectId: string;
};

function normalizeLine(value: string) {
  return value.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
}

function setEnvVar(input: string, key: string, value: string) {
  const normalized = normalizeLine(input);
  const lines = normalized.split("\n");
  const next: string[] = [];
  let replaced = false;
  const safeValue = value.replaceAll("\n", "").replaceAll("\r", "");
  const lineValue = `${key}=${safeValue}`;

  for (const line of lines) {
    if (!line.trim()) {
      next.push(line);
      continue;
    }
    if (line.startsWith(`${key}=`)) {
      next.push(lineValue);
      replaced = true;
      continue;
    }
    next.push(line);
  }

  if (!replaced) next.push(lineValue);
  return next.join("\n").replace(/\n{3,}$/g, "\n\n");
}

export async function POST(req: Request) {
  try {
    if (process.env.NODE_ENV !== "development") {
      return badRequest("Writing .env.local is only supported in development.", 400);
    }

    const auth = req.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";
    if (!token) return badRequest("Missing Authorization bearer token.", 401);

    const anon = createSupabaseAnonServerClient(token);
    const { data: authData, error: authError } = await anon.auth.getUser(token);
    if (authError || !authData?.user?.id) return badRequest("Invalid session.", 401);

    const { data: profile, error: profileError } = await anon
      .from("users")
      .select("id,is_admin")
      .eq("id", authData.user.id)
      .maybeSingle();
    if (profileError) return badRequest("Not allowed.", 403);
    if (!profile?.is_admin) return badRequest("Not allowed.", 403);

    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body) return badRequest("Invalid JSON body.");

    const supabaseUrl = (body.supabaseUrl ?? "").trim();
    const supabaseAnonKey = (body.supabaseAnonKey ?? "").trim();
    const supabaseServiceRoleKey = (body.supabaseServiceRoleKey ?? "").trim();
    const supabaseProjectId = (body.supabaseProjectId ?? "").trim();

    if (!supabaseUrl) return badRequest("supabaseUrl is required.");
    if (!supabaseAnonKey) return badRequest("supabaseAnonKey is required.");
    if (!supabaseServiceRoleKey) return badRequest("supabaseServiceRoleKey is required.");

    const envPath = path.join(process.cwd(), "apps", "web", ".env.local");

    let text = "";
    try {
      text = await fs.readFile(envPath, "utf8");
    } catch {
      text = "";
    }

    text = setEnvVar(text, "NEXT_PUBLIC_SUPABASE_URL", supabaseUrl);
    text = setEnvVar(text, "NEXT_PUBLIC_SUPABASE_ANON_KEY", supabaseAnonKey);
    text = setEnvVar(text, "SUPABASE_SERVICE_ROLE_KEY", supabaseServiceRoleKey);
    if (supabaseProjectId) {
      text = setEnvVar(text, "NEXT_PUBLIC_SUPABASE_PROJECT_ID", supabaseProjectId);
    }

    await fs.writeFile(envPath, text, "utf8");
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to write env.";
    return badRequest(msg, 500);
  }
}
