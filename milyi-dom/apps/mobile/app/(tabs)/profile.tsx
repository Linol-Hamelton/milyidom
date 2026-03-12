import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { fetchLoyaltyBalance } from '@/services/loyalty';
import { subscribeNewsletter } from '@/services/newsletter';
import { Colors } from '@/constants/colors';

const TIER_COLORS = {
  BRONZE:   { label: 'Bronze',   color: '#92400E', bg: '#FEF3C7' },
  SILVER:   { label: 'Silver',   color: Colors.slate[600], bg: Colors.slate[100] },
  GOLD:     { label: 'Gold',     color: '#92400E', bg: '#FEF9C3' },
  PLATINUM: { label: 'Platinum', color: '#6D28D9', bg: '#EDE9FE' },
} as const;

export default function ProfileScreen() {
  const { user, isAuthenticated, logout } = useAuthStore();

  const { data: loyalty } = useQuery({
    queryKey: ['loyalty-balance'],
    queryFn: fetchLoyaltyBalance,
    enabled: isAuthenticated,
  });

  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const newsletterMutation = useMutation({
    mutationFn: subscribeNewsletter,
    onSuccess: () => setNewsletterSubscribed(true),
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : '';
      // 409 = already subscribed — treat as success
      if (msg.includes('409') || msg.includes('already')) {
        setNewsletterSubscribed(true);
      } else {
        Alert.alert('Ошибка', 'Не удалось оформить подписку. Попробуйте позже.');
      }
    },
  });

  const handleLogout = () => {
    Alert.alert('Выход', 'Вы уверены, что хотите выйти?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: () => void logout() },
    ]);
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authPrompt}>
          <Ionicons name="person-circle-outline" size={72} color={Colors.pine[300]} />
          <Text style={styles.authTitle}>Войдите в аккаунт</Text>
          <Text style={styles.authSub}>
            Чтобы управлять бронированиями, избранным и бонусами
          </Text>
          <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.loginBtnText}>Войти</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.regLink}>Создать аккаунт</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const tierCfg = loyalty ? TIER_COLORS[loyalty.tier] : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.profile?.firstName?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.userName}>
              {user?.profile?.firstName
                ? `${user.profile.firstName} ${user.profile.lastName}`
                : user?.email}
            </Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
        </View>

        {/* Loyalty card */}
        {loyalty && tierCfg && (
          <View style={[styles.loyaltyCard, { backgroundColor: tierCfg.bg }]}>
            <View style={styles.loyaltyRow}>
              <View>
                <Text style={[styles.tierLabel, { color: tierCfg.color }]}>
                  {tierCfg.label}
                </Text>
                <Text style={styles.pointsText}>
                  {loyalty.points.toLocaleString('ru-RU')} баллов
                </Text>
              </View>
              <Ionicons name="star" size={32} color={tierCfg.color} />
            </View>
            {loyalty.nextTier && (
              <View style={styles.progressWrap}>
                <View style={styles.progressBg}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(
                          100,
                          (loyalty.totalEarned /
                            (loyalty.totalEarned + loyalty.nextTier.pointsNeeded)) *
                            100,
                        )}%` as `${number}%`,
                        backgroundColor: tierCfg.color,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.progressText, { color: tierCfg.color }]}>
                  Ещё {loyalty.nextTier.pointsNeeded.toLocaleString('ru-RU')} до{' '}
                  {TIER_COLORS[loyalty.nextTier.tier].label}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Host section */}
        {(user?.role === 'HOST' || user?.role === 'ADMIN') && (
          <View style={styles.hostSection}>
            <Text style={styles.sectionHeading}>Управление жильём</Text>
            <View style={styles.menu}>
              {[
                { icon: 'stats-chart-outline', label: 'Панель хозяина', href: '/host/dashboard' },
                { icon: 'calendar-outline', label: 'Бронирования гостей', href: '/host/bookings' },
                { icon: 'home-outline', label: 'Мои объявления', href: '/host/listings' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.label}
                  style={styles.menuItem}
                  onPress={() => router.push(item.href as Parameters<typeof router.push>[0])}
                >
                  <Ionicons name={item.icon as React.ComponentProps<typeof Ionicons>['name']} size={22} color={Colors.pine[600]} />
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color={Colors.slate[400]} style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Menu items */}
        <View style={styles.menu}>
          {[
            { icon: 'heart-outline', label: 'Избранное', href: '/(tabs)/favorites' },
            { icon: 'notifications-outline', label: 'Уведомления', href: '/notifications' },
            { icon: 'trophy-outline', label: 'Бонусная программа', href: '/loyalty' },
            { icon: 'bookmark-outline', label: 'Сохранённые поиски', href: '/saved-searches' },
            { icon: 'card-outline', label: 'Способы оплаты', href: null },
            { icon: 'shield-checkmark-outline', label: 'Безопасность', href: null },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.menuItem}
              onPress={() => item.href && router.push(item.href as Parameters<typeof router.push>[0])}
            >
              <Ionicons name={item.icon as React.ComponentProps<typeof Ionicons>['name']} size={22} color={Colors.slate[600]} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.slate[400]} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Newsletter */}
        <View style={styles.newsletterCard}>
          {newsletterSubscribed ? (
            <View style={styles.newsletterSuccess}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.pine[600]} />
              <Text style={styles.newsletterSuccessText}>Вы подписаны на рассылку!</Text>
            </View>
          ) : (
            <>
              <Text style={styles.newsletterTitle}>Подписка на новости</Text>
              <Text style={styles.newsletterSubtitle}>
                Получайте акции и лучшие предложения на {user?.email}
              </Text>
              <TouchableOpacity
                style={[styles.newsletterBtn, newsletterMutation.isPending && { opacity: 0.6 }]}
                onPress={() => user?.email && newsletterMutation.mutate(user.email)}
                disabled={newsletterMutation.isPending}
              >
                <Text style={styles.newsletterBtnText}>
                  {newsletterMutation.isPending ? 'Подписываемся…' : 'Подписаться'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.rose[500]} />
          <Text style={styles.logoutText}>Выйти</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.sand[50] },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.sand[100],
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.pine[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: Colors.white, fontSize: 22, fontWeight: '700' },
  userName: { fontSize: 18, fontWeight: '600', color: Colors.slate[900] },
  userEmail: { fontSize: 13, color: Colors.slate[500], marginTop: 2 },

  loyaltyCard: {
    margin: 16,
    borderRadius: 16,
    padding: 16,
  },
  loyaltyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tierLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  pointsText: { fontSize: 22, fontWeight: '700', color: Colors.slate[900], marginTop: 4 },
  progressWrap: { marginTop: 12 },
  progressBg: { height: 6, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 11, marginTop: 6, fontWeight: '500' },

  hostSection: { marginTop: 12 },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.slate[500],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: Colors.sand[50],
  },
  menu: { marginTop: 12, backgroundColor: Colors.white },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.sand[100],
  },
  menuLabel: { fontSize: 16, color: Colors.slate[700] },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    margin: 16,
    padding: 16,
    backgroundColor: Colors.white,
    borderRadius: 16,
  },
  logoutText: { color: Colors.rose[500], fontSize: 16, fontWeight: '500' },

  authPrompt: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  authTitle: { fontSize: 22, fontWeight: '700', color: Colors.slate[900] },
  authSub: { fontSize: 14, color: Colors.slate[500], textAlign: 'center', lineHeight: 20 },
  loginBtn: {
    backgroundColor: Colors.pine[500],
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 8,
    width: '100%',
    alignItems: 'center',
  },
  loginBtnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  regLink: { color: Colors.pine[500], fontSize: 15, fontWeight: '500' },
  newsletterCard: {
    margin: 16,
    marginTop: 12,
    backgroundColor: Colors.pine[50],
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.pine[100],
  },
  newsletterTitle: { fontSize: 15, fontWeight: '700', color: Colors.pine[700] },
  newsletterSubtitle: { fontSize: 12, color: Colors.slate[600], marginTop: 4, lineHeight: 16 },
  newsletterBtn: {
    marginTop: 12,
    backgroundColor: Colors.pine[600],
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  newsletterBtnText: { color: Colors.white, fontSize: 14, fontWeight: '600' },
  newsletterSuccess: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  newsletterSuccessText: { fontSize: 14, fontWeight: '600', color: Colors.pine[700] },
});
