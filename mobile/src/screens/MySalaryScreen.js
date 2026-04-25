import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  SafeAreaView, RefreshControl, Alert, TouchableOpacity,
} from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { salaryApi } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';

export default function MySalaryScreen({ navigation }) {
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
      const { data } = await salaryApi.byEmployee(user.employee_id);
      setRows(data.salaries || []);
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
        <ScreenHeader title="My Salary" onBack={() => navigation.goBack()} />
        <View style={styles.loader}><ActivityIndicator size="large" color="#1d4ed8" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="My Salary" onBack={() => navigation.goBack()} />
      <FlatList
        data={rows}
        keyExtractor={(r) => String(r.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={<Text style={styles.empty}>No salary records yet</Text>}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('SalaryDetail', { salary: item })}
          >
            <View style={styles.cardTop}>
              <Text style={styles.month}>{item.month}</Text>
              <Text style={[styles.badge, badgeStyle(item.status)]}>{item.status}</Text>
            </View>
            <Text style={styles.amount}>₹ {Number(item.amount).toLocaleString('en-IN')}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.meta}>{Number(item.total_hours || 0).toFixed(1)} hours</Text>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.meta}>{Number(item.total_days || 0)} days</Text>
              {item.paid_at && (
                <>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.meta}>Paid {new Date(item.paid_at).toLocaleDateString()}</Text>
                </>
              )}
              <Text style={styles.tapHint}>› Tap for breakdown</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

function badgeStyle(status) {
  if (status === 'paid') return { color: '#059669', backgroundColor: '#d1fae5' };
  if (status === 'approved') return { color: '#1d4ed8', backgroundColor: '#dbeafe' };
  return { color: '#d97706', backgroundColor: '#fef3c7' };
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f1f5f9' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  month: { fontSize: 15, fontWeight: '600', color: '#64748b' },
  amount: { fontSize: 26, fontWeight: '700', color: '#0f172a', marginTop: 6 },
  metaRow: { flexDirection: 'row', marginTop: 6, flexWrap: 'wrap' },
  meta: { color: '#64748b', fontSize: 13 },
  metaDot: { color: '#cbd5e1', marginHorizontal: 6 },
  tapHint: { color: '#1d4ed8', fontSize: 12, fontWeight: '600', marginLeft: 'auto' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, fontSize: 11, fontWeight: '700', overflow: 'hidden' },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 40 },
});
