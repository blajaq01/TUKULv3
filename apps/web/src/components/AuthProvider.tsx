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
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

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
          return;
        }
        setProfile(data as UserProfile);
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
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [isLoading, profile, session],
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
