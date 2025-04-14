import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useBanner } from '../context/BannerContext';

export function Banner() {
    const { banner, hideBanner } = useBanner();

    if (!banner) return null;

    return (
        <View style={[styles.container, styles[banner.type]]}>
            <Text style={styles.text}>{banner.message}</Text>
            <TouchableOpacity onPress={hideBanner} style={styles.closeButton}>
                <Text style={styles.closeText}>×</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 8,
    },
    text: {
        flex: 1,
        color: '#ffffff',
        fontSize: 14,
    },
    closeButton: {
        marginLeft: 8,
    },
    closeText: {
        color: '#ffffff',
        fontSize: 20,
    },
    success: {
        backgroundColor: '#10B981',
    },
    error: {
        backgroundColor: '#EF4444',
    },
    warning: {
        backgroundColor: '#F59E0B',
    },
    info: {
        backgroundColor: '#3B82F6',
    },
}); 