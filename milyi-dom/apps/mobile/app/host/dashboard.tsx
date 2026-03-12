import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { fetchHostAnalytics } from '@/services/host';
import { Colors } from '@/constants/colors';

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ComponentProps<typeof Ionicons>['name'] }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={20} color={Colors.pine[600]} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function HostDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['host-analytics'],
    queryFn: fetchHostAnalytics,
    staleTime: 60_000,
  });

  const totalRevenue = data
    ? new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(data.totalRevenue)
    : '—';

  const occupancy = data
    ? `${Math.round(data.avgOccupancyRate)}%`
    : '—';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.slate[700]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Панель хозяина</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.pine[500]} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Key stats */}
          <Text style={styles.sectionTitle}>Обзор (12 месяцев)</Text>
          <View style={styles.statsGrid}>
            <StatCard label="Доход" value={totalRevenue} icon="card-outline" />
            <StatCard label="Бронирований" value={String(data?.totalBookings ?? 0)} icon="calendar-outline" />
            <StatCard label="Заселений (7д)" value={String(data?.upcomingCheckIns ?? 0)} icon="enter-outline" />
            <StatCard label="Загруженность" value={occupancy} icon="stats-chart-outline" />
          </View>

          {/* Listings performance */}
          {data?.listingPerformance && data.listingPerformance.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Объявления</Text>
              {data.listingPerformance.map((lp) => (
                <View key={lp.listingId} style={styles.listingRow}>
                  <View style={styles.listingInfo}>
                    <Text style={styles.listingTitle} numberOfLines={1}>{lp.title}</Text>
                    <Text style={styles.listingCity}>{lp.city}</Text>
                  </View>
                  <View style={styles.listingStats}>
                    <Text style={styles.listingRevenue}>
                      {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(lp.revenue)}
                    </Text>
                    <Text style={styles.listingMeta}>
                      {lp.bookingsCount} броней · {Math.round(lp.occupancyRate)}% загр.
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Monthly revenue table (last 6) */}
          {data?.monthlyRevenue && data.monthlyRevenue.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Доход по месяцам</Text>
              {data.monthlyRevenue.slice(-6).reverse().map((m) => (
                <View key={m.month} style={styles.monthRow}>
                  <Text style={styles.monthLabel}>{m.month}</Text>
                  <View style={styles.monthRight}>
                    <Text style={styles.monthRevenue}>
                      {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(m.revenue)}
                    </Text>
                    <Text style={styles.monthBookings}>{m.bookingsCount} броней</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Quick links */}
          <Text style={styles.sectionTitle}>Управление</Text>
          <View style={styles.linksCard}>
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => router.push('/host/bookings' as Parameters<typeof router.push>[0])}
            >
              <Ionicons name="calendar-outline" size={20} color={Colors.pine[600]} />
              <Text style={styles.linkText}>Входящие бронирования</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.slate[400]} />
            </TouchableOpacity>
            <View style={styles.linkDivider} />
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => router.push('/host/listings' as Parameters<typeof router.push>[0])}
            >
              <Ionicons name="home-outline" size={20} color={Colors.pine[600]} />
              <Text style={styles.linkText}>Мои объявления</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.slate[400]} />
            </TouchableOpacity>
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
  content: { padding: 16, gap: 0 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.slate[700], marginTop: 20, marginBottom: 10 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    alignItems: 'flex-start',
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.pine[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: { fontSize: 18, fontWeight: '700', color: Colors.slate[900] },
  statLabel: { fontSize: 12, color: Colors.slate[500] },
  listingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  listingInfo: { flex: 1, marginRight: 12 },
  listingTitle: { fontSize: 14, fontWeight: '600', color: Colors.slate[900] },
  listingCity: { fontSize: 12, color: Colors.slate[500], marginTop: 2 },
  listingStats: { alignItems: 'flex-end' },
  listingRevenue: { fontSize: 14, fontWeight: '700', color: Colors.pine[700] },
  listingMeta: { fontSize: 11, color: Colors.slate[400], marginTop: 2 },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 6,
  },
  monthLabel: { fontSize: 14, color: Colors.slate[700] },
  monthRight: { alignItems: 'flex-end' },
  monthRevenue: { fontSize: 14, fontWeight: '600', color: Colors.slate[900] },
  monthBookings: { fontSize: 11, color: Colors.slate[400] },
  linksCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    marginBottom: 24,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  linkText: { flex: 1, fontSize: 15, color: Colors.slate[700] },
  linkDivider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.slate[200], marginLeft: 48 },
});
