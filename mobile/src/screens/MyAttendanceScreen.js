import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  SafeAreaView, RefreshControl, Alert,
} from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { attendanceApi } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';

export default function MyAttendanceScreen({ navigation }) {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.employee_id) {
      Alert.alert('Not available', 'Your account is not linked to an employee record.');
      setLoading(false);
      return;
    }
    try {
      const { data } = await attendanceApi.history(user.employee_id);
      setRows(data.attendance || []);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.employee_id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="My Attendance" onBack={() => navigation.goBack()} />
        <View style={styles.loader}><ActivityIndicator size="large" color="#1d4ed8" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="My Attendance" onBack={() => navigation.goBack()} />
      <FlatList
        data={rows}
        keyExtractor={(r) => String(r.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={<Text style={styles.empty}>No attendance records yet</Text>}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.date}>{item.date}</Text>
              <Text style={styles.times}>
                {fmtTime(item.check_in)} → {item.check_out ? fmtTime(item.check_out) : 'in progress'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.hours}>{Number(item.working_hours || 0).toFixed(2)} h</Text>
              <Text style={[styles.badge, badgeStyle(item.status)]}>{item.status}</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
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
  row: {
    flexDirection: 'row', backgroundColor: '#fff', padding: 14, borderRadius: 12,
    marginBottom: 10, alignItems: 'center',
  },
  date: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  times: { color: '#64748b', marginTop: 2 },
  hours: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  badge: {
    marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
    fontSize: 11, fontWeight: '600', overflow: 'hidden',
  },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 40 },
});
