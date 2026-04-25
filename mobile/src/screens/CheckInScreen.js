import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  RefreshControl,
  ScrollView,
} from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { attendanceApi } from '../api/endpoints';

export default function CheckInScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [today, setToday] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await attendanceApi.me();
      setToday(data.attendance || null);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const doCheckIn = async () => {
    setBusy(true);
    try {
      const { data } = await attendanceApi.checkIn();
      setToday(data.attendance);
      Alert.alert('Checked in', `Welcome! Recorded at ${fmtTime(data.attendance.check_in)}`);
    } catch (err) {
      Alert.alert('Check-in failed', err.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  const doCheckOut = async () => {
    setBusy(true);
    try {
      const { data } = await attendanceApi.checkOut();
      setToday(data.attendance);
      Alert.alert(
        'Checked out',
        `Worked ${Number(data.attendance.working_hours).toFixed(2)} hours.`
      );
    } catch (err) {
      Alert.alert('Check-out failed', err.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Check In / Out" onBack={() => navigation.goBack()} />
        <View style={styles.loader}><ActivityIndicator size="large" color="#1d4ed8" /></View>
      </SafeAreaView>
    );
  }

  const hasCheckedIn = !!today;
  const hasCheckedOut = !!today?.check_out;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Check In / Out" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Today's Status</Text>
          <Text style={styles.statusValue}>
            {!hasCheckedIn ? 'Not checked in' : hasCheckedOut ? 'Day complete' : 'Checked in'}
          </Text>
          <View style={styles.rowsBox}>
            <Row label="Check-in" value={today?.check_in ? fmtTime(today.check_in) : '—'} />
            <Row label="Check-out" value={today?.check_out ? fmtTime(today.check_out) : '—'} />
            <Row
              label="Hours worked"
              value={today?.working_hours ? `${Number(today.working_hours).toFixed(2)} h` : '—'}
            />
            <Row label="Status" value={today?.status || '—'} />
          </View>
        </View>

        {!hasCheckedIn && (
          <TouchableOpacity style={[styles.btn, styles.btnPrimary, busy && styles.btnDisabled]} onPress={doCheckIn} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Check In</Text>}
          </TouchableOpacity>
        )}

        {hasCheckedIn && !hasCheckedOut && (
          <TouchableOpacity style={[styles.btn, styles.btnDanger, busy && styles.btnDisabled]} onPress={doCheckOut} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Check Out</Text>}
          </TouchableOpacity>
        )}

        {hasCheckedOut && (
          <View style={[styles.btn, styles.btnDone]}>
            <Text style={styles.btnText}>✓ Day Complete</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function fmtTime(v) {
  if (!v) return '—';
  const d = new Date(v.replace(' ', 'T'));
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f1f5f9' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 16 },
  statusCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statusLabel: { color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  statusValue: { fontSize: 26, fontWeight: '700', color: '#0f172a', marginTop: 4, marginBottom: 16 },
  rowsBox: { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  rowLabel: { color: '#64748b' },
  rowValue: { color: '#0f172a', fontWeight: '600' },
  btn: { paddingVertical: 18, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  btnPrimary: { backgroundColor: '#1d4ed8' },
  btnDanger: { backgroundColor: '#dc2626' },
  btnDone: { backgroundColor: '#16a34a' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
