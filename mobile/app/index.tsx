import { ScrollView, StyleSheet, View } from 'react-native';
import { DailyItemAccordion } from '../components/DailyItemAccordion';
import { useDataStore } from '../store';

export default function HomePage() {
  const { weeklyItems } = useDataStore();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {Object.entries(weeklyItems).map(([day, items]) => (
          <DailyItemAccordion
            key={day}
            day={day}
            items={items}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
});
