import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert, Switch,
} from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { employeeApi } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';

/**
 * Create or edit an employee.
 * route params: { employee } — if present, edit mode; else create.
 */
export default function EmployeeFormScreen({ navigation, route }) {
  const { user } = useAuth();
  const existing = route.params?.employee || null;
  const isEdit = !!existing;
  const isOwnRecord = isEdit && user?.employee_id === existing.id;

  const [name, setName] = useState(existing?.name || '');
  const [phone, setPhone] = useState(existing?.phone_number || '');
  const [email, setEmail] = useState(existing?.email_id || '');
  const [empRole, setEmpRole] = useState(existing?.role || 'pump_attendant');
  const [salary, setSalary] = useState(existing?.salary ? String(existing.salary) : '');
  const [status, setStatus] = useState(existing?.status || 'active');

  // Login-account fields (create only)
  const [createUser, setCreateUser] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim() || !phone.trim() || !empRole.trim()) {
      Alert.alert('Missing fields', 'Name, phone, and role are required.');
      return;
    }
    if (isOwnRecord && status === 'deactivated') {
      Alert.alert('Not allowed', 'You cannot deactivate your own employee record.');
      return;
    }
    const salaryAmount = salary.trim() ? Number(salary) : 0;
    if (!Number.isFinite(salaryAmount) || salaryAmount < 0) {
      Alert.alert('Invalid salary', 'Salary must be a valid non-negative number.');
      return;
    }
    const payload = {
      name: name.trim(),
      phone_number: phone.trim(),
      email_id: email.trim() || null,
      role: empRole.trim(),
      salary: salaryAmount,
      status,
    };
    if (!isEdit && createUser) {
      if (!username.trim() || !password.trim()) {
        Alert.alert('Missing fields', 'Username and password required when creating login.');
        return;
      }
      payload.createUser = true;
      payload.username = username.trim();
      payload.password = password;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await employeeApi.update(existing.id, payload);
        Alert.alert('Saved', 'Employee updated.');
      } else {
        await employeeApi.create(payload);
        Alert.alert('Created', 'Employee added.');
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Failed', err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    if (isOwnRecord) {
      Alert.alert('Not allowed', 'You cannot delete your own employee record.');
      return;
    }

    Alert.alert(
      'Delete employee?',
      `This will deactivate ${existing.name}. History is preserved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await employeeApi.remove(existing.id);
              Alert.alert('Deleted', 'Employee has been deactivated.');
              navigation.goBack();
            } catch (err) {
              Alert.alert('Failed', err.response?.data?.message || err.message);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title={isEdit ? 'Edit Employee' : 'New Employee'} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.container}>
        <Field label="Name *" value={name} onChangeText={setName} placeholder="Full name" />
        <Field label="Phone *" value={phone} onChangeText={setPhone} placeholder="10-digit number" keyboardType="phone-pad" />
        <Field label="Email" value={email} onChangeText={setEmail} placeholder="optional" keyboardType="email-address" autoCapitalize="none" />
        <Field label="Job Role *" value={empRole} onChangeText={setEmpRole} placeholder="e.g. pump_attendant, cashier, manager" />
        <Field label="Base Salary (₹/month)" value={salary} onChangeText={setSalary} placeholder="0" keyboardType="numeric" />

        <Text style={styles.label}>Status</Text>
        <View style={styles.chips}>
          {['active', 'on_leave', 'deactivated'].map((s) => (
            <TouchableOpacity
              key={s}
              style={[
                styles.chip,
                status === s && styles.chipActive,
                isOwnRecord && s === 'deactivated' && styles.chipDisabled,
              ]}
              disabled={isOwnRecord && s === 'deactivated'}
              onPress={() => setStatus(s)}
            >
              <Text style={[styles.chipText, status === s && styles.chipTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {!isEdit && (
          <View style={styles.loginBox}>
            <View style={styles.switchRow}>
              <Text style={styles.label}>Create login account</Text>
              <Switch value={createUser} onValueChange={setCreateUser} />
            </View>
            {createUser && (
              <>
                <Field label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" />
                <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />
              </>
            )}
          </View>
        )}

        <TouchableOpacity style={[styles.btn, styles.btnSave, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{isEdit ? 'Save Changes' : 'Create Employee'}</Text>}
        </TouchableOpacity>

        {isEdit && (
          <TouchableOpacity
            style={[styles.btn, styles.btnDelete, isOwnRecord && styles.btnDisabled]}
            onPress={remove}
            disabled={isOwnRecord}
          >
            <Text style={styles.btnText}>Delete Employee</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, ...rest }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor="#94a3b8" {...rest} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f1f5f9' },
  container: { padding: 16, paddingBottom: 32 },
  label: { fontSize: 13, color: '#334155', fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#0f172a', borderWidth: 1, borderColor: '#e2e8f0',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14, gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
  },
  chipActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  chipDisabled: { opacity: 0.45 },
  chipText: { color: '#334155', fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: '#fff' },
  loginBox: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 14 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  btn: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  btnSave: { backgroundColor: '#1d4ed8' },
  btnDelete: { backgroundColor: '#dc2626', marginTop: 10 },
  btnDisabled: { opacity: 0.45 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
