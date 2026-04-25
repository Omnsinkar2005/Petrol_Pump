import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  SafeAreaView, RefreshControl, Alert,
} from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { employeeApi, borrowedApi, attendanceApi, salaryApi } from '../api/endpoints';

export default function ReportsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState({
    employees: 0,
    presentToday: 0,
    outstandingBorrowed: 0,
    salaryPaidThisMonth: 0,
  });

  const load = useCallback(async () => {
    try {
      const month = currentMonth();
      const [empRes, todayRes, borRes, salRes] = await Promise.all([
        employeeApi.list(),
        attendanceApi.today(),
        borrowedApi.list(),
        salaryApi.byMonth(month).catch(() => ({ data: { salaries: [] } })),
      ]);
      const employees = (empRes.data.employees || []).filter((e) => e.status !== 'deactivated').length;
      const todayRows = todayRes.data.attendance || [];
      const presentToday = todayRows.filter((r) => r.status === 'present' || r.status === 'half_day').length;
      const borrowed = borRes.data.records || borRes.data.borrowed || [];
      const outstandingBorrowed = borrowed.reduce(
        (acc, b) => acc + Math.max(Number(b.amount || 0) - Number(b.paid_amount || 0), 0),
        0,
      );
      const salaries = salRes.data.salaries || [];
      const salaryPaidThisMonth = salaries
        .filter((s) => s.status === 'paid')
        .reduce((acc, s) => acc + Number(s.amount || 0), 0);

      setSummary({ employees, presentToday, outstandingBorrowed, salaryPaidThisMonth });
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Reports" onBack={() => navigation.goBack()} />
        <View style={styles.loader}><ActivityIndicator size="large" color="#1d4ed8" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Reports" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        <Text style={styles.section}>Overview · {currentMonth()}</Text>

        <Stat label="Active Employees" value={summary.employees} color="#1d4ed8" icon="👥" />
        <Stat label="Present Today" value={summary.presentToday} color="#059669" icon="✓" />
        <Stat
          label="Outstanding Borrowed Petrol"
          value={`₹ ${Number(summary.outstandingBorrowed).toLocaleString('en-IN')}`}
          color="#dc2626"
          icon="⛽"
        />
        <Stat
          label="Salary Paid This Month"
          value={`₹ ${Number(summary.salaryPaidThisMonth).toLocaleString('en-IN')}`}
          color="#059669"
          icon="💰"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, color, icon }) {
  return (
    <View style={styles.stat}>
      <View style={[styles.iconBox, { backgroundColor: color }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
      </View>
    </View>
  );
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f1f5f9' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  section: {
    fontSize: 12, color: '#64748b', textTransform: 'uppercase',
    fontWeight: '700', letterSpacing: 0.5, marginBottom: 12,
  },
  stat: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    padding: 16, borderRadius: 12, marginBottom: 10,
  },
  iconBox: {
    width: 48, height: 48, borderRadius: 12, alignItems: 'center',
    justifyContent: 'center', marginRight: 14,
  },
  icon: { fontSize: 22 },
  statLabel: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  statValue: { fontSize: 22, fontWeight: '700', marginTop: 2 },
});
