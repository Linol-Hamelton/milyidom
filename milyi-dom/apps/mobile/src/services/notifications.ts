import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiClient } from '@/api/client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const NotificationService = {
  registerForPushNotifications: async (): Promise<string | null> => {
    if (!Device.isDevice) {
      // Simulators/emulators don't support push notifications
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3D6B4F',
      });
    }

    try {
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      // Register token on backend
      await apiClient.post('/users/me/push-token', { token });
      return token;
    } catch {
      return null;
    }
  },

  addNotificationReceivedListener: (
    handler: (notification: Notifications.Notification) => void,
  ) => Notifications.addNotificationReceivedListener(handler),

  addNotificationResponseReceivedListener: (
    handler: (response: Notifications.NotificationResponse) => void,
  ) => Notifications.addNotificationResponseReceivedListener(handler),
};
