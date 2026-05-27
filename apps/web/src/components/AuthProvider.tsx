"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase/client";

export type UserProfile = {
  id: string;
  email: string;
  full_name: string;
  is_contractor: boolean;
  is_admin: boolean;
};

type AuthContextValue = {
  isLoading: boolean;
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  permissions: string[];
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return;
        setSession(data.session ?? null);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const userId = session?.user?.id;
    if (!userId) {
      Promise.resolve().then(() => {
        if (!isMounted) return;
        setPermissions([]);
      });
      return () => {
        isMounted = false;
      };
    }

    supabase
      .from("users")
      .select("id,email,full_name,is_contractor,is_admin")
      .eq("id", userId)
      .single()
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          setProfile(null);
          setPermissions([]);
          return;
        }
        setProfile(data as UserProfile);
      });

    supabase
      .from("user_role_assignments")
      .select("role_id")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .then(async ({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          setPermissions([]);
          return;
        }
        const roleIds = (data ?? []).map((r) => (r as { role_id: string }).role_id);
        if (roleIds.length === 0) {
          setPermissions([]);
          return;
        }
        const { data: perms, error: permsError } = await supabase
          .from("role_permissions")
          .select("permission_code")
          .in("role_id", roleIds);
        if (!isMounted) return;
        if (permsError) {
          setPermissions([]);
          return;
        }
        const codes = Array.from(
          new Set((perms ?? []).map((p) => (p as { permission_code: string }).permission_code).filter(Boolean)),
        );
        setPermissions(codes);
      })
      .catch(() => {
        if (!isMounted) return;
        setPermissions([]);
      });

    return () => {
      isMounted = false;
    };
  }, [session?.user?.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      session,
      user: session?.user ?? null,
      profile: session ? profile : null,
      permissions,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [isLoading, permissions, profile, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
}
