import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDataStore } from '../src/store';
import { getDailyLocationOperationTimes, getCurrentTimeOfDay, mapFullLocationToShort } from '../src/utils';
import { useThemeColors } from '../src/theme';
import Fuse from 'fuse.js';
import DailyItemAccordion from '../src/components/DailyItemAccordion';

export default function DailyItemsScreen() {
  const weeklyItems = useDataStore((s) => s.weeklyItems);
  const colors = useThemeColors();
  const locationOperationTimes = useDataStore((s) => s.locationOperatingTimes);
  const styles = getStyles(colors);

  const [query, setQuery] = useState('');
  const [visibleTimes, setVisibleTimes] = useState<string[]>([]);
  const [openLocations, setOpenLocations] = useState<string[]>([]);

  // Compute today's date key in YYYY-MM-DD
  const todayKey = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todaysItems = weeklyItems?.[todayKey] || [];

  // Initialize selected times and open locations
  useEffect(() => {
    const locTimes = getDailyLocationOperationTimes(locationOperationTimes, new Date());
    const timeOfDay = getCurrentTimeOfDay();
    if (timeOfDay) setVisibleTimes([timeOfDay]);
    const isNowOpen = (name: string) => {
      const hours = locTimes[name];
      if (!hours) return false;
      const now = new Date();
      return hours.some(({ StartHour, StartMinutes, EndHour, EndMinutes }) => {
        const start = new Date();
        const end = new Date();
        start.setHours(StartHour, StartMinutes, 0);
        end.setHours(EndHour, EndMinutes, 0);
        return now >= start && now < end;
      });
    };
    const open = Object.keys(locTimes).filter(isNowOpen);
    setOpenLocations(open);
  }, [locationOperationTimes]);

  // Filter by time of day and search query
  const filteredByTime = useMemo(() => {
    if (visibleTimes.length === 0) return todaysItems;
    return todaysItems.filter((i) => (i.TimeOfDay ? visibleTimes.includes(i.TimeOfDay) : true));
  }, [todaysItems, visibleTimes]);

  const fuse = useMemo(() => new Fuse(filteredByTime, { keys: ['Name'], threshold: 0.5 }), [filteredByTime]);
  const filtered = useMemo(() => {
    if (!query) return filteredByTime;
    return fuse.search(query).map(({ item }) => item);
  }, [filteredByTime, fuse, query]);

  // Group by short location name
  const grouped = useMemo(() => {
    const groups: Record<string, typeof filtered> = {} as any;
    for (const item of filtered) {
      const short = mapFullLocationToShort(item.Location);
      if (!groups[short]) groups[short] = [] as any;
      groups[short].push(item);
    }
    return groups;
  }, [filtered]);

  const toggleTime = (t: string) => {
    setVisibleTimes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        {['Breakfast', 'Lunch', 'Dinner'].map((t) => (
          <TouchableOpacity key={t} onPress={() => toggleTime(t)} style={[styles.chip, { borderColor: colors.border }, visibleTimes.includes(t) && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
            <Text style={[styles.chipText, { color: colors.foreground }, visibleTimes.includes(t) && { color: colors.primaryForeground }]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        placeholder="Search today's items..."
        value={query}
        onChangeText={setQuery}
        style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }]}
      />
      {openLocations.length > 0 && (
        <Text style={[styles.subtle, { color: colors.muted }]}>Open now: {openLocations.join(', ')}</Text>
      )}
      <FlatList
        data={Object.entries(grouped)}
        keyExtractor={([group]) => group}
        renderItem={({ item: [group, items] }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }] }>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{group}</Text>
            <DailyItemAccordion items={items} expandFolders={false} />
          </View>
        )}
        ListEmptyComponent={<Text style={[styles.subtle, { color: colors.muted }]}>No items found for today.</Text>}
        contentContainerStyle={{ paddingBottom: 24, gap: 12, paddingHorizontal: 12 }}
      />
    </SafeAreaView>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: 8,
    },
    header: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9999, borderWidth: 1, borderColor: colors.border },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { color: colors.foreground },
    chipTextActive: { color: colors.primaryForeground },
    input: {
      marginHorizontal: 16,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    subtle: { color: colors.muted, marginHorizontal: 16, marginBottom: 8 },
    row: { paddingHorizontal: 16, paddingVertical: 10 },
    title: { color: colors.foreground, fontSize: 16, marginBottom: 4 },
    meta: { color: colors.muted, fontSize: 13 },
    sep: { height: 1, backgroundColor: colors.border },
    card: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    cardTitle: { fontSize: 18, fontWeight: '600', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6, color: colors.foreground },
  });


