import { createClient } from "@supabase/supabase-js";

import { requireSupabaseEnv, requireSupabaseServiceEnv } from "@/lib/env";

export function createSupabaseAnonServerClient(accessToken: string) {
  const { supabaseUrl, supabaseAnonKey } = requireSupabaseEnv();
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function createSupabaseServiceClient() {
  const { supabaseUrl, supabaseServiceRoleKey } = requireSupabaseServiceEnv();
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

