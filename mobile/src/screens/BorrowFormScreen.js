import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert,
} from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { borrowedApi } from '../api/endpoints';

/**
 * Create a new borrowed-petrol record.
 * Accessible to manager, admin, owner.
 */
export default function BorrowFormScreen({ navigation }) {
  const today = new Date().toISOString().slice(0, 10);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [quantity, setQuantity] = useState('');
  const [amount, setAmount] = useState('');
  const [borrowDate, setBorrowDate] = useState(today);
  const [deadline, setDeadline] = useState(addDays(today, 7));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim() || !phone.trim() || !quantity || !amount || !deadline) {
      Alert.alert('Missing fields', 'Name, phone, quantity, amount, and deadline are required.');
      return;
    }
    if (!isYmd(deadline)) {
      Alert.alert('Invalid deadline', 'Use format YYYY-MM-DD (e.g. 2026-04-25).');
      return;
    }
    if (borrowDate && !isYmd(borrowDate)) {
      Alert.alert('Invalid borrow date', 'Use format YYYY-MM-DD.');
      return;
    }
    setSaving(true);
    try {
      await borrowedApi.create({
        borrower_name: name.trim(),
        borrower_phone_number: phone.trim(),
        borrower_email: email.trim() || null,
        quantity: Number(quantity),
        amount: Number(amount),
        borrow_date: borrowDate,
        deadline,
        notes: notes.trim() || null,
      });
      Alert.alert('Recorded', 'Borrowed petrol entry created.');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Failed', err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="New Borrow" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.container}>
        <Field label="Borrower Name *" value={name} onChangeText={setName} placeholder="e.g. Ramesh Auto Service" />
        <Field label="Phone *" value={phone} onChangeText={setPhone} placeholder="10-digit number" keyboardType="phone-pad" />
        <Field label="Email" value={email} onChangeText={setEmail} placeholder="optional" keyboardType="email-address" autoCapitalize="none" />

        <View style={styles.row2}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Field label="Quantity (L) *" value={quantity} onChangeText={setQuantity} keyboardType="numeric" placeholder="0" />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Field label="Amount (₹) *" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0" />
          </View>
        </View>

        <View style={styles.row2}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Field label="Borrow Date" value={borrowDate} onChangeText={setBorrowDate} placeholder="YYYY-MM-DD" />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Field label="Deadline *" value={deadline} onChangeText={setDeadline} placeholder="YYYY-MM-DD" />
          </View>
        </View>

        <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="optional" multiline />

        <TouchableOpacity style={[styles.btn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Record Borrow</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, multiline, ...rest }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { minHeight: 80, textAlignVertical: 'top' }]}
        placeholderTextColor="#94a3b8"
        multiline={multiline}
        {...rest}
      />
    </View>
  );
}

function isYmd(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s); }
function addDays(ymd, n) {
  const d = new Date(ymd);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f1f5f9' },
  container: { padding: 16, paddingBottom: 32 },
  label: { fontSize: 13, color: '#334155', fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#0f172a', borderWidth: 1, borderColor: '#e2e8f0',
  },
  row2: { flexDirection: 'row' },
  btn: {
    backgroundColor: '#1d4ed8', paddingVertical: 14, borderRadius: 10,
    alignItems: 'center', marginTop: 8,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
