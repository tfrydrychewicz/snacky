import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Alert, Linking, NativeModules, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import type FirebaseMessaging from '@react-native-firebase/messaging';
import { useAuth } from './AuthProvider';
import { getSupabase } from '~/shared/api/client';

type MessagingModule = typeof FirebaseMessaging;

const FIREBASE_AVAILABLE = NativeModules.RNFBAppModule != null;

interface NotificationContextValue {
  fcmToken: string | null;
  permissionGranted: boolean;
  requestPermission: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextValue>({
  fcmToken: null,
  permissionGranted: false,
  requestPermission: () => Promise.resolve(false),
});

export const useNotifications = () => useContext(NotificationContext);

function tryLoadMessaging(): MessagingModule | null {
  if (!FIREBASE_AVAILABLE) {
    console.warn('[Notifications] Firebase native module not linked — skipping');
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-member-access
  return require('@react-native-firebase/messaging').default as MessagingModule;
}

async function registerToken(token: string, userId: string): Promise<void> {
  const supabase = getSupabase();
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';

  const { error } = await supabase.from('user_devices').upsert(
    {
      user_id: userId,
      fcm_token: token,
      platform,
      last_active_at: new Date().toISOString(),
    },
    { onConflict: 'fcm_token' },
  );

  if (error) {
    console.warn('[Notifications] Failed to register token:', error.message);
  }
}

async function unregisterToken(token: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('user_devices').delete().eq('fcm_token', token);
  if (error) {
    console.warn('[Notifications] Failed to unregister token:', error.message);
  }
}

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation('notifications');
  const { user, isAuthenticated } = useAuth();
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const messagingRef = useRef<MessagingModule | null>(null);

  useEffect(() => {
    messagingRef.current = tryLoadMessaging();
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const msg = messagingRef.current;

    if (!msg) {
      Alert.alert(t('permission_denied_title'), t('permission_denied_message'), [
        { text: t('permission_denied_cancel'), style: 'cancel' },
        { text: t('permission_denied_settings'), onPress: () => void Linking.openSettings() },
      ]);
      return false;
    }

    try {
      const authStatus = await msg().requestPermission();
      const granted =
        authStatus === msg.AuthorizationStatus.AUTHORIZED ||
        authStatus === msg.AuthorizationStatus.PROVISIONAL;

      setPermissionGranted(granted);

      if (!granted) {
        Alert.alert(t('permission_denied_title'), t('permission_denied_message'), [
          { text: t('permission_denied_cancel'), style: 'cancel' },
          { text: t('permission_denied_settings'), onPress: () => void Linking.openSettings() },
        ]);
      }

      return granted;
    } catch (err) {
      console.warn('[Notifications] Permission request failed:', err);
      return false;
    }
  }, [t]);

  useEffect(() => {
    const msg = messagingRef.current;
    if (!isAuthenticated || !user || !msg) return;

    let tokenRefreshUnsubscribe: (() => void) | undefined;

    const init = async () => {
      try {
        const authStatus = await msg().hasPermission();
        const hasPermission =
          authStatus === msg.AuthorizationStatus.AUTHORIZED ||
          authStatus === msg.AuthorizationStatus.PROVISIONAL;

        setPermissionGranted(hasPermission);

        if (!hasPermission) return;

        const token = await msg().getToken();
        setFcmToken(token);
        await registerToken(token, user.id);

        tokenRefreshUnsubscribe = msg().onTokenRefresh(async (newToken) => {
          setFcmToken(newToken);
          await registerToken(newToken, user.id);
        });
      } catch (err) {
        console.warn('[Notifications] Init failed:', err);
      }
    };

    void init();

    return () => {
      tokenRefreshUnsubscribe?.();
    };
  }, [isAuthenticated, user]);

  useEffect(() => {
    const msg = messagingRef.current;
    if (!msg) return;

    try {
      const unsubscribe = msg().onMessage((remoteMessage) => {
        const { notification } = remoteMessage;
        if (notification) {
          Alert.alert(notification.title ?? '', notification.body ?? '');
        }
      });

      return unsubscribe;
    } catch (err) {
      console.warn('[Notifications] onMessage setup failed:', err);
      return undefined;
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated && fcmToken) {
      void unregisterToken(fcmToken);
      setFcmToken(null);
    }
  }, [isAuthenticated, fcmToken]);

  const value: NotificationContextValue = {
    fcmToken,
    permissionGranted,
    requestPermission,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};
