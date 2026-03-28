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

const KEYCHAIN_SERVICE = 'com.snacky.auth';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
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

async function getPersistedRefreshToken(): Promise<string | null> {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: KEYCHAIN_SERVICE,
    });
    return credentials ? credentials.password : null;
  } catch {
    return null;
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
  });

  useEffect(() => {
    const supabase = getSupabase();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({
        session,
        user: session?.user ?? null,
        isLoading: false,
        isAuthenticated: !!session,
      });

      if (session?.refresh_token) {
        persistRefreshToken(session.refresh_token);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setState({
        session,
        user: session?.user ?? null,
        isLoading: false,
        isAuthenticated: !!session,
      });

      if (session?.refresh_token) {
        await persistRefreshToken(session.refresh_token);
      } else {
        await clearPersistedRefreshToken();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();

    if (!response.data?.idToken) {
      throw new Error('Google Sign-In failed: no ID token received');
    }

    const { error } = await getSupabase().auth.signInWithIdToken({
      provider: 'google',
      token: response.data.idToken,
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

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, signInWithGoogle, signOut }),
    [state, signInWithGoogle, signOut],
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
