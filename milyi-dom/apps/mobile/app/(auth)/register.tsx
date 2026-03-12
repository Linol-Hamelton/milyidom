import { useState } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth.store';
import { Colors } from '@/constants/colors';

export default function RegisterScreen() {
  const { register } = useAuthStore();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const trimEmail = email.trim().toLowerCase();
    const trimFirst = firstName.trim();
    const trimLast = lastName.trim();

    if (!trimFirst || !trimLast || !trimEmail || !password) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Ошибка', 'Пароль должен быть не менее 8 символов');
      return;
    }

    setLoading(true);
    try {
      await register(trimEmail, password, trimFirst, trimLast);
      router.replace('/(tabs)');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Не удалось создать аккаунт';
      Alert.alert('Ошибка регистрации', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand */}
          <View style={styles.brand}>
            <Ionicons name="home" size={36} color={Colors.pine[500]} />
            <Text style={styles.brandName}>Милый Дом</Text>
          </View>

          <Text style={styles.title}>Создать аккаунт</Text>
          <Text style={styles.sub}>Присоединяйтесь — сдавайте и бронируйте</Text>

          {/* First + Last name row */}
          <View style={styles.nameRow}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Имя</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Анна"
                placeholderTextColor={Colors.slate[400]}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Фамилия</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Иванова"
                placeholderTextColor={Colors.slate[400]}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color={Colors.slate[400]} style={styles.inputIcon} />
              <TextInput
                style={styles.inputInner}
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
                style={[styles.inputInner, { paddingRight: 44 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Мин. 8 символов"
                placeholderTextColor={Colors.slate[400]}
                secureTextEntry={!showPass}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleRegister}
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

          {/* Strength hint */}
          {password.length > 0 && password.length < 8 && (
            <Text style={styles.hint}>Ещё {8 - password.length} символов</Text>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.btnText}>Создать аккаунт</Text>
            )}
          </TouchableOpacity>

          {/* Terms notice */}
          <Text style={styles.terms}>
            Регистрируясь, вы соглашаетесь с{' '}
            <Text style={styles.termsLink}>Условиями использования</Text>{' '}
            и{' '}
            <Text style={styles.termsLink}>Политикой конфиденциальности</Text>.
          </Text>

          {/* Login link */}
          <TouchableOpacity
            style={{ marginTop: 16 }}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={styles.switchText}>
              Уже есть аккаунт? <Text style={styles.switchLink}>Войти</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.sand[50] },
  scroll: { padding: 24, paddingBottom: 48 },

  brand: { alignItems: 'center', marginBottom: 24, gap: 6 },
  brandName: { fontSize: 22, fontWeight: '800', color: Colors.pine[700] },

  title: { fontSize: 22, fontWeight: '700', color: Colors.slate[900] },
  sub: { fontSize: 14, color: Colors.slate[400], marginTop: 4, marginBottom: 24 },

  nameRow: { flexDirection: 'row', gap: 12 },

  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.slate[600], marginBottom: 6 },

  // Standalone input (for name fields — no icon)
  input: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.sand[200],
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.slate[900],
  },

  // Inputs with icon
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.sand[200],
  },
  inputIcon: { marginLeft: 14 },
  inputInner: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.slate[900],
  },
  eyeBtn: { position: 'absolute', right: 14 },

  hint: { fontSize: 12, color: Colors.rose[500], marginTop: -10, marginBottom: 12 },

  btn: {
    backgroundColor: Colors.pine[500],
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },

  terms: {
    fontSize: 12,
    color: Colors.slate[400],
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 16,
  },
  termsLink: { color: Colors.pine[500] },

  switchText: { textAlign: 'center', fontSize: 15, color: Colors.slate[600] },
  switchLink: { color: Colors.pine[500], fontWeight: '600' },
});
