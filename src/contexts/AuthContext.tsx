"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authReady: boolean;
  isAdmin: boolean;
  solvedIds: Set<string>;
  markSolved: (problemId: string) => Promise<void>;
  unmarkSolved: (problemId: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function fetchSolvedIds(userId: string): Promise<Set<string>> {
  try {
    const { data, error } = await supabase
      .from("solved_problems")
      .select("problem_id")
      .eq("user_id", userId);
    if (error) return new Set();
    return new Set((data ?? []).map((r: { problem_id: string }) => r.problem_id));
  } catch {
    return new Set();
  }
}

async function fetchIsAdmin(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return false;
    return Boolean(data);
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [solvedIds, setSolvedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let isMounted = true;

    async function syncUserState(nextUser: User | null) {
      if (!isMounted) return;

      setUser(nextUser);

      if (!nextUser) {
        setSolvedIds(new Set());
        setIsAdmin(false);
        setLoading(false);
        setAuthReady(true);
        return;
      }

      setLoading(true);

      const [nextSolvedIds, nextIsAdmin] = await Promise.all([
        fetchSolvedIds(nextUser.id),
        fetchIsAdmin(nextUser.id),
      ]);

      if (!isMounted) return;

      setSolvedIds(nextSolvedIds);
      setIsAdmin(nextIsAdmin);
      setLoading(false);
      setAuthReady(true);
    }

    void supabase.auth.getSession().then(({ data }) => {
      void syncUserState(data.session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      void syncUserState(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const markSolved = useCallback(
    async (problemId: string) => {
      if (!user) return;
      try {
        const { error } = await supabase
          .from("solved_problems")
          .upsert(
            { user_id: user.id, problem_id: problemId },
            { onConflict: "user_id,problem_id" },
          );
        if (error) throw error;
        setSolvedIds((prev) => new Set([...prev, problemId]));
      } catch (e) {
        console.error("[markSolved]", e);
        throw e;
      }
    },
    [user],
  );

  const unmarkSolved = useCallback(
    async (problemId: string) => {
      if (!user) return;
      try {
        const { error } = await supabase
          .from("solved_problems")
          .delete()
          .eq("user_id", user.id)
          .eq("problem_id", problemId);
        if (error) throw error;
        setSolvedIds((prev) => {
          const next = new Set(prev);
          next.delete(problemId);
          return next;
        });
      } catch (e) {
        console.error("[unmarkSolved]", e);
        throw e;
      }
    },
    [user],
  );

  const signInWithGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authReady,
        isAdmin,
        solvedIds,
        markSolved,
        unmarkSolved,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
