import { ScrollView, StyleSheet, View } from 'react-native';
import { LocationGrid } from '../components/locationGrid';
import { TimePreferences } from '../components/time-preferences';
import { VisualPreferences } from '../components/visual-preferences';

export default function PreferencesPage() {
    return (
        <ScrollView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.section}>
                    <TimePreferences />
                </View>
                <View style={styles.section}>
                    <VisualPreferences />
                </View>
                <View style={styles.section}>
                    <LocationGrid onLocationSelect={(location) => console.log('Selected location:', location)} />
                </View>
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
    section: {
        marginBottom: 24,
    },
}); 