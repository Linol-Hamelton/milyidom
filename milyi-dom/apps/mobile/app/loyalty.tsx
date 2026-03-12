import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { fetchLoyaltyBalance, fetchLoyaltyHistory, type LoyaltyTransaction } from '@/services/loyalty';
import { useAuthStore } from '@/stores/auth.store';
import { Colors } from '@/constants/colors';

const TIER_CONFIG = {
  BRONZE:   { label: 'Bronze',   color: '#92400E', bg: '#FEF3C7', next: 'Silver' },
  SILVER:   { label: 'Silver',   color: Colors.slate[600], bg: Colors.slate[100], next: 'Gold' },
  GOLD:     { label: 'Gold',     color: '#92400E', bg: '#FEF9C3', next: 'Platinum' },
  PLATINUM: { label: 'Platinum', color: '#6D28D9', bg: '#EDE9FE', next: null },
} as const;

const TX_ICON: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  EARN: 'add-circle',
  REDEEM: 'remove-circle',
  EXPIRE: 'time',
  BONUS: 'gift',
};

function TransactionRow({ tx }: { tx: LoyaltyTransaction }) {
  const icon = TX_ICON[tx.type] ?? 'ellipse';
  const isEarning = tx.type === 'EARN' || tx.type === 'BONUS';

  return (
    <View style={styles.txRow}>
      <View style={[styles.txIcon, { backgroundColor: isEarning ? Colors.pine[50] : '#FEF2F2' }]}>
        <Ionicons name={icon} size={18} color={isEarning ? Colors.pine[600] : Colors.rose[500]} />
      </View>
      <View style={styles.txBody}>
        <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
        <Text style={styles.txDate}>
          {format(new Date(tx.createdAt), 'd MMM yyyy', { locale: ru })}
        </Text>
      </View>
      <Text style={[styles.txPoints, { color: isEarning ? Colors.pine[600] : Colors.rose[500] }]}>
        {isEarning ? '+' : '-'}{Math.abs(tx.points)}
      </Text>
    </View>
  );
}

export default function LoyaltyScreen() {
  const { isAuthenticated } = useAuthStore();

  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ['loyalty-balance'],
    queryFn: fetchLoyaltyBalance,
    enabled: isAuthenticated,
  });

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ['loyalty-history'],
    queryFn: () => fetchLoyaltyHistory(30),
    enabled: isAuthenticated,
  });

  const tierCfg = balance ? TIER_CONFIG[balance.tier] : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.slate[700]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Бонусная программа</Text>
        <View style={{ width: 24 }} />
      </View>

      {balanceLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.pine[500]} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Tier card */}
          {balance && tierCfg && (
            <View style={[styles.tierCard, { backgroundColor: tierCfg.bg }]}>
              <View style={styles.tierRow}>
                <View>
                  <Text style={[styles.tierLabel, { color: tierCfg.color }]}>
                    {tierCfg.label}
                  </Text>
                  <Text style={styles.points}>
                    {balance.points.toLocaleString('ru-RU')} баллов
                  </Text>
                  <Text style={[styles.totalEarned, { color: tierCfg.color }]}>
                    Всего заработано: {balance.totalEarned.toLocaleString('ru-RU')}
                  </Text>
                </View>
                <Ionicons name="star" size={48} color={tierCfg.color} />
              </View>

              {/* Progress bar */}
              {balance.nextTier && (
                <View style={styles.progressWrap}>
                  <View style={styles.progressBg}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(
                            100,
                            (balance.totalEarned /
                              (balance.totalEarned + balance.nextTier.pointsNeeded)) *
                              100,
                          )}%` as `${number}%`,
                          backgroundColor: tierCfg.color,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.progressText, { color: tierCfg.color }]}>
                    Ещё {balance.nextTier.pointsNeeded.toLocaleString('ru-RU')} баллов до{' '}
                    {TIER_CONFIG[balance.nextTier.tier].label}
                  </Text>
                </View>
              )}
              {!balance.nextTier && (
                <Text style={[styles.progressText, { color: tierCfg.color, marginTop: 12 }]}>
                  Вы достигли максимального уровня!
                </Text>
              )}
            </View>
          )}

          {/* How it works */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Как это работает</Text>
            <View style={styles.infoCard}>
              {[
                { icon: 'home', text: '1 балл за каждые 100 ₽ стоимости бронирования' },
                { icon: 'star', text: 'Уровни: Bronze → Silver → Gold → Platinum' },
                { icon: 'pricetag', text: 'Используйте баллы как скидку на следующее бронирование' },
              ].map((item, i) => (
                <View key={i} style={styles.infoRow}>
                  <Ionicons name={item.icon as React.ComponentProps<typeof Ionicons>['name']} size={18} color={Colors.pine[600]} />
                  <Text style={styles.infoText}>{item.text}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Transaction history */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>История баллов</Text>
            {historyLoading ? (
              <ActivityIndicator color={Colors.pine[500]} style={{ marginTop: 16 }} />
            ) : history.length === 0 ? (
              <Text style={styles.emptyHistory}>История транзакций пуста</Text>
            ) : (
              <View style={styles.historyCard}>
                {history.map((tx, i) => (
                  <View key={tx.id}>
                    <TransactionRow tx={tx} />
                    {i < history.length - 1 && <View style={styles.divider} />}
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.sand[50] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate[200],
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.slate[900] },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tierCard: { margin: 16, borderRadius: 20, padding: 20 },
  tierRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tierLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  points: { fontSize: 32, fontWeight: '800', color: Colors.slate[900], marginTop: 6 },
  totalEarned: { fontSize: 12, marginTop: 4, fontWeight: '500' },
  progressWrap: { marginTop: 16 },
  progressBg: { height: 8, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 12, marginTop: 8, fontWeight: '500' },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.slate[800], marginBottom: 10 },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoText: { flex: 1, fontSize: 13, color: Colors.slate[600], lineHeight: 18 },
  historyCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  txIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  txBody: { flex: 1 },
  txDesc: { fontSize: 14, color: Colors.slate[800], fontWeight: '500' },
  txDate: { fontSize: 11, color: Colors.slate[400], marginTop: 2 },
  txPoints: { fontSize: 15, fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.slate[200], marginLeft: 62 },
  emptyHistory: { fontSize: 14, color: Colors.slate[400], textAlign: 'center', paddingVertical: 20 },
});
