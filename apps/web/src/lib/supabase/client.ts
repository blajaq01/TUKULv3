import { createClient } from "@supabase/supabase-js";

import { requireSupabaseEnv } from "@/lib/env";

const { supabaseUrl, supabaseAnonKey } = requireSupabaseEnv();

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
