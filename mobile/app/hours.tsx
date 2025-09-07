import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDataStore } from '../src/store';
import { formatTime, getWeekday, locationAliases } from '../src/utils';
import { useThemeColors } from '../src/theme';

export default function OperationHoursScreen() {
  const colors = useThemeColors();
  const styles = getStyles(colors);
  const locationOperatingTimes = useDataStore((s) => s.locationOperatingTimes);
  // Build grouped UI similar to web mobile: show each location card with the full week rows
  const sections = useMemo(() => {
    const byShort: Record<string, typeof locationOperatingTimes[number] | undefined> = {};
    for (const [short, aliases] of Object.entries(locationAliases)) {
      const match = (locationOperatingTimes || []).find((loc) => aliases.includes(loc.Name));
      if (match) byShort[short] = match;
    }

    const grouping: Record<string, string[]> = {
      'Dining Commons': ['Allison', 'Sargent', 'Plex East', 'Plex West', 'Elder'],
      'Norris Center': [
        '847 Burger',
        'Buen Dia',
        'Shake Smart',
        'Chicken & Boba',
        'Wildcat Deli',
        'Starbucks',
        'MOD Pizza',
        'Market at Norris',
      ],
      Chicago: ["Cafe Coralie", "Lisa's Cafe", 'Café Bergson'],
    };

    return Object.entries(grouping).map(([title, shorts]) => ({
      title,
      items: shorts
        .map((s) => byShort[s])
        .filter(Boolean) as typeof locationOperatingTimes,
    }));
  }, [locationOperatingTimes]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={sections}
        keyExtractor={(s) => s.title}
        renderItem={({ item: section }) => (
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.groupTitle}>{section.title}</Text>
            {section.items.map((loc, locIdx) => (
              <View key={loc.Name} style={[styles.card, locIdx !== section.items.length - 1 && { marginBottom: 14 }] }>
                <Text style={styles.title}>{loc.Name}</Text>
                {loc.Week.map((day, idx) => (
                  <View key={`${loc.Name}-${idx}`} style={[styles.row, idx === 0 && styles.firstRow]}>
                    <Text style={styles.day}>{getWeekday(idx)}</Text>
                    <Text style={[styles.times, !day.Hours && styles.closed]}>
                      {day.Hours && day.Hours.length > 0
                        ? day.Hours
                            .map((h) => `${formatTime(h.StartHour, h.StartMinutes)} – ${formatTime(h.EndHour, h.EndMinutes)}`)
                            .join('\n')
                        : 'Closed'}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}
        contentContainerStyle={{ padding: 12 }}
      />
    </SafeAreaView>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    title: { color: colors.foreground, fontSize: 20, fontWeight: '700', marginBottom: 6 },
    meta: { color: colors.muted, marginTop: 6 },
    groupTitle: { color: colors.foreground, fontSize: 22, fontWeight: '700', marginBottom: 8 },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    firstRow: { marginTop: 2 },
    day: { color: colors.foreground, fontSize: 16, width: 110 },
    times: { color: colors.foreground, fontSize: 15, textAlign: 'right', flex: 1, lineHeight: 20 },
    closed: { color: '#f16d96' },
  });


