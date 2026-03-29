import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as Keychain from 'react-native-keychain';
import Config from 'react-native-config';
import { getSupabase } from '~/shared/api/client';
import { generateNonce } from '~/shared/utils/crypto';

const KEYCHAIN_SERVICE = 'com.snacky.auth';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
}

interface AuthContextValue extends AuthState {
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

GoogleSignin.configure({
  iosClientId: Config.GOOGLE_IOS_CLIENT_ID,
  webClientId: Config.GOOGLE_WEB_CLIENT_ID,
});

async function persistRefreshToken(token: string): Promise<void> {
  try {
    await Keychain.setGenericPassword('refresh_token', token, {
      service: KEYCHAIN_SERVICE,
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } catch {
    // Biometric not available — token remains in MMKV via Supabase client
  }
}

async function clearPersistedRefreshToken(): Promise<void> {
  try {
    await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
  } catch {
    // Ignore — keychain entry may not exist
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    isLoading: true,
    isAuthenticated: false,
    hasCompletedOnboarding: false,
  });

  const checkOnboardingStatus = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await getSupabase()
        .from('user_profiles')
        .select('onboarding_completed_at')
        .eq('user_id', userId)
        .single();
      if (error) {
        console.warn('[Auth] Failed to check onboarding status:', error.message);
        return false;
      }
      return !!data?.onboarding_completed_at;
    } catch (err) {
      console.warn('[Auth] checkOnboardingStatus error:', err);
      return false;
    }
  }, []);

  const resolveSession = useCallback(
    async (session: Session | null) => {
      if (session) {
        // Verify the user actually exists in auth (guards against stale
        // sessions after a local database reset)
        const { error: userError } = await getSupabase().auth.getUser(session.access_token);
        if (userError) {
          console.warn('[Auth] Stale session detected, signing out:', userError.message);
          await getSupabase().auth.signOut();
          await clearPersistedRefreshToken();
          setState({
            session: null,
            user: null,
            isLoading: false,
            isAuthenticated: false,
            hasCompletedOnboarding: false,
          });
          return;
        }
      }

      let onboarded = false;
      if (session?.user) {
        onboarded = await checkOnboardingStatus(session.user.id);
      }
      setState({
        session,
        user: session?.user ?? null,
        isLoading: false,
        isAuthenticated: !!session,
        hasCompletedOnboarding: onboarded,
      });

      if (session?.refresh_token) {
        void persistRefreshToken(session.refresh_token);
      } else if (!session) {
        void clearPersistedRefreshToken();
      }
    },
    [checkOnboardingStatus],
  );

  useEffect(() => {
    const supabase = getSupabase();

    void supabase.auth
      .getSession()
      .then(({ data: { session } }) => resolveSession(session))
      .catch((err: unknown) => {
        console.error('[Auth] getSession failed:', err);
        setState((prev) => ({ ...prev, isLoading: false }));
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        console.log('[Auth] Token refreshed');
      }
      if (event === 'SIGNED_OUT') {
        console.log('[Auth] Signed out (may be due to expired session)');
      }
      void resolveSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [resolveSession]);

  const signInWithGoogle = useCallback(async () => {
    await GoogleSignin.hasPlayServices();

    const { raw, hashed } = generateNonce();
    const response = await GoogleSignin.signIn({ nonce: hashed });

    if (!response.data?.idToken) {
      throw new Error('Google Sign-In failed: no ID token received');
    }

    const { error } = await getSupabase().auth.signInWithIdToken({
      provider: 'google',
      token: response.data.idToken,
      nonce: raw,
    });

    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
    try {
      await GoogleSignin.revokeAccess();
      await GoogleSignin.signOut();
    } catch {
      // Google sign-out may fail if not signed in natively
    }
    await clearPersistedRefreshToken();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!state.user) return;
    const onboarded = await checkOnboardingStatus(state.user.id);
    setState((prev) => ({ ...prev, hasCompletedOnboarding: onboarded }));
  }, [state.user, checkOnboardingStatus]);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, signInWithGoogle, signOut, refreshProfile }),
    [state, signInWithGoogle, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
