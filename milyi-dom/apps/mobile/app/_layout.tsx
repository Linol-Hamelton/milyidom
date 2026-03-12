import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '@/stores/auth.store';
import { NotificationService } from '@/services/notifications';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    void initialize();
    void NotificationService.registerForPushNotifications();
  }, [initialize]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen
            name="listing/[id]"
            options={{ headerShown: true, title: '', headerTransparent: true }}
          />
          <Stack.Screen
            name="booking/[id]"
            options={{ headerShown: true, title: 'Бронирование', presentation: 'modal' }}
          />
          <Stack.Screen name="conversation/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="notifications" options={{ headerShown: false }} />
          <Stack.Screen name="saved-searches" options={{ headerShown: false }} />
          <Stack.Screen name="loyalty" options={{ headerShown: false }} />
          <Stack.Screen name="review/[bookingId]" options={{ headerShown: false }} />
          <Stack.Screen name="host/dashboard" options={{ headerShown: false }} />
          <Stack.Screen name="host/bookings" options={{ headerShown: false }} />
          <Stack.Screen name="host/listings" options={{ headerShown: false }} />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
