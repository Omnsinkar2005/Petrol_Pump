import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  SafeAreaView, RefreshControl, Alert, TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import { alertApi } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';

export default function AlertsScreen({ navigation }) {
  const { user } = useAuth();
  const canRunScan = ['admin', 'owner'].includes(user?.role);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scanning, setScanning] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await alertApi.list();
      setRows(data.alerts || []);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const markRead = async (id) => {
    try {
      await alertApi.markRead(id);
      setRows((prev) => prev.map((row) => (row.id === id ? { ...row, is_read: 1 } : row)));
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to mark read');
    }
  };

  const markAllRead = async () => {
    try {
      await alertApi.markAllRead();
      load();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed');
    }
  };

  const runScan = async () => {
    setScanning(true);
    try {
      const { data } = await alertApi.runScan();
      const created = data.alertsCreated ?? data.created ?? 0;
      Alert.alert('Scan complete', `Created ${created} new alerts.`);
      load();
    } catch (err) {
      Alert.alert('Scan failed', err.response?.data?.message || err.message);
    } finally {
      setScanning(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Alerts" onBack={() => navigation.goBack()} />
        <View style={styles.loader}><ActivityIndicator size="large" color="#1d4ed8" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Alerts" onBack={() => navigation.goBack()} />
      <View style={styles.actionBar}>
        {canRunScan ? (
          <TouchableOpacity style={[styles.actionBtn, styles.scanBtn]} onPress={runScan} disabled={scanning}>
            {scanning ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionText}>Run Scan</Text>}
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={[styles.actionBtn, styles.readBtn]} onPress={markAllRead}>
          <Text style={[styles.actionText, styles.readText]}>Mark all read</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(row) => String(row.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={<Text style={styles.empty}>No alerts</Text>}
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        renderItem={({ item }) => {
          const alertType = item.alert_type || item.type;
          return (
            <TouchableOpacity
              style={[styles.card, !item.is_read && styles.cardUnread]}
              onPress={() => !item.is_read && markRead(item.id)}
              activeOpacity={0.7}
            >
              <View style={styles.cardTop}>
                <Text style={[styles.type, typeStyle(alertType)]}>{formatAlertType(alertType)}</Text>
                {!item.is_read && <View style={styles.dot} />}
              </View>
              <Text style={styles.message}>{item.message}</Text>
              <Text style={styles.date}>{item.date || item.created_at}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

function typeStyle(type) {
  if (type === 'overdue') return { color: '#dc2626', backgroundColor: '#fee2e2' };
  if (type === 'deadline_approaching') return { color: '#d97706', backgroundColor: '#fef3c7' };
  return { color: '#1d4ed8', backgroundColor: '#dbeafe' };
}

function formatAlertType(type) {
  return String(type || 'system')
    .split('_')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f1f5f9' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  actionBar: { flexDirection: 'row', padding: 16, gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  scanBtn: { backgroundColor: '#1d4ed8' },
  readBtn: { backgroundColor: '#e2e8f0' },
  actionText: { color: '#fff', fontWeight: '700' },
  readText: { color: '#334155' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10 },
  cardUnread: { borderLeftWidth: 4, borderLeftColor: '#1d4ed8' },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  type: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    fontSize: 11, fontWeight: '700', overflow: 'hidden', textTransform: 'uppercase',
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1d4ed8', marginLeft: 8 },
  message: { fontSize: 14, color: '#0f172a', marginBottom: 4 },
  date: { fontSize: 12, color: '#64748b' },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 40 },
});
