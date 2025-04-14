import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDataStore } from '../store';

interface LocationGridProps {
    onLocationSelect: (location: string) => void;
}

export function LocationGrid({ onLocationSelect }: LocationGridProps) {
    const { UserDataResponse } = useDataStore();
    const locations = [...new Set(UserDataResponse.locationOperationHours.map(item => item.location))];

    return (
        <View style={styles.container}>
            {locations.map((location) => (
                <TouchableOpacity
                    key={location}
                    style={styles.locationButton}
                    onPress={() => onLocationSelect(location)}
                >
                    <Text style={styles.locationText}>{location}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        padding: 8,
    },
    locationButton: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    locationText: {
        color: '#374151',
        fontSize: 14,
        fontWeight: '500',
    },
}); 