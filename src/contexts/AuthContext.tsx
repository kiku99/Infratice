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
  solvedIds: Set<string>;
  markSolved: (problemId: string) => Promise<void>;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [solvedIds, setSolvedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false); // auth 확인 즉시 로딩 해제 — solved 조회와 분리
      if (session?.user) {
        setSolvedIds(await fetchSolvedIds(session.user.id));
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setSolvedIds(await fetchSolvedIds(session.user.id));
      } else {
        setSolvedIds(new Set());
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const markSolved = useCallback(
    async (problemId: string) => {
      if (!user) return;
      try {
        const { error } = await supabase
          .from("solved_problems")
          .upsert({ user_id: user.id, problem_id: problemId });
        if (error) throw error;
        setSolvedIds((prev) => new Set([...prev, problemId]));
      } catch (e) {
        console.error("[markSolved]", e);
        throw e; // 호출부에서 catch 가능하도록 re-throw
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
      value={{ user, loading, solvedIds, markSolved, signInWithGoogle, signOut }}
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
