import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  SafeAreaView, RefreshControl, Alert, TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import { employeeApi } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';

export default function EmployeesScreen({ navigation }) {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'manager';

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await employeeApi.list();
      setRows(data.employees || []);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const confirmDelete = (employee) => {
    if (user?.employee_id === employee.id) {
      Alert.alert('Not allowed', 'You cannot delete your own employee record.');
      return;
    }

    Alert.alert(
      'Delete employee?',
      `This will deactivate ${employee.name}. Attendance and salary history will be preserved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(employee.id);
            try {
              await employeeApi.remove(employee.id);
              setRows((current) =>
                current.map((row) =>
                  row.id === employee.id ? { ...row, status: 'deactivated' } : row
                )
              );
              Alert.alert('Deleted', 'Employee has been deactivated.');
            } catch (err) {
              Alert.alert('Failed', err.response?.data?.message || err.message);
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const screenActions = (
    <View style={styles.screenActions}>
      <TouchableOpacity style={styles.backAction} onPress={() => navigation.goBack()}>
        <Text style={styles.backActionText}>Back</Text>
      </TouchableOpacity>
      {canEdit ? (
        <TouchableOpacity
          style={styles.newAction}
          onPress={() => navigation.navigate('EmployeeForm')}
        >
          <Text style={styles.newActionText}>+ New Employee</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Employees" />
        {screenActions}
        <View style={styles.loader}><ActivityIndicator size="large" color="#1d4ed8" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Employees" />
      {screenActions}
      <FlatList
        data={rows}
        keyExtractor={(r) => String(r.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={<Text style={styles.empty}>No employees found</Text>}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => canEdit && navigation.navigate('EmployeeForm', { employee: item })}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(item.name)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.role}>{item.role}</Text>
              <View style={styles.metaRow}>
                {item.phone_number ? <Text style={styles.meta}>{item.phone_number}</Text> : null}
                {item.phone_number && item.salary ? <Text style={styles.metaDot}>·</Text> : null}
                {item.salary ? (
                  <Text style={styles.meta}>₹ {Number(item.salary).toLocaleString('en-IN')}/mo</Text>
                ) : null}
              </View>
            </View>
            <View style={styles.actions}>
              <Text style={[styles.badge, badgeStyle(item.status)]}>{item.status || 'active'}</Text>
              {canEdit && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.editBtn]}
                    onPress={() => navigation.navigate('EmployeeForm', { employee: item })}
                  >
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      styles.deleteBtn,
                      (item.status === 'deactivated' || deletingId === item.id || user?.employee_id === item.id) &&
                        styles.actionDisabled,
                    ]}
                    disabled={item.status === 'deactivated' || deletingId === item.id || user?.employee_id === item.id}
                    onPress={() => confirmDelete(item)}
                  >
                    <Text style={styles.deleteText}>
                      {deletingId === item.id ? '...' : 'Delete'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}
function badgeStyle(status) {
  if (status === 'deactivated') return { color: '#64748b', backgroundColor: '#e2e8f0' };
  if (status === 'on_leave') return { color: '#d97706', backgroundColor: '#fef3c7' };
  return { color: '#059669', backgroundColor: '#d1fae5' };
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f1f5f9' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  screenActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: '#f1f5f9',
  },
  backAction: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backActionText: { color: '#334155', fontSize: 15, fontWeight: '700' },
  newAction: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newActionText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    padding: 14, borderRadius: 12, marginBottom: 10,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#1d4ed8',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  name: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  role: { fontSize: 12, color: '#1d4ed8', fontWeight: '600', marginTop: 2, textTransform: 'uppercase' },
  metaRow: { flexDirection: 'row', marginTop: 4, flexWrap: 'wrap' },
  meta: { color: '#64748b', fontSize: 12 },
  metaDot: { color: '#cbd5e1', marginHorizontal: 6 },
  badge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    fontSize: 11, fontWeight: '700', overflow: 'hidden',
  },
  actions: { alignItems: 'flex-end', gap: 8 },
  actionRow: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  editBtn: { borderColor: '#bfdbfe', backgroundColor: '#eff6ff' },
  deleteBtn: { borderColor: '#fecaca', backgroundColor: '#fef2f2' },
  actionDisabled: { opacity: 0.45 },
  editText: { color: '#1d4ed8', fontSize: 11, fontWeight: '700' },
  deleteText: { color: '#dc2626', fontSize: 11, fontWeight: '700' },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 40 },
});
