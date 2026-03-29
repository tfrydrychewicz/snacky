import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Alert, Linking, Platform } from 'react-native';
import messaging, { type FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthProvider';
import { getSupabase } from '~/shared/api/client';

interface NotificationContextValue {
  fcmToken: string | null;
  permissionGranted: boolean;
  requestPermission: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextValue>({
  fcmToken: null,
  permissionGranted: false,
  requestPermission: async () => false,
});

export const useNotifications = () => useContext(NotificationContext);

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

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const authStatus = await messaging().requestPermission();
    const granted =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    setPermissionGranted(granted);

    if (!granted) {
      Alert.alert(t('permission_denied_title'), t('permission_denied_message'), [
        { text: t('permission_denied_cancel'), style: 'cancel' },
        { text: t('permission_denied_settings'), onPress: () => void Linking.openSettings() },
      ]);
    }

    return granted;
  }, [t]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    let tokenRefreshUnsubscribe: (() => void) | undefined;

    const init = async () => {
      const authStatus = await messaging().hasPermission();
      const hasPermission =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      setPermissionGranted(hasPermission);

      if (!hasPermission) return;

      try {
        const token = await messaging().getToken();
        setFcmToken(token);
        await registerToken(token, user.id);
      } catch (err) {
        console.warn('[Notifications] Failed to get FCM token:', err);
      }

      tokenRefreshUnsubscribe = messaging().onTokenRefresh(async (newToken) => {
        setFcmToken(newToken);
        await registerToken(newToken, user.id);
      });
    };

    void init();

    return () => {
      tokenRefreshUnsubscribe?.();
    };
  }, [isAuthenticated, user]);

  useEffect(() => {
    const unsubscribe = messaging().onMessage(
      async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
        const { notification } = remoteMessage;
        if (notification) {
          Alert.alert(notification.title ?? '', notification.body ?? '');
        }
      },
    );

    return unsubscribe;
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
