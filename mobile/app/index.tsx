import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDataStore } from '../src/store';
import Fuse from 'fuse.js';

export default function AllItemsScreen() {
  const allItems = useDataStore((s) => s.allItems);
  const [query, setQuery] = useState('');

  const items = useMemo(() => allItems.map((n) => ({ Name: n })), [allItems]);
  const fuse = useMemo(() => new Fuse(items, { keys: ['Name'], threshold: 0.5 }), [items]);
  const filtered = useMemo(() => {
    if (!query) return items;
    return fuse.search(query).map(({ item }) => item);
  }, [items, fuse, query]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TextInput
        placeholder="Search items..."
        value={query}
        onChangeText={setQuery}
        style={styles.input}
      />
      <FlatList
        data={filtered}
        keyExtractor={(item, idx) => `${item.Name}-${idx}`}
        renderItem={({ item }) => (
          <View style={styles.row}><Text style={styles.rowText}>{item.Name}</Text></View>
        )}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 12,
  },
  input: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  row: { paddingHorizontal: 16, paddingVertical: 12 },
  rowText: { color: '#111827', fontSize: 16 },
  sep: { height: 1, backgroundColor: '#f3f4f6' },
});


