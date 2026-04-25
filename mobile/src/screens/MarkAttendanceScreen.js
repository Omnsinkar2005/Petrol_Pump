import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  SafeAreaView, RefreshControl, Alert, TouchableOpacity,
} from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { employeeApi, attendanceApi } from '../api/endpoints';

/**
 * Manager/admin screen: see every employee with today's attendance status
 * and tap to check them in or out.
 */
export default function MarkAttendanceScreen({ navigation }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [empRes, todayRes] = await Promise.all([
        employeeApi.list(),
        attendanceApi.today(),
      ]);
      const employees = (empRes.data.employees || []).filter((e) => e.status !== 'deactivated');
      const todayMap = {};
      (todayRes.data.attendance || []).forEach((r) => { todayMap[r.employee_id] = r; });
      setRows(employees.map((e) => ({ ...e, today: todayMap[e.id] || null })));
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const doCheckIn = async (emp) => {
    setBusyId(emp.id);
    try {
      await attendanceApi.checkIn(emp.id);
      await load();
    } catch (err) {
      Alert.alert('Check-in failed', err.response?.data?.message || err.message);
    } finally {
      setBusyId(null);
    }
  };

  const doCheckOut = async (emp) => {
    setBusyId(emp.id);
    try {
      await attendanceApi.checkOut(emp.id);
      await load();
    } catch (err) {
      Alert.alert('Check-out failed', err.response?.data?.message || err.message);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Mark Attendance" onBack={() => navigation.goBack()} />
        <View style={styles.loader}><ActivityIndicator size="large" color="#1d4ed8" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Mark Attendance" onBack={() => navigation.goBack()} />
      <FlatList
        data={rows}
        keyExtractor={(r) => String(r.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={<Text style={styles.empty}>No active employees</Text>}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => {
          const today = item.today;
          const checkedIn = !!today;
          const checkedOut = !!today?.check_out;
          const isBusy = busyId === item.id;
          return (
            <View style={styles.card}>
              <View style={styles.topRow}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{initials(item.name)}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.role}>{item.role}</Text>
                </View>
              </View>
              <View style={styles.timesRow}>
                <Time label="In" value={today?.check_in ? fmtTime(today.check_in) : '—'} />
                <Time label="Out" value={today?.check_out ? fmtTime(today.check_out) : '—'} />
                <Time label="Hours" value={today?.working_hours ? `${Number(today.working_hours).toFixed(2)}` : '—'} />
              </View>
              {!checkedIn && (
                <TouchableOpacity
                  style={[styles.btn, styles.btnIn, isBusy && styles.btnDisabled]}
                  disabled={isBusy}
                  onPress={() => doCheckIn(item)}
                >
                  {isBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Check In</Text>}
                </TouchableOpacity>
              )}
              {checkedIn && !checkedOut && (
                <TouchableOpacity
                  style={[styles.btn, styles.btnOut, isBusy && styles.btnDisabled]}
                  disabled={isBusy}
                  onPress={() => doCheckOut(item)}
                >
                  {isBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Check Out</Text>}
                </TouchableOpacity>
              )}
              {checkedOut && (
                <View style={[styles.btn, styles.btnDone]}>
                  <Text style={styles.btnText}>✓ Day Complete</Text>
                </View>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

function Time({ label, value }) {
  return (
    <View style={styles.timeBox}>
      <Text style={styles.timeLabel}>{label}</Text>
      <Text style={styles.timeValue}>{value}</Text>
    </View>
  );
}
function initials(name) {
  if (!name) return '?';
  const p = name.trim().split(/\s+/);
  return (p[0][0] + (p[1]?.[0] || '')).toUpperCase();
}
function fmtTime(v) {
  if (!v) return '—';
  const d = new Date(v.replace(' ', 'T'));
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f1f5f9' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12 },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#1d4ed8',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { color: '#fff', fontWeight: '700' },
  name: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  role: { fontSize: 11, color: '#1d4ed8', fontWeight: '600', marginTop: 2, textTransform: 'uppercase' },
  timesRow: {
    flexDirection: 'row', marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#e2e8f0',
  },
  timeBox: { flex: 1, alignItems: 'center' },
  timeLabel: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: '600' },
  timeValue: { fontSize: 15, color: '#0f172a', fontWeight: '700', marginTop: 2 },
  btn: { marginTop: 12, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  btnIn: { backgroundColor: '#1d4ed8' },
  btnOut: { backgroundColor: '#dc2626' },
  btnDone: { backgroundColor: '#16a34a' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 40 },
});
