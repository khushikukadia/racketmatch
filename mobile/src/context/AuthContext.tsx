import type { Session } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../api/client';
import { getSupabase } from '../lib/supabase';

type AuthState = {
  session: Session | null;
  apiToken: string | null;
  userId: string | null;
  /** True when signed in with Supabase (JWT), so Storage uploads are allowed. */
  canUseCloudStorage: boolean;
  loading: boolean;
  profileReady: boolean | null;
  refreshProfileGate: () => Promise<void>;
  signOut: () => Promise<void>;
  enterDevMock: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

const DEV_MOCK = process.env.EXPO_PUBLIC_DEV_MOCK_AUTH === 'true';

function buildMockSession(): Session {
  const uid = process.env.EXPO_PUBLIC_DEV_MOCK_USER_ID ?? '00000000-0000-0000-0000-000000000001';
  return {
    access_token: 'mock',
    refresh_token: '',
    expires_in: 99999,
    token_type: 'bearer',
    user: {
      id: uid,
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: '',
    },
  } as Session;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileReady, setProfileReady] = useState<boolean | null>(null);
  const [mockLoggedOut, setMockLoggedOut] = useState(false);

  const apiToken = session?.access_token && session.access_token !== 'mock' ? session.access_token : null;
  const userId = session?.user?.id ?? null;
  const canUseCloudStorage = Boolean(apiToken && !DEV_MOCK);

  const refreshProfileGate = useCallback(async () => {
    const token = DEV_MOCK ? null : session?.access_token ?? null;
    try {
      await api.getProfileMe(token);
      setProfileReady(true);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setProfileReady(false);
      } else {
        setProfileReady(false);
      }
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (DEV_MOCK) {
      if (!mockLoggedOut) {
        setSession(buildMockSession());
      } else {
        setSession(null);
      }
      setLoading(false);
      return;
    }

    getSupabase()
      .auth.getSession()
      .then(({ data }) => {
        setSession(data.session ?? null);
        setLoading(false);
      })
      .catch((e) => {
        console.warn('Failed to load Supabase session', e);
        setSession(null);
        setLoading(false);
      });

    const { data: sub } = getSupabase().auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });

    return () => sub.subscription.unsubscribe();
  }, [mockLoggedOut]);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      setProfileReady(null);
      return;
    }
    refreshProfileGate();
  }, [loading, session, refreshProfileGate]);

  const signOut = useCallback(async () => {
    if (DEV_MOCK) {
      setMockLoggedOut(true);
      setSession(null);
      setProfileReady(null);
      return;
    }
    await getSupabase().auth.signOut();
    setSession(null);
    setProfileReady(null);
  }, []);

  const enterDevMock = useCallback(() => {
    setMockLoggedOut(false);
    setSession(buildMockSession());
  }, []);

  const value = useMemo(
    () => ({
      session,
      apiToken: DEV_MOCK ? null : apiToken,
      userId,
      canUseCloudStorage,
      loading,
      profileReady,
      refreshProfileGate,
      signOut,
      enterDevMock,
    }),
    [
      session,
      apiToken,
      userId,
      canUseCloudStorage,
      loading,
      profileReady,
      refreshProfileGate,
      signOut,
      enterDevMock,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth outside AuthProvider');
  }
  return ctx;
}

export function isDevMockAuth() {
  return DEV_MOCK;
}
