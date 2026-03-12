import { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/api/client';
import { Colors } from '@/constants/colors';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';

export default function LoginScreen() {
  const { login, loginWithToken } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  const [request, response, promptGoogleAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID || undefined,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.authentication?.idToken;
      if (idToken) {
        setOauthLoading(true);
        apiClient
          .post<{ accessToken: string }>('/auth/google/mobile', { idToken })
          .then(({ data }) => loginWithToken(data.accessToken))
          .then(() => router.replace('/(tabs)'))
          .catch(() => Alert.alert('Ошибка', 'Не удалось войти через Google'))
          .finally(() => setOauthLoading(false));
      }
    }
  }, [response, loginWithToken]);

  const handleLogin = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }

    setLoading(true);
    try {
      await login(trimmedEmail, password);
      // Navigate to tabs; replace so the user can't go back to login
      router.replace('/(tabs)');
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Неверный email или пароль';
      Alert.alert('Ошибка входа', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        {/* Logo / brand */}
        <View style={styles.brand}>
          <Ionicons name="home" size={40} color={Colors.pine[500]} />
          <Text style={styles.brandName}>Милый Дом</Text>
        </View>

        <Text style={styles.title}>Вход в аккаунт</Text>

        {/* Email */}
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={18} color={Colors.slate[400]} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={Colors.slate[400]}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="next"
            />
          </View>
        </View>

        {/* Password */}
        <View style={styles.field}>
          <Text style={styles.label}>Пароль</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.slate[400]} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { paddingRight: 44 }]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={Colors.slate[400]}
              secureTextEntry={!showPass}
              autoCapitalize="none"
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPass((v) => !v)}
            >
              <Ionicons
                name={showPass ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={Colors.slate[400]}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.btnText}>Войти</Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <Text style={styles.orText}>или</Text>

        {/* Google OAuth */}
        {GOOGLE_WEB_CLIENT_ID || GOOGLE_IOS_CLIENT_ID || GOOGLE_ANDROID_CLIENT_ID ? (
          <TouchableOpacity
            style={[styles.googleBtn, (oauthLoading || !request) && styles.btnDisabled]}
            onPress={() => void promptGoogleAsync()}
            disabled={oauthLoading || !request}
          >
            {oauthLoading ? (
              <ActivityIndicator color={Colors.slate[700]} />
            ) : (
              <>
                <Ionicons name="logo-google" size={18} color="#EA4335" />
                <Text style={styles.googleBtnText}>Войти через Google</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}

        {/* Register link */}
        <TouchableOpacity onPress={() => router.replace('/(auth)/register')} style={{ marginTop: 20 }}>
          <Text style={styles.switchText}>
            Нет аккаунта? <Text style={styles.switchLink}>Создать</Text>
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.sand[50] },
  kav: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },

  brand: { alignItems: 'center', marginBottom: 32, gap: 8 },
  brandName: { fontSize: 26, fontWeight: '800', color: Colors.pine[700] },

  title: { fontSize: 22, fontWeight: '700', color: Colors.slate[900], marginBottom: 24 },

  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.slate[600], marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.sand[200],
  },
  inputIcon: { marginLeft: 14 },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.slate[900],
  },
  eyeBtn: { position: 'absolute', right: 14 },

  btn: {
    backgroundColor: Colors.pine[500],
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },

  orText: { textAlign: 'center', color: Colors.slate[400], marginVertical: 20, fontSize: 14 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.sand[200],
  },
  googleBtnText: { fontSize: 15, fontWeight: '600', color: Colors.slate[700] },
  switchText: { textAlign: 'center', fontSize: 15, color: Colors.slate[600] },
  switchLink: { color: Colors.pine[500], fontWeight: '600' },
});
