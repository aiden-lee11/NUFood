import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useDataStore } from '../store';
import { Button } from './ui/button';
import { Input } from './ui/input';

export function TimePreferences() {
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');
    const { UserDataResponse, setUserPreferences } = useDataStore();

    const handleSave = () => {
        // Implement time preference saving logic
        console.log('Saving time preferences:', { startTime, endTime });
    };

    return (
        <View style={styles.container}>
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Start Time</Text>
                <Input
                    value={startTime}
                    onChangeText={setStartTime}
                    placeholder="HH:MM"
                    keyboardType="numeric"
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>End Time</Text>
                <Input
                    value={endTime}
                    onChangeText={setEndTime}
                    placeholder="HH:MM"
                    keyboardType="numeric"
                />
            </View>

            <Button onPress={handleSave} style={styles.button}>
                Save Preferences
            </Button>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 16,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
    },
    button: {
        marginTop: 8,
    },
}); 