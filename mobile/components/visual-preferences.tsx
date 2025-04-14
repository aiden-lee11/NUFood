import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { useDataStore } from '../store';

export function VisualPreferences() {
    const { UserDataResponse } = useDataStore();
    const [darkMode, setDarkMode] = React.useState(false);
    const [compactView, setCompactView] = React.useState(false);

    return (
        <View style={styles.container}>
            <View style={styles.preference}>
                <Text style={styles.label}>Dark Mode</Text>
                <Switch
                    value={darkMode}
                    onValueChange={setDarkMode}
                    trackColor={{ false: '#E5E7EB', true: '#0EA5E9' }}
                    thumbColor={darkMode ? '#ffffff' : '#ffffff'}
                />
            </View>

            <View style={styles.preference}>
                <Text style={styles.label}>Compact View</Text>
                <Switch
                    value={compactView}
                    onValueChange={setCompactView}
                    trackColor={{ false: '#E5E7EB', true: '#0EA5E9' }}
                    thumbColor={compactView ? '#ffffff' : '#ffffff'}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 16,
    },
    preference: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    label: {
        fontSize: 16,
        color: '#374151',
    },
}); 