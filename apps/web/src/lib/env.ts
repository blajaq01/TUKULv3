export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
};

export function requireSupabaseEnv(): {
  supabaseUrl: string;
  supabaseAnonKey: string;
} {
  const missing: string[] = [];
  if (!env.supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!env.supabaseAnonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (missing.length > 0) {
    throw new Error(`Missing env: ${missing.join(", ")}`);
  }
  return { supabaseUrl: env.supabaseUrl, supabaseAnonKey: env.supabaseAnonKey };
}

export function requireSupabaseServiceEnv(): {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
} {
  const missing: string[] = [];
  if (!env.supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!env.supabaseServiceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length > 0) {
    throw new Error(`Missing env: ${missing.join(", ")}`);
  }
  return { supabaseUrl: env.supabaseUrl, supabaseServiceRoleKey: env.supabaseServiceRoleKey };
}
