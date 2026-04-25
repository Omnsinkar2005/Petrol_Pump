import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function ScreenHeader({ title, onBack, right }) {
  return (
    <>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {onBack || right ? (
        <View style={styles.actionBar}>
          {onBack ? (
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}
          {right ? <View style={styles.right}>{right}</View> : null}
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  title: {
    textAlign: 'center',
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: '#f1f5f9',
  },
  backBtn: {
    minHeight: 44,
    minWidth: 88,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { color: '#334155', fontSize: 15, fontWeight: '700' },
  right: { flex: 1, alignItems: 'flex-end' },
});
