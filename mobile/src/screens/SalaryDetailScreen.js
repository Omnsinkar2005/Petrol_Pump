import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  SafeAreaView, Alert,
} from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { attendanceApi, employeeApi } from '../api/endpoints';

/**
 * Detailed salary breakdown for a single salary record (one month).
 * Shows each day: earned vs max, with deductions for absences / short hours.
 *
 * Calculation (matches backend):
 *   per_day_rate  = base_salary / WORKING_DAYS_PER_MONTH (26)
 *   present       → 1.0 day earned
 *   half_day      → 0.5 day earned  (0.5 day deducted)
 *   absent/no-rec → 0   day earned  (1.0 day deducted)
 */
const WORKING_DAYS_PER_MONTH = 26;
const FULL_DAY_HOURS = 8;

export default function SalaryDetailScreen({ navigation, route }) {
  const { salary } = route.params; // { id, employee_id, month, amount, total_days, total_hours, status, paid_at }

  const [attendance, setAttendance] = useState([]);
  const [baseSalary, setBaseSalary] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [attRes, empRes] = await Promise.all([
        attendanceApi.history(salary.employee_id, salary.month),
        employeeApi.get(salary.employee_id),
      ]);
      setAttendance(attRes.data.attendance || []);
      setBaseSalary(Number(empRes.data.employee?.salary) || 0);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [salary.employee_id, salary.month]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title={salary.month} onBack={() => navigation.goBack()} />
        <View style={styles.loader}><ActivityIndicator size="large" color="#1d4ed8" /></View>
      </SafeAreaView>
    );
  }

  const perDay = baseSalary / WORKING_DAYS_PER_MONTH;
  const totalEarned = Number(salary.amount);
  const maxPossible = baseSalary;
  const totalDeducted = Math.max(maxPossible - totalEarned, 0);

  // Sort rows ascending by date for a natural calendar feel
  const sortedAttendance = [...attendance].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title={`Salary · ${salary.month}`} onBack={() => navigation.goBack()} />

      <FlatList
        data={sortedAttendance}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <View>
            <View style={styles.summary}>
              <SummaryItem label="Base Salary" value={`₹ ${maxPossible.toLocaleString('en-IN')}`} color="#0f172a" />
              <SummaryItem
                label="Earned"
                value={`₹ ${totalEarned.toLocaleString('en-IN')}`}
                color="#059669"
              />
              <SummaryItem
                label="Deducted"
                value={`₹ ${totalDeducted.toLocaleString('en-IN')}`}
                color="#dc2626"
              />
            </View>
            <View style={styles.metaCard}>
              <MetaRow label="Days counted" value={`${Number(salary.total_days).toFixed(1)} / ${WORKING_DAYS_PER_MONTH}`} />
              <MetaRow label="Hours worked" value={`${Number(salary.total_hours || 0).toFixed(1)} h`} />
              <MetaRow label="Per-day rate" value={`₹ ${perDay.toFixed(2)}`} />
              <MetaRow label="Status" value={salary.status} />
              {salary.paid_at ? <MetaRow label="Paid on" value={new Date(salary.paid_at).toLocaleDateString()} /> : null}
            </View>
            <Text style={styles.section}>Day-by-day</Text>
            {sortedAttendance.length === 0 && (
              <Text style={styles.empty}>No attendance recorded for this month.</Text>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const hours = Number(item.working_hours || 0);
          let earnedFraction;
          let label;
          let color;
          if (item.status === 'present') {
            earnedFraction = 1;
            label = 'Present (full day)';
            color = '#059669';
          } else if (item.status === 'half_day') {
            earnedFraction = 0.5;
            label = `Half day (worked ${hours.toFixed(1)}h, < ${FULL_DAY_HOURS}h)`;
            color = '#d97706';
          } else {
            earnedFraction = 0;
            label = 'Absent';
            color = '#dc2626';
          }
          const earned = perDay * earnedFraction;
          const deducted = perDay - earned;
          return (
            <View style={styles.dayCard}>
              <View style={styles.dayTop}>
                <Text style={styles.dayDate}>{item.date}</Text>
                <Text style={[styles.dayBadge, { color, backgroundColor: bgFor(color) }]}>{item.status}</Text>
              </View>
              <Text style={styles.dayLabel}>{label}</Text>
              <View style={styles.dayAmounts}>
                <Text style={styles.earned}>+ ₹ {earned.toFixed(0)}</Text>
                {deducted > 0 && <Text style={styles.deducted}>− ₹ {deducted.toFixed(0)}</Text>}
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

function SummaryItem({ label, value, color }) {
  return (
    <View style={styles.summaryBox}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryVal, { color }]}>{value}</Text>
    </View>
  );
}
function MetaRow({ label, value }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaVal}>{value}</Text>
    </View>
  );
}
function bgFor(color) {
  if (color === '#059669') return '#d1fae5';
  if (color === '#d97706') return '#fef3c7';
  return '#fee2e2';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f1f5f9' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  summary: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  summaryBox: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center' },
  summaryLabel: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: '600' },
  summaryVal: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  metaCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 16 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  metaLabel: { color: '#64748b', fontSize: 13 },
  metaVal: { color: '#0f172a', fontWeight: '600', fontSize: 13 },
  section: {
    fontSize: 12, color: '#64748b', textTransform: 'uppercase',
    fontWeight: '700', letterSpacing: 0.5, marginBottom: 8,
  },
  dayCard: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8 },
  dayTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayDate: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  dayBadge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
    fontSize: 11, fontWeight: '700', overflow: 'hidden',
  },
  dayLabel: { color: '#64748b', fontSize: 12, marginTop: 4 },
  dayAmounts: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4, gap: 12 },
  earned: { color: '#059669', fontWeight: '700' },
  deducted: { color: '#dc2626', fontWeight: '700' },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 20 },
});
