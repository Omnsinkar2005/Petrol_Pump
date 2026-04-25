import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useAuth } from '../auth/AuthContext';

/**
 * Role-based home screen. Each role sees different action cards.
 * Tapping a card navigates to the corresponding feature screen.
 */

const ROLE_LABEL = {
  admin: 'Administrator',
  owner: 'Owner',
  manager: 'Manager',
  employee: 'Employee',
};

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();

  const cards = getCardsForRole(user?.role);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Hello, {user?.name || user?.username}</Text>
            <Text style={styles.roleBadge}>{ROLE_LABEL[user?.role] || user?.role}</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>What would you like to do?</Text>

        <View style={styles.grid}>
          {cards.map((c) => (
            <TouchableOpacity
              key={c.key}
              style={[styles.card, { backgroundColor: c.color }]}
              onPress={() => c.route && navigation.navigate(c.route)}
              activeOpacity={0.8}
            >
              <Text style={styles.cardIcon}>{c.icon}</Text>
              <Text style={styles.cardTitle}>{c.title}</Text>
              <Text style={styles.cardSub}>{c.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getCardsForRole(role) {
  const myAttendance = { key: 'myatt', route: 'MyAttendance', icon: '📅', title: 'My Attendance', sub: 'View your history', color: '#0891b2' };
  const mySalary = { key: 'mysal', route: 'MySalary', icon: '💰', title: 'My Salary', sub: 'Monthly earnings', color: '#059669' };
  const markAttendance = { key: 'markatt', route: 'MarkAttendance', icon: '⏱', title: 'Mark Attendance', sub: 'Check staff in / out', color: '#1d4ed8' };
  const employees = { key: 'emp', route: 'Employees', icon: '👥', title: 'Employees', sub: 'Manage staff records', color: '#7c3aed' };
  const allAttendance = { key: 'allatt', route: 'AttendanceToday', icon: '🗓', title: 'Attendance Today', sub: 'See everyone\'s status', color: '#0891b2' };
  const salaryMgmt = { key: 'sal', route: 'SalaryManagement', icon: '💵', title: 'Salary', sub: 'Generate & approve', color: '#059669' };
  const borrowed = { key: 'bor', route: 'BorrowedPetrol', icon: '⛽', title: 'Borrowed Petrol', sub: 'Track credit sales', color: '#dc2626' };
  const alerts = { key: 'alerts', route: 'Alerts', icon: '🔔', title: 'Alerts', sub: 'Deadlines & reminders', color: '#ea580c' };
  const reports = { key: 'rep', route: 'Reports', icon: '📊', title: 'Reports', sub: 'Business overview', color: '#6d28d9' };

  switch (role) {
    case 'admin':
      return [markAttendance, employees, allAttendance, salaryMgmt, borrowed, alerts, reports];
    case 'owner':
      return [reports, borrowed, alerts, allAttendance, salaryMgmt];
    case 'manager':
      return [markAttendance, employees, allAttendance, salaryMgmt, borrowed, alerts, myAttendance, mySalary];
    case 'employee':
      return [myAttendance, mySalary];
    default:
      return [];
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f1f5f9' },
  container: { padding: 16, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  greeting: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  roleBadge: {
    fontSize: 12,
    color: '#1d4ed8',
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  logoutBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
  },
  logoutText: { color: '#334155', fontWeight: '600' },
  sectionTitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  cardIcon: { fontSize: 32 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 8 },
  cardSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
});
