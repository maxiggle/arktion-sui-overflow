"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { apiClient as api } from "@/lib/api/client";
import type { AuthResult, AuthUser } from "@/lib/types/auth";
import { clearStoredAuth, getStoredToken, setStoredToken } from "@/lib/auth";
import { useInkStore } from "@/stores/ink.store";
import { useReadingStore } from "@/stores/reading.store";
import { usePassportStore } from "@/stores/passport.store";
import { useJournalStore } from "@/stores/journal.store";
import { useBadgesStore } from "@/stores/badges.store";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  /** Null while loading or when the user is not signed in. */
  user: AuthUser | null;
  /** The raw session token stored in localStorage (Bearer token for the API). */
  token: string | null;
  /** True while we're verifying the stored token on mount. */
  isLoading: boolean;
  isAuthenticated: boolean;
  /**
   * Exchange a Google ID token for an Arktion session.
   * Called by the /auth/callback page after Google redirects back.
   */
  completeSignIn: (googleIdToken: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * On mount: check whether we have a stored session token and, if so,
   * verify it's still valid by calling GET /auth/me.
   */
  useEffect(() => {
    const stored = getStoredToken();
    if (!stored) {
      setIsLoading(false);
      return;
    }

    api
      .get<AuthUser>("/auth/me", {
        headers: { Authorization: `Bearer ${stored}` },
      })
      .then(({ data }) => {
        setToken(stored);
        setUser(data);
      })
      .catch(() => {
        // Token is expired or invalid — wipe it and start fresh.
        clearStoredAuth();
      })
      .finally(() => setIsLoading(false));
  }, []);

  /**
   * Exchange a Google ID token for an Arktion session token.
   * The backend verifies the JWT, derives the Sui address, and on first
   * login bootstraps the on-chain passport + library + journal.
   */
  const completeSignIn = useCallback(
    async (googleIdToken: string): Promise<AuthResult> => {
      const { data } = await api.post<AuthResult>("/auth/zklogin/complete", {
        jwt: googleIdToken,
      });

      setStoredToken(data.sessionToken);
      setToken(data.sessionToken);
      setUser(data.user);

      return data;
    },
    [],
  );

  /**
   * Revoke the current session on the backend, then clear local state.
   */
  const signOut = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Backend might be unreachable — clear locally regardless.
    }
    clearStoredAuth();
    setToken(null);
    setUser(null);
    // Flush all Zustand stores so stale data never leaks to the next session
    useInkStore.getState().reset();
    useReadingStore.getState().reset();
    usePassportStore.getState().reset();
    useJournalStore.getState().reset();
    useBadgesStore.getState().reset();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        completeSignIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
