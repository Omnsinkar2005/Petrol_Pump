import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  SafeAreaView, RefreshControl, Alert, TouchableOpacity,
} from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { salaryApi } from '../api/endpoints';

export default function SalaryManagementScreen({ navigation }) {
  const [month, setMonth] = useState(currentMonth());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await salaryApi.byMonth(month);
      setRows(data.salaries || []);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    setGenerating(true);
    try {
      const { data } = await salaryApi.generate({ month });
      Alert.alert('Generated', `${data.generated || data.count || 0} salary records created/updated.`);
      load();
    } catch (err) {
      Alert.alert('Failed', err.response?.data?.message || err.message);
    } finally {
      setGenerating(false);
    }
  };

  const setStatus = async (id, status) => {
    try {
      await salaryApi.updateStatus(id, status);
      load();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Salary" onBack={() => navigation.goBack()} />
        <View style={styles.loader}><ActivityIndicator size="large" color="#1d4ed8" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Salary" onBack={() => navigation.goBack()} />
      <View style={styles.actionBar}>
        <Text style={styles.monthLabel}>{month}</Text>
        <TouchableOpacity
          style={[styles.genBtn, generating && { opacity: 0.6 }]}
          onPress={generate}
          disabled={generating}
        >
          {generating ? <ActivityIndicator color="#fff" /> : <Text style={styles.genText}>Generate for month</Text>}
        </TouchableOpacity>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(r) => String(r.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={<Text style={styles.empty}>No salaries for {month} yet — tap Generate</Text>}
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.name}>{item.employee_name || `Employee #${item.employee_id}`}</Text>
              <Text style={[styles.badge, badgeStyle(item.status)]}>{item.status}</Text>
            </View>
            <Text style={styles.amount}>₹ {Number(item.amount).toLocaleString('en-IN')}</Text>
            <Text style={styles.meta}>
              {Number(item.total_days || 0)} days · {Number(item.total_hours || 0).toFixed(1)} hrs
            </Text>
            <View style={styles.btnRow}>
              {item.status === 'pending' && (
                <TouchableOpacity style={[styles.smallBtn, styles.approveBtn]} onPress={() => setStatus(item.id, 'approved')}>
                  <Text style={styles.smallBtnText}>Approve</Text>
                </TouchableOpacity>
              )}
              {item.status === 'approved' && (
                <TouchableOpacity style={[styles.smallBtn, styles.payBtn]} onPress={() => setStatus(item.id, 'paid')}>
                  <Text style={styles.smallBtnText}>Mark Paid</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function badgeStyle(status) {
  if (status === 'paid') return { color: '#059669', backgroundColor: '#d1fae5' };
  if (status === 'approved') return { color: '#1d4ed8', backgroundColor: '#dbeafe' };
  return { color: '#d97706', backgroundColor: '#fef3c7' };
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f1f5f9' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  actionBar: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12,
  },
  monthLabel: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  genBtn: { flex: 1, backgroundColor: '#1d4ed8', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  genText: { color: '#fff', fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '700', color: '#0f172a', flex: 1 },
  amount: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginTop: 8 },
  meta: { color: '#64748b', fontSize: 13, marginTop: 4 },
  badge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    fontSize: 11, fontWeight: '700', overflow: 'hidden',
  },
  btnRow: { flexDirection: 'row', marginTop: 10, gap: 8 },
  smallBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  approveBtn: { backgroundColor: '#1d4ed8' },
  payBtn: { backgroundColor: '#059669' },
  smallBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 40 },
});
