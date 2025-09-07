import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { defaultExpandedStations } from '../../src/utils';
import { useThemeColors } from '../../src/theme';
import { DailyItem } from '../../src/types';

interface Props {
  items?: DailyItem[];
  expandFolders: boolean;
}

const DailyItemAccordion: React.FC<Props> = ({ items, expandFolders }) => {
  const safeItems = items ?? [];
  const colors = useThemeColors();
  // Group items by StationName
  const itemsByStation = useMemo(() => {
    return safeItems.reduce<Record<string, DailyItem[]>>((acc, item) => {
      const key = item.StationName || 'Other';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [safeItems]);

  const [expanded, setExpanded] = useState<string[]>([]);

  useEffect(() => {
    // Initialize expanded sections when items change
    const stationNames = Object.keys(itemsByStation);
    if (expandFolders) {
      setExpanded(stationNames);
    } else {
      const defaults = stationNames.filter((n) => defaultExpandedStations.includes(n));
      setExpanded(defaults);
    }
  }, [expandFolders, itemsByStation]);

  const toggle = (name: string) => {
    setExpanded((prev) => (prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]));
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => {
    const isOpen = expanded.includes(title);
    return (
      <View style={[styles.section, { borderColor: colors.border }]}>
        <TouchableOpacity onPress={() => toggle(title)} style={[styles.sectionHeader, { backgroundColor: colors.card }] }>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.chev, { color: colors.muted }]}>{isOpen ? '▾' : '▸'}</Text>
        </TouchableOpacity>
        {isOpen && <View style={styles.sectionBody}>{children}</View>}
      </View>
    );
  };

  return (
    <View>
      {Object.entries(itemsByStation).map(([station, stationItems]) => (
        <Section key={station} title={station}>
          {stationItems.map((it, idx) => (
            <View key={`${it.Name}-${idx}`} style={styles.itemRow}>
              <Text style={[styles.itemText, { color: colors.foreground }]}>{it.Name}</Text>
            </View>
          ))}
        </Section>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  section: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, marginBottom: 8, overflow: 'hidden' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f9fafb',
  },
  sectionTitle: { fontSize: 16, color: '#111827', fontWeight: '600' },
  chev: { color: '#6b7280' },
  sectionBody: { paddingHorizontal: 12, paddingVertical: 8 },
  itemRow: { paddingVertical: 8 },
  itemText: { color: '#111827', fontSize: 15 },
});

export default DailyItemAccordion;


