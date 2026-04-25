import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  SafeAreaView, RefreshControl, Alert,
} from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { attendanceApi } from '../api/endpoints';

export default function AttendanceTodayScreen({ navigation }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await attendanceApi.today();
      setRows(data.attendance || []);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Attendance Today" onBack={() => navigation.goBack()} />
        <View style={styles.loader}><ActivityIndicator size="large" color="#1d4ed8" /></View>
      </SafeAreaView>
    );
  }

  const present = rows.filter((r) => r.status === 'present').length;
  const half = rows.filter((r) => r.status === 'half_day').length;
  const absent = rows.filter((r) => !r.check_in || r.status === 'absent').length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Attendance Today" onBack={() => navigation.goBack()} />
      <View style={styles.summary}>
        <Summary label="Present" value={present} color="#059669" />
        <Summary label="Half day" value={half} color="#d97706" />
        <Summary label="Absent" value={absent} color="#dc2626" />
      </View>
      <FlatList
        data={rows}
        keyExtractor={(r, i) => String(r.employee_id || i)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={<Text style={styles.empty}>No records for today</Text>}
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.employee_name || `Employee #${item.employee_id}`}</Text>
              <Text style={styles.times}>
                {fmtTime(item.check_in)} → {item.check_out ? fmtTime(item.check_out) : 'in progress'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.hours}>{Number(item.working_hours || 0).toFixed(2)} h</Text>
              <Text style={[styles.badge, badgeStyle(item.status)]}>{item.status || 'absent'}</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function Summary({ label, value, color }) {
  return (
    <View style={styles.summaryBox}>
      <Text style={[styles.summaryVal, { color }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}
function fmtTime(v) {
  if (!v) return '—';
  const d = new Date(v.replace(' ', 'T'));
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function badgeStyle(status) {
  if (status === 'present') return { color: '#059669', backgroundColor: '#d1fae5' };
  if (status === 'half_day') return { color: '#d97706', backgroundColor: '#fef3c7' };
  return { color: '#dc2626', backgroundColor: '#fee2e2' };
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f1f5f9' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  summary: { flexDirection: 'row', padding: 16, gap: 10 },
  summaryBox: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center',
  },
  summaryVal: { fontSize: 24, fontWeight: '700' },
  summaryLabel: { fontSize: 12, color: '#64748b', marginTop: 2, textTransform: 'uppercase', fontWeight: '600' },
  row: {
    flexDirection: 'row', backgroundColor: '#fff', padding: 14, borderRadius: 12,
    marginBottom: 10, alignItems: 'center',
  },
  name: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  times: { color: '#64748b', marginTop: 2, fontSize: 13 },
  hours: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  badge: {
    marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
    fontSize: 11, fontWeight: '600', overflow: 'hidden',
  },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 40 },
});
