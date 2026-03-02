import { Stack } from 'expo-router';
import { Colors } from '@/constants/colors';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.sand[50] },
        headerTintColor: Colors.pine[500],
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: Colors.sand[50] },
      }}
    >
      <Stack.Screen name="login" options={{ title: 'Войти' }} />
      <Stack.Screen name="register" options={{ title: 'Регистрация' }} />
    </Stack>
  );
}
