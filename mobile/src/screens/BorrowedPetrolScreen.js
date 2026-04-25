import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  SafeAreaView, RefreshControl, Alert, TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import { borrowedApi } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';

export default function BorrowedPetrolScreen({ navigation }) {
  const { user } = useAuth();
  const canCreate = ['admin', 'manager', 'owner'].includes(user?.role);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await borrowedApi.list();
      setRows(data.records || data.borrowed || []);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const openBorrowForm = useCallback(() => navigation.navigate('BorrowForm'), [navigation]);

  const rightBtn = canCreate ? (
    <TouchableOpacity style={styles.addBtn} onPress={openBorrowForm}>
      <Text style={styles.addBtnText}>+ New</Text>
    </TouchableOpacity>
  ) : null;

  const addPayment = (record) => {
    Alert.prompt?.(
      'Add payment',
      `Remaining: ₹ ${Number(record.amount - (record.paid_amount || 0)).toLocaleString('en-IN')}`,
      async (input) => {
        const amount = Number(input);
        if (!amount || amount <= 0) return;
        try {
          await borrowedApi.addPayment(record.id, amount);
          load();
        } catch (err) {
          Alert.alert('Payment failed', err.response?.data?.message || err.message);
        }
      },
      'plain-text',
      '',
      'numeric',
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Borrowed Petrol" onBack={() => navigation.goBack()} right={rightBtn} />
        <View style={styles.loader}><ActivityIndicator size="large" color="#1d4ed8" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Borrowed Petrol" onBack={() => navigation.goBack()} right={rightBtn} />
      <FlatList
        data={rows}
        keyExtractor={(r) => String(r.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={<Text style={styles.empty}>No borrowed petrol records</Text>}
        ListHeaderComponent={
          canCreate ? (
            <TouchableOpacity style={styles.createCard} onPress={openBorrowForm} activeOpacity={0.9}>
              <Text style={styles.createTitle}>Add New Borrow</Text>
              <Text style={styles.createSub}>Create a borrowed petrol entry for a customer.</Text>
            </TouchableOpacity>
          ) : null
        }
        contentContainerStyle={[styles.listContent, rows.length === 0 && styles.listEmptyContent]}
        renderItem={({ item }) => {
          const total = Number(item.amount || 0);
          const paid = Number(item.paid_amount || 0);
          const remaining = total - paid;
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.name}>{item.borrower_name || item.customer_name}</Text>
                <Text style={[styles.badge, badgeStyle(item.status)]}>{formatStatus(item.status)}</Text>
              </View>
              <View style={styles.amountRow}>
                <View>
                  <Text style={styles.lbl}>Total</Text>
                  <Text style={styles.amt}>₹ {total.toLocaleString('en-IN')}</Text>
                </View>
                <View>
                  <Text style={styles.lbl}>Paid</Text>
                  <Text style={[styles.amt, { color: '#059669' }]}>₹ {paid.toLocaleString('en-IN')}</Text>
                </View>
                <View>
                  <Text style={styles.lbl}>Remaining</Text>
                  <Text style={[styles.amt, { color: '#dc2626' }]}>₹ {remaining.toLocaleString('en-IN')}</Text>
                </View>
              </View>
              {item.deadline ? (
                <Text style={styles.deadline}>Deadline: {item.deadline}</Text>
              ) : null}
              {remaining > 0 && (
                <TouchableOpacity style={styles.payBtn} onPress={() => addPayment(item)}>
                  <Text style={styles.payBtnText}>Add Payment</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

function badgeStyle(status) {
  if (status === 'fully_paid') return { color: '#059669', backgroundColor: '#d1fae5' };
  if (status === 'overdue') return { color: '#dc2626', backgroundColor: '#fee2e2' };
  if (status === 'alert_active') return { color: '#d97706', backgroundColor: '#fef3c7' };
  return { color: '#1d4ed8', backgroundColor: '#dbeafe' };
}

function formatStatus(status) {
  return String(status || '')
    .split('_')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f1f5f9' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  addBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  listContent: { padding: 16, paddingBottom: 24 },
  listEmptyContent: { flexGrow: 1 },
  createCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  createTitle: { fontSize: 16, fontWeight: '700', color: '#1d4ed8' },
  createSub: { fontSize: 13, color: '#475569', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  name: { fontSize: 16, fontWeight: '700', color: '#0f172a', flex: 1 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  lbl: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: '600' },
  amt: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginTop: 2 },
  deadline: { color: '#64748b', fontSize: 13, marginTop: 4 },
  badge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    fontSize: 11, fontWeight: '700', overflow: 'hidden',
  },
  payBtn: {
    marginTop: 10, backgroundColor: '#1d4ed8', paddingVertical: 10,
    borderRadius: 8, alignItems: 'center',
  },
  payBtnText: { color: '#fff', fontWeight: '700' },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 40 },
});
